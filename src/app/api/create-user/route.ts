import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email, etablissement_id, nom } = await request.json()

  if (!email || !etablissement_id) {
    return NextResponse.json({ error: 'Champs manquants' }, { status: 400 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Invite le user par email — il reçoit un lien pour créer son mot de passe
  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: 'https://www.meditrack-app.fr/login'
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

  return NextResponse.json({ success: true })
}