import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { etablissement_id } = await request.json()

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Trouve le user lié à cet établissement
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('etablissement_id', etablissement_id)

  // Supprime les users Auth
  for (const profile of profiles || []) {
    await supabaseAdmin.auth.admin.deleteUser(profile.id)
  }

  // Supprime les profils et l'établissement
  await supabaseAdmin.from('profiles').delete().eq('etablissement_id', etablissement_id)
  await supabaseAdmin.from('etablissements').delete().eq('id', etablissement_id)

  return NextResponse.json({ success: true })
}