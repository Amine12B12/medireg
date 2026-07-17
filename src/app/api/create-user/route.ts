import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email, client_id, nom, role } = await request.json()

  if (!email) {
    return NextResponse.json({ error: 'Email manquant' }, { status: 400 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: 'https://medireg1.vercel.app/set-password'
  })

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 400 })
  }

  const { error: profileError } = await supabaseAdmin
    .from('profiles')
    .insert([{
      id: userData.user.id,
      role: role || 'client',
      nom: nom || email,
      email,
      client_id: client_id || null
    }])

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}