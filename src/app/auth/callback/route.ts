import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/dashboard'

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://medireg-wcnk.vercel.app'

  // Si c'est un recovery, rediriger vers reset-password avec les params
  if (type === 'recovery' && token_hash) {
    return NextResponse.redirect(
      `${APP_URL}/reset-password?token_hash=${token_hash}&type=${type}`
    )
  }

  // Sinon rediriger vers dashboard
  return NextResponse.redirect(`${APP_URL}${next}`)
}