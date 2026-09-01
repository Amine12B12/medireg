'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const CHAPITRES: Record<string, { label: string; color: string; bg: string; border: string }> = {
  '1': { label: 'Éthique, droits et satisfaction', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  '2': { label: 'Distribution et réalisation', color: '#1A56DB', bg: '#EBF2FF', border: '#BFDBFE' },
  '3': { label: 'Fonctions support', color: '#0A7C4E', bg: '#E8F5EE', border: '#A7F3D0' },
  '4': { label: 'Qualité et risques', color: '#B45309', bg: '#FEF3C7', border: '#FDE68A' },
}

const DOC_META: Record<string, { titre: string; chapitre: string; criteres: string[] }> = {
  'USA-INFO-01': { titre: "Notice d'information libre choix", chapitre: '1', criteres: ['1.2.1', '1.2.2'] },
  'USA-DOC-01': { titre: 'Charte éthique', chapitre: '1', criteres: ['1.2.1', '1.2.5'] },
  'PRESTA-DOC-01': { titre: "Attestation d'installation (modèle)", chapitre: '1', criteres: ['1.2.4'] },
  'QR-DOC-01': { titre: 'Questionnaire de satisfaction', chapitre: '1', criteres: ['1.3.1'] },
  'ATTESTATION-DEVIS': { titre: 'Attestation remise systématique des devis', chapitre: '1', criteres: ['1.2.2'] },
  'ATTESTATION-CONSENTEMENT': { titre: 'Attestation recueil consentement', chapitre: '1', criteres: ['1.2.4'] },
  'PROC-BIENTRAITANCE': { titre: 'Procédure bientraitance et dignité', chapitre: '1', criteres: ['1.2.3'] },
  'FORM-BIENTRAITANCE': { titre: 'Attestation sensibilisation bientraitance', chapitre: '1', criteres: ['1.2.3'] },
  'POLITIQUE-CONFIDENTIALITE': { titre: 'Politique de confidentialité RGPD', chapitre: '1', criteres: ['1.2.5'] },
  'REGISTRE-TRAITEMENTS': { titre: 'Registre des activités de traitement', chapitre: '1', criteres: ['1.2.5'] },
  'ATTEST-RGPD': { titre: 'Attestation sensibilisation RGPD', chapitre: '1', criteres: ['1.2.5'] },
  'RAPPORT-SATISFACTION': { titre: 'Rapport annuel de satisfaction', chapitre: '1', criteres: ['1.3.1'] },
  'PROC-RECLAMATIONS': { titre: 'Procédure gestion des réclamations', chapitre: '1', criteres: ['1.3.2'] },
  'PROC-PRESCRIPTION-01': { titre: 'Procédure réception des prescriptions', chapitre: '2', criteres: ['2.2.1'] },
}

