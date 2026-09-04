import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import JSZip from 'jszip'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const DOC_META: Record<string, { titre: string; chapitre: string; criteres: string[] }> = {
  'USA-INFO-01': { titre: "Notice information libre choix", chapitre: '1', criteres: ['1.2.1', '1.2.2'] },
  'USA-DOC-01': { titre: 'Charte ethique', chapitre: '1', criteres: ['1.2.1', '1.2.5'] },
  'PRESTA-DOC-01': { titre: "Attestation installation modele", chapitre: '1', criteres: ['1.2.4'] },
  'QR-DOC-01': { titre: 'Questionnaire satisfaction', chapitre: '1', criteres: ['1.3.1'] },
  'ATTESTATION-DEVIS': { titre: 'Attestation remise devis', chapitre: '1', criteres: ['1.2.2'] },
  'ATTESTATION-CONSENTEMENT': { titre: 'Attestation consentement', chapitre: '1', criteres: ['1.2.4'] },
  'PROC-BIENTRAITANCE': { titre: 'Procedure bientraitance', chapitre: '1', criteres: ['1.2.3'] },
  'FORM-BIENTRAITANCE': { titre: 'Attestation bientraitance', chapitre: '1', criteres: ['1.2.3'] },
  'POLITIQUE-CONFIDENTIALITE': { titre: 'Politique confidentialite RGPD', chapitre: '1', criteres: ['1.2.5'] },
  'REGISTRE-TRAITEMENTS': { titre: 'Registre traitements RGPD', chapitre: '1', criteres: ['1.2.5'] },
  'ATTEST-RGPD': { titre: 'Attestation RGPD personnel', chapitre: '1', criteres: ['1.2.5'] },
  'RAPPORT-SATISFACTION': { titre: 'Rapport satisfaction annuel', chapitre: '1', criteres: ['1.3.1'] },
  'PROC-RECLAMATIONS': { titre: 'Procedure reclamations', chapitre: '1', criteres: ['1.3.2'] },
  'PROC-PRESCRIPTION-01': { titre: 'Procedure prescriptions', chapitre: '2', criteres: ['2.2.1'] },
  'PROC-ACCESSIBILITE': { titre: 'Procedure accessibilite et accueil', chapitre: '2', criteres: ['2.1.1'] },
  'INFO-ACTIVITES': { titre: 'Information sur les activites', chapitre: '2', criteres: ['2.1.2'] },
  'PROC-HANDICAP': { titre: 'Procedure acces personnes handicapees', chapitre: '2', criteres: ['2.1.3'] },
  'ATTEST-LIVRAISONS': { titre: 'Attestation tracabilite livraisons', chapitre: '2', criteres: ['2.2.1', '2.3.2', '2.3.3'] },
  'ATTEST-MAINTENANCE': { titre: 'Attestation tracabilite maintenances', chapitre: '2', criteres: ['2.4.1', '2.4.3'] },
  'ATTEST-REPRISES': { titre: 'Attestation tracabilite reprises', chapitre: '2', criteres: ['2.5.1', '2.5.2'] },
  'PROC-DESINFECTION': { titre: 'Procedure nettoyage et desinfection DM', chapitre: '3', criteres: ['3.2.1', '3.3.2'] },
}

const CHAPITRES: Record<string, string> = {
  '1': 'Chapitre 1 - Ethique droits et satisfaction',
  '2': 'Chapitre 2 - Distribution et realisation',
  '3': 'Chapitre 3 - Fonctions support',
  '4': 'Chapitre 4 - Qualite et risques',
}

