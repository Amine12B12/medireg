import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { societe_id, etablissement_id, code_doc } = await req.json()
    if (!societe_id || !code_doc) return NextResponse.json({ error: 'Parametres manquants' }, { status: 400 })

    const { data: societe } = await supabase.from('societes').select('*').eq('id', societe_id).single()
    if (!societe) return NextResponse.json({ error: 'Societe non trouvee' }, { status: 404 })

    let etablissement: any = null
    if (etablissement_id) {
      const { data: etab } = await supabase.from('etablissements_psdm').select('*').eq('id', etablissement_id).single()
      etablissement = etab
    }

    const { data: personnes } = await supabase.from('personnes').select('*, responsabilites_personnes(*)').eq('societe_id', societe_id)

    const getResponsable = (role: string) => {
      if (!personnes) return ''
      for (const p of personnes) {
        const resps = (p.responsabilites_personnes || []) as any[]
        if (resps.some((r: any) => r.responsabilite === role && r.actif !== false)) return `${p.prenom} ${p.nom}`
      }
      return ''
    }
    const getFonction = (role: string) => {
      if (!personnes) return ''
      for (const p of personnes) {
        const resps = (p.responsabilites_personnes || []) as any[]
        if (resps.some((r: any) => r.responsabilite === role && r.actif !== false)) return p.fonction_reelle || ''
      }
      return ''
    }

    const now = new Date()
    const dateGeneration = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

    const variables: Record<string, string> = {
      logo: societe.logo_url || '',
      raison_sociale: societe.raison_sociale || '',
      nom_commercial: societe.nom_commercial || societe.raison_sociale || '',
      siren: societe.siren || '',
      code_ape: societe.code_ape || '',
      forme_juridique: societe.forme_juridique || '',
      adresse_siege: [societe.adresse_siege, societe.code_postal, societe.ville].filter(Boolean).join(', '),
      code_postal: societe.code_postal || '',
      ville: societe.ville || '',
      telephone: societe.telephone || '',
      email: societe.email || '',
      nom_etablissement: etablissement?.nom || societe.raison_sociale || '',
      siret_etablissement: etablissement?.siret || '',
      adresse_etablissement: etablissement ? [etablissement.adresse, etablissement.code_postal, etablissement.ville].filter(Boolean).join(', ') : '',
      dirigeant_nom: getResponsable('direction'),
      dirigeant_fonction: getFonction('direction'),
      garant_psdm: getResponsable('garant_psdm'),
      correspondant_materiovigilance: getResponsable('materiovigilance'),
      responsable_desinfection: getResponsable('desinfection'),
      responsable_sav: getResponsable('sav_maintenance'),
      responsable_reclamations: getResponsable('reclamations'),
      pilote_certification: getResponsable('pilote_certification'),
      referent_rgpd: getResponsable('dpo'),
      pharmacien_responsable: getResponsable('pharmacien'),
      date_generation: dateGeneration,
      annee: now.getFullYear().toString(),
    }

    const { data: fileData, error: fileError } = await supabase.storage.from('modeles').download(`${code_doc}.docx`)
    if (fileError || !fileData) return NextResponse.json({ error: `Modele ${code_doc}.docx non trouve` }, { status: 404 })

    const arrayBuffer = await fileData.arrayBuffer()
    const zip = new PizZip(Buffer.from(arrayBuffer))
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true, delimiters: { start: '{', end: '}' } })
    doc.render(variables)
    const output = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' })

    // Sauvegarder dans storage
    const outputPath = `generes/${societe_id}/${code_doc}_${Date.now()}.docx`
    await supabase.storage.from('modeles').upload(outputPath, output, {
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      upsert: true
    })

    // Trouver le critere associe
    const { data: critere } = await supabase.from('criteres_psdm').select('id').eq('code', code_doc.split('-').join('.').replace(/(\d+)\.(\d+)\.(\d+)/, '$1.$2.$3')).maybeSingle()

    // Supprimer l ancien document genere pour ce code_doc + etablissement
    if (etablissement_id) {
      await supabase.from('documents_qualite').delete()
        .eq('etablissement_id', etablissement_id)
        .eq('code_doc', code_doc)
    }

    // Sauvegarder en base
    if (etablissement_id) {
      await supabase.from('documents_qualite').insert([{
        etablissement_id,
        critere_id: critere?.id || null,
        code_doc,
        nom: getNomDocument(code_doc),
        type_doc: getTypeDocument(code_doc),
        contenu_variables: variables,
        url: outputPath,
        statut: 'genere',
        version: '01'
      }])
    }

    return new NextResponse(output as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${code_doc}_${societe.raison_sociale.replace(/\s/g, '_')}.docx"`,
      }
    })

  } catch (error: any) {
    console.error('Generate doc error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  // Retelecharger un document existant
  try {
    const { searchParams } = new URL(req.url)
    const path = searchParams.get('path')
    if (!path) return NextResponse.json({ error: 'Path manquant' }, { status: 400 })

    const { data: fileData, error } = await supabase.storage.from('modeles').download(path)
    if (error || !fileData) return NextResponse.json({ error: 'Document non trouve' }, { status: 404 })

    const arrayBuffer = await fileData.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${path.split('/').pop()}"`,
      }
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

function getNomDocument(code: string): string {
  const noms: Record<string, string> = {
    'USA-INFO-01': 'Definitions libre choix et consentement',
    'USA-DOC-01': 'Charte ethique',
    'PRESTA-DOC-01': 'Attestation d installation',
    'QR-DOC-01': 'Questionnaire satisfaction',
  }
  return noms[code] || code
}

function getTypeDocument(code: string): string {
  if (code.includes('INFO')) return 'information'
  if (code.includes('DOC')) return 'procedure'
  return 'formulaire'
}