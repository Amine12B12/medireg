import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email, password, etablissement_id, nom } = await request.json()

  if (!email || !password || !etablissement_id) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Crée le user dans Supabase Auth
  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 400 })
  }

  // Crée le profil
  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert([{
      id: userData.user.id,
      role: 'client',
      nom: nom || email,
      etablissement_id
    }])

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true, user: userData.user })
}