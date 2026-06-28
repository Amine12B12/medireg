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
        .select('id, reference, designation, categorie, statut, localisation, date_revision, fabricant, modele, numero_serie, commentaires, responsable_referent, service, etage, etablissements(nom)')
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
${equipements?.map(e => `- [${(e.statut || 'inconnu').toUpperCase()}] ${e.designation} (ID: ${e.id} | Réf: ${e.reference || '—'} | N°Série: ${(e as any).numero_serie || '—'}) — Client: ${(e.etablissements as any)?.nom || 'Non affecté'} — Localisation: ${e.localisation || '—'} — Service: ${(e as any).service || '—'} — Étage: ${(e as any).etage || '—'} — Responsable: ${(e as any).responsable_referent || '—'} — Révision: ${e.date_revision || 'non définie'} — Commentaires: ${(e as any).commentaires || '—'}`).join('\n') || 'Aucun'}

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
        .select('id, reference, designation, categorie, statut, localisation, date_revision, fabricant, modele, numero_serie, commentaires')
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
      max_tokens: 2000,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search'
        }
      ],
      system: `Tu es l'assistant MediTrack, un expert en gestion de matériel médical à domicile (PSDM) et en réglementation des dispositifs médicaux en France.

${contextData ? `Tu as accès aux données réelles de MediTrack ci-dessous. Utilise-les pour répondre aux questions sur le parc, les maintenances, les pannes et les établissements.

${contextData}` : ''}

SOURCES RÉGLEMENTAIRES — utilise la recherche web pour consulter :
- ANSM (ansm.sante.fr) → autorisation, surveillance, matériovigilance, rappels de dispositifs médicaux
- HAS (has-sante.fr) → recommandations, évaluations, bonnes pratiques
- Légifrance (legifrance.gouv.fr) → textes de loi, décrets, arrêtés sur les dispositifs médicaux
- ARS → obligations locales et régionales
- LNE/G-MED → certification et marquage CE des dispositifs médicaux
- CPAM / Ameli → remboursement et conventionnement PSDM

SITES FABRICANTS — utilise la recherche web pour consulter :
- Invacare (invacare.fr) → lits médicalisés, fauteuils roulants
- Winncare (winncare.com) → lits, matelas, équipements de nursing
- Sunrise Medical (sunrisemedical.fr) → fauteuils roulants Quickie
- Vermeiren (vermeiren.com) → fauteuils roulants, déambulateurs
- Arjo (arjo.com) → lève-personnes, équipements de mobilisation
- Hartmann (hartmann.fr) → pansements, équipements médicaux
- Systam (systam.com) → matelas anti-escarre
- ResMed (resmed.fr) → ventilateurs, PPC, apnée du sommeil

RÈGLES DE FORMATAGE :
- Réponds en français, de façon concise et professionnelle
- Utilise des listes à puces avec des tirets (-) pour les énumérations
- Utilise des emojis pour les statuts : ✅ En service, 🔴 Hors service, 🟠 Maintenance, 🔧 Préventive
- N'utilise JAMAIS de tableaux Markdown avec des |
- N'utilise pas de --- comme séparateurs
- Mets en gras les informations importantes avec **texte**
- Garde les réponses claires et lisibles
- Si une info n'est pas dans les données MediTrack, utilise la recherche web
- Tu ne fournis pas de conseils médicaux aux patients
- Cite toujours la source quand tu utilises la recherche web

RAPPORTS PAR ÉQUIPEMENT :
- Si on te demande un rapport sur un équipement (par n° de série, référence ou désignation), génère un rapport structuré avec : statut, localisation, établissement, fabricant, modèle, date de révision, maintenances associées, pannes en cours, commentaires
- Si on te demande tous les équipements d'un client ou établissement, liste-les avec statut, localisation et date de révision
- Si on te demande un rapport de conformité, base-toi sur les données disponibles

RÉGLEMENTATION :
- Pour toute question réglementaire (matériovigilance, marquage CE, obligations PSDM, remboursement), utilise la recherche web sur les sources officielles
- Pour les fiches techniques ou notices d'un fabricant, recherche sur le site du fabricant correspondant

MODIFICATIONS DIRECTES (admin uniquement) :
- Si l'utilisateur demande de modifier un équipement (changer localisation, statut, commentaires, date révision, responsable, service, étage), identifie l'équipement exact dans les données grâce à son ID et génère une action JSON dans ce format EXACT à la fin de ta réponse :
\`\`\`action
{"type":"update_equipement","equipement_id":"UUID_ICI","field":"localisation","old_value":"Chambre 12","new_value":"Chambre 23","description":"Déplacement du Lit médicalisé de Chambre 12 vers Chambre 23"}
\`\`\`
- Ne génère l'action QUE si tu as trouvé l'équipement exact dans les données (tu as l'ID dans le contexte)
- Champs modifiables : localisation, statut, commentaires, date_revision, responsable_referent, service, etage
- Valeurs de statut valides : en_service, maintenance, hors_service, en_preparation
- Ne propose JAMAIS de supprimer quoi que ce soit — explique comment faire manuellement dans l'interface si demandé`,
      messages
    })
  })

  const data = await response.json()

  const textContent = data.content
    ?.filter((c: any) => c.type === 'text')
    ?.map((c: any) => c.text)
    ?.join('\n') || 'Désolé, je n\'ai pas pu générer une réponse.'

  return NextResponse.json({
    ...data,
    content: [{ type: 'text', text: textContent }]
  })
}