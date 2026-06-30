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
=== DONNEES REELLES DE MEDITRACK ===

ETABLISSEMENTS (${etablissements?.length || 0}) :
${etablissements?.map(e => `- ${e.nom} (${e.type}, ${e.ville || '-'}) - Formule: ${e.formule} - Statut: ${e.statut}`).join('\n') || 'Aucun'}

PARC MATERIEL (${equipements?.length || 0} equipements) :
${equipements?.map(e => `- [${(e.statut || 'inconnu').toUpperCase()}] ${e.designation} (ID: ${e.id} | Ref: ${e.reference || '-'} | N Serie: ${(e as any).numero_serie || '-'}) - Client: ${(e.etablissements as any)?.nom || 'Non affecte'} - Localisation: ${e.localisation || '-'} - Service: ${(e as any).service || '-'} - Etage: ${(e as any).etage || '-'} - Responsable: ${(e as any).responsable_referent || '-'} - Revision: ${e.date_revision || 'non definie'} - Commentaires: ${(e as any).commentaires || '-'}`).join('\n') || 'Aucun'}

MAINTENANCES (${maintenances?.length || 0}) :
${maintenances?.map(m => `- ${m.type === 'preventive' ? 'Preventive' : 'Curative'} [${m.statut}] pour ${(m.equipements as any)?.designation} (${(m.equipements as any)?.etablissements?.nom || '-'}) - Date: ${m.date_prevue ? new Date(m.date_prevue).toLocaleDateString('fr-FR') : 'non definie'} - Notes: ${m.notes || '-'}`).join('\n') || 'Aucune'}

PANNES RECENTES (${pannes?.length || 0}) :
${pannes?.map(p => `- [${p.statut}] ${(p.equipements as any)?.designation} (${(p.equipements as any)?.etablissements?.nom || '-'}) - ${new Date(p.created_at).toLocaleDateString('fr-FR')} - ${p.description}`).join('\n') || 'Aucune'}
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
=== DONNEES DE VOTRE ETABLISSEMENT ===

ETABLISSEMENT : ${etab?.nom} (${etab?.type}, ${etab?.ville || '-'}) - Formule: ${etab?.formule}

VOTRE PARC (${equipements?.length || 0} equipements) :
${equipements?.map(e => `- [${(e.statut || 'inconnu').toUpperCase()}] ${e.designation} (Ref: ${e.reference || '-'} | N Serie: ${(e as any).numero_serie || '-'}) - Localisation: ${e.localisation || '-'} - Revision: ${e.date_revision || 'non definie'} - Commentaires: ${(e as any).commentaires || '-'}`).join('\n') || 'Aucun equipement'}

MAINTENANCES (${maintenances?.length || 0}) :
${maintenances?.map(m => `- ${m.type === 'preventive' ? 'Preventive' : 'Curative'} [${m.statut}] pour ${(m.equipements as any)?.designation} - Date: ${m.date_prevue ? new Date(m.date_prevue).toLocaleDateString('fr-FR') : 'non definie'} - Notes: ${m.notes || '-'}`).join('\n') || 'Aucune maintenance'}

PANNES RECENTES (${pannes?.length || 0}) :
${pannes?.map(p => `- [${p.statut}] ${(p.equipements as any)?.designation} - ${new Date(p.created_at).toLocaleDateString('fr-FR')} - ${p.description}`).join('\n') || 'Aucune panne'}
`
    }
  } catch (err) {
    console.error('Erreur chargement donnees:', err)
  }

  const systemPrompt = `Tu es l assistant MediTrack, un expert en gestion de materiel medical a domicile (PSDM) et en reglementation des dispositifs medicaux en France.

${contextData ? `Tu as acces aux donnees reelles de MediTrack ci-dessous. Utilise-les pour repondre aux questions sur le parc, les maintenances, les pannes et les etablissements.

${contextData}` : ''}

RECHERCHE WEB :
Tu as acces a un outil de recherche web. Utilise-le systematiquement pour toute question concernant :
- La reglementation des dispositifs medicaux (ANSM ansm.sante.fr, HAS has-sante.fr, Legifrance legifrance.gouv.fr, ARS, CPAM/Ameli)
- Les fabricants (Invacare, Winncare, Sunrise Medical, Vermeiren, Arjo, Hartmann, Systam, ResMed) : fiches techniques, notices, nouveautes produits
- Toute information que tu ne trouves pas dans les donnees MediTrack ci-dessus

REGLES DE FORMATAGE :
- Reponds en francais, de facon concise et professionnelle
- Utilise des listes a puces avec des tirets (-) pour les enumerations
- Mets en gras les informations importantes avec **texte**
- N utilise JAMAIS de tableaux Markdown avec des |
- Cite la source quand tu utilises la recherche web
- Tu ne fournis pas de conseils medicaux aux patients

RAPPORTS PAR EQUIPEMENT :
- Si on te demande un rapport sur un equipement, genere un rapport structure avec : statut, localisation, etablissement, fabricant, modele, date de revision, maintenances, pannes, commentaires

MODIFICATIONS DIRECTES (admin uniquement) :
- Si l utilisateur demande de modifier un equipement (changer localisation, statut, commentaires, date revision, responsable, service, etage), identifie l equipement exact dans les donnees grace a son ID et genere une action JSON dans ce format EXACT a la fin de ta reponse :
\`\`\`action
{"type":"update_equipement","equipement_id":"UUID_ICI","field":"localisation","old_value":"Chambre 12","new_value":"Chambre 23","description":"Deplacement du Lit medicalise de Chambre 12 vers Chambre 23"}
\`\`\`
- Ne genere l action QUE si tu as trouve l equipement exact dans les donnees
- Champs modifiables : localisation, statut, commentaires, date_revision, responsable_referent, service, etage
- Valeurs de statut valides : en_service, maintenance, hors_service, en_preparation
- Ne propose JAMAIS de supprimer quoi que ce soit`

  async function callClaude(msgs: any[]) {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        system: systemPrompt,
        messages: msgs
      })
    })
    return r.json()
  }

  let data = await callClaude(messages)

  if (!data.content) {
    console.error('Erreur API Anthropic:', JSON.stringify(data))
    return NextResponse.json({
      content: [{ type: 'text', text: 'Erreur de connexion a l IA. ' + (data.error?.message || 'Verifiez la cle API et le credit disponible.') }]
    })
  }

  // Boucle pour gerer les appels d'outils (web_search) — Claude peut faire plusieurs recherches
  let workingMessages = [...messages]
  let safety = 0
  while (data.stop_reason === 'tool_use' && safety < 5) {
    safety++
    workingMessages = [...workingMessages, { role: 'assistant', content: data.content }]

    // Le web_search server-side gere ses propres resultats automatiquement,
    // mais si le modele attend un tool_result on le relance simplement
    const toolUseBlocks = data.content.filter((c: any) => c.type === 'tool_use')
    if (toolUseBlocks.length === 0) break

    data = await callClaude(workingMessages)
  }

  const textContent = data.content
    ?.filter((c: any) => c.type === 'text')
    ?.map((c: any) => c.text)
    ?.join('\n') || 'Desole, je n ai pas pu generer une reponse.'

  return NextResponse.json({
    ...data,
    content: [{ type: 'text', text: textContent }]
  })
}