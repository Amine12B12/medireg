import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const RESEND_API_KEY = process.env.RESEND_API_KEY!
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://medireg-wcnk.vercel.app'

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pwd = ''
  for (let i = 0; i < 12; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return pwd
}

async function sendInvitationEmail(email: string, nom: string, password: string) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="margin:0;padding:0;background:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
      <div style="max-width:520px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        
        <div style="background:linear-gradient(135deg,#7C3AED,#1A56DB);padding:28px 36px;text-align:center;">
          <div style="font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.5px;">MediReg</div>
          <div style="color:rgba(255,255,255,0.75);font-size:13px;margin-top:4px;">Certification HAS PSDM</div>
        </div>

        <div style="padding:36px;">
          <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#111827;">Bienvenue sur MediReg</h2>
          <p style="margin:0 0 24px;font-size:14px;color:#6B7280;line-height:1.6;">
            Votre espace de certification HAS a été créé pour <strong style="color:#111827;">${nom}</strong>.
            Voici vos identifiants de connexion :
          </p>

          <div style="background:#F8FAFF;border:1px solid #E0E7FF;border-radius:12px;padding:20px;margin:0 0 24px;">
            <div style="margin-bottom:12px;">
              <div style="font-size:11px;font-weight:600;color:#6366F1;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Email</div>
              <div style="font-size:15px;font-weight:600;color:#111827;">${email}</div>
            </div>
            <div>
              <div style="font-size:11px;font-weight:600;color:#6366F1;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Mot de passe temporaire</div>
              <div style="font-size:18px;font-weight:700;color:#111827;letter-spacing:2px;font-family:monospace;">${password}</div>
            </div>
          </div>

          <div style="text-align:center;margin:28px 0;">
            <a href="${APP_URL}/login"
               style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7C3AED,#1A56DB);color:#fff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:600;">
              Accéder à mon espace →
            </a>
          </div>

          <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:12px 16px;font-size:12px;color:#92400E;">
            <strong>Important</strong> — Nous vous recommandons de changer ce mot de passe temporaire dès votre première connexion depuis votre profil.
          </div>
        </div>

        <div style="padding:16px 36px;background:#F9FAFB;border-top:1px solid #F3F4F6;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">MediReg · Certification HAS PSDM</p>
        </div>
      </div>
    </body>
    </html>
  `

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + RESEND_API_KEY,
    },
    body: JSON.stringify({
      from: 'MediReg <noreply@medireg.pro>',
      to: [email],
      subject: 'Vos accès MediReg — Certification HAS PSDM',
      html,
    })
  })

  const body = await res.json()
  console.log('Resend status:', res.status, JSON.stringify(body))
  return res.ok
}

export async function POST(req: NextRequest) {
  try {
    const { nom, email, forfait } = await req.json()
    if (!nom || !email) return NextResponse.json({ error: 'Nom et email requis' }, { status: 400 })

    // Generer mot de passe temporaire
    const tempPassword = generatePassword()

    // 1. Créer le client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert([{ nom, contact_email: email, forfait: forfait || 'starter', forfait_actif: true, statut: 'actif' }])
      .select()
      .single()

    if (clientError) return NextResponse.json({ error: clientError.message }, { status: 500 })

    // 2. Créer le compte auth avec mot de passe temporaire
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { nom, client_id: client.id }
    })

    if (authError && !authError.message?.includes('already')) {
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    const userId = authData?.user?.id
    if (userId) {
      // 3. Créer le profil
      await supabase.from('profiles').upsert([{
        id: userId, email, nom, role: 'admin', client_id: client.id
      }])
    }

    // 4. Envoyer l'email avec les identifiants
    await sendInvitationEmail(email, nom, tempPassword)

    return NextResponse.json({ success: true, client_id: client.id })

  } catch (error: any) {
    console.log('Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}