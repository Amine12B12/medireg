import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
  const { query, equipement_id, limit = 5 } = await request.json()

  if (!query) {
    return NextResponse.json({ success: false, error: 'Query manquante' }, { status: 400 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Génère l'embedding de la question
    const embedding = await generateEmbedding(query)

    // Recherche les chunks les plus proches
    const { data: chunks, error } = await supabaseAdmin.rpc('search_document_chunks', {
      query_embedding: embedding,
      match_equipement_id: equipement_id || null,
      match_count: limit
    })

    if (error) {
      console.error('Erreur recherche chunks:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, chunks: chunks || [] })
  } catch (err: any) {
    console.error('Erreur search-documents:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}