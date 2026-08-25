'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const CHAPITRES = [
  { num: '1', label: 'Ethique, droits et satisfaction', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  { num: '2', label: 'Distribution et realisation', color: '#1A56DB', bg: '#EBF2FF', border: '#BFDBFE' },
  { num: '3', label: 'Fonctions support', color: '#0A7C4E', bg: '#E8F5EE', border: '#A7F3D0' },
  { num: '4', label: 'Qualite et risques', color: '#B45309', bg: '#FEF3C7', border: '#FDE68A' },
]

export default function Dashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [societe, setSociete] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [clientsKpi, setClientsKpi] = useState<any[]>([])
  const [reponses, setReponses] = useState<any[]>([])
  const [criteres, setCriteres] = useState<any[]>([])
  const [docsCount, setDocsCount] = useState(0)
  const [messagesNonLus, setMessagesNonLus] = useState(0)
  const [docsAValider, setDocsAValider] = useState(0)
  const [actionsCorrectifs, setActionsCorrectifs] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      if (prof?.role === 'consultant') {
        // Charger tous les clients
        const { data: cls } = await supabase.from('clients').select('*').eq('statut', 'actif').order('nom')
        setClients(cls || [])

        // KPI par client
        const kpiList: any[] = []
        let totalMsgsNonLus = 0
        let totalAValider = 0
        let totalActionsCorr = 0

        for (const client of cls || []) {
          const { data: soc } = await supabase.from('societes').select('id, raison_sociale').eq('client_id', client.id).single()
          if (!soc) { kpiList.push({ client, score: 0, prets: 0, aValider: 0, actionsCorr: 0, msgsNonLus: 0, lastActivity: null }); continue }

          const { data: etabs } = await supabase.from('etablissements_psdm').select('id').eq('societe_id', soc.id)
          const etabId = etabs?.[0]?.id
          if (!etabId) { kpiList.push({ client, soc, score: 0, prets: 0, aValider: 0, actionsCorr: 0, msgsNonLus: 0, lastActivity: null }); continue }

          const { data: crits } = await supabase.from('criteres_psdm').select('id').order('code')
          const { data: reps } = await supabase.from('reponses_criteres').select('*').eq('etablissement_id', etabId)
          const { data: msgs } = await supabase.from('messages_critere').select('id').eq('etablissement_id', etabId).eq('lu_consultant', false)

          const total = crits?.length || 0
          const prets = reps?.filter(r => r.statut === 'pret_audit').length || 0
          const aVal = reps?.filter(r => r.statut === 'procedure_a_valider').length || 0
          const actCorr = reps?.filter(r => r.statut === 'action_corrective').length || 0
          const score = total > 0 ? Math.round((prets / total) * 100) : 0
          const msgsNonLus = msgs?.length || 0

          const lastRep = reps?.sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())[0]

          totalMsgsNonLus += msgsNonLus
          totalAValider += aVal
          totalActionsCorr += actCorr

          kpiList.push({ client, soc, score, prets, total, aValider: aVal, actionsCorr: actCorr, msgsNonLus, lastActivity: lastRep?.updated_at || lastRep?.created_at || null })
        }

        setClientsKpi(kpiList)
        setMessagesNonLus(totalMsgsNonLus)
        setDocsAValider(totalAValider)
        setActionsCorrectifs(totalActionsCorr)

      } else if (prof?.client_id) {
        const { data: soc } = await supabase.from('societes').select('*').eq('client_id', prof.client_id).single()
        setSociete(soc)
        if (soc) {
          const { data: etabs } = await supabase.from('etablissements_psdm').select('id').eq('societe_id', soc.id)
          const etabId = etabs?.[0]?.id
          if (etabId) {
            const { data: reps } = await supabase.from('reponses_criteres').select('*').eq('etablissement_id', etabId)
            setReponses(reps || [])
            const { count } = await supabase.from('documents_qualite').select('*', { count: 'exact', head: true }).eq('etablissement_id', etabId)
            setDocsCount(count || 0)
            const { data: msgs } = await supabase.from('messages_critere').select('id').eq('etablissement_id', etabId).eq('lu_client', false)
            setMessagesNonLus(msgs?.length || 0)
          }
          const { data: crits } = await supabase.from('criteres_psdm').select('*').order('code')
          setCriteres(crits || [])
        }
      }

      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: 'var(--font)', color: 'var(--text-tertiary)', fontSize: '13px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #7C3AED, #1A56DB)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <i className="ti ti-shield-check" style={{ fontSize: '20px', color: '#fff' }} />
        </div>
        Chargement...
      </div>
    </div>
  )

  // ===================== VUE CONSULTANT =====================
  if (profile?.role === 'consultant') {
    const scoreMoyen = clientsKpi.length > 0 ? Math.round(clientsKpi.reduce((acc, k) => acc + k.score, 0) / clientsKpi.length) : 0
    const clientsUrgents = clientsKpi.filter(k => k.actionsCorr > 0 || k.aValider > 0).sort((a, b) => (b.actionsCorr + b.aValider) - (a.actionsCorr + a.aValider))

    return (
      <div style={{ padding: '28px', fontFamily: 'var(--font)', maxWidth: '1100px' }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Bonjour {profile?.prenom || profile?.nom || ''} 👋
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* KPI globaux */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px', marginBottom: '28px' }}>
          {[
            { icon: 'ti-building-hospital', color: '#1A56DB', bg: '#EBF2FF', value: clients.length, label: 'Clients actifs', onClick: () => router.push('/dashboard/clients') },
            { icon: 'ti-chart-line', color: '#059669', bg: '#ECFDF5', value: scoreMoyen + '%', label: 'Score moyen certification', onClick: null },
            { icon: 'ti-message-circle', color: '#7C3AED', bg: '#F5F3FF', value: messagesNonLus, label: 'Messages non lus', onClick: () => router.push('/dashboard/notifications'), badge: messagesNonLus > 0 },
            { icon: 'ti-clock', color: '#2563EB', bg: '#EFF6FF', value: docsAValider, label: 'Critères à valider', onClick: null },
            { icon: 'ti-alert-triangle', color: '#DC2626', bg: '#FEF2F2', value: actionsCorrectifs, label: 'Actions correctives', onClick: null },
          ].map(k => (
            <div key={k.label} onClick={k.onClick || undefined}
              style={{ background: 'var(--surface)', border: `1px solid ${Number(k.value) > 0 && k.badge ? '#BFDBFE' : 'var(--border)'}`, borderRadius: '12px', padding: '18px', cursor: k.onClick ? 'pointer' : 'default', transition: 'all 0.1s', position: 'relative' }}
              onMouseEnter={e => { if (k.onClick) (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)' }}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'}>
              {k.badge && k.value > 0 && (
                <div style={{ position: 'absolute', top: '12px', right: '12px', width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }} />
              )}
              <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px' }}>
                <i className={`ti ${k.icon}`} style={{ fontSize: '18px', color: k.color }} />
              </div>
              <div style={{ fontSize: '26px', fontWeight: '700', color: k.color, letterSpacing: '-0.5px', lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', lineHeight: '1.3' }}>{k.label}</div>
            </div>
          ))}
        </div>

        {/* Clients nécessitant attention */}
        {clientsUrgents.length > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid #FECACA', borderRadius: '14px', overflow: 'hidden', marginBottom: '20px' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #FEE2E2', background: '#FEF2F2', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: '15px', color: '#DC2626' }} />
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#DC2626' }}>Clients nécessitant votre attention</span>
              <span style={{ fontSize: '12px', color: '#9CA3AF', marginLeft: '4px' }}>{clientsUrgents.length} client{clientsUrgents.length > 1 ? 's' : ''}</span>
            </div>
            {clientsUrgents.slice(0, 5).map((k, i) => (
              <div key={k.client.id} onClick={() => router.push('/dashboard/clients/' + k.client.id)}
                style={{ padding: '14px 20px', borderBottom: i < Math.min(clientsUrgents.length, 5) - 1 ? '1px solid #FEE2E2' : 'none', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', background: '#fff' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#FEF2F2'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = '#fff'}>
                <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#DC2626' }}>{k.client.nom?.charAt(0).toUpperCase()}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{k.soc?.raison_sociale || k.client.nom}</div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                    {k.actionsCorr > 0 && (
                      <span style={{ fontSize: '11px', color: '#DC2626', background: '#FEE2E2', padding: '1px 7px', borderRadius: '20px', fontWeight: '600' }}>
                        {k.actionsCorr} action{k.actionsCorr > 1 ? 's' : ''} corrective{k.actionsCorr > 1 ? 's' : ''}
                      </span>
                    )}
                    {k.aValider > 0 && (
                      <span style={{ fontSize: '11px', color: '#2563EB', background: '#EFF6FF', padding: '1px 7px', borderRadius: '20px', fontWeight: '600' }}>
                        {k.aValider} à valider
                      </span>
                    )}
                    {k.msgsNonLus > 0 && (
                      <span style={{ fontSize: '11px', color: '#7C3AED', background: '#F5F3FF', padding: '1px 7px', borderRadius: '20px', fontWeight: '600' }}>
                        {k.msgsNonLus} message{k.msgsNonLus > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: k.score >= 75 ? '#10B981' : k.score >= 50 ? '#F59E0B' : '#EF4444' }}>{k.score}%</div>
                  <i className="ti ti-chevron-right" style={{ fontSize: '14px', color: 'var(--text-tertiary)' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tous les clients */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Tous les clients</div>
            <button onClick={() => router.push('/dashboard/clients')}
              style={{ padding: '6px 14px', background: '#1A56DB', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)' }}>
              Gérer
            </button>
          </div>
          {clientsKpi.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <i className="ti ti-building-hospital" style={{ fontSize: '32px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '12px', opacity: 0.3 }} />
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '16px' }}>Aucun client pour le moment</div>
              <button onClick={() => router.push('/dashboard/clients')}
                style={{ padding: '9px 20px', background: '#1A56DB', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                Ajouter un client
              </button>
            </div>
          ) : clientsKpi.map((k, i) => (
            <div key={k.client.id} onClick={() => router.push('/dashboard/clients/' + k.client.id)}
              style={{ padding: '14px 20px', borderBottom: i < clientsKpi.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-hover)'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
              <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: '#EBF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#1A56DB' }}>{k.client.nom?.charAt(0).toUpperCase()}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{k.soc?.raison_sociale || k.client.nom}</div>
                <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {k.msgsNonLus > 0 && (
                    <span style={{ fontSize: '10px', color: '#7C3AED', background: '#F5F3FF', padding: '1px 6px', borderRadius: '20px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#EF4444' }} />
                      {k.msgsNonLus} msg
                    </span>
                  )}
                  {k.aValider > 0 && (
                    <span style={{ fontSize: '10px', color: '#2563EB', background: '#EFF6FF', padding: '1px 6px', borderRadius: '20px', fontWeight: '600' }}>
                      {k.aValider} à valider
                    </span>
                  )}
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    {k.lastActivity ? 'Actif ' + new Date(k.lastActivity).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }) : 'Aucune activité'}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: k.score >= 75 ? '#10B981' : k.score >= 50 ? '#F59E0B' : '#EF4444' }}>{k.score}%</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{k.prets}/{k.total} prêts</div>
                </div>
                <i className="ti ti-chevron-right" style={{ fontSize: '14px', color: 'var(--text-tertiary)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // ===================== VUE CLIENT =====================
  const total = criteres.length
  const prets = reponses.filter(r => r.statut === 'pret_audit').length
  const aValider = reponses.filter(r => r.statut === 'procedure_a_valider').length
  const actionsCorr = reponses.filter(r => r.statut === 'action_corrective').length
  const score = total > 0 ? Math.round((prets / total) * 100) : 0

  const statsByChap = CHAPITRES.map(ch => {
    const critChap = criteres.filter(c => c.chapitre === ch.num)
    const pretsChap = critChap.filter(c => reponses.find(r => r.critere_id === c.id && r.statut === 'pret_audit')).length
    return { ...ch, criteres: critChap.length, prets: pretsChap }
  })

  const criteresNonAnalyses = criteres.filter(c => {
    const rep = reponses.find(r => r.critere_id === c.id)
    return !rep || rep.statut === 'non_analyse'
  }).slice(0, 4)

  if (!societe) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh', fontFamily: 'var(--font)' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px' }}>
        <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, #7C3AED, #1A56DB)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <i className="ti ti-shield-check" style={{ fontSize: '28px', color: '#fff' }} />
        </div>
        <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>Bienvenue sur MediReg</div>
        <div style={{ fontSize: '14px', color: 'var(--text-tertiary)', lineHeight: '1.6', marginBottom: '24px' }}>
          Configurez votre profil pour commencer votre parcours de certification HAS PSDM.
        </div>
        <button onClick={() => router.push('/dashboard/onboarding')}
          style={{ padding: '12px 28px', background: 'linear-gradient(135deg, #7C3AED, #1A56DB)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)' }}>
          Configurer mon profil
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)', maxWidth: '1000px' }}>

      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Bonjour {profile?.prenom || ''} 👋
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            {societe.raison_sociale} · {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
        <button onClick={() => router.push('/dashboard/certification')}
          style={{ padding: '10px 20px', background: '#1A56DB', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="ti ti-shield-check" style={{ fontSize: '15px' }} />
          Continuer ma certification
        </button>
      </div>

      {/* Alerte messages non lus */}
      {messagesNonLus > 0 && (
        <div onClick={() => router.push('/dashboard/certification')}
          style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: '12px', padding: '14px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#7C3AED' }}>
            {messagesNonLus} nouveau{messagesNonLus > 1 ? 'x' : ''} message{messagesNonLus > 1 ? 's' : ''} de votre consultant
          </span>
          <i className="ti ti-arrow-right" style={{ fontSize: '13px', color: '#7C3AED', marginLeft: 'auto' }} />
        </div>
      )}

      {/* Alerte action corrective */}
      {actionsCorr > 0 && (
        <div onClick={() => router.push('/dashboard/certification')}
          style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '14px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: '16px', color: '#DC2626', flexShrink: 0 }} />
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#DC2626' }}>
            {actionsCorr} action{actionsCorr > 1 ? 's' : ''} corrective{actionsCorr > 1 ? 's' : ''} demandée{actionsCorr > 1 ? 's' : ''} par votre consultant
          </span>
          <i className="ti ti-arrow-right" style={{ fontSize: '13px', color: '#DC2626', marginLeft: 'auto' }} />
        </div>
      )}

      {/* Score hero */}
      <div style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #1e3a5f 100%)', borderRadius: '16px', padding: '28px 32px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
            <circle cx="50" cy="50" r="42" fill="none"
              stroke={score >= 75 ? '#10B981' : score >= 50 ? '#F59E0B' : '#6366F1'}
              strokeWidth="10"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * (1 - score / 100)}`}
              strokeLinecap="round" transform="rotate(-90 50 50)" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '24px', fontWeight: '800', color: '#fff' }}>{score}%</span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Score de certification HAS PSDM</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '14px' }}>
            {score === 0 ? 'Commencez votre certification' : score < 30 ? 'Bon début — continuez !' : score < 60 ? 'Bonne progression' : score < 80 ? 'Presque prêt' : 'Excellent niveau !'}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { label: 'Prêts audit', value: prets, color: '#10B981' },
              { label: 'À valider', value: aValider, color: '#3B82F6' },
              { label: 'Action corrective', value: actionsCorr, color: '#EF4444' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: s.color }} />
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>{s.value} {s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
          <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>{docsCount}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>Documents générés</div>
          </div>
          <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>{total}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>Critères total</div>
          </div>
        </div>
      </div>

      {/* Par chapitre */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {statsByChap.map(ch => {
          const pct = ch.criteres > 0 ? Math.round((ch.prets / ch.criteres) * 100) : 0
          return (
            <div key={ch.num} onClick={() => router.push('/dashboard/certification')}
              style={{ background: 'var(--surface)', border: `1px solid ${ch.border}`, borderRadius: '12px', padding: '16px 18px', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: ch.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: ch.color }}>Ch.{ch.num}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{ch.prets}/{ch.criteres} prêts</div>
                </div>
                <span style={{ fontSize: '14px', fontWeight: '700', color: ch.color }}>{pct}%</span>
              </div>
              <div style={{ height: '5px', background: ch.border, borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: ch.color, borderRadius: '3px' }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Prochains critères */}
      {criteresNonAnalyses.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="ti ti-arrow-right" style={{ fontSize: '15px', color: '#1A56DB' }} />
              Prochaines étapes
            </div>
            <button onClick={() => router.push('/dashboard/certification')}
              style={{ fontSize: '12px', color: '#1A56DB', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: '600' }}>
              Voir tout →
            </button>
          </div>
          {criteresNonAnalyses.map((c, i) => {
            const chap = CHAPITRES.find(ch => ch.num === c.chapitre)
            return (
              <div key={c.id} onClick={() => router.push('/dashboard/certification')}
                style={{ padding: '14px 20px', borderBottom: i < criteresNonAnalyses.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-hover)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                <div style={{ width: '32px', height: '32px', borderRadius: '7px', background: chap?.bg || '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: chap?.color || '#6B7280' }}>{c.code}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.titre}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Chapitre {c.chapitre}</div>
                </div>
                <i className="ti ti-chevron-right" style={{ fontSize: '14px', color: 'var(--text-tertiary)', flexShrink: 0 }} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}