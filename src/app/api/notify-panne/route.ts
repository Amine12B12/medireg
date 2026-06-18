import { NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: Request) {
  const { equipement, localisation, etablissement, description, contact_email } = await request.json()

  try {
    await resend.emails.send({
      from: 'MediTrack <alertes@meditrack-app.fr>',
      to: ['hassanfirdaouss@yahoo.com'],
      subject: `🚨 Panne signalée — ${equipement}`,
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #F7F7F5;">
          <div style="background: #fff; border-radius: 12px; border: 1px solid #e5e5e5; overflow: hidden;">
            
            <div style="background: #C2362A; padding: 20px 24px;">
              <div style="font-size: 18px; font-weight: 600; color: #fff;">🚨 Panne signalée</div>
              <div style="font-size: 13px; color: rgba(255,255,255,0.8); margin-top: 4px;">MediTrack — Alerte équipement</div>
            </div>

            <div style="padding: 24px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 0.4px; width: 140px;">Équipement</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; font-weight: 500; color: #1a1a1a;">${equipement}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 0.4px;">Établissement</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; font-weight: 500; color: #1a1a1a;">${etablissement}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 0.4px;">Localisation</td>
                  <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; font-weight: 500; color: #1a1a1a;">${localisation || '—'}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0; font-size: 12px; color: #999; text-transform: uppercase; letter-spacing: 0.4px;">Description</td>
                  <td style="padding: 10px 0; font-size: 14px; color: #1a1a1a;">${description}</td>
                </tr>
              </table>

              <div style="margin-top: 20px; padding: 14px; background: #FEF2F2; border-radius: 8px; border: 1px solid rgba(194,54,42,0.2);">
                <div style="font-size: 13px; color: #C2362A; font-weight: 500;">Action requise</div>
                <div style="font-size: 12px; color: #C2362A; opacity: 0.8; margin-top: 4px;">Connectez-vous à MediTrack pour traiter cette alerte.</div>
              </div>

              <div style="margin-top: 20px; text-align: center;">
                <a href="https://www.meditrack-app.fr/dashboard/alertes"
                   style="display: inline-block; padding: 12px 24px; background: #1A56DB; color: #fff; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">
                  Voir l'alerte →
                </a>
              </div>
            </div>

            <div style="padding: 16px 24px; border-top: 1px solid #f0f0f0; text-align: center; font-size: 11px; color: #999;">
              MediTrack · Plateforme de gestion PSDM · ${new Date().toLocaleDateString('fr-FR')}
            </div>
          </div>
        </div>
      `
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erreur email:', error)
    return NextResponse.json({ error: 'Erreur envoi email' }, { status: 500 })
  }
}