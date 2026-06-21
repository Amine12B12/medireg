import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const { messages, etablissement_id, role } = await request.json()

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let contextData = ''

  try {
    if (role === 'admin') {
      const { data: equipements } = await supabaseAdmin
        .from('equipements')
        .select('reference, designation, categorie, statut, localisation, date_revision, fabricant, modele, numero_serie, commentaires, etablissements(nom)')
        .order('created_at')
        .limit(100)

      const { data: maintenances } = await supabaseAdmin
        .from('maintenances')
        .select('type, statut, date_prevue, notes, equipements(reference, designation, numero_serie, etablissements(nom))')
        .order('date_prevue', { ascending: true })
        .limit(50)

      const { data: pannes } = await supabaseAdmin
        .from('pannes')
        .select('description, statut, created_at, equipements(reference, designation, numero_serie, etablissements(nom))')
        .order('created_at', { ascending: false })
        .limit(20)

      const { data: etablissements } = await supabaseAdmin
        .from('etablissements')
        .select('nom, type, ville, formule, statut')
        .order('nom')

      contextData = `
=== DONNÉES RÉELLES DE MEDITRACK ===

ÉTABLISSEMENTS (${etablissements?.length || 0}) :
${etablissements?.map(e => `- ${e.nom} (${e.type}, ${e.ville || '—'}) — Formule: ${e.formule} — Statut: ${e.statut}`).join('\n') || 'Aucun'}

PARC MATÉRIEL (${equipements?.length || 0} équipements) :
${equipements?.map(e => `- [${(e.statut || 'inconnu').toUpperCase()}] ${e.designation} (Réf: ${e.reference || '—'} | N°Série: ${(e as any).numero_serie || '—'}) — Client: ${(e.etablissements as any)?.nom || 'Non affecté'} — Localisation: ${e.localisation || '—'} — Révision: ${e.date_revision || 'non définie'} — Commentaires: ${(e as any).commentaires || '—'}`).join('\n') || 'Aucun'}

MAINTENANCES (${maintenances?.length || 0}) :
${maintenances?.map(m => `- ${m.type === 'preventive' ? 'Préventive' : 'Curative'} [${m.statut}] pour ${(m.equipements as any)?.designation} (N°Série: ${(m.equipements as any)?.numero_serie || '—'}) (${(m.equipements as any)?.etablissements?.nom || '—'}) — Date: ${m.date_prevue ? new Date(m.date_prevue).toLocaleDateString('fr-FR') : 'non définie'} — Notes: ${m.notes || '—'}`).join('\n') || 'Aucune'}

PANNES RÉCENTES (${pannes?.length || 0}) :
${pannes?.map(p => `- [${p.statut}] ${(p.equipements as any)?.designation} (N°Série: ${(p.equipements as any)?.numero_serie || '—'}) (${(p.equipements as any)?.etablissements?.nom || '—'}) — ${new Date(p.created_at).toLocaleDateString('fr-FR')} — ${p.description}`).join('\n') || 'Aucune'}
`
    } else if (role === 'client' && etablissement_id) {
      const { data: etab } = await supabaseAdmin
        .from('etablissements')
        .select('nom, type, ville, formule')
        .eq('id', etablissement_id)
        .single()

      const { data: equipements } = await supabaseAdmin
        .from('equipements')
        .select('reference, designation, categorie, statut, localisation, date_revision, fabricant, modele, numero_serie, commentaires')
        .eq('etablissement_id', etablissement_id)
        .order('created_at')

      const { data: maintenances } = await supabaseAdmin
        .from('maintenances')
        .select('type, statut, date_prevue, notes, equipements!inner(reference, designation, numero_serie, etablissement_id)')
        .eq('equipements.etablissement_id', etablissement_id)
        .order('date_prevue', { ascending: true })
        .limit(10)

      const { data: pannes } = await supabaseAdmin
        .from('pannes')
        .select('description, statut, created_at, equipements!inner(reference, designation, numero_serie, etablissement_id)')
        .eq('equipements.etablissement_id', etablissement_id)
        .order('created_at', { ascending: false })
        .limit(5)

      contextData = `
=== DONNÉES DE VOTRE ÉTABLISSEMENT ===

ÉTABLISSEMENT : ${etab?.nom} (${etab?.type}, ${etab?.ville || '—'}) — Formule: ${etab?.formule}

VOTRE PARC (${equipements?.length || 0} équipements) :
${equipements?.map(e => `- [${(e.statut || 'inconnu').toUpperCase()}] ${e.designation} (Réf: ${e.reference || '—'} | N°Série: ${(e as any).numero_serie || '—'}) — Localisation: ${e.localisation || '—'} — Révision: ${e.date_revision || 'non définie'} — Commentaires: ${(e as any).commentaires || '—'}`).join('\n') || 'Aucun équipement'}

MAINTENANCES (${maintenances?.length || 0}) :
${maintenances?.map(m => `- ${m.type === 'preventive' ? 'Préventive' : 'Curative'} [${m.statut}] pour ${(m.equipements as any)?.designation} — Date: ${m.date_prevue ? new Date(m.date_prevue).toLocaleDateString('fr-FR') : 'non définie'} — Notes: ${m.notes || '—'}`).join('\n') || 'Aucune maintenance'}

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
      max_tokens: 1500,
      system: `Tu es l'assistant MediTrack, un expert en gestion de matériel médical à domicile (PSDM).
Tu aides les prestataires de santé et les établissements clients à gérer leur parc d'équipements médicaux.

${contextData ? `Tu as accès aux données réelles de MediTrack ci-dessous. Utilise-les pour répondre aux questions sur le parc, les maintenances, les pannes et les établissements.

${contextData}` : ''}

RÈGLES DE FORMATAGE :
- Réponds en français, de façon concise et professionnelle
- Utilise des listes à puces avec des tirets (-) pour les énumérations
- Utilise des emojis pour les statuts : ✅ En service, 🔴 Hors service, 🟠 Maintenance, 🔧 Préventive
- N'utilise JAMAIS de tableaux Markdown avec des |
- N'utilise pas de --- comme séparateurs
- Mets en gras les informations importantes avec **texte**
- Garde les réponses claires et lisibles
- Si une info n'est pas dans les données, dis-le clairement
- Tu ne fournis pas de conseils médicaux aux patients

RAPPORTS PAR ÉQUIPEMENT :
- Si on te demande un rapport sur un équipement (par n° de série, référence ou désignation), génère un rapport structuré avec : statut, localisation, établissement, fabricant, modèle, date de révision, maintenances associées, pannes en cours, commentaires
- Si on te demande tous les équipements d'un client ou établissement, liste-les avec statut, localisation et date de révision
- Si on te demande un rapport de conformité, base-toi sur les données disponibles : présence de localisation, date de révision, historique de maintenance, pannes résolues vs ouvertes`,
      messages
    })
  })

  const data = await response.json()
  return NextResponse.json(data)
}