export default function DocumentsPage() {
  const [docsEditables, setDocsEditables] = useState<any[]>([])
  const [docsQualite, setDocsQualite] = useState<any[]>([])
  const [societe, setSociete] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [chapitreFilter, setChapitreFilter] = useState('tous')
  const [exporting, setExporting] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    console.log('user:', user?.id)
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('client_id').eq('id', user.id).single()
    console.log('prof client_id:', prof?.client_id)
    if (!prof?.client_id) { setLoading(false); return }
    const { data: soc } = await supabase.from('societes').select('*').eq('client_id', prof.client_id).single()
    console.log('soc:', soc?.id)
    setSociete(soc)
    if (!soc) { setLoading(false); return }
    const { data: etabs } = await supabase.from('etablissements_psdm').select('id').eq('societe_id', soc.id)
    console.log('etabs:', etabs)
    const etabId = etabs?.[0]?.id
    console.log('etabId:', etabId)
    if (!etabId) { setLoading(false); return }

    // Documents éditables signés
    const { data: editables, error: editErr } = await supabase.from('documents_editables').select('*').eq('etablissement_id', etabId).eq('statut', 'signe').order('created_at', { ascending: false })
    console.log('editables:', editables?.length, 'error:', editErr?.message)
    setDocsEditables(editables || [])

    // Documents qualité (anciens)
    const { data: qualite } = await supabase.from('documents_qualite').select('*').eq('etablissement_id', etabId).order('created_at', { ascending: false })
    setDocsQualite(qualite || [])

    setLoading(false)
  }

  // Construire liste unifiée
  const allDocs = [
    ...docsEditables.map(d => ({
      id: d.id,
      code: d.template_code,
      titre: d.titre,
      type: 'editable' as const,
      signe_par: d.signe_par,
      signe_le: d.signe_le,
      created_at: d.created_at,
      url: null,
      meta: DOC_META[d.template_code],
    })),
    ...docsQualite.filter(d => !d.code_doc?.startsWith('PREUVE_')).map(d => ({
      id: d.id,
      code: d.code_doc,
      titre: DOC_META[d.code_doc]?.titre || d.nom || d.code_doc,
      type: 'qualite' as const,
      signe_par: null,
      signe_le: null,
      created_at: d.created_at,
      url: d.url,
      meta: DOC_META[d.code_doc],
    })),
    ...docsQualite.filter(d => d.code_doc?.startsWith('PREUVE_')).map(d => ({
      id: d.id,
      code: d.code_doc,
      titre: d.nom || d.code_doc,
      type: 'preuve' as const,
      signe_par: null,
      signe_le: null,
      created_at: d.created_at,
      url: d.url,
      meta: { chapitre: d.code_doc.replace('PREUVE_', '').split('.')[0], criteres: [d.code_doc.replace('PREUVE_', '')], titre: d.nom },
    })),
  ]

  // Grouper par chapitre
  const docsParChapitre: Record<string, typeof allDocs> = {}
  for (const doc of allDocs) {
    const chap = doc.meta?.chapitre || '?'
    if (!docsParChapitre[chap]) docsParChapitre[chap] = []
    docsParChapitre[chap].push(doc)
  }

  const filteredDocs = chapitreFilter === 'tous' ? allDocs : allDocs.filter(d => d.meta?.chapitre === chapitreFilter)

  async function exportZip() {
    setExporting(true)
    // Créer une liste des documents téléchargeables
    const lines = allDocs.map(d => {
      if (d.type === 'editable') return `${d.titre} — Signé par ${d.signe_par} le ${new Date(d.signe_le).toLocaleDateString('fr-FR')} — /api/download-editable?id=${d.id}`
      if (d.url) return `${d.titre} — ${d.url}`
      return null
    }).filter(Boolean)

    const content = `LISTE DES DOCUMENTS QUALITE — ${societe?.raison_sociale}\nExport du ${new Date().toLocaleDateString('fr-FR')}\n\n${lines.join('\n')}`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `documents_qualite_${new Date().toISOString().split('T')[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: 'var(--font)', color: 'var(--text-tertiary)', fontSize: '13px' }}>
      Chargement...
    </div>
  )

  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)', maxWidth: '1000px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Documents qualité</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '3px' }}>{societe?.raison_sociale} · {allDocs.length} document{allDocs.length > 1 ? 's' : ''}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={exportZip} disabled={exporting || allDocs.length === 0}
            style={{ padding: '9px 16px', background: allDocs.length === 0 ? '#F3F4F6' : '#F0FDF4', border: `1px solid ${allDocs.length === 0 ? 'var(--border)' : '#A7F3D0'}`, borderRadius: '9px', color: allDocs.length === 0 ? '#9CA3AF' : '#059669', fontSize: '13px', fontWeight: '600', cursor: allDocs.length === 0 ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="ti ti-download" style={{ fontSize: '14px' }} />
            {exporting ? 'Export...' : 'Exporter la liste'}
          </button>
          <button onClick={() => router.push('/dashboard/certification')}
            style={{ padding: '9px 16px', background: '#1A56DB', border: 'none', borderRadius: '9px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="ti ti-plus" style={{ fontSize: '14px' }} />
            Créer un document
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'Documents signés', value: docsEditables.length, icon: 'ti-signature', color: '#059669', bg: '#ECFDF5' },
          { label: 'Preuves uploadées', value: docsQualite.filter(d => d.code_doc?.startsWith('PREUVE_')).length, icon: 'ti-paperclip', color: '#7C3AED', bg: '#F5F3FF' },
          { label: 'Chapitres couverts', value: Object.keys(docsParChapitre).filter(k => k !== '?').length, icon: 'ti-book', color: '#1A56DB', bg: '#EBF2FF' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '9px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`ti ${s.icon}`} style={{ fontSize: '18px', color: s.color }} />
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '3px' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtres chapitres */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button onClick={() => setChapitreFilter('tous')}
          style={{ padding: '6px 14px', borderRadius: '20px', border: `1px solid ${chapitreFilter === 'tous' ? '#1A56DB' : 'var(--border)'}`, background: chapitreFilter === 'tous' ? '#EBF2FF' : 'var(--surface)', color: chapitreFilter === 'tous' ? '#1A56DB' : 'var(--text-secondary)', fontSize: '12px', fontWeight: chapitreFilter === 'tous' ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)' }}>
          Tous ({allDocs.length})
        </button>
        {['1', '2', '3', '4'].map(chap => {
          const ch = CHAPITRES[chap]
          const count = docsParChapitre[chap]?.length || 0
          return (
            <button key={chap} onClick={() => setChapitreFilter(chap)}
              style={{ padding: '6px 14px', borderRadius: '20px', border: `1px solid ${chapitreFilter === chap ? ch.color : 'var(--border)'}`, background: chapitreFilter === chap ? ch.bg : 'var(--surface)', color: chapitreFilter === chap ? ch.color : 'var(--text-secondary)', fontSize: '12px', fontWeight: chapitreFilter === chap ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)' }}>
              Ch.{chap} ({count})
            </button>
          )
        })}
      </div>

      {/* Documents vides */}
      {allDocs.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '64px', textAlign: 'center' }}>
          <i className="ti ti-files" style={{ fontSize: '32px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '12px', opacity: 0.3 }} />
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>Aucun document pour le moment</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>Créez vos premiers documents depuis la page Certification</div>
          <button onClick={() => router.push('/dashboard/certification')}
            style={{ padding: '9px 20px', background: '#1A56DB', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)' }}>
            Aller à la certification
          </button>
        </div>
      ) : (
        /* Groupé par chapitre */
        chapitreFilter === 'tous' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {['1', '2', '3', '4'].filter(chap => docsParChapitre[chap]?.length > 0).map(chap => {
              const ch = CHAPITRES[chap]
              const docs = docsParChapitre[chap]
              return (
                <div key={chap}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: ch.bg, border: `1px solid ${ch.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: ch.color }}>{chap}</span>
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: ch.color }}>{ch.label}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', background: ch.bg, padding: '2px 8px', borderRadius: '20px' }}>{docs.length} doc{docs.length > 1 ? 's' : ''}</div>
                  </div>
                  <DocList docs={docs} router={router} />
                </div>
              )
            })}
            {docsParChapitre['?']?.length > 0 && (
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '12px' }}>Autres documents</div>
                <DocList docs={docsParChapitre['?']} router={router} />
              </div>
            )}
          </div>
        ) : (
          <DocList docs={filteredDocs} router={router} />
        )
      )}
    </div>
  )
}

