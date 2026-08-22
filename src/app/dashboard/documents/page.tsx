'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const CHAPITRES: Record<string, { label: string; color: string; bg: string }> = {
  '1': { label: 'Ethique, droits et satisfaction', color: '#7C3AED', bg: '#F5F3FF' },
  '2': { label: 'Distribution et realisation', color: '#1A56DB', bg: '#EBF2FF' },
  '3': { label: 'Fonctions support', color: '#0A7C4E', bg: '#E8F5EE' },
  '4': { label: 'Qualite et risques', color: '#B45309', bg: '#FEF3C7' },
}

const NOMS_DOCS: Record<string, string> = {
  'USA-INFO-01': 'Définitions libre choix et consentement',
  'USA-DOC-01': 'Charte éthique',
  'PRESTA-DOC-01': 'Attestation d\'installation',
  'QR-DOC-01': 'Enquête de satisfaction',
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<any[]>([])
  const [criteres, setCriteres] = useState<any[]>([])
  const [societe, setSociete] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'tous' | 'generes' | 'preuves'>('tous')
  const [search, setSearch] = useState('')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('role, client_id').eq('id', user.id).single()
      if (!prof?.client_id) { setLoading(false); return }

      const { data: soc } = await supabase.from('societes').select('*').eq('client_id', prof.client_id).single()
      setSociete(soc)
      if (!soc) { setLoading(false); return }

      const { data: etabs } = await supabase.from('etablissements_psdm').select('id').eq('societe_id', soc.id)
      const etabId = etabs?.[0]?.id
      if (!etabId) { setLoading(false); return }

      const { data: documents } = await supabase.from('documents_qualite').select('*').eq('etablissement_id', etabId).order('created_at', { ascending: false })
      setDocs(documents || [])

      const { data: crits } = await supabase.from('criteres_psdm').select('id, code, titre, chapitre').order('code')
      setCriteres(crits || [])

      setLoading(false)
    }
    load()
  }, [])

  const isPreuve = (doc: any) => doc.code_doc?.startsWith('PREUVE_')
  const getCritereCode = (doc: any) => {
    if (isPreuve(doc)) return doc.code_doc.replace('PREUVE_', '')
    return null
  }

  const getCritere = (doc: any) => {
    if (isPreuve(doc)) {
      const code = getCritereCode(doc)
      return criteres.find(c => c.code === code)
    }
    return null
  }

  const filtered = docs.filter(d => {
    if (filter === 'generes' && isPreuve(d)) return false
    if (filter === 'preuves' && !isPreuve(d)) return false
    if (search) {
      const name = isPreuve(d) ? d.nom : (NOMS_DOCS[d.code_doc] || d.code_doc)
      return name.toLowerCase().includes(search.toLowerCase()) || d.code_doc?.toLowerCase().includes(search.toLowerCase())
    }
    return true
  })

  const nbGeneres = docs.filter(d => !isPreuve(d)).length
  const nbPreuves = docs.filter(d => isPreuve(d)).length

  function getExt(url: string) {
    const ext = url.split('.').pop()?.toUpperCase() || 'DOC'
    return ext.length > 4 ? 'DOC' : ext
  }

  function getDocIcon(doc: any) {
    if (isPreuve(doc)) return { icon: 'ti-paperclip', color: '#7C3AED', bg: '#F5F3FF' }
    const ext = getExt(doc.url || '')
    if (ext === 'DOCX' || ext === 'DOC') return { icon: 'ti-file-word', color: '#1A56DB', bg: '#EBF2FF' }
    if (ext === 'PDF') return { icon: 'ti-file-type-pdf', color: '#DC2626', bg: '#FEE2E2' }
    return { icon: 'ti-file', color: '#6B7280', bg: '#F3F4F6' }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: 'var(--font)', color: 'var(--text-tertiary)', fontSize: '13px' }}>
      Chargement...
    </div>
  )

  if (!societe) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: 'var(--font)' }}>
      <div style={{ textAlign: 'center' }}>
        <i className="ti ti-files" style={{ fontSize: '32px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '12px', opacity: 0.3 }} />
        <div style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>Configurez votre profil pour accéder aux documents</div>
        <button onClick={() => router.push('/dashboard/onboarding')}
          style={{ marginTop: '16px', padding: '9px 20px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)' }}>
          Configurer mon profil
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)', maxWidth: '1000px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Documents qualité</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '3px' }}>{societe.raison_sociale} · {docs.length} document{docs.length > 1 ? 's' : ''}</div>
        </div>
        <button onClick={() => router.push('/dashboard/certification')}
          style={{ padding: '9px 18px', background: 'var(--accent)', border: 'none', borderRadius: '9px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '7px', boxShadow: '0 1px 4px rgba(26,86,219,0.25)' }}>
          <i className="ti ti-plus" style={{ fontSize: '14px' }} />
          Ajouter depuis la certification
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'Total', value: docs.length, icon: 'ti-files', color: '#1A56DB', bg: '#EBF2FF' },
          { label: 'Générés par MediReg', value: nbGeneres, icon: 'ti-sparkles', color: '#059669', bg: '#D1FAE5' },
          { label: 'Preuves uploadées', value: nbPreuves, icon: 'ti-upload', color: '#7C3AED', bg: '#F5F3FF' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '9px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`ti ${s.icon}`} style={{ fontSize: '18px', color: s.color }} />
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: s.color, letterSpacing: '-0.5px', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '3px' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtres + search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'var(--text-tertiary)' }} />
          <input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 12px 8px 32px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface)', width: '200px' }} />
        </div>
        <div style={{ display: 'flex', gap: '5px' }}>
          {[
            { key: 'tous', label: 'Tous' },
            { key: 'generes', label: 'Générés' },
            { key: 'preuves', label: 'Preuves' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key as any)}
              style={{ padding: '7px 14px', borderRadius: '20px', border: `1px solid ${filter === f.key ? '#1A56DB' : 'var(--border)'}`, background: filter === f.key ? '#EBF2FF' : 'var(--surface)', color: filter === f.key ? '#1A56DB' : 'var(--text-secondary)', fontSize: '12px', fontWeight: filter === f.key ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)' }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste documents */}
      {filtered.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '64px', textAlign: 'center' }}>
          <i className="ti ti-files" style={{ fontSize: '32px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '12px', opacity: 0.3 }} />
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>
            {docs.length === 0 ? 'Aucun document pour le moment' : 'Aucun résultat'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>
            {docs.length === 0 ? 'Générez vos premiers documents depuis la page Certification' : 'Modifiez votre recherche'}
          </div>
          {docs.length === 0 && (
            <button onClick={() => router.push('/dashboard/certification')}
              style={{ padding: '9px 20px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)' }}>
              Aller à la certification
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filtered.map(doc => {
            const preuve = isPreuve(doc)
            const critere = getCritere(doc)
            const chap = critere ? CHAPITRES[critere.chapitre] : null
            const nomDoc = preuve ? doc.nom : (NOMS_DOCS[doc.code_doc] || doc.nom || doc.code_doc)
            const iconStyle = getDocIcon(doc)
            const filename = doc.url?.split('/').pop() || ''
            const ext = getExt(doc.url || '')

            return (
              <div key={doc.id}
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '14px', transition: 'all 0.1s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = '#BFDBFE'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}>

                {/* Icone doc */}
                <div style={{ width: '40px', height: '40px', borderRadius: '9px', background: iconStyle.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`ti ${iconStyle.icon}`} style={{ fontSize: '20px', color: iconStyle.color }} />
                </div>

                {/* Infos */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{nomDoc}</span>
                    {!preuve && doc.code_doc && (
                      <span style={{ fontSize: '10px', color: '#1A56DB', background: '#EBF2FF', padding: '1px 7px', borderRadius: '20px', fontWeight: '500' }}>{doc.code_doc}</span>
                    )}
                    {preuve && (
                      <span style={{ fontSize: '10px', color: '#7C3AED', background: '#F5F3FF', padding: '1px 7px', borderRadius: '20px', fontWeight: '500' }}>Preuve uploadée</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {critere && chap && (
                      <span style={{ fontSize: '11px', color: chap.color, background: chap.bg, padding: '1px 7px', borderRadius: '4px', fontWeight: '500' }}>
                        {critere.code} — {critere.titre.substring(0, 40)}{critere.titre.length > 40 ? '...' : ''}
                      </span>
                    )}
                    <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      {new Date(doc.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', background: 'var(--surface-hover)', padding: '1px 6px', borderRadius: '4px' }}>{ext}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <a href={`/api/generate-doc?path=${encodeURIComponent(doc.url)}`} download={filename}
                    style={{ height: '34px', padding: '0 14px', background: 'var(--accent-light)', border: '1px solid rgba(26,86,219,0.15)', borderRadius: '8px', color: 'var(--accent)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none' }}>
                    <i className="ti ti-download" style={{ fontSize: '13px' }} />
                    Télécharger
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}