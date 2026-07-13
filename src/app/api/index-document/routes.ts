import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

async function extractTextFromPDF(url: string): Promise<string> {
  const response = await fetch(url)
  const buffer = await response.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')

  // Utilise Claude pour extraire le texte du PDF
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 }
          },
          {
            type: 'text',
            text: 'Extrait tout le texte de ce document de maniere structuree. Inclus tous les titres, paragraphes, tableaux et specifications techniques. Reponds uniquement avec le texte extrait, sans commentaire.'
          }
        ]
      }]
    })
  })
  const data = await res.json()
  return data.content?.[0]?.text || ''
}

function splitIntoChunks(text: string, chunkSize = 500): string[] {
  const words = text.split(/\s+/)
  const chunks: string[] = []
  let current: string[] = []

  for (const word of words) {
    current.push(word)
    if (current.length >= chunkSize) {
      chunks.push(current.join(' '))
      current = current.slice(-50) // overlap de 50 mots
    }
  }
  if (current.length > 0) chunks.push(current.join(' '))
  return chunks
}

async function generateEmbedding(text: string): Promise<number[]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text
    })
  })
  const data = await res.json()
  return data.data?.[0]?.embedding || []
}

export async function POST(request: Request) {
  const { document_id, equipement_id, url, nom } = await request.json()

  if (!document_id || !url) {
    return NextResponse.json({ success: false, error: 'Parametres manquants' }, { status: 400 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // 1. Extraire le texte du PDF
    console.log(`Extraction texte: ${nom}`)
    const texte = await extractTextFromPDF(url)

    if (!texte || texte.length < 50) {
      return NextResponse.json({ success: false, error: 'Impossible d extraire le texte du document' }, { status: 400 })
    }

    // 2. Découper en chunks
    const chunks = splitIntoChunks(texte, 400)
    console.log(`${chunks.length} chunks generes`)

    // 3. Supprimer les anciens chunks de ce document
    await supabaseAdmin.from('document_chunks').delete().eq('document_id', document_id)

    // 4. Générer embeddings et insérer
    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk)
      await supabaseAdmin.from('document_chunks').insert([{
        document_id,
        equipement_id,
        contenu: chunk,
        embedding
      }])
    }

    return NextResponse.json({ success: true, chunks: chunks.length })
  } catch (err: any) {
    console.error('Erreur indexation:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}