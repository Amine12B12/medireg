import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { messages } = await request.json()

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
Tu aides les prestataires de santé et les établissements clients à :
- Gérer leur parc d'équipements médicaux
- Comprendre les obligations réglementaires (traçabilité, maintenance, conformité)
- Préparer les contrôles et audits
- Optimiser la maintenance préventive
- Rédiger des procédures de traçabilité

Tu réponds en français, de façon concise et professionnelle.
Tu ne fournis pas de conseils médicaux aux patients.`,
      messages
    })
  })

  const data = await response.json()
  return NextResponse.json(data)
}