'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useParams } from 'next/navigation'

const CHAPITRES: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  '1': { label: 'Ethique, droits et satisfaction', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', icon: 'ti-heart' },
  '2': { label: 'Distribution et realisation', color: '#1A56DB', bg: '#EBF2FF', border: '#BFDBFE', icon: 'ti-truck-delivery' },
  '3': { label: 'Fonctions support', color: '#0A7C4E', bg: '#E8F5EE', border: '#A7F3D0', icon: 'ti-settings' },
  '4': { label: 'Qualite et risques', color: '#B45309', bg: '#FEF3C7', border: '#FDE68A', icon: 'ti-shield-check' },
}

const STATUTS = [
  { key: 'non_analyse', label: 'Non analysé', color: '#6B7280', bg: '#F9FAFB', dot: '#D1D5DB' },
  { key: 'non_applicable', label: 'Non applicable', color: '#9CA3AF', bg: '#F3F4F6', dot: '#D1D5DB' },
  { key: 'information_manquante', label: 'Info manquante', color: '#7C3AED', bg: '#F5F3FF', dot: '#8B5CF6' },
  { key: 'preuve_manquante', label: 'Preuve manquante', color: '#D97706', bg: '#FFFBEB', dot: '#F59E0B' },
  { key: 'procedure_a_valider', label: 'À valider', color: '#2563EB', bg: '#EFF6FF', dot: '#3B82F6' },
  { key: 'action_corrective', label: 'Action corrective', color: '#DC2626', bg: '#FEF2F2', dot: '#EF4444' },
  { key: 'pret_audit', label: 'Prêt pour audit', color: '#059669', bg: '#ECFDF5', dot: '#10B981' },
]