function DocList({ docs, router }: { docs: any[]; router: any }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {docs.map(doc => <DocItem key={doc.id} doc={doc} router={router} />)}
    </div>
  )
}

function DocItem({ doc, router }: { doc: any; router: any }) {
  const isEditable = doc.type === 'editable'
  const isPreuve = doc.type === 'preuve'
  const ch = CHAPITRES[doc.meta?.chapitre || '']

  return (
    <div style={{ background: 'var(--surface)', border: `1px solid ${isEditable ? '#A7F3D0' : 'var(--border)'}`, borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px' }}>

      {/* Icone */}
      <div style={{ width: '40px', height: '40px', borderRadius: '9px', background: isEditable ? '#ECFDF5' : isPreuve ? '#F5F3FF' : '#EBF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className={`ti ${isEditable ? 'ti-signature' : isPreuve ? 'ti-paperclip' : 'ti-file-text'}`}
          style={{ fontSize: '18px', color: isEditable ? '#059669' : isPreuve ? '#7C3AED' : '#1A56DB' }} />
      </div>

      {/* Infos */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{doc.titre}</span>
          {isEditable && <span style={{ fontSize: '10px', color: '#059669', background: '#ECFDF5', padding: '1px 7px', borderRadius: '20px', fontWeight: '600' }}>Signé</span>}
          {isPreuve && <span style={{ fontSize: '10px', color: '#7C3AED', background: '#F5F3FF', padding: '1px 7px', borderRadius: '20px', fontWeight: '600' }}>Uploadé</span>}
          {doc.code && !isPreuve && <span style={{ fontSize: '10px', color: '#6B7280', background: '#F3F4F6', padding: '1px 7px', borderRadius: '20px' }}>{doc.code}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {doc.meta?.criteres?.map((c: string) => ch ? (
            <span key={c} style={{ fontSize: '10px', color: ch.color, background: ch.bg, padding: '1px 7px', borderRadius: '4px', fontWeight: '600' }}>{c}</span>
          ) : null)}
          {doc.signe_par && <span style={{ fontSize: '11px', color: '#6B7280' }}>par {doc.signe_par}</span>}
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            {new Date(doc.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        {isEditable && (
          <a href={`/api/download-editable?id=${doc.id}`} target="_blank"
            style={{ height: '34px', padding: '0 14px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', color: '#059669', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none', cursor: 'pointer' }}>
            <i className="ti ti-download" style={{ fontSize: '13px' }} />
            Télécharger
          </a>
        )}
        {!isEditable && doc.url && (
          <a href={`/api/generate-doc?path=${encodeURIComponent(doc.url)}`} download
            style={{ height: '34px', padding: '0 14px', background: '#EBF2FF', border: '1px solid #BFDBFE', borderRadius: '8px', color: '#1A56DB', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none' }}>
            <i className="ti ti-download" style={{ fontSize: '13px' }} />
            Télécharger
          </a>
        )}
      </div>
    </div>
  )
}