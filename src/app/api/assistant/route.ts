import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const { messages, etablissement_id, role } = await request.json()

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Charge les données réelles selon le rôle
  let contextData = ''

  try {
    if (role === 'admin') {
      // Admin voit tout
      const { data: equipements } = await supabaseAdmin
        .from('equipements')
        .select('reference, designation, categorie, statut, localisation, date_revision, fabricant, modele, etablissements(nom)')
        .order('created_at')
        .limit(50)

      const { data: maintenances } = await supabaseAdmin
        .from('maintenances')
        .select('type, statut, date_prevue, notes, equipements(reference, designation, etablissements(nom))')
        .order('date_prevue', { ascending: true })
        .limit(20)

      const { data: pannes } = await supabaseAdmin
        .from('pannes')
        .select('description, statut, created_at, equipements(reference, designation, etablissements(nom))')
        .order('created_at', { ascending: false })
        .limit(10)

      const { data: etablissements } = await supabaseAdmin
        .from('etablissements')
        .select('nom, type, ville, formule, statut')
        .order('nom')

      contextData = `
=== DONNÉES RÉELLES DE MEDITRACK ===

ÉTABLISSEMENTS (${etablissements?.length || 0}) :
${etablissements?.map(e => `- ${e.nom} (${e.type}, ${e.ville || '—'}) — Formule: ${e.formule} — Statut: ${e.statut}`).join('\n') || 'Aucun'}

PARC MATÉRIEL (${equipements?.length || 0} équipements) :
${equipements?.map(e => `- [${e.statut.toUpperCase()}] ${e.designation} (${e.reference}) — ${(e.etablissements as any)?.nom || '—'} — Localisation: ${e.localisation || '—'} — Révision: ${e.date_revision || 'non définie'}`).join('\n') || 'Aucun'}

MAINTENANCES À VENIR (${maintenances?.length || 0}) :
${maintenances?.map(m => `- ${m.type === 'preventive' ? 'Préventive' : 'Curative'} [${m.statut}] pour ${(m.equipements as any)?.designation} (${(m.equipements as any)?.etablissements?.nom || '—'}) — Date: ${m.date_prevue ? new Date(m.date_prevue).toLocaleDateString('fr-FR') : 'non définie'} — Notes: ${m.notes || '—'}`).join('\n') || 'Aucune'}

PANNES RÉCENTES (${pannes?.length || 0}) :
${pannes?.map(p => `- [${p.statut}] ${(p.equipements as any)?.designation} (${(p.equipements as any)?.etablissements?.nom || '—'}) — ${new Date(p.created_at).toLocaleDateString('fr-FR')} — ${p.description}`).join('\n') || 'Aucune'}
`
    } else if (role === 'client' && etablissement_id) {
      // Client voit seulement son établissement
      const { data: etab } = await supabaseAdmin
        .from('etablissements')
        .select('nom, type, ville, formule')
        .eq('id', etablissement_id)
        .single()

      const { data: equipements } = await supabaseAdmin
        .from('equipements')
        .select('reference, designation, categorie, statut, localisation, date_revision, fabricant, modele')
        .eq('etablissement_id', etablissement_id)
        .order('created_at')

      const { data: maintenances } = await supabaseAdmin
        .from('maintenances')
        .select('type, statut, date_prevue, notes, equipements!inner(reference, designation, etablissement_id)')
        .eq('equipements.etablissement_id', etablissement_id)
        .order('date_prevue', { ascending: true })
        .limit(10)

      const { data: pannes } = await supabaseAdmin
        .from('pannes')
        .select('description, statut, created_at, equipements!inner(reference, designation, etablissement_id)')
        .eq('equipements.etablissement_id', etablissement_id)
        .order('created_at', { ascending: false })
        .limit(5)

      contextData = `
=== DONNÉES DE VOTRE ÉTABLISSEMENT ===

ÉTABLISSEMENT : ${etab?.nom} (${etab?.type}, ${etab?.ville || '—'}) — Formule: ${etab?.formule}

VOTRE PARC (${equipements?.length || 0} équipements) :
${equipements?.map(e => `- [${e.statut.toUpperCase()}] ${e.designation} (${e.reference}) — Localisation: ${e.localisation || '—'} — Révision: ${e.date_revision || 'non définie'}`).join('\n') || 'Aucun équipement'}

MAINTENANCES (${maintenances?.length || 0}) :
${maintenances?.map(m => `- ${m.type === 'preventive' ? 'Préventive' : 'Curative'} [${m.statut}] pour ${(m.equipements as any)?.designation} — Date: ${m.date_prevue ? new Date(m.date_prevue).toLocaleDateString('fr-FR') : 'non définie'}`).join('\n') || 'Aucune maintenance'}

PANNES RÉCENTES (${pannes?.length || 0}) :
${pannes?.map(p => `- [${p.statut}] ${(p.equipements as any)?.designation} — ${new Date(p.created_at).toLocaleDateString('fr-FR')} — ${p.description}`).join('\n') || 'Aucune panne'}
`
    }
  } catch (err) {
    console.error('Erreur chargement données:', err)
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: `Tu es l'assistant MediTrack, un expert en gestion de matériel médical à domicile (PSDM).
Tu aides les prestataires de santé et les établissements clients à gérer leur parc d'équipements médicaux.

${contextData ? `Tu as accès aux données réelles de MediTrack ci-dessous. Utilise-les pour répondre aux questions sur le parc, les maintenances, les pannes et les établissements. Si l'utilisateur demande des infos sur ses équipements, réponds avec les vraies données.

${contextData}` : ''}

RÈGLES :
- Tu réponds en français, de façon concise et professionnelle
- Tu utilises les données réelles fournies ci-dessus pour répondre aux questions
- Si une info n'est pas dans les données, dis-le clairement
- Tu ne fournis pas de conseils médicaux aux patients
- Tu peux aider à rédiger des procédures, préparer des audits, analyser la conformité`,
      messages
    })
  })

  const data = await response.json()
  return NextResponse.json(data)
}