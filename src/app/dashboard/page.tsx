'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const supabase = createClient()

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [kpis, setKpis] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)

    if (prof?.role === 'client') {
      // Client → redirect vers certification
      router.push('/dashboard/certification')
      return
    }

    // Consultant → charger ses clients
    const { data: cls } = await supabase
      .from('clients')
      .select('*')
      .eq('statut', 'actif')
      .eq('consultant_id', prof.id)
      .order('nom')
    setClients(cls || [])

    // KPI par client
    const kpiList: any[] = []
    for (const client of cls || []) {
      const { data: soc } = await supabase.from('societes').select('id').eq('client_id', client.id).single()
      if (!soc) { kpiList.push({ client, score: 0, prets: 0, total: 0, aValider: 0 }); continue }
      const { data: etabs } = await supabase.from('etablissements_psdm').select('id').eq('societe_id', soc.id)
      const etabId = etabs?.[0]?.id
      if (!etabId) { kpiList.push({ client, score: 0, prets: 0, total: 0, aValider: 0 }); continue }
      const { data: reps } = await supabase.from('reponses_criteres').select('statut').eq('etablissement_id', etabId)
      const total = 60
      const prets = (reps || []).filter(r => r.statut === 'pret_audit').length
      const aValider = (reps || []).filter(r => r.statut === 'procedure_a_valider').length
      const score = Math.round((prets / total) * 100)
      kpiList.push({ client, score, prets, total, aValider })
    }
    setKpis(kpiList)

    // Notifications non lues
    const { data: notifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('consultant_id', prof.id)
      .eq('lu', false)
      .order('created_at', { ascending: false })
      .limit(10)
    setNotifications(notifs || [])

    setLoading(false)
  }

  async function markNotifLue(id: string) {
    await supabase.from('notifications').update({ lu: true }).eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: 'var(--font)', color: 'var(--text-tertiary)', fontSize: '13px' }}>
      Chargement...
    </div>
  )

  const totalClients = clients.length
  const totalPrets = kpis.reduce((a, k) => a + k.prets, 0)
  const totalAValider = kpis.reduce((a, k) => a + k.aValider, 0)
  const scoreGlobal = kpis.length > 0 ? Math.round(kpis.reduce((a, k) => a + k.score, 0) / kpis.length) : 0

  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)', maxWidth: '1100px' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
          Bonjour {profile?.nom?.split(' ')[0] || 'Consultant'} 👋
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '3px' }}>
          Voici l'état de vos {totalClients} client{totalClients > 1 ? 's' : ''} aujourd'hui
        </div>
      </div>

      {/* KPIs globaux */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Clients actifs', value: totalClients, icon: 'ti-building', color: '#1A56DB', bg: '#EBF2FF' },
          { label: 'Critères validés', value: totalPrets, icon: 'ti-circle-check', color: '#059669', bg: '#ECFDF5' },
          { label: 'En attente validation', value: totalAValider, icon: 'ti-clock', color: '#D97706', bg: '#FFFBEB' },
          { label: 'Score moyen', value: `${scoreGlobal}%`, icon: 'ti-chart-bar', color: '#7C3AED', bg: '#F5F3FF' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`ti ${s.icon}`} style={{ fontSize: '20px', color: s.color }} />
            </div>
            <div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '3px' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>

        {/* Liste clients avec progression */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>Mes clients</div>
            <button onClick={() => router.push('/dashboard/clients')}
              style={{ padding: '7px 14px', background: '#1A56DB', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <i className="ti ti-plus" style={{ fontSize: '13px' }} />
              Ajouter un client
            </button>
          </div>

          {kpis.length === 0 ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '48px', textAlign: 'center' }}>
              <i className="ti ti-building" style={{ fontSize: '32px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '12px', opacity: 0.3 }} />
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>Aucun client</div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>Ajoutez votre premier client pour commencer</div>
              <button onClick={() => router.push('/dashboard/clients')}
                style={{ padding: '9px 20px', background: '#1A56DB', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                Ajouter un client
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {kpis.map(({ client, score, prets, total, aValider }) => (
                <div key={client.id}
                  onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 18px', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = '#1A56DB'; el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'var(--border)'; el.style.boxShadow = 'none' }}>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #7C3AED, #1A56DB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
                      {client.nom?.[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{client.nom}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{client.contact_email}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '20px', fontWeight: '800', color: score >= 75 ? '#059669' : score >= 40 ? '#D97706' : '#DC2626' }}>{score}%</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{prets}/{total} critères</div>
                    </div>
                  </div>

                  {/* Barre de progression */}
                  <div style={{ height: '6px', background: '#F3F4F6', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                    <div style={{ height: '100%', width: `${score}%`, background: score >= 75 ? '#10B981' : score >= 40 ? '#F59E0B' : '#EF4444', borderRadius: '3px', transition: 'width 0.5s' }} />
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {aValider > 0 && (
                      <span style={{ fontSize: '10px', color: '#D97706', background: '#FFFBEB', padding: '2px 8px', borderRadius: '20px', fontWeight: '600' }}>
                        {aValider} en attente de validation
                      </span>
                    )}
                    <span style={{ fontSize: '10px', color: '#6B7280', background: '#F3F4F6', padding: '2px 8px', borderRadius: '20px' }}>
                      {client.forfait || 'starter'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="ti ti-bell" style={{ fontSize: '16px' }} />
            Alertes
            {notifications.length > 0 && (
              <span style={{ fontSize: '11px', fontWeight: '700', color: '#fff', background: '#EF4444', padding: '1px 7px', borderRadius: '20px' }}>{notifications.length}</span>
            )}
          </div>

          {notifications.length === 0 ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
              <i className="ti ti-bell-off" style={{ fontSize: '24px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '8px', opacity: 0.3 }} />
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Aucune alerte pour le moment</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {notifications.map(notif => (
                <div key={notif.id} style={{ background: 'var(--surface)', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '12px 14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#EBF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`ti ${notif.type === 'document_signe' ? 'ti-signature' : notif.type === 'critere_a_valider' ? 'ti-clipboard-check' : 'ti-bell'}`} style={{ fontSize: '15px', color: '#1A56DB' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', color: '#111827', lineHeight: '1.5', marginBottom: '6px' }}>{notif.message}</div>
                    <div style={{ fontSize: '10px', color: '#9CA3AF' }}>{new Date(notif.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                  <button onClick={() => markNotifLue(notif.id)}
                    style={{ width: '24px', height: '24px', border: 'none', borderRadius: '6px', background: '#F3F4F6', color: '#6B7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="ti ti-x" style={{ fontSize: '12px' }} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}