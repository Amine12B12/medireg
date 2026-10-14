import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { adminMedireg, estConsultant, RefusAcces, reponseRefus, utilisateurConnecte, verifierAccesClient } from '@/lib/acces-api'

// Passerelle MediReg → MediTrack. La clé MediTrack reste sur le serveur ; chaque requête est limitée
// à l'établissement MediTrack rattaché au client MediReg auquel l'utilisateur a accès.

function meditrack(): SupabaseClient {
  const cle = process.env.MEDITRACK_SERVICE_ROLE_KEY
  if (!cle) throw new Error('MEDITRACK_SERVICE_ROLE_KEY manquant')
  return createClient(process.env.MEDITRACK_SUPABASE_URL || 'https://nkfivuqomqubhpsvgdfm.supabase.co', cle, { auth: { persistSession: false } })
}

const TABLES = ['equipements', 'livraisons', 'maintenances'] as const
type Table = (typeof TABLES)[number]

// Champs qu'un utilisateur MediReg peut saisir dans MediTrack (tout le reste est ignoré)
const CHAMPS: Record<Table, string[]> = {
  equipements: ['designation', 'categorie', 'fabricant', 'modele', 'numero_serie', 'mode_dispo', 'statut', 'date_mes', 'commentaires'],
  livraisons: ['equipement_id', 'type', 'date_prevue', 'date_realisee', 'statut', 'adresse', 'notes'],
  maintenances: ['equipement_id', 'type', 'date_prevue', 'date_realisee', 'statut', 'notes'],
}

async function contexte(req: Request, clientId: string | null) {
  const profil = await utilisateurConnecte(req)
  await verifierAccesClient(profil, clientId)
  const { data: client } = await adminMedireg().from('clients').select('id, contact_email, meditrack_etablissement_id').eq('id', clientId!).single()
  if (!client) throw new RefusAcces(404, 'Client introuvable.')
  return { profil, client }
}

async function idsEquipements(mt: SupabaseClient, etabId: string) {
  const { data } = await mt.from('equipements').select('id').eq('etablissement_id', etabId)
  return (data || []).map(e => e.id as string)
}

export async function GET(req: NextRequest) {
  try {
    const p = new URL(req.url).searchParams
    const { profil, client } = await contexte(req, p.get('clientId'))
    const mt = meditrack()
    const action = p.get('action')

    // Établissements MediTrack proposés pour la liaison : ceux dont l'email de contact est celui du client
    // (un consultant voit tout pour pouvoir rattacher un ancien client)
    if (action === 'etablissements') {
      let q = mt.from('etablissements').select('id, nom, ville').order('nom')
      if (!estConsultant(profil)) {
        if (!client.contact_email) return NextResponse.json({ etablissements: [] })
        q = q.ilike('contact_email', client.contact_email)
      }
      const { data } = await q
      return NextResponse.json({ etablissements: data || [] })
    }

    const etabId = client.meditrack_etablissement_id as string | null
    if (!etabId) return NextResponse.json({ lie: false })

    if (action === 'stats') {
      // q=livraisons,equipements:en_service,maintenances
      const demandes = (p.get('q') || '').split(',').filter(Boolean)
      const eqIds = await idsEquipements(mt, etabId)
      const resultats: Record<string, number> = {}
      for (const d of demandes) {
        const [table, statut] = d.split(':') as [Table, string | undefined]
        if (!TABLES.includes(table)) continue
        let q = mt.from(table).select('id', { count: 'exact', head: true })
        q = table === 'maintenances' ? q.in('equipement_id', eqIds.length ? eqIds : ['-']) : q.eq('etablissement_id', etabId)
        if (statut) q = q.eq('statut', statut)
        const { count } = await q
        resultats[d] = count || 0
      }
      return NextResponse.json({ lie: true, stats: resultats })
    }

    if (action === 'saisie') {
      const { data: equipements } = await mt.from('equipements').select('*').eq('etablissement_id', etabId).order('created_at', { ascending: false })
      const { data: livraisons } = await mt.from('livraisons').select('*, equipements(designation)').eq('etablissement_id', etabId).order('created_at', { ascending: false })
      const eqIds = (equipements || []).map(e => e.id)
      const { data: maintenances } = eqIds.length
        ? await mt.from('maintenances').select('*, equipements(designation)').in('equipement_id', eqIds).order('created_at', { ascending: false })
        : { data: [] }
      return NextResponse.json({ lie: true, equipements: equipements || [], livraisons: livraisons || [], maintenances: maintenances || [] })
    }

    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
  } catch (e) {
    if (e instanceof RefusAcces) return reponseRefus(e)
    console.error('API meditrack GET', e)
    return NextResponse.json({ error: 'Erreur MediTrack.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const corps = await req.json()
    const { profil, client } = await contexte(req, corps.clientId ?? null)
    const mt = meditrack()

    if (corps.action === 'lier') {
      const etabId = String(corps.etablissementId || '')
      const { data: etab } = await mt.from('etablissements').select('id, contact_email').eq('id', etabId).maybeSingle()
      if (!etab) throw new RefusAcces(404, 'Établissement MediTrack introuvable.')
      const memeEmail = !!client.contact_email && etab.contact_email?.toLowerCase() === client.contact_email.toLowerCase()
      if (!estConsultant(profil) && !memeEmail) throw new RefusAcces(403, "Cet établissement MediTrack n'est pas le vôtre.")
      await adminMedireg().from('clients').update({ meditrack_etablissement_id: etab.id }).eq('id', client.id)
      return NextResponse.json({ ok: true })
    }

    if (corps.action === 'ajouter') {
      const etabId = client.meditrack_etablissement_id as string | null
      if (!etabId) throw new RefusAcces(403, "Aucun établissement MediTrack n'est rattaché.")
      const table = corps.table as Table
      if (!TABLES.includes(table)) return NextResponse.json({ error: 'Table non autorisée.' }, { status: 400 })

      const ligne: Record<string, unknown> = {}
      for (const c of CHAMPS[table]) if (corps.donnees?.[c] !== undefined && corps.donnees[c] !== '') ligne[c] = corps.donnees[c]
      if (table !== 'maintenances') ligne.etablissement_id = etabId
      if (table !== 'equipements') {
        const eqIds = await idsEquipements(mt, etabId)
        if (!eqIds.includes(String(ligne.equipement_id))) throw new RefusAcces(403, "Cet équipement n'appartient pas à votre établissement.")
      }
      const { error } = await mt.from(table).insert([ligne])
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
  } catch (e) {
    if (e instanceof RefusAcces) return reponseRefus(e)
    console.error('API meditrack POST', e)
    return NextResponse.json({ error: 'Erreur MediTrack.' }, { status: 500 })
  }
}
