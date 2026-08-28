import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 })

  const { data: doc, error } = await supabase
    .from('documents_editables')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !doc) return NextResponse.json({ error: 'Document non trouvé' }, { status: 404 })

  const sections = doc.contenu as any[]

  const sectionsHtml = sections.map((s: any, i: number) => `
    <div class="section">
      <h2>${i + 1}. ${escapeHtml(s.titre)}</h2>
      <div class="content">${escapeHtml(s.contenu).replace(/\n/g, '<br/>')}</div>
    </div>
  `).join('')

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(doc.titre)}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12pt; color: #1a1a1a; max-width: 800px; margin: 40px auto; padding: 0 40px; }
  .header { text-align: center; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 3px solid #1A56DB; }
  .logo-area { margin-bottom: 12px; font-size: 20px; font-weight: 800; color: #1A56DB; letter-spacing: -0.5px; }
  .doc-title { font-size: 18px; font-weight: 700; color: #111827; margin: 8px 0; }
  .meta { font-size: 11px; color: #9CA3AF; margin-top: 8px; }
  .signed-badge { display: inline-block; background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 600; margin-top: 10px; }
  .section { margin-bottom: 28px; page-break-inside: avoid; }
  .section h2 { font-size: 13px; font-weight: 700; color: #1A56DB; margin-bottom: 10px; padding: 8px 12px; background: #EBF2FF; border-left: 3px solid #1A56DB; border-radius: 0 6px 6px 0; }
  .content { font-size: 11.5px; color: #374151; line-height: 1.9; padding: 0 4px; }
  .signature-box { margin-top: 48px; padding: 20px 24px; border: 1px solid #A7F3D0; background: #F0FDF4; border-radius: 8px; }
  .signature-title { font-size: 12px; font-weight: 700; color: #065F46; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .signature-details { font-size: 11px; color: #374151; line-height: 2; }
  .signature-line { border-bottom: 2px solid #059669; margin-bottom: 14px; }
  .footer { margin-top: 60px; padding-top: 16px; border-top: 1px solid #E5E7EB; text-align: center; font-size: 10px; color: #9CA3AF; }
  @media print { body { margin: 0; } @page { margin: 2cm; } }
</style>
</head>
<body>

<div class="header">
  <div class="logo-area">MediReg</div>
  <div class="doc-title">${escapeHtml(doc.titre)}</div>
  <div class="meta">Généré le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
  ${doc.signe_par ? `<div class="signed-badge">✓ Signé électroniquement</div>` : ''}
</div>

${sectionsHtml}

${doc.signe_par ? `
<div class="signature-box">
  <div class="signature-line"></div>
  <div class="signature-title">✓ Signature électronique</div>
  <div class="signature-details">
    <strong>Signé par :</strong> ${escapeHtml(doc.signe_par)}<br/>
    <strong>Date de signature :</strong> ${new Date(doc.signe_le).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} à ${new Date(doc.signe_le).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}<br/>
    <strong>Statut :</strong> Document signé et validé<br/>
    <strong>Référence :</strong> ${doc.id}
  </div>
</div>
` : ''}

<div class="footer">
  Document généré par MediReg — Plateforme de certification HAS PSDM · medireg.pro<br/>
  Ce document constitue une preuve de conformité dans le cadre de la certification PSDM HAS 2024
</div>

</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="${doc.titre.replace(/[^a-z0-9]/gi, '_')}.html"`,
    }
  })
}

function escapeHtml(str: string): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}