import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const RESEND_API_KEY = process.env.RESEND_API_KEY!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://medireg-wcnk.vercel.app'

async function sendInvitationEmail(email: string, nom: string, inviteLink: string) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <div style="max-width:560px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <div style="background:linear-gradient(135deg,#7C3AED,#1A56DB);padding:32px 40px;text-align:center;">
          <span style="color:#fff;font-size:22px;font-weight:700;">MediReg</span>
          <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">Plateforme de certification HAS PSDM</p>
        </div>
        <div style="padding:40px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Bienvenue sur MediReg</h1>
          <p style="margin:0 0 24px;font-size:15px;color:#6B7280;line-height:1.6;">
            Votre espace de certification HAS a été créé pour <strong style="color:#111827;">${nom}</strong>. 
            Cliquez sur le bouton ci-dessous pour créer votre mot de passe.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${inviteLink}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7C3AED,#1A56DB);color:#fff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:600;">
              Créer mon mot de passe →
            </a>
          </div>
          <p style="margin:24px 0 0;font-size:12px;color:#9CA3AF;line-height:1.6;">
            Ce lien est valable 24 heures. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
          </p>
        </div>
        <div style="padding:20px 40px;background:#F9FAFB;border-top:1px solid #F3F4F6;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">MediReg · Certification HAS PSDM</p>
        </div>
      </div>
    </body>
    </html>
  `

  console.log('Sending email to:', email)
  console.log('RESEND_API_KEY present:', !!RESEND_API_KEY)

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + RESEND_API_KEY,
    },
    body: JSON.stringify({
      from: 'MediReg <noreply@medireg.pro>',
      to: [email],
      subject: 'Votre accès MediReg — Certification HAS PSDM',
      html,
    })
  })

  const resBody = await res.json()
  console.log('Resend response status:', res.status)
  console.log('Resend response body:', JSON.stringify(resBody))

  return res.ok
}

export async function POST(req: NextRequest) {
  try {
    const { nom, email, forfait } = await req.json()
    console.log('create-client called with:', { nom, email, forfait })

    if (!nom || !email) return NextResponse.json({ error: 'Nom et email requis' }, { status: 400 })

    // 1. Créer le client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert([{ nom, contact_email: email, forfait: forfait || 'starter', forfait_actif: true, statut: 'actif' }])
      .select()
      .single()

    if (clientError) {
      console.log('Client insert error:', clientError.message)
      return NextResponse.json({ error: clientError.message }, { status: 500 })
    }

    console.log('Client created:', client.id)

    // 2. Créer le compte auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { nom, client_id: client.id }
    })

    console.log('Auth createUser error:', authError?.message || 'none')
    console.log('Auth user id:', authData?.user?.id || 'none')

    if (authError && !authError.message?.includes('already')) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    const userId = authData?.user?.id

    if (userId) {
      // 3. Créer le profil
      await supabase.from('profiles').upsert([{
        id: userId, email, nom, role: 'admin', client_id: client.id
      }])

      // 4. Générer le lien
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: { redirectTo: APP_URL + '/auth/reset-password' }
      })

      console.log('generateLink error:', linkError?.message || 'none')
      console.log('action_link:', linkData?.properties?.action_link || 'none')

      if (!linkError && linkData?.properties?.action_link) {
        const sent = await sendInvitationEmail(email, nom, linkData.properties.action_link)
        console.log('email sent:', sent)
      }
    }

    return NextResponse.json({ success: true, client_id: client.id })

  } catch (error: any) {
    console.log('Unexpected error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}