function generateDocHtml(doc: any, societeNom: string): string {
  const sections = doc.contenu as any[]
  const sectionsHtml = sections.map((s: any, i: number) => `
    <div style="margin-bottom: 28px;">
      <h2 style="font-size: 14px; font-weight: 700; color: #1A56DB; margin-bottom: 10px; padding: 8px 12px; background: #EBF2FF; border-left: 3px solid #1A56DB;">${i + 1}. ${s.titre}</h2>
      <div style="font-size: 12px; color: #374151; line-height: 1.8; white-space: pre-wrap;">${s.contenu}</div>
    </div>
  `).join('')

  const signatureHtml = doc.signe_par ? `
    <div style="margin-top: 40px; padding: 16px; background: #F0FDF4; border: 1px solid #A7F3D0; border-radius: 8px;">
      <div style="font-size: 12px; font-weight: 700; color: #065F46; margin-bottom: 8px;">✓ Signature electronique</div>
      <div style="font-size: 12px; color: #374151; line-height: 1.8;">
        <strong>Signe par :</strong> ${doc.signe_par}<br/>
        <strong>Date :</strong> ${new Date(doc.signe_le).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}<br/>
        <strong>Reference :</strong> ${doc.id}
      </div>
    </div>
  ` : ''

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>${doc.titre}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 12pt; color: #1a1a1a; max-width: 800px; margin: 40px auto; padding: 0 40px; }
  .header { text-align: center; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 3px solid #1A56DB; }
  .footer { margin-top: 60px; padding-top: 16px; border-top: 1px solid #E5E7EB; text-align: center; font-size: 10px; color: #9CA3AF; }
</style>
</head>
<body>
<div class="header">
  <div style="font-size: 20px; font-weight: 800; color: #1A56DB;">MediReg</div>
  <div style="font-size: 18px; font-weight: 700; color: #111827; margin: 8px 0;">${doc.titre}</div>
  <div style="font-size: 11px; color: #9CA3AF;">${societeNom} — ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
  ${doc.signe_par ? '<div style="display: inline-block; background: #ECFDF5; color: #059669; border: 1px solid #A7F3D0; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 600; margin-top: 8px;">✓ Signe electroniquement</div>' : ''}
</div>
${sectionsHtml}
${signatureHtml}
<div class="footer">Document genere par MediReg — Plateforme certification HAS PSDM · medireg.pro</div>
</body></html>`
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const etabId = searchParams.get('etabId')
  const clientId = searchParams.get('clientId')

  if (!etabId || !clientId) return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })

  // Vérifier que le client a accès à cet établissement
  const { data: soc } = await supabase.from('societes').select('raison_sociale').eq('client_id', clientId).single()
  if (!soc) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  // Charger tous les documents signés
  const { data: editables } = await supabase
    .from('documents_editables')
    .select('*')
    .eq('etablissement_id', etabId)
    .eq('statut', 'signe')
    .order('created_at')

  if (!editables || editables.length === 0) {
    return NextResponse.json({ error: 'Aucun document à exporter' }, { status: 404 })
  }

  // Créer le ZIP
  const zip = new JSZip()

  for (const doc of editables) {
    const meta = DOC_META[doc.template_code]
    if (!meta) continue

    const chapLabel = CHAPITRES[meta.chapitre] || `Chapitre ${meta.chapitre}`
    const critereLabel = meta.criteres[0] || 'divers'
    const folder = `${chapLabel}/${critereLabel}`
    const filename = `${meta.titre}.html`

    const html = generateDocHtml(doc, soc.raison_sociale)
    zip.folder(folder)?.file(filename, html)
  }

  // Ajouter un fichier index
  const indexLines = editables.map(doc => {
    const meta = DOC_META[doc.template_code]
    return `${meta?.titre || doc.titre} — Critères: ${meta?.criteres.join(', ')} — Signé par: ${doc.signe_par} le ${new Date(doc.signe_le).toLocaleDateString('fr-FR')}`
  })
  zip.file('INDEX.txt', `DOCUMENTS QUALITE — ${soc.raison_sociale}\nExport du ${new Date().toLocaleDateString('fr-FR')}\nTotal : ${editables.length} documents\n\n${indexLines.join('\n')}`)

  const zipBuffer = await zip.generateAsync({ type: 'arraybuffer' })
  const date = new Date().toISOString().split('T')[0]

  return new NextResponse(zipBuffer, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="documents_qualite_${date}.zip"`,
    }
  })
}