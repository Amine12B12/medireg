import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://bhqsaajduogwebaovxsd.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJocXNhYWpkdW9nd2ViYW92eHNkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDI3NDYwNywiZXhwIjoyMDk5ODUwNjA3fQ.TplgTHfJp1GGqgTXtH6y1A4pII-vPGZ1XviP0au-9gg'
)

const meditrackSupabase = createClient(
  'https://nkfivuqomqubhpsvgdfm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZml2dXFvbXF1Ymhwc3ZnZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDg1Mjc5NCwiZXhwIjoyMDk2NDI4Nzk0fQ.d9MRLh_1p7HDZccijNZzUwMLEaKJ0GBNWI8oX6YWIMk'
)

const RESEND_API_KEY = process.env.RESEND_API_KEY!
const APP_URL = 'https://medireg.pro'

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
            Votre espace de certification HAS a ete cree pour <strong style="color:#111827;">${nom}</strong>.
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
              Acceder a mon espace
            </a>
          </div>
          <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:8px;padding:12px 16px;font-size:12px;color:#92400E;">
            <strong>Important</strong> — Changez ce mot de passe temporaire des votre premiere connexion.
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
      subject: 'Vos acces MediReg — Certification HAS PSDM',
      html,
    })
  })

  const data = await res.json()
  console.log('Resend status:', res.status, JSON.stringify(data))
  return res.ok
}

export async function POST(req: NextRequest) {
  try {
    const { nom, email, forfait, ville, adresse } = await req.json()
    if (!nom || !email) return NextResponse.json({ error: 'Nom et email requis' }, { status: 400 })

    const tempPassword = generatePassword()

    // 1. Créer le client MediReg
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert([{ nom, contact_email: email, forfait: forfait || 'starter', forfait_actif: true, statut: 'actif' }])
      .select()
      .single()

    if (clientError) {
      console.error('Client error:', clientError.message)
      return NextResponse.json({ error: clientError.message }, { status: 500 })
    }

    // 2. Créer le compte auth MediReg
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { nom, client_id: client.id }
    })

    if (authError && !authError.message?.includes('already')) {
      console.error('Auth error:', authError.message)
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    const userId = authData?.user?.id
    if (userId) {
      await supabase.from('profiles').upsert([{
        id: userId, email, nom, role: 'client', client_id: client.id
      }])
    }

    // 3. Envoyer l'email
    await sendInvitationEmail(email, nom, tempPassword)

    // 4. Créer l'établissement MediTrack
    console.log('Creating MediTrack etablissement for:', nom, email)
    const { data: meditrackEtab, error: meditrackError } = await meditrackSupabase
      .from('etablissements')
      .insert([{
        nom,
        type: 'PSDM',
        adresse: adresse || '',
        ville: ville || '',
        contact_nom: nom,
        contact_email: email,
        statut: 'actif',
        formule: forfait || 'standard'
      }])
      .select('id')
      .single()

    console.log('MediTrack result:', meditrackEtab, 'error:', meditrackError?.message)

    if (meditrackEtab?.id) {
      await supabase
        .from('clients')
        .update({ meditrack_etablissement_id: meditrackEtab.id })
        .eq('id', client.id)
      console.log('MediTrack link saved:', meditrackEtab.id)

        // Créer le compte auth MediTrack avec le même email et mot de passe
        try {
          const { data: meditrackUser, error: authErr } = await meditrackSupabase.auth.admin.createUser({
            email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { nom, etablissement_id: meditrackEtab.id }
          })
          console.log('MediTrack auth user:', meditrackUser?.user?.id, 'error:', authErr?.message)

          if (meditrackUser?.user?.id) {
            await meditrackSupabase.from('profiles').insert([{
              id: meditrackUser.user.id,
              nom,
              role: 'client',
              etablissement_id: meditrackEtab.id
            }])
          }
        } catch (authErr: any) {
          console.error('MediTrack auth error:', authErr.message)
        }
    }

    return NextResponse.json({ success: true, client_id: client.id })

  } catch (error: any) {
    console.error('Error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}