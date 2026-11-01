'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { critereApplicable } from '@/lib/applicabilite'

const supabase = createClient()

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [kpis, setKpis] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [suivi, setSuivi] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(prof)

    if (prof?.role === 'client') {
      // Client → sa propre progression, pas la liste de clients du consultant
      const { data: soc } = await supabase.from('societes').select('id, raison_sociale').eq('client_id', prof.client_id).single()
      const { data: etabs } = soc ? await supabase.from('etablissements_psdm').select('id').eq('societe_id', soc.id) : { data: [] }
      const etabId = etabs?.[0]?.id
      if (etabId) {
        const [{ data: reps }, { data: crits }, { data: acts }, { count: evts }, { count: recls }] = await Promise.all([
          supabase.from('reponses_criteres').select('critere_id, statut').eq('etablissement_id', etabId),
          supabase.from('criteres_psdm').select('id, champ_application'),
          supabase.from('activites_etablissement').select('activite').eq('etablissement_id', etabId).neq('mode', 'non_concerne'),
          supabase.from('evenements_indesirables').select('id', { count: 'exact', head: true }).eq('etablissement_id', etabId).neq('statut', 'clos'),
          supabase.from('registre_reclamations').select('id', { count: 'exact', head: true }).eq('etablissement_id', etabId).neq('statut', 'clos'),
        ])
        // Même calcul que la page Certification : seuls les critères applicables aux activités de l'établissement comptent
        const activites = (acts || []).map(a => a.activite)
        const statuts = new Map((reps || []).map(r => [r.critere_id, r.statut]))
        const applicables = (crits || []).filter(c => critereApplicable(c.champ_application, activites)).map(c => statuts.get(c.id) || 'non_analyse')
        const compte = (s: string) => applicables.filter(st => st === s).length
        setSuivi({ societe: soc?.raison_sociale, total: applicables.length, prets: compte('pret_audit'), aValider: compte('procedure_a_valider'), correctives: compte('action_corrective'), aTraiter: applicables.length - compte('pret_audit') - compte('procedure_a_valider') - compte('action_corrective'), evts: evts || 0, recls: recls || 0 })
      } else {
        setSuivi({ societe: soc?.raison_sociale, total: 0, prets: 0, aValider: 0, correctives: 0, aTraiter: 0, evts: 0, recls: 0 })
      }
      setLoading(false)
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

  if (profile?.role === 'client' && suivi) {
    const total = suivi.total
    const score = total > 0 ? Math.round((suivi.prets / total) * 100) : 0
    const carte = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }
    const actions = [
      { n: suivi.correctives, label: 'action(s) corrective(s) à mener', icon: 'ti-alert-triangle', color: '#DC2626', path: '/dashboard/certification' },
      { n: suivi.aValider, label: 'procédure(s) en attente de validation', icon: 'ti-clock', color: '#D97706', path: '/dashboard/certification' },
      { n: suivi.aTraiter, label: 'critère(s) à compléter', icon: 'ti-file-alert', color: '#6E56CF', path: '/dashboard/certification' },
      { n: suivi.evts, label: 'événement(s) indésirable(s) ouvert(s)', icon: 'ti-urgent', color: '#DC2626', path: '/dashboard/certification' },
      { n: suivi.recls, label: 'réclamation(s) en cours', icon: 'ti-message-report', color: '#D97706', path: '/dashboard/certification' },
    ].filter(a => a.n > 0)
    return (
      <div style={{ padding: '28px', fontFamily: 'var(--font)', maxWidth: '1100px' }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
            Bonjour {profile?.prenom || profile?.nom || ''}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '3px' }}>
            {suivi.societe ? `${suivi.societe} : ` : ''}où en est votre certification HAS
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Progression vers l\'audit', value: `${score}%`, icon: 'ti-chart-bar', color: 'var(--accent)', bg: 'var(--accent-light)' },
            { label: `Critères prêts (sur ${total})`, value: suivi.prets, icon: 'ti-circle-check', color: '#059669', bg: '#ECFDF5' },
            { label: 'À valider', value: suivi.aValider, icon: 'ti-clock', color: '#D97706', bg: '#FFFBEB' },
            { label: 'Actions correctives', value: suivi.correctives, icon: 'ti-alert-triangle', color: '#DC2626', bg: '#FEF2F2' },
          ].map(s => (
            <div key={s.label} style={{ ...carte, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
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
          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px' }}>À faire</div>
            <div style={{ ...carte, overflow: 'hidden' }}>
              {actions.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: 'var(--text-tertiary)' }}>Rien en attente : tous vos critères sont prêts.</div>
              ) : actions.map((a, i) => (
                <button key={a.label} onClick={() => router.push(a.path)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: 'none', border: 'none', borderTop: i ? '1px solid var(--border)' : 'none', cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left' }}>
                  <i className={`ti ${a.icon}`} style={{ fontSize: '18px', color: a.color }} />
                  <span style={{ fontSize: '14px', fontWeight: '700', color: a.color, minWidth: '24px' }}>{a.n}</span>
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)', flex: 1 }}>{a.label}</span>
                  <i className="ti ti-chevron-right" style={{ fontSize: '14px', color: 'var(--text-tertiary)' }} />
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px' }}>Accès rapide</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Continuer la certification', icon: 'ti-shield-check', path: '/dashboard/certification' },
                { label: 'Mes documents', icon: 'ti-files', path: '/dashboard/documents' },
                { label: 'Ressources humaines', icon: 'ti-users', path: '/dashboard/rh' },
                { label: 'Mon profil', icon: 'ti-building', path: '/dashboard/profil' },
              ].map(l => (
                <button key={l.path} onClick={() => router.push(l.path)}
                  style={{ ...carte, display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 16px', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '13px', color: 'var(--text-primary)', textAlign: 'left' }}>
                  <i className={`ti ${l.icon}`} style={{ fontSize: '17px', color: 'var(--accent)' }} />
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

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
          { label: 'Clients actifs', value: totalClients, icon: 'ti-building', color: 'var(--accent)', bg: 'var(--accent-light)' },
          { label: 'Critères validés', value: totalPrets, icon: 'ti-circle-check', color: '#059669', bg: '#ECFDF5' },
          { label: 'En attente validation', value: totalAValider, icon: 'ti-clock', color: '#D97706', bg: '#FFFBEB' },
          { label: 'Score moyen', value: `${scoreGlobal}%`, icon: 'ti-chart-bar', color: '#6E56CF', bg: '#F0EEFF' },
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
              style={{ padding: '7px 14px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '5px' }}>
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
                style={{ padding: '9px 20px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                Ajouter un client
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {kpis.map(({ client, score, prets, total, aValider }) => (
                <div key={client.id}
                  onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 18px', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'var(--accent)'; el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'var(--border)'; el.style.boxShadow = 'none' }}>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg, #6E56CF, var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
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
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`ti ${notif.type === 'document_signe' ? 'ti-signature' : notif.type === 'critere_a_valider' ? 'ti-clipboard-check' : 'ti-bell'}`} style={{ fontSize: '15px', color: 'var(--accent)' }} />
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