export default function ClientDetailPage() {
  const [client, setClient] = useState<any>(null)
  const [societe, setSociete] = useState<any>(null)
  const [criteres, setCriteres] = useState<any[]>([])
  const [reponses, setReponses] = useState<Record<string, any>>({})
  const [docs, setDocs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatut, setFilterStatut] = useState('tous')
  const [filterChap, setFilterChap] = useState('tous')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [etabId, setEtabId] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  useEffect(() => { load() }, [clientId])

  async function load() {
    setLoading(true)

    const { data: cl } = await supabase.from('clients').select('*').eq('id', clientId).single()
    setClient(cl)

    const { data: soc } = await supabase.from('societes').select('*').eq('client_id', clientId).single()
    setSociete(soc)

    if (soc) {
      const { data: etabs } = await supabase.from('etablissements_psdm').select('id').eq('societe_id', soc.id)
      const eid = etabs?.[0]?.id
      setEtabId(eid || null)

      if (eid) {
        const { data: reps } = await supabase.from('reponses_criteres').select('*').eq('etablissement_id', eid)
        const repMap: Record<string, any> = {}
        for (const r of reps || []) repMap[r.critere_id] = r
        setReponses(repMap)

        const { data: documents } = await supabase.from('documents_qualite').select('*').eq('etablissement_id', eid).order('created_at', { ascending: false })
        setDocs(documents || [])
      }
    }

    const { data: crits } = await supabase.from('criteres_psdm').select('*').order('code')
    setCriteres(crits || [])

    setLoading(false)
  }

  async function updateStatut(critereId: string, statut: string) {
    if (!etabId) return
    setSavingId(critereId)
    const existing = reponses[critereId]
    if (existing) {
      await supabase.from('reponses_criteres').update({ statut, updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await supabase.from('reponses_criteres').insert([{ etablissement_id: etabId, critere_id: critereId, statut }])
    }
    setReponses(prev => ({ ...prev, [critereId]: { ...prev[critereId], statut } }))
    setSavingId(null)
  }

  const getStatut = (critereId: string) => reponses[critereId]?.statut || 'non_analyse'
  const getStatutStyle = (statut: string) => STATUTS.find(s => s.key === statut) || STATUTS[0]

  const criteresFiltres = criteres.filter(c => {
    if (filterChap !== 'tous' && c.chapitre !== filterChap) return false
    if (filterStatut !== 'tous' && getStatut(c.id) !== filterStatut) return false
    return true
  })

  const total = criteres.length
  const prets = criteres.filter(c => getStatut(c.id) === 'pret_audit').length
  const aValider = criteres.filter(c => getStatut(c.id) === 'procedure_a_valider').length
  const actionsCorr = criteres.filter(c => getStatut(c.id) === 'action_corrective').length
  const preuveManquante = criteres.filter(c => getStatut(c.id) === 'preuve_manquante').length
  const score = total > 0 ? Math.round((prets / total) * 100) : 0
  const scoreColor = score >= 75 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444'

  const docsEnAttente = docs.filter(d => d.code_doc?.startsWith('PREUVE_'))

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: 'var(--font)', color: 'var(--text-tertiary)', fontSize: '13px' }}>
      Chargement du dossier...
    </div>
  )

  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)', maxWidth: '1100px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
        <button onClick={() => router.push('/dashboard/clients')}
          style={{ width: '36px', height: '36px', border: '1px solid var(--border)', borderRadius: '9px', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0 }}>
          <i className="ti ti-arrow-left" style={{ fontSize: '16px' }} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            {societe?.raison_sociale || client?.nom}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '3px' }}>
            {client?.contact_email} · Forfait {client?.forfait}
          </div>
        </div>
        <button onClick={() => router.push('/dashboard/certification?client_id=' + clientId)}
          style={{ padding: '9px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '9px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '7px' }}>
          <i className="ti ti-eye" style={{ fontSize: '14px' }} />
          Vue client
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', marginBottom: '24px' }}>
        {[
          { label: 'Prêts pour audit', value: prets, color: '#059669', bg: '#ECFDF5', icon: 'ti-circle-check' },
          { label: 'À valider', value: aValider, color: '#2563EB', bg: '#EFF6FF', icon: 'ti-clock' },
          { label: 'Action corrective', value: actionsCorr, color: '#DC2626', bg: '#FEF2F2', icon: 'ti-alert-triangle' },
          { label: 'Preuve manquante', value: preuveManquante, color: '#D97706', bg: '#FFFBEB', icon: 'ti-file-x' },
          { label: 'Docs uploadés', value: docsEnAttente.length, color: '#7C3AED', bg: '#F5F3FF', icon: 'ti-upload' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: 'var(--surface)', border: `1px solid ${kpi.bg}`, borderRadius: '12px', padding: '16px', cursor: kpi.label !== 'Docs uploadés' ? 'pointer' : 'default' }}
            onClick={() => {
              if (kpi.label === 'À valider') setFilterStatut('procedure_a_valider')
              else if (kpi.label === 'Action corrective') setFilterStatut('action_corrective')
              else if (kpi.label === 'Preuve manquante') setFilterStatut('preuve_manquante')
              else if (kpi.label === 'Prêts pour audit') setFilterStatut('pret_audit')
            }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
              <i className={`ti ${kpi.icon}`} style={{ fontSize: '17px', color: kpi.color }} />
            </div>
            <div style={{ fontSize: '26px', fontWeight: '700', color: kpi.color, letterSpacing: '-0.5px', lineHeight: 1 }}>{kpi.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Score global + par chapitre */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px 24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          {/* Cercle score */}
          <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="#F3F4F6" strokeWidth="8" />
              <circle cx="40" cy="40" r="32" fill="none"
                stroke={scoreColor}
                strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 32}`}
                strokeDashoffset={`${2 * Math.PI * 32 * (1 - score / 100)}`}
                strokeLinecap="round" transform="rotate(-90 40 40)" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '18px', fontWeight: '800', color: scoreColor }}>{score}%</span>
              <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', marginTop: '1px' }}>audit</span>
            </div>
          </div>

          {/* Score par chapitre */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {['1', '2', '3', '4'].map(chap => {
              const ch = CHAPITRES[chap]
              const critsChap = criteres.filter(c => c.chapitre === chap)
              const pretsChap = critsChap.filter(c => getStatut(c.id) === 'pret_audit').length
              const pct = critsChap.length > 0 ? Math.round((pretsChap / critsChap.length) * 100) : 0
              const aValiderChap = critsChap.filter(c => getStatut(c.id) === 'procedure_a_valider').length
              return (
                <div key={chap} style={{ background: '#F9FAFB', borderRadius: '10px', padding: '12px', cursor: 'pointer' }}
                  onClick={() => { setFilterChap(chap); setFilterStatut('tous') }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <i className={`ti ${ch.icon}`} style={{ fontSize: '14px', color: ch.color }} />
                    <span style={{ fontSize: '11px', fontWeight: '700', color: ch.color }}>Chap. {chap}</span>
                  </div>
                  <div style={{ height: '4px', background: '#E5E7EB', borderRadius: '2px', overflow: 'hidden', marginBottom: '6px' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: ch.color, borderRadius: '2px' }} />
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: ch.color }}>{pct}%</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{pretsChap}/{critsChap.length} prêts</div>
                  {aValiderChap > 0 && (
                    <div style={{ fontSize: '10px', color: '#2563EB', fontWeight: '600', marginTop: '4px' }}>
                      {aValiderChap} à valider
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Filtres critères */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Chapitre</span>
        {(['tous', '1', '2', '3', '4'] as const).map(ch => (
          <button key={ch} onClick={() => setFilterChap(ch)}
            style={{ padding: '5px 12px', borderRadius: '20px', border: `1px solid ${filterChap === ch ? (ch === 'tous' ? '#1A56DB' : CHAPITRES[ch]?.color) : 'var(--border)'}`, background: filterChap === ch ? (ch === 'tous' ? '#EBF2FF' : CHAPITRES[ch]?.bg) : 'var(--surface)', color: filterChap === ch ? (ch === 'tous' ? '#1A56DB' : CHAPITRES[ch]?.color) : 'var(--text-secondary)', fontSize: '12px', fontWeight: filterChap === ch ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)' }}>
            {ch === 'tous' ? 'Tous' : `Ch.${ch}`}
          </button>
        ))}
        <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
        {['tous', ...STATUTS.map(s => s.key)].map(sk => {
          const s = STATUTS.find(x => x.key === sk)
          return (
            <button key={sk} onClick={() => setFilterStatut(sk)}
              style={{ padding: '5px 12px', borderRadius: '20px', border: `1px solid ${filterStatut === sk ? (s?.dot || '#1A56DB') : 'var(--border)'}`, background: filterStatut === sk ? (s?.bg || '#EBF2FF') : 'var(--surface)', color: filterStatut === sk ? (s?.color || '#1A56DB') : 'var(--text-secondary)', fontSize: '11px', fontWeight: filterStatut === sk ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              {sk !== 'tous' && <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: s?.dot || '#D1D5DB' }} />}
              {sk === 'tous' ? 'Tous statuts' : s?.label}
            </button>
          )
        })}
        {(filterChap !== 'tous' || filterStatut !== 'tous') && (
          <button onClick={() => { setFilterChap('tous'); setFilterStatut('tous') }}
            style={{ padding: '5px 12px', borderRadius: '20px', border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <i className="ti ti-x" style={{ fontSize: '11px' }} />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Liste critères */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {criteresFiltres.map(critere => {
          const statut = getStatut(critere.id)
          const st = getStatutStyle(statut)
          const ch = CHAPITRES[critere.chapitre]
          const isSaving = savingId === critere.id
          const docsCritere = docs.filter(d => d.critere_id === critere.id)

          return (
            <div key={critere.id} style={{ background: 'var(--surface)', border: `1px solid ${statut === 'action_corrective' ? '#FECACA' : statut === 'procedure_a_valider' ? '#BFDBFE' : 'var(--border)'}`, borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>

              {/* Code critère */}
              <span style={{ fontSize: '11px', fontWeight: '700', color: ch?.color, background: ch?.bg, padding: '3px 8px', borderRadius: '4px', border: `1px solid ${ch?.border}`, flexShrink: 0 }}>
                {critere.code}
              </span>

              {/* Titre */}
              <div style={{ flex: 1, minWidth: '200px' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', lineHeight: '1.4' }}>{critere.titre}</div>
                {docsCritere.length > 0 && (
                  <div style={{ fontSize: '11px', color: '#7C3AED', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <i className="ti ti-paperclip" style={{ fontSize: '11px' }} />
                    {docsCritere.length} document{docsCritere.length > 1 ? 's' : ''} uploadé{docsCritere.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>

              {/* Changement statut rapide */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', flexShrink: 0 }}>
                {STATUTS.map(s => (
                  <button key={s.key} onClick={() => updateStatut(critere.id, s.key)} disabled={isSaving}
                    style={{ height: '26px', padding: '0 10px', border: `1px solid ${statut === s.key ? s.dot : '#E5E7EB'}`, borderRadius: '20px', background: statut === s.key ? s.bg : '#fff', color: statut === s.key ? s.color : '#9CA3AF', fontSize: '11px', fontWeight: statut === s.key ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap', opacity: isSaving ? 0.5 : 1 }}>
                    {statut === s.key && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: s.dot }} />}
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {criteresFiltres.length === 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Aucun critère pour ces filtres</div>
        </div>
      )}
    </div>
  )
}