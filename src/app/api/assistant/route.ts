import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  const { messages } = await request.json()

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Recuperer le user et son contexte
  let contextData = ''
  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader) {
      const supabaseUser = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { global: { headers: { authorization: authHeader } } }
      )
      const { data: { user } } = await supabaseUser.auth.getUser()
      if (user) {
        const { data: prof } = await supabaseAdmin.from('profiles').select('role, client_id').eq('id', user.id).single()

        if (prof?.role === 'consultant') {
          const { data: clients } = await supabaseAdmin.from('clients').select('nom, type, ville, pays, statut').order('nom').limit(50)
          const { data: audits } = await supabaseAdmin.from('audits').select('titre, statut, score, clients(nom), referentiels(nom)').order('created_at', { ascending: false }).limit(20)
          const { data: ncs } = await supabaseAdmin.from('non_conformites').select('titre, niveau, statut, clients(nom)').eq('statut', 'ouverte').limit(20)

          contextData = `
=== DONNEES MEDIREG — CONSULTANT ===

CLIENTS (${clients?.length || 0}) :
${clients?.map(c => `- ${c.nom} (${c.type}, ${c.ville || '-'}, ${c.pays}) - Statut: ${c.statut}`).join('\n') || 'Aucun'}

AUDITS RECENTS (${audits?.length || 0}) :
${audits?.map(a => `- ${a.titre} | Client: ${(a.clients as any)?.nom || '-'} | Referentiel: ${(a.referentiels as any)?.nom || '-'} | Statut: ${a.statut} | Score: ${a.score !== null ? a.score + '%' : 'non evalue'}`).join('\n') || 'Aucun'}

NON-CONFORMITES OUVERTES (${ncs?.length || 0}) :
${ncs?.map(n => `- [${n.niveau?.toUpperCase()}] ${n.titre} | Client: ${(n.clients as any)?.nom || '-'}`).join('\n') || 'Aucune'}
`
        } else if (prof?.client_id) {
          const { data: client } = await supabaseAdmin.from('clients').select('nom, type, ville').eq('id', prof.client_id).single()
          const { data: audits } = await supabaseAdmin.from('audits').select('titre, statut, score, referentiels(nom)').eq('client_id', prof.client_id).order('created_at', { ascending: false }).limit(5)
          const { data: taches } = await supabaseAdmin.from('taches').select('titre, priorite, statut, echeance').eq('client_id', prof.client_id).neq('statut', 'termine').limit(10)
          const { data: ncs } = await supabaseAdmin.from('non_conformites').select('titre, niveau, statut').eq('client_id', prof.client_id).eq('statut', 'ouverte').limit(10)

          contextData = `
=== DONNEES MEDIREG — ${client?.nom?.toUpperCase() || 'ETABLISSEMENT'} ===

ETABLISSEMENT : ${client?.nom} (${client?.type}, ${client?.ville || '-'})

AUDITS (${audits?.length || 0}) :
${audits?.map(a => `- ${a.titre} | Referentiel: ${(a.referentiels as any)?.nom || '-'} | Statut: ${a.statut} | Score: ${a.score !== null ? a.score + '%' : 'non evalue'}`).join('\n') || 'Aucun audit'}

TACHES EN COURS (${taches?.length || 0}) :
${taches?.map(t => `- [${t.priorite?.toUpperCase()}] ${t.titre} | Statut: ${t.statut} | Echeance: ${t.echeance ? new Date(t.echeance).toLocaleDateString('fr-FR') : '-'}`).join('\n') || 'Aucune tache'}

NON-CONFORMITES OUVERTES (${ncs?.length || 0}) :
${ncs?.map(n => `- [${n.niveau?.toUpperCase()}] ${n.titre}`).join('\n') || 'Aucune'}
`
        }
      }
    }
  } catch (err) {
    console.error('Erreur contexte:', err)
  }

  const systemPrompt = `Tu es l assistant IA de MediReg, expert en conformite reglementaire dans le secteur de la sante.

Tu maitrises parfaitement :
- La certification HAS (Haute Autorite de Sante) — V2020 et suivantes
- Les obligations ANSM (Agence Nationale de Securite du Medicament)
- Les normes ISO applicables a la sante (ISO 9001, ISO 15189, ISO 22000...)
- Les referentiels marocains (Ministere de la Sante du Maroc, HAS Maroc)
- La reglementation COFRAC et les exigences d accreditation
- Les exigences ARS (Agence Regionale de Sante)
- La gestion documentaire reglementaire (procedures, protocoles, enregistrements)
- La preparation aux audits et certifications
- La gestion des non-conformites et plans d actions correctifs

${contextData ? `Tu as acces aux donnees reelles de cet etablissement dans MediReg :
${contextData}

Utilise ces donnees pour contextualiser tes reponses.` : ''}

TES CAPACITES :
- Interpreter et expliquer les referentiels reglementaires
- Generer des procedures, check-lists, plans d actions
- Aider a preparer un audit de certification
- Identifier les risques de non-conformite
- Proposer des actions correctives et preventives
- Rechercher les textes reglementaires sur le web
- Traduire les exigences reglementaires en actions concretes

REGLES DE FORMATAGE :
- Reponds en francais, de facon professionnelle et structuree
- Utilise des listes avec des tirets (-) pour les enumerations
- Mets en gras les points importants avec **texte**
- Structure tes reponses avec des titres clairs
- Sois concis mais complet
- Cite tes sources reglementaires (article, critere, norme)
- N utilise PAS de tableaux Markdown

GENERATION DE DOCUMENTS :
Si on te demande de generer une procedure, une checklist ou un plan d actions, fournis un document complet et directement utilisable, structure et professionnel.`

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
      content: [{ type: 'text', text: 'Erreur de connexion a l IA. ' + (data.error?.message || 'Verifiez la cle API.') }]
    })
  }

  let workingMessages = [...messages]
  let safety = 0
  while (data.stop_reason === 'tool_use' && safety < 5) {
    safety++
    workingMessages = [...workingMessages, { role: 'assistant', content: data.content }]
    const toolUseBlocks = data.content.filter((c: any) => c.type === 'tool_use')
    if (toolUseBlocks.length === 0) break
    const toolResults = toolUseBlocks.map((block: any) => ({
      type: 'tool_result',
      tool_use_id: block.id,
      content: 'Recherche effectuee.'
    }))
    workingMessages = [...workingMessages, { role: 'user', content: toolResults }]
    data = await callClaude(workingMessages)
  }

  const textContent = data.content
    ?.filter((c: any) => c.type === 'text')
    ?.map((c: any) => c.text)
    ?.join('\n') || 'Desolee, je n ai pas pu generer une reponse.'

  return NextResponse.json({
    content: [{ type: 'text', text: textContent }]
  })
}