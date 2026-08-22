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
        
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#7C3AED,#1A56DB);padding:32px 40px;text-align:center;">
          <div style="display:inline-flex;align-items:center;gap:10px;">
            <div style="width:40px;height:40px;background:rgba(255,255,255,0.2);border-radius:10px;display:inline-flex;align-items:center;justify-content:center;">
              <span style="color:#fff;font-size:20px;">✦</span>
            </div>
            <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">MediReg</span>
          </div>
          <p style="color:rgba(255,255,255,0.8);margin:12px 0 0;font-size:14px;">Plateforme de certification HAS PSDM</p>
        </div>

        <!-- Body -->
        <div style="padding:40px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.3px;">
            Bienvenue sur MediReg
          </h1>
          <p style="margin:0 0 24px;font-size:15px;color:#6B7280;line-height:1.6;">
            Votre espace de certification HAS a été créé pour <strong style="color:#111827;">${nom}</strong>. 
            Cliquez sur le bouton ci-dessous pour créer votre mot de passe et accéder à votre tableau de bord.
          </p>

          <div style="text-align:center;margin:32px 0;">
            <a href="${inviteLink}" 
               style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7C3AED,#1A56DB);color:#fff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:600;letter-spacing:-0.2px;box-shadow:0 4px 12px rgba(26,86,219,0.3);">
              Créer mon mot de passe →
            </a>
          </div>

          <div style="background:#F8FAFF;border:1px solid #E0E7FF;border-radius:10px;padding:20px;margin:24px 0;">
            <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#4F46E5;text-transform:uppercase;letter-spacing:0.5px;">Ce que vous allez trouver</p>
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${[
                'Vos 60 critères HAS guidés étape par étape',
                'Génération automatique de vos documents de certification',
                'Assistant IA expert en réglementation PSDM',
                'Suivi de votre score de certification en temps réel',
              ].map(item => `
                <div style="display:flex;align-items:center;gap:10px;font-size:13px;color:#374151;">
                  <span style="color:#10B981;font-weight:700;">✓</span> ${item}
                </div>
              `).join('')}
            </div>
          </div>

          <p style="margin:24px 0 0;font-size:12px;color:#9CA3AF;line-height:1.6;">
            Ce lien est valable 24 heures. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.<br>
            Des questions ? Répondez directement à cet email.
          </p>
        </div>

        <!-- Footer -->
        <div style="padding:20px 40px;background:#F9FAFB;border-top:1px solid #F3F4F6;text-align:center;">
          <p style="margin:0;font-size:12px;color:#9CA3AF;">
            MediReg · Certification HAS PSDM · <a href="${APP_URL}" style="color:#6366F1;text-decoration:none;">medireg-wcnk.vercel.app</a>
          </p>
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
      subject: 'Votre accès MediReg — Certification HAS PSDM',
      html,
    })
  })

  return res.ok
}

export async function POST(req: NextRequest) {
  try {
    const { nom, email, forfait } = await req.json()
    if (!nom || !email) return NextResponse.json({ error: 'Nom et email requis' }, { status: 400 })

    // 1. Créer le client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert([{ nom, contact_email: email, forfait: forfait || 'starter', forfait_actif: true, statut: 'actif' }])
      .select()
      .single()

    if (clientError) return NextResponse.json({ error: clientError.message }, { status: 500 })

    // 2. Créer le compte auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
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
        id: userId,
        email,
        nom,
        role: 'admin',
        client_id: client.id
      }])

      // 4. Générer le lien d'invitation (création de mot de passe)
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
          redirectTo: APP_URL + '/dashboard'
        }
      })

      if (!linkError && linkData?.properties?.action_link) {
        // 5. Envoyer l'email via Resend
        await sendInvitationEmail(email, nom, linkData.properties.action_link)
      }
    }

    return NextResponse.json({ success: true, client_id: client.id })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}