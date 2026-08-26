'use client'

import { useEffect, useState, useRef } from 'react'
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
  const [messagesNonLus, setMessagesNonLus] = useState<Record<string, number>>({})

  // Panneau latéral
  const [selectedCritere, setSelectedCritere] = useState<any>(null)
  const [panelMessages, setPanelMessages] = useState<any[]>([])
  const [panelInput, setPanelInput] = useState('')
  const [panelSending, setPanelSending] = useState(false)
  const [panelDocs, setPanelDocs] = useState<any[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  useEffect(() => { load() }, [clientId])

  useEffect(() => {
    if (selectedCritere && etabId) loadPanel(selectedCritere.id)
  }, [selectedCritere])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [panelMessages])

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
        // Messages non lus
        const { data: msgs } = await supabase.from('messages_critere').select('critere_id').eq('etablissement_id', eid).eq('lu_consultant', false)
        const nonLusMap: Record<string, number> = {}
        for (const m of msgs || []) nonLusMap[m.critere_id] = (nonLusMap[m.critere_id] || 0) + 1
        setMessagesNonLus(nonLusMap)
      }
    }
    const { data: crits } = await supabase.from('criteres_psdm').select('*').order('code')
    setCriteres(crits || [])
    setLoading(false)
  }

  async function loadPanel(critereId: string) {
    if (!etabId) return
    const { data: msgs } = await supabase
      .from('messages_critere')
      .select('*, profiles(nom, prenom, role)')
      .eq('critere_id', critereId)
      .eq('etablissement_id', etabId)
      .order('created_at', { ascending: true })
    setPanelMessages(msgs || [])

    const docsCritere = docs.filter(d => d.critere_id === critereId || d.code_doc === `PREUVE_${selectedCritere?.code}`)
    setPanelDocs(docsCritere)

    // Marquer comme lus
    await supabase.from('messages_critere')
      .update({ lu_consultant: true })
      .eq('critere_id', critereId)
      .eq('etablissement_id', etabId)
      .eq('lu_consultant', false)

    // Mettre à jour le compteur local
    setMessagesNonLus(prev => ({ ...prev, [critereId]: 0 }))
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

    // Message automatique
    const critere = criteres.find(c => c.id === critereId)
    const { data: { user } } = await supabase.auth.getUser()
    if (user && (statut === 'pret_audit' || statut === 'action_corrective')) {
      await supabase.from('messages_critere').insert([{
        etablissement_id: etabId,
        critere_id: critereId,
        auteur_id: user.id,
        auteur_role: 'consultant',
        contenu: statut === 'pret_audit'
          ? `Critere ${critere?.code || ''} valide - pret pour audit.`
          : `Action corrective necessaire sur le critere ${critere?.code || ''}. Voir commentaires.`,
        type: statut === 'pret_audit' ? 'validation' : 'rejet',
        lu_client: false,
        lu_consultant: true,
      }])
      if (selectedCritere?.id === critereId) await loadPanel(critereId)
    }

    setSavingId(null)
  }

  async function sendPanelMessage() {
    if (!panelInput.trim() || panelSending || !selectedCritere || !etabId) return
    setPanelSending(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('messages_critere').insert([{
      etablissement_id: etabId,
      critere_id: selectedCritere.id,
      auteur_id: user.id,
      auteur_role: 'consultant',
      contenu: panelInput.trim(),
      type: 'message',
      lu_client: false,
      lu_consultant: true,
    }])
    setPanelInput('')
    await loadPanel(selectedCritere.id)
    setPanelSending(false)
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
  const totalMsgsNonLus = Object.values(messagesNonLus).reduce((a, b) => a + b, 0)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: 'var(--font)', color: 'var(--text-tertiary)', fontSize: '13px' }}>
      Chargement du dossier...
    </div>
  )

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 58px)', fontFamily: 'var(--font)', overflow: 'hidden' }}>

      {/* Colonne principale */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px', minWidth: 0 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <button onClick={() => router.push('/dashboard/clients')}
            style={{ width: '36px', height: '36px', border: '1px solid var(--border)', borderRadius: '9px', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0 }}>
            <i className="ti ti-arrow-left" style={{ fontSize: '16px' }} />
          </button>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
              {societe?.raison_sociale || client?.nom}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
              {client?.contact_email} · Forfait {client?.forfait}
              {totalMsgsNonLus > 0 && (
                <span style={{ marginLeft: '8px', color: '#7C3AED', fontWeight: '600' }}>
                  · {totalMsgsNonLus} message{totalMsgsNonLus > 1 ? 's' : ''} non lu{totalMsgsNonLus > 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', marginBottom: '20px' }}>
          {[
            { label: 'Prêts audit', value: prets, color: '#059669', bg: '#ECFDF5', filterKey: 'pret_audit' },
            { label: 'À valider', value: aValider, color: '#2563EB', bg: '#EFF6FF', filterKey: 'procedure_a_valider' },
            { label: 'Action corrective', value: actionsCorr, color: '#DC2626', bg: '#FEF2F2', filterKey: 'action_corrective' },
            { label: 'Preuve manquante', value: preuveManquante, color: '#D97706', bg: '#FFFBEB', filterKey: 'preuve_manquante' },
            { label: 'Msg non lus', value: totalMsgsNonLus, color: '#7C3AED', bg: '#F5F3FF', filterKey: null },
          ].map(kpi => (
            <div key={kpi.label}
              onClick={() => kpi.filterKey && setFilterStatut(filterStatut === kpi.filterKey ? 'tous' : kpi.filterKey)}
              style={{ background: 'var(--surface)', border: `1px solid ${kpi.value > 0 ? kpi.bg : 'var(--border)'}`, borderRadius: '10px', padding: '14px', cursor: kpi.filterKey ? 'pointer' : 'default' }}>
              <div style={{ fontSize: '22px', fontWeight: '700', color: kpi.value > 0 ? kpi.color : '#9CA3AF', lineHeight: 1 }}>{kpi.value}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px', lineHeight: '1.3' }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Score par chapitre */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0 }}>
              <svg width="64" height="64" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="24" fill="none" stroke="#F3F4F6" strokeWidth="6" />
                <circle cx="32" cy="32" r="24" fill="none" stroke={scoreColor} strokeWidth="6"
                  strokeDasharray={`${2 * Math.PI * 24}`}
                  strokeDashoffset={`${2 * Math.PI * 24 * (1 - score / 100)}`}
                  strokeLinecap="round" transform="rotate(-90 32 32)" />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: '800', color: scoreColor }}>{score}%</span>
              </div>
            </div>
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {['1', '2', '3', '4'].map(chap => {
                const ch = CHAPITRES[chap]
                const critsChap = criteres.filter(c => c.chapitre === chap)
                const pretsChap = critsChap.filter(c => getStatut(c.id) === 'pret_audit').length
                const pct = critsChap.length > 0 ? Math.round((pretsChap / critsChap.length) * 100) : 0
                return (
                  <div key={chap} onClick={() => setFilterChap(filterChap === chap ? 'tous' : chap)}
                    style={{ background: '#F9FAFB', borderRadius: '8px', padding: '10px', cursor: 'pointer', border: filterChap === chap ? `1px solid ${ch.color}` : '1px solid transparent' }}>
                    <div style={{ fontSize: '10px', fontWeight: '700', color: ch.color, marginBottom: '6px' }}>Ch.{chap}</div>
                    <div style={{ height: '3px', background: '#E5E7EB', borderRadius: '2px', overflow: 'hidden', marginBottom: '4px' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: ch.color }} />
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: '700', color: ch.color }}>{pct}%</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{pretsChap}/{critsChap.length}</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Filtres */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
          {(['tous', '1', '2', '3', '4'] as const).map(ch => (
            <button key={ch} onClick={() => setFilterChap(ch)}
              style={{ padding: '5px 12px', borderRadius: '20px', border: `1px solid ${filterChap === ch ? (ch === 'tous' ? '#1A56DB' : CHAPITRES[ch]?.color) : 'var(--border)'}`, background: filterChap === ch ? (ch === 'tous' ? '#EBF2FF' : CHAPITRES[ch]?.bg) : 'var(--surface)', color: filterChap === ch ? (ch === 'tous' ? '#1A56DB' : CHAPITRES[ch]?.color) : 'var(--text-secondary)', fontSize: '11px', fontWeight: filterChap === ch ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)' }}>
              {ch === 'tous' ? 'Tous' : `Ch.${ch}`}
            </button>
          ))}
          <div style={{ width: '1px', height: '16px', background: 'var(--border)' }} />
          {STATUTS.map(s => (
            <button key={s.key} onClick={() => setFilterStatut(filterStatut === s.key ? 'tous' : s.key)}
              style={{ padding: '5px 10px', borderRadius: '20px', border: `1px solid ${filterStatut === s.key ? s.dot : 'var(--border)'}`, background: filterStatut === s.key ? s.bg : 'var(--surface)', color: filterStatut === s.key ? s.color : 'var(--text-secondary)', fontSize: '10px', fontWeight: filterStatut === s.key ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: filterStatut === s.key ? s.dot : '#D1D5DB' }} />
              {s.label}
            </button>
          ))}
          {(filterChap !== 'tous' || filterStatut !== 'tous') && (
            <button onClick={() => { setFilterChap('tous'); setFilterStatut('tous') }}
              style={{ padding: '5px 10px', borderRadius: '20px', border: '1px solid #FECACA', background: '#FEF2F2', color: '#DC2626', fontSize: '10px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)' }}>
              <i className="ti ti-x" style={{ fontSize: '11px' }} /> Reset
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
            const msgsNonLus = messagesNonLus[critere.id] || 0
            const isSelected = selectedCritere?.id === critere.id

            return (
              <div key={critere.id}
                style={{ background: isSelected ? '#F8FAFF' : 'var(--surface)', border: `1px solid ${isSelected ? '#BFDBFE' : statut === 'action_corrective' ? '#FECACA' : statut === 'procedure_a_valider' ? '#BFDBFE' : 'var(--border)'}`, borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', cursor: 'pointer', transition: 'all 0.1s' }}
                onClick={() => setSelectedCritere(isSelected ? null : critere)}>

                <span style={{ fontSize: '11px', fontWeight: '700', color: ch?.color, background: ch?.bg, padding: '2px 7px', borderRadius: '4px', border: `1px solid ${ch?.border}`, flexShrink: 0 }}>
                  {critere.code}
                </span>

                <div style={{ flex: 1, minWidth: '150px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', lineHeight: '1.3' }}>{critere.titre}</div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {docsCritere.length > 0 && (
                      <span style={{ fontSize: '10px', color: '#7C3AED', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <i className="ti ti-paperclip" style={{ fontSize: '10px' }} />{docsCritere.length} doc{docsCritere.length > 1 ? 's' : ''}
                      </span>
                    )}
                    {msgsNonLus > 0 && (
                      <span style={{ fontSize: '10px', color: '#DC2626', background: '#FEF2F2', padding: '1px 6px', borderRadius: '20px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#EF4444' }} />
                        {msgsNonLus} msg
                      </span>
                    )}
                  </div>
                </div>

                {/* Changement statut rapide */}
                <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                  {STATUTS.map(s => (
                    <button key={s.key} onClick={() => updateStatut(critere.id, s.key)} disabled={isSaving}
                      style={{ height: '24px', padding: '0 8px', border: `1px solid ${statut === s.key ? s.dot : '#E5E7EB'}`, borderRadius: '20px', background: statut === s.key ? s.bg : '#fff', color: statut === s.key ? s.color : '#9CA3AF', fontSize: '10px', fontWeight: statut === s.key ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '2px', whiteSpace: 'nowrap', opacity: isSaving ? 0.5 : 1 }}>
                      {statut === s.key && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: s.dot }} />}
                      {s.label}
                    </button>
                  ))}
                </div>

                <i className={`ti ${isSelected ? 'ti-chevron-right' : 'ti-message-circle'}`}
                  style={{ fontSize: '14px', color: msgsNonLus > 0 ? '#EF4444' : 'var(--text-tertiary)', flexShrink: 0 }} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Panneau latéral chat */}
      {selectedCritere && (
        <div style={{ width: '360px', borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--surface)', flexShrink: 0, height: '100%' }}>

          {/* Header panneau */}
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--border)', background: '#FAFAFA' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: CHAPITRES[selectedCritere.chapitre]?.color, background: CHAPITRES[selectedCritere.chapitre]?.bg, padding: '2px 8px', borderRadius: '4px' }}>
                {selectedCritere.code}
              </span>
              <button onClick={() => setSelectedCritere(null)}
                style={{ width: '26px', height: '26px', border: 'none', borderRadius: '6px', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
                <i className="ti ti-x" style={{ fontSize: '13px' }} />
              </button>
            </div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', lineHeight: '1.4' }}>{selectedCritere.titre}</div>

            {/* Statut actuel */}
            <div style={{ marginTop: '10px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '5px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Changer le statut</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {STATUTS.map(s => {
                  const statut = getStatut(selectedCritere.id)
                  return (
                    <button key={s.key} onClick={() => updateStatut(selectedCritere.id, s.key)}
                      style={{ height: '24px', padding: '0 8px', border: `1px solid ${statut === s.key ? s.dot : '#E5E7EB'}`, borderRadius: '20px', background: statut === s.key ? s.bg : '#fff', color: statut === s.key ? s.color : '#9CA3AF', fontSize: '10px', fontWeight: statut === s.key ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      {statut === s.key && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: s.dot }} />}
                      {s.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Documents du client */}
          {panelDocs.length > 0 && (
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', background: '#FFFBEB' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="ti ti-paperclip" style={{ fontSize: '12px' }} />
                Documents uploadés par le client
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {panelDocs.map(doc => (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: '#fff', borderRadius: '8px', border: '1px solid #FDE68A' }}>
                    <i className="ti ti-file" style={{ fontSize: '14px', color: '#D97706', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '500', color: '#92400E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nom || doc.code_doc}</div>
                      <div style={{ fontSize: '10px', color: '#B45309' }}>{new Date(doc.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</div>
                    </div>
                    <a href={`/api/generate-doc?path=${encodeURIComponent(doc.url)}`} download
                      style={{ width: '26px', height: '26px', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', flexShrink: 0 }}>
                      <i className="ti ti-download" style={{ fontSize: '12px', color: '#D97706' }} />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {panelMessages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#9CA3AF', fontSize: '12px' }}>
                <i className="ti ti-message-circle" style={{ fontSize: '24px', display: 'block', marginBottom: '8px', opacity: 0.3 }} />
                Aucun message — démarrez la discussion
              </div>
            ) : panelMessages.map((msg: any) => {
              const isMine = msg.auteur_role === 'consultant'
              const isAuto = msg.type !== 'message'

              if (isAuto) return (
                <div key={msg.id} style={{ textAlign: 'center' }}>
                  <span style={{ fontSize: '11px', color: msg.type === 'validation' ? '#059669' : '#DC2626', background: msg.type === 'validation' ? '#ECFDF5' : '#FEF2F2', padding: '4px 12px', borderRadius: '20px', fontWeight: '600' }}>
                    {msg.type === 'validation' ? '✓ ' : '✗ '}{msg.contenu}
                  </span>
                </div>
              )

              return (
                <div key={msg.id} style={{ display: 'flex', flexDirection: isMine ? 'row-reverse' : 'row', gap: '6px', alignItems: 'flex-end' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: isMine ? '#EBF2FF' : '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`ti ${isMine ? 'ti-user-star' : 'ti-user'}`} style={{ fontSize: '11px', color: isMine ? '#1A56DB' : '#7C3AED' }} />
                  </div>
                  <div style={{ maxWidth: '80%' }}>
                    <div style={{ padding: '8px 12px', borderRadius: isMine ? '12px 3px 12px 12px' : '3px 12px 12px 12px', background: isMine ? '#1A56DB' : '#F3F4F6', color: isMine ? '#fff' : 'var(--text-primary)', fontSize: '13px', lineHeight: '1.5' }}>
                      {msg.contenu}
                    </div>
                    <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '2px', textAlign: isMine ? 'right' : 'left' }}>
                      {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input message */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <textarea
              value={panelInput}
              onChange={e => setPanelInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendPanelMessage() } }}
              placeholder="Envoyer un retour au client..."
              rows={1}
              style={{ flex: 1, padding: '9px 12px', border: '1px solid var(--border)', borderRadius: '9px', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface-hover)', resize: 'none', lineHeight: '1.5', maxHeight: '80px', overflowY: 'auto', boxSizing: 'border-box' as const }}
              onInput={e => { const el = e.target as HTMLTextAreaElement; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 80) + 'px' }}
              onFocus={e => e.target.style.borderColor = '#7C3AED'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <button onClick={sendPanelMessage} disabled={panelSending || !panelInput.trim()}
              style={{ width: '36px', height: '36px', background: panelSending || !panelInput.trim() ? 'rgba(124,58,237,0.2)' : '#7C3AED', border: 'none', borderRadius: '9px', cursor: panelSending || !panelInput.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="ti ti-send" style={{ fontSize: '15px', color: '#fff' }} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}