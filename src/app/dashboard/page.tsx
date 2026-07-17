'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({
    clients: 0, audits: 0, nonConformites: 0, plansActions: 0, taches: 0, documents: 0
  })
  const [auditsRecents, setAuditsRecents] = useState<any[]>([])
  const [tachesUrgentes, setTachesUrgentes] = useState<any[]>([])
  const [nonConformitesOuvertes, setNonConformitesOuvertes] = useState<any[]>([])
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
        const { count: cClients } = await supabase.from('clients').select('*', { count: 'exact', head: true })
        const { count: cAudits } = await supabase.from('audits').select('*', { count: 'exact', head: true })
        const { count: cNC } = await supabase.from('non_conformites').select('*', { count: 'exact', head: true }).eq('statut', 'ouverte')
        const { count: cPA } = await supabase.from('plans_actions').select('*', { count: 'exact', head: true }).eq('statut', 'a_faire')
        const { count: cDocs } = await supabase.from('documents').select('*', { count: 'exact', head: true })
        setStats({ clients: cClients || 0, audits: cAudits || 0, nonConformites: cNC || 0, plansActions: cPA || 0, taches: 0, documents: cDocs || 0 })

        const { data: audits } = await supabase.from('audits').select('*, clients(nom)').order('created_at', { ascending: false }).limit(5)
        setAuditsRecents(audits || [])

        const { data: nc } = await supabase.from('non_conformites').select('*, clients(nom)').eq('statut', 'ouverte').eq('niveau', 'majeure').order('created_at', { ascending: false }).limit(4)
        setNonConformitesOuvertes(nc || [])

      } else if (prof?.role === 'admin' && prof?.client_id) {
        const { count: cAudits } = await supabase.from('audits').select('*', { count: 'exact', head: true }).eq('client_id', prof.client_id)
        const { count: cNC } = await supabase.from('non_conformites').select('*', { count: 'exact', head: true }).eq('client_id', prof.client_id).eq('statut', 'ouverte')
        const { count: cPA } = await supabase.from('plans_actions').select('*', { count: 'exact', head: true }).eq('client_id', prof.client_id).neq('statut', 'termine')
        const { count: cTaches } = await supabase.from('taches').select('*', { count: 'exact', head: true }).eq('client_id', prof.client_id).eq('statut', 'a_faire')
        setStats({ clients: 0, audits: cAudits || 0, nonConformites: cNC || 0, plansActions: cPA || 0, taches: cTaches || 0, documents: 0 })

        const { data: audits } = await supabase.from('audits').select('*').eq('client_id', prof.client_id).order('created_at', { ascending: false }).limit(3)
        setAuditsRecents(audits || [])

        const { data: taches } = await supabase.from('taches').select('*').eq('client_id', prof.client_id).eq('statut', 'a_faire').order('echeance', { ascending: true }).limit(4)
        setTachesUrgentes(taches || [])

      } else if (prof?.role === 'client' && prof?.client_id) {
        const { count: cTaches } = await supabase.from('taches').select('*', { count: 'exact', head: true }).eq('client_id', prof.client_id).eq('statut', 'a_faire')
        const { count: cDocs } = await supabase.from('documents').select('*', { count: 'exact', head: true }).eq('client_id', prof.client_id)
        const { count: cPA } = await supabase.from('plans_actions').select('*', { count: 'exact', head: true }).eq('client_id', prof.client_id).neq('statut', 'termine')
        setStats({ clients: 0, audits: 0, nonConformites: 0, plansActions: cPA || 0, taches: cTaches || 0, documents: cDocs || 0 })

        const { data: taches } = await supabase.from('taches').select('*').eq('client_id', prof.client_id).neq('statut', 'termine').order('echeance', { ascending: true }).limit(5)
        setTachesUrgentes(taches || [])
      }

      setLoading(false)
    }
    load()
  }, [])

  const card = (icon: string, color: string, bg: string, value: number, label: string, sub: string, path: string) => (
    <div onClick={() => router.push(path)}
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px', cursor: 'pointer' }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-sm)', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className={`ti ${icon}`} style={{ fontSize: '17px', color }} />
        </div>
        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', background: 'var(--surface-hover)', padding: '2px 8px', borderRadius: '20px', border: '1px solid var(--border)' }}>{sub}</span>
      </div>
      <div style={{ fontSize: '30px', fontWeight: '700', color, letterSpacing: '-1px', lineHeight: 1, marginBottom: '4px' }}>{value}</div>
      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{label}</div>
    </div>
  )

  const statutAudit = (s: string) => {
    if (s === 'en_cours') return { label: 'En cours', color: 'var(--warning)', bg: 'var(--warning-light)' }
    if (s === 'termine') return { label: 'Termine', color: 'var(--success)', bg: 'var(--success-light)' }
    return { label: 'Archive', color: 'var(--text-tertiary)', bg: 'var(--surface-hover)' }
  }

  const niveauNC = (n: string) => {
    if (n === 'majeure') return { color: 'var(--danger)', bg: 'var(--danger-light)' }
    if (n === 'mineure') return { color: 'var(--warning)', bg: 'var(--warning-light)' }
    return { color: 'var(--text-tertiary)', bg: 'var(--surface-hover)' }
  }

  const prioriteTache = (p: string) => {
    if (p === 'urgente') return { color: 'var(--danger)', bg: 'var(--danger-light)' }
    if (p === 'haute') return { color: 'var(--warning)', bg: 'var(--warning-light)' }
    return { color: 'var(--accent)', bg: 'var(--accent-light)' }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: 'var(--font)', color: 'var(--text-tertiary)', fontSize: '13px' }}>
      Chargement...
    </div>
  )

  return (
    <div style={{ padding: '24px', fontFamily: 'var(--font)', maxWidth: '1400px' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          Bonjour {profile?.prenom || ''} 👋
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* CONSULTANT */}
      {profile?.role === 'consultant' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            {card('ti-building-hospital', 'var(--accent)', 'var(--accent-light)', stats.clients, 'Clients', 'Total', '/dashboard/clients')}
            {card('ti-clipboard-check', '#7C3AED', '#F5F3FF', stats.audits, 'Audits', 'Total', '/dashboard/audits')}
            {card('ti-alert-triangle', 'var(--danger)', 'var(--danger-light)', stats.nonConformites, 'Non-conformites', 'Ouvertes', '/dashboard/audits')}
            {card('ti-list-check', 'var(--warning)', 'var(--warning-light)', stats.plansActions, 'Plans d actions', 'A faire', '/dashboard/audits')}
            {card('ti-books', 'var(--success)', 'var(--success-light)', stats.documents, 'Documents', 'Bibliotheque', '/dashboard/bibliotheque')}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

            {/* Audits recents */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: 'var(--radius-sm)', background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="ti ti-clipboard-check" style={{ fontSize: '13px', color: '#7C3AED' }} />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Audits recents</span>
                </div>
                <button onClick={() => router.push('/dashboard/audits')} style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: '500' }}>Voir tout</button>
              </div>
              {auditsRecents.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>Aucun audit</div>
              ) : auditsRecents.map((a, i) => {
                const st = statutAudit(a.statut)
                return (
                  <div key={a.id} style={{ padding: '12px 18px', borderBottom: i < auditsRecents.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.titre}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{(a.clients as any)?.nom || '-'} {a.date_audit ? '· ' + new Date(a.date_audit).toLocaleDateString('fr-FR') : ''}</div>
                    </div>
                    {a.score !== null && <div style={{ fontSize: '14px', fontWeight: '700', color: a.score >= 80 ? 'var(--success)' : a.score >= 60 ? 'var(--warning)' : 'var(--danger)' }}>{a.score}%</div>}
                    <span style={{ fontSize: '10px', fontWeight: '500', color: st.color, background: st.bg, padding: '2px 8px', borderRadius: '20px', flexShrink: 0 }}>{st.label}</span>
                  </div>
                )
              })}
            </div>

            {/* Non-conformites majeures */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: 'var(--radius-sm)', background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="ti ti-alert-triangle" style={{ fontSize: '13px', color: 'var(--danger)' }} />
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Non-conformites majeures</span>
                  {nonConformitesOuvertes.length > 0 && <span style={{ background: 'var(--danger)', color: '#fff', fontSize: '10px', fontWeight: '600', padding: '1px 6px', borderRadius: '10px' }}>{nonConformitesOuvertes.length}</span>}
                </div>
              </div>
              {nonConformitesOuvertes.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                    <i className="ti ti-check" style={{ fontSize: '18px', color: 'var(--success)' }} />
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Aucune non-conformite majeure</div>
                </div>
              ) : nonConformitesOuvertes.map((nc, i) => {
                const nv = niveauNC(nc.niveau)
                return (
                  <div key={nc.id} style={{ padding: '12px 18px', borderBottom: i < nonConformitesOuvertes.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: nv.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nc.titre}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{(nc.clients as any)?.nom || '-'}</div>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: '500', color: nv.color, background: nv.bg, padding: '2px 8px', borderRadius: '20px', flexShrink: 0, textTransform: 'capitalize' }}>{nc.niveau}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ADMIN */}
      {profile?.role === 'admin' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            {card('ti-clipboard-check', '#7C3AED', '#F5F3FF', stats.audits, 'Audits', 'Total', '/dashboard/conformite')}
            {card('ti-alert-triangle', 'var(--danger)', 'var(--danger-light)', stats.nonConformites, 'Non-conformites', 'Ouvertes', '/dashboard/conformite')}
            {card('ti-list-check', 'var(--warning)', 'var(--warning-light)', stats.plansActions, 'Plans d actions', 'En attente', '/dashboard/conformite')}
            {card('ti-checklist', 'var(--accent)', 'var(--accent-light)', stats.taches, 'Taches', 'A faire', '/dashboard/taches')}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Audits */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Mes audits</span>
                <button onClick={() => router.push('/dashboard/conformite')} style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: '500' }}>Voir tout</button>
              </div>
              {auditsRecents.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>Aucun audit en cours</div>
              ) : auditsRecents.map((a, i) => {
                const st = statutAudit(a.statut)
                return (
                  <div key={a.id} style={{ padding: '12px 18px', borderBottom: i < auditsRecents.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.titre}</div>
                      {a.date_audit && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{new Date(a.date_audit).toLocaleDateString('fr-FR')}</div>}
                    </div>
                    {a.score !== null && <div style={{ fontSize: '14px', fontWeight: '700', color: a.score >= 80 ? 'var(--success)' : a.score >= 60 ? 'var(--warning)' : 'var(--danger)' }}>{a.score}%</div>}
                    <span style={{ fontSize: '10px', fontWeight: '500', color: st.color, background: st.bg, padding: '2px 8px', borderRadius: '20px', flexShrink: 0 }}>{st.label}</span>
                  </div>
                )
              })}
            </div>

            {/* Taches */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Taches en attente</span>
                <button onClick={() => router.push('/dashboard/taches')} style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: '500' }}>Voir tout</button>
              </div>
              {tachesUrgentes.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                    <i className="ti ti-check" style={{ fontSize: '18px', color: 'var(--success)' }} />
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Aucune tache en attente</div>
                </div>
              ) : tachesUrgentes.map((t, i) => {
                const pr = prioriteTache(t.priorite)
                return (
                  <div key={t.id} style={{ padding: '12px 18px', borderBottom: i < tachesUrgentes.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.titre}</div>
                      {t.echeance && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Echeance : {new Date(t.echeance).toLocaleDateString('fr-FR')}</div>}
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: '500', color: pr.color, background: pr.bg, padding: '2px 8px', borderRadius: '20px', flexShrink: 0, textTransform: 'capitalize' }}>{t.priorite}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* CLIENT */}
      {profile?.role === 'client' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
            {card('ti-checklist', 'var(--accent)', 'var(--accent-light)', stats.taches, 'Mes taches', 'A faire', '/dashboard/taches')}
            {card('ti-list-check', 'var(--warning)', 'var(--warning-light)', stats.plansActions, 'Plans d actions', 'En cours', '/dashboard/conformite')}
            {card('ti-books', 'var(--success)', 'var(--success-light)', stats.documents, 'Documents', 'Disponibles', '/dashboard/bibliotheque')}
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Que faire aujourd hui ?</span>
              <button onClick={() => router.push('/dashboard/taches')} style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: '500' }}>Voir tout</button>
            </div>
            {tachesUrgentes.length === 0 ? (
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <i className="ti ti-check" style={{ fontSize: '24px', color: 'var(--success)' }} />
                </div>
                <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '4px' }}>Tout est a jour</div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Aucune tache en attente pour aujourd hui</div>
              </div>
            ) : tachesUrgentes.map((t, i) => {
              const pr = prioriteTache(t.priorite)
              return (
                <div key={t.id} style={{ padding: '14px 18px', borderBottom: i < tachesUrgentes.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-sm)', background: pr.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="ti ti-checklist" style={{ fontSize: '16px', color: pr.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.titre}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{t.description || 'Aucune description'}</div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    {t.echeance && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{new Date(t.echeance).toLocaleDateString('fr-FR')}</div>}
                    <span style={{ fontSize: '10px', fontWeight: '500', color: pr.color, background: pr.bg, padding: '2px 8px', borderRadius: '20px', textTransform: 'capitalize' }}>{t.priorite}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}