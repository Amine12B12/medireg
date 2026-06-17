import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { type, data } = await request.json()

  // On génère le HTML et on le renvoie — le client génère le PDF
  return NextResponse.json({ success: true, data })
}