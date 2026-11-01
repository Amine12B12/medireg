import { NextRequest, NextResponse } from 'next/server'
import { adminMedireg, estConsultant, RefusAcces, reponseRefus, utilisateurConnecte, verifierAccesClient } from '@/lib/acces-api'

// Passerelle MediReg → MediTrack. MediReg n'a aucun accès à la base MediTrack : il appelle la route
// dédiée de MediTrack (/api/passerelle/medireg) avec un secret partagé, côté serveur uniquement.
// MediReg vérifie ici que l'utilisateur a droit au client ; MediTrack ne renvoie que des compteurs
// et les fiches matériel / livraison / maintenance de l'établissement rattaché (jamais de données patient).

const BASE = (process.env.MEDITRACK_URL || 'https://www.meditrack-app.fr').replace(/\/$/, '')

async function passerelle(methode: 'GET' | 'POST', params: Record<string, string>, corps?: unknown) {
  const secret = process.env.PASSERELLE_MEDIREG_SECRET
  if (!secret) throw new Error('PASSERELLE_MEDIREG_SECRET manquant')
  const res = await fetch(`${BASE}/api/passerelle/medireg?${new URLSearchParams(params)}`, {
    method: methode,
    headers: { 'x-passerelle-cle': secret, 'content-type': 'application/json' },
    body: corps ? JSON.stringify(corps) : undefined,
    cache: 'no-store',
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new RefusAcces(res.status === 403 ? 403 : res.status === 404 ? 404 : 401, json.error || 'MediTrack indisponible.')
  return json
}

async function contexte(req: Request, clientId: string | null) {
  const profil = await utilisateurConnecte(req)
  await verifierAccesClient(profil, clientId)
  const { data: client } = await adminMedireg().from('clients').select('id, contact_email, meditrack_etablissement_id').eq('id', clientId!).single()
  if (!client) throw new RefusAcces(404, 'Client introuvable.')
  return { profil, client }
}

export async function GET(req: NextRequest) {
  try {
    const p = new URL(req.url).searchParams
    const { profil, client } = await contexte(req, p.get('clientId'))
    const action = p.get('action')

    // Établissements proposés pour la liaison : ceux dont l'e-mail de contact est celui du client
    // (un consultant voit tout pour pouvoir rattacher un ancien client)
    if (action === 'etablissements') {
      if (estConsultant(profil)) return NextResponse.json(await passerelle('GET', { action, tous: '1' }))
      if (!client.contact_email) return NextResponse.json({ etablissements: [] })
      return NextResponse.json(await passerelle('GET', { action, email: client.contact_email }))
    }

    const etabId = client.meditrack_etablissement_id as string | null
    if (!etabId) return NextResponse.json({ lie: false })
    if (action === 'stats') return NextResponse.json({ lie: true, ...(await passerelle('GET', { action, etablissementId: etabId })) })
    if (action === 'saisie') return NextResponse.json({ lie: true, ...(await passerelle('GET', { action, etablissementId: etabId })) })
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

    if (corps.action === 'lier') {
      const etabId = String(corps.etablissementId || '')
      const { etablissement: etab } = await passerelle('GET', { action: 'etablissement', etablissementId: etabId })
      const memeEmail = !!client.contact_email && etab.contact_email?.toLowerCase() === client.contact_email.toLowerCase()
      if (!estConsultant(profil) && !memeEmail) throw new RefusAcces(403, "Cet établissement MediTrack n'est pas le vôtre.")
      await adminMedireg().from('clients').update({ meditrack_etablissement_id: etab.id }).eq('id', client.id)
      return NextResponse.json({ ok: true })
    }

    if (corps.action === 'ajouter') {
      const etabId = client.meditrack_etablissement_id as string | null
      if (!etabId) throw new RefusAcces(403, "Aucun établissement MediTrack n'est rattaché.")
      return NextResponse.json(await passerelle('POST', {}, { action: 'ajouter', etablissementId: etabId, table: corps.table, donnees: corps.donnees }))
    }

    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
  } catch (e) {
    if (e instanceof RefusAcces) return reponseRefus(e)
    console.error('API meditrack POST', e)
    return NextResponse.json({ error: 'Erreur MediTrack.' }, { status: 500 })
  }
}
