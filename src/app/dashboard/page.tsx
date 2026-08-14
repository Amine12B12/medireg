'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [stats, setStats] = useState({ clients: 0, audits: 0, nonConformites: 0, plansActions: 0, taches: 0, documents: 0 })
  const [auditsRecents, setAuditsRecents] = useState<any[]>([])
  const [tachesUrgentes, setTachesUrgentes] = useState<any[]>([])
  const [ncMajeures, setNcMajeures] = useState<any[]>([])
  const [actionsEnRetard, setActionsEnRetard] = useState<any[]>([])
  const [clientsSansObligations, setClientsSansObligations] = useState<any[]>([])
  const [prochainesEcheances, setProchainesEcheances] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()
  const today = new Date()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      if (prof?.role === 'consultant') {
        // Stats globales
        const { count: cClients } = await supabase.from('clients').select('*', { count: 'exact', head: true }).eq('statut', 'actif')
        const { count: cAudits } = await supabase.from('audits').select('*', { count: 'exact', head: true })
        const { count: cNC } = await supabase.from('non_conformites').select('*', { count: 'exact', head: true }).eq('statut', 'ouverte')
        const { count: cPA } = await supabase.from('plans_actions').select('*', { count: 'exact', head: true }).eq('statut', 'a_faire')
        const { count: cDocs } = await supabase.from('documents').select('*', { count: 'exact', head: true })
        setStats({ clients: cClients || 0, audits: cAudits || 0, nonConformites: cNC || 0, plansActions: cPA || 0, taches: 0, documents: cDocs || 0 })

        // NC majeures ouvertes — priorité absolue
        const { data: nc } = await supabase.from('non_conformites')
          .select('*, clients(nom, ville)')
          .eq('statut', 'ouverte')
          .eq('niveau', 'majeure')
          .order('created_at', { ascending: false })
          .limit(6)
        setNcMajeures(nc || [])

        // Actions en retard (echeance depassee)
        const { data: paRetard } = await supabase.from('plans_actions')
          .select('*, non_conformites(titre), clients(nom)')
          .neq('statut', 'termine')
          .lt('echeance', today.toISOString().split('T')[0])
          .order('echeance', { ascending: true })
          .limit(5)
        setActionsEnRetard(paRetard || [])

        // Prochaines echeances (7 prochains jours)
        const in7days = new Date(today)
        in7days.setDate(in7days.getDate() + 7)
        const { data: echeances } = await supabase.from('plans_actions')
          .select('*, clients(nom)')
          .neq('statut', 'termine')
          .gte('echeance', today.toISOString().split('T')[0])
          .lte('echeance', in7days.toISOString().split('T')[0])
          .order('echeance', { ascending: true })
          .limit(5)
        setProchainesEcheances(echeances || [])

        // Audits recents
        const { data: audits } = await supabase.from('audits')
          .select('*, clients(nom, ville)')
          .order('created_at', { ascending: false })
          .limit(5)
        setAuditsRecents(audits || [])

        // Clients sans audits (manquent a leurs obligations)
        const { data: allClients } = await supabase.from('clients').select('id, nom, type, ville, statut').eq('statut', 'actif').order('nom')
        const { data: allAudits } = await supabase.from('audits').select('client_id')
        const clientsAvecAudits = new Set((allAudits || []).map((a: any) => a.client_id))
        const sansPrepare = (allClients || []).filter(c => !clientsAvecAudits.has(c.id))
        setClientsSansObligations(sansPrepare)

      } else if (prof?.role === 'admin' && prof?.client_id) {
        const { count: cAudits } = await supabase.from('audits').select('*', { count: 'exact', head: true }).eq('client_id', prof.client_id)
        const { count: cNC } = await supabase.from('non_conformites').select('*', { count: 'exact', head: true }).eq('client_id', prof.client_id).eq('statut', 'ouverte')
        const { count: cPA } = await supabase.from('plans_actions').select('*', { count: 'exact', head: true }).eq('client_id', prof.client_id).neq('statut', 'termine')
        const { count: cTaches } = await supabase.from('taches').select('*', { count: 'exact', head: true }).eq('client_id', prof.client_id).eq('statut', 'a_faire')
        setStats({ clients: 0, audits: cAudits || 0, nonConformites: cNC || 0, plansActions: cPA || 0, taches: cTaches || 0, documents: 0 })

        const { data: nc } = await supabase.from('non_conformites').select('*').eq('client_id', prof.client_id).eq('statut', 'ouverte').eq('niveau', 'majeure').order('created_at', { ascending: false }).limit(4)
        setNcMajeures(nc || [])

        const { data: paRetard } = await supabase.from('plans_actions').select('*, non_conformites(titre)').eq('client_id', prof.client_id).neq('statut', 'termine').lt('echeance', today.toISOString().split('T')[0]).order('echeance', { ascending: true }).limit(5)
        setActionsEnRetard(paRetard || [])

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

  const scoreColor = (s: number) => s >= 80 ? 'var(--success)' : s >= 60 ? 'var(--warning)' : 'var(--danger)'

  const prioriteTache = (p: string) => {
    if (p === 'urgente') return { color: 'var(--danger)', bg: 'var(--danger-light)' }
    if (p === 'haute') return { color: 'var(--warning)', bg: 'var(--warning-light)' }
    return { color: 'var(--accent)', bg: 'var(--accent-light)' }
  }

  const typeColors: Record<string, { color: string; bg: string }> = {
    'Hopital': { color: 'var(--danger)', bg: 'var(--danger-light)' },
    'Clinique': { color: '#7C3AED', bg: '#F5F3FF' },
    'PSDM': { color: 'var(--accent)', bg: 'var(--accent-light)' },
    'EHPAD': { color: 'var(--success)', bg: 'var(--success-light)' },
    'Pharmacie': { color: 'var(--warning)', bg: 'var(--warning-light)' },
    'Centre de soins': { color: '#0891B2', bg: '#E0F2FE' },
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: 'var(--font)', color: 'var(--text-tertiary)', fontSize: '13px' }}>
      Chargement...
    </div>
  )

  return (
    <div style={{ padding: '24px', fontFamily: 'var(--font)', maxWidth: '1400px' }}>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          Bonjour {profile?.prenom || ''} 👋
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* ===== CONSULTANT ===== */}
      {profile?.role === 'consultant' && (
        <>
          {/* Alerte NC majeures — visible immediatement */}
          {ncMajeures.length > 0 && (
            <div style={{ background: 'var(--danger-light)', border: '1px solid rgba(194,54,42,0.3)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="ti ti-alert-triangle" style={{ fontSize: '18px', color: '#fff' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--danger)', marginBottom: '2px' }}>
                  {ncMajeures.length} non-conformite{ncMajeures.length > 1 ? 's' : ''} majeure{ncMajeures.length > 1 ? 's' : ''} ouverte{ncMajeures.length > 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--danger)', opacity: 0.8 }}>
                  {ncMajeures.slice(0, 3).map(nc => (nc.clients as any)?.nom || '-').join(', ')}
                  {ncMajeures.length > 3 ? ` + ${ncMajeures.length - 3} autre(s)` : ''}
                </div>
              </div>
              <button onClick={() => router.push('/dashboard/audits')}
                style={{ padding: '7px 14px', background: 'var(--danger)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0 }}>
                Voir tout
              </button>
            </div>
          )}

          {/* Alerte actions en retard */}
          {actionsEnRetard.length > 0 && (
            <div style={{ background: 'var(--warning-light)', border: '1px solid rgba(158,94,0,0.3)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--warning)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="ti ti-clock-exclamation" style={{ fontSize: '18px', color: '#fff' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--warning)', marginBottom: '2px' }}>
                  {actionsEnRetard.length} action{actionsEnRetard.length > 1 ? 's' : ''} en retard
                </div>
                <div style={{ fontSize: '12px', color: 'var(--warning)', opacity: 0.8 }}>
                  Echeance{actionsEnRetard.length > 1 ? 's' : ''} depassee{actionsEnRetard.length > 1 ? 's' : ''} — action requise
                </div>
              </div>
              <button onClick={() => router.push('/dashboard/conformite')}
                style={{ padding: '7px 14px', background: 'var(--warning)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0 }}>
                Traiter
              </button>
            </div>
          )}

          {/* KPI row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', marginBottom: '20px' }}>
            {[
              { icon: 'ti-building-hospital', color: 'var(--accent)', bg: 'var(--accent-light)', value: stats.clients, label: 'Clients actifs', path: '/dashboard/clients' },
              { icon: 'ti-clipboard-check', color: '#7C3AED', bg: '#F5F3FF', value: stats.audits, label: 'Audits', path: '/dashboard/audits' },
              { icon: 'ti-alert-triangle', color: 'var(--danger)', bg: 'var(--danger-light)', value: stats.nonConformites, label: 'NC ouvertes', path: '/dashboard/audits' },
              { icon: 'ti-list-check', color: 'var(--warning)', bg: 'var(--warning-light)', value: actionsEnRetard.length, label: 'Actions retard', path: '/dashboard/conformite' },
              { icon: 'ti-books', color: 'var(--success)', bg: 'var(--success-light)', value: stats.documents, label: 'Documents', path: '/dashboard/bibliotheque' },
            ].map(k => (
              <div key={k.label} onClick={() => router.push(k.path)}
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', cursor: 'pointer' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: 'var(--radius-sm)', background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                  <i className={`ti ${k.icon}`} style={{ fontSize: '15px', color: k.color }} />
                </div>
                <div style={{ fontSize: '26px', fontWeight: '700', color: k.color, letterSpacing: '-0.5px', lineHeight: 1, marginBottom: '4px' }}>{k.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{k.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>

            {/* Actions en retard detail */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="ti ti-clock-exclamation" style={{ fontSize: '15px', color: 'var(--danger)' }} />
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Actions en retard</span>
                  {actionsEnRetard.length > 0 && <span style={{ background: 'var(--danger)', color: '#fff', fontSize: '10px', fontWeight: '600', padding: '1px 6px', borderRadius: '10px' }}>{actionsEnRetard.length}</span>}
                </div>
                <button onClick={() => router.push('/dashboard/conformite')} style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: '500' }}>Voir tout</button>
              </div>
              {actionsEnRetard.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center' }}>
                  <i className="ti ti-check" style={{ fontSize: '22px', display: 'block', marginBottom: '6px', color: 'var(--success)' }} />
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Aucune action en retard</div>
                </div>
              ) : actionsEnRetard.map((pa, i) => {
                const joursRetard = Math.floor((today.getTime() - new Date(pa.echeance).getTime()) / (1000 * 60 * 60 * 24))
                return (
                  <div key={pa.id} style={{ padding: '10px 16px', borderBottom: i < actionsEnRetard.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pa.titre}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>{(pa.clients as any)?.nom || '-'}</div>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: '600', color: 'var(--danger)', background: 'var(--danger-light)', padding: '2px 8px', borderRadius: '20px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                      +{joursRetard}j
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Prochaines echeances */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="ti ti-calendar-due" style={{ fontSize: '15px', color: 'var(--warning)' }} />
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Echeances 7 jours</span>
                </div>
              </div>
              {prochainesEcheances.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>Aucune echeance cette semaine</div>
              ) : prochainesEcheances.map((pa, i) => {
                const joursRestants = Math.floor((new Date(pa.echeance).getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                return (
                  <div key={pa.id} style={{ padding: '10px 16px', borderBottom: i < prochainesEcheances.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pa.titre}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>{(pa.clients as any)?.nom || '-'} · {new Date(pa.echeance).toLocaleDateString('fr-FR')}</div>
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: '600', color: joursRestants <= 2 ? 'var(--danger)' : 'var(--warning)', background: joursRestants <= 2 ? 'var(--danger-light)' : 'var(--warning-light)', padding: '2px 8px', borderRadius: '20px', flexShrink: 0 }}>
                      J-{joursRestants}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>

            {/* Audits recents */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="ti ti-clipboard-check" style={{ fontSize: '15px', color: '#7C3AED' }} />
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Audits recents</span>
                </div>
                <button onClick={() => router.push('/dashboard/audits')} style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: '500' }}>Voir tout</button>
              </div>
              {auditsRecents.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>Aucun audit</div>
              ) : auditsRecents.map((a, i) => (
                <div key={a.id} style={{ padding: '10px 16px', borderBottom: i < auditsRecents.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.titre}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>{(a.clients as any)?.nom || '-'}</div>
                  </div>
                  {a.score !== null && <div style={{ fontSize: '14px', fontWeight: '700', color: scoreColor(a.score), flexShrink: 0 }}>{a.score}%</div>}
                  <span style={{ fontSize: '10px', fontWeight: '500', padding: '2px 8px', borderRadius: '20px', flexShrink: 0,
                    color: a.statut === 'termine' ? 'var(--success)' : a.statut === 'en_cours' ? 'var(--warning)' : 'var(--text-tertiary)',
                    background: a.statut === 'termine' ? 'var(--success-light)' : a.statut === 'en_cours' ? 'var(--warning-light)' : 'var(--surface-hover)' }}>
                    {a.statut === 'termine' ? 'Termine' : a.statut === 'en_cours' ? 'En cours' : 'Archive'}
                  </span>
                </div>
              ))}
            </div>

            {/* Clients sans preparation */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="ti ti-building-off" style={{ fontSize: '15px', color: 'var(--danger)' }} />
                  <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Sans audit planifie</span>
                  {clientsSansObligations.length > 0 && <span style={{ background: 'var(--warning)', color: '#fff', fontSize: '10px', fontWeight: '600', padding: '1px 6px', borderRadius: '10px' }}>{clientsSansObligations.length}</span>}
                </div>
                <button onClick={() => router.push('/dashboard/clients')} style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: '500' }}>Clients</button>
              </div>
              {clientsSansObligations.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center' }}>
                  <i className="ti ti-check" style={{ fontSize: '22px', display: 'block', marginBottom: '6px', color: 'var(--success)' }} />
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Tous les clients ont un audit</div>
                </div>
              ) : clientsSansObligations.slice(0, 5).map((c, i) => {
                const tc = typeColors[c.type] || { color: 'var(--text-secondary)', bg: 'var(--surface-hover)' }
                return (
                  <div key={c.id} style={{ padding: '10px 16px', borderBottom: i < Math.min(clientsSansObligations.length, 5) - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', background: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: tc.color, flexShrink: 0 }}>
                      {c.nom.slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nom}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{c.type} {c.ville ? '· ' + c.ville : ''}</div>
                    </div>
                    <span style={{ background: tc.bg, color: tc.color, padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '500', flexShrink: 0 }}>{c.type}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ===== ADMIN ===== */}
      {profile?.role === 'admin' && (
        <>
          {ncMajeures.length > 0 && (
            <div style={{ background: 'var(--danger-light)', border: '1px solid rgba(194,54,42,0.3)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: '20px', color: 'var(--danger)', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--danger)' }}>{ncMajeures.length} non-conformite{ncMajeures.length > 1 ? 's' : ''} majeure{ncMajeures.length > 1 ? 's' : ''} — action requise</div>
                <div style={{ fontSize: '11px', color: 'var(--danger)', opacity: 0.8, marginTop: '2px' }}>Ces points bloquent votre certification</div>
              </div>
              <button onClick={() => router.push('/dashboard/conformite')} style={{ padding: '7px 14px', background: 'var(--danger)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)' }}>Voir</button>
            </div>
          )}

          {actionsEnRetard.length > 0 && (
            <div style={{ background: 'var(--warning-light)', border: '1px solid rgba(158,94,0,0.3)', borderRadius: 'var(--radius-lg)', padding: '12px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="ti ti-clock-exclamation" style={{ fontSize: '18px', color: 'var(--warning)', flexShrink: 0 }} />
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--warning)' }}>{actionsEnRetard.length} action{actionsEnRetard.length > 1 ? 's' : ''} en retard — echeance depassee</div>
              <button onClick={() => router.push('/dashboard/conformite')} style={{ marginLeft: 'auto', padding: '6px 12px', background: 'var(--warning)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0 }}>Traiter</button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', marginBottom: '20px' }}>
            {[
              { icon: 'ti-clipboard-check', color: '#7C3AED', bg: '#F5F3FF', value: stats.audits, label: 'Audits', path: '/dashboard/conformite' },
              { icon: 'ti-alert-triangle', color: 'var(--danger)', bg: 'var(--danger-light)', value: stats.nonConformites, label: 'NC ouvertes', path: '/dashboard/conformite' },
              { icon: 'ti-list-check', color: 'var(--warning)', bg: 'var(--warning-light)', value: actionsEnRetard.length, label: 'En retard', path: '/dashboard/conformite' },
              { icon: 'ti-checklist', color: 'var(--accent)', bg: 'var(--accent-light)', value: stats.taches, label: 'Taches', path: '/dashboard/taches' },
            ].map(k => (
              <div key={k.label} onClick={() => router.push(k.path)}
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', cursor: 'pointer' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: 'var(--radius-sm)', background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                  <i className={`ti ${k.icon}`} style={{ fontSize: '15px', color: k.color }} />
                </div>
                <div style={{ fontSize: '26px', fontWeight: '700', color: k.color, letterSpacing: '-0.5px', lineHeight: 1, marginBottom: '4px' }}>{k.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{k.label}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Mes audits</span>
                <button onClick={() => router.push('/dashboard/conformite')} style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: '500' }}>Voir tout</button>
              </div>
              {auditsRecents.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>Aucun audit</div>
              ) : auditsRecents.map((a, i) => (
                <div key={a.id} style={{ padding: '10px 16px', borderBottom: i < auditsRecents.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.titre}</div>
                  </div>
                  {a.score !== null && <div style={{ fontSize: '14px', fontWeight: '700', color: scoreColor(a.score) }}>{a.score}%</div>}
                  <span style={{ fontSize: '10px', fontWeight: '500', padding: '2px 8px', borderRadius: '20px', flexShrink: 0,
                    color: a.statut === 'termine' ? 'var(--success)' : 'var(--warning)',
                    background: a.statut === 'termine' ? 'var(--success-light)' : 'var(--warning-light)' }}>
                    {a.statut === 'termine' ? 'Termine' : 'En cours'}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Taches en attente</span>
                <button onClick={() => router.push('/dashboard/taches')} style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: '500' }}>Voir tout</button>
              </div>
              {tachesUrgentes.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center' }}>
                  <i className="ti ti-check" style={{ fontSize: '22px', display: 'block', marginBottom: '6px', color: 'var(--success)' }} />
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Aucune tache en attente</div>
                </div>
              ) : tachesUrgentes.map((t, i) => {
                const pr = prioriteTache(t.priorite)
                const depasse = t.echeance && new Date(t.echeance) < today
                return (
                  <div key={t.id} style={{ padding: '10px 16px', borderBottom: i < tachesUrgentes.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.titre}</div>
                      {t.echeance && <div style={{ fontSize: '11px', color: depasse ? 'var(--danger)' : 'var(--text-tertiary)', fontWeight: depasse ? '600' : '400', marginTop: '1px' }}>
                        {new Date(t.echeance).toLocaleDateString('fr-FR')}{depasse ? ' — Retard' : ''}
                      </div>}
                    </div>
                    <span style={{ fontSize: '10px', fontWeight: '500', color: pr.color, background: pr.bg, padding: '2px 8px', borderRadius: '20px', flexShrink: 0, textTransform: 'capitalize' }}>{t.priorite}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* ===== CLIENT ===== */}
      {profile?.role === 'client' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', marginBottom: '20px' }}>
            {[
              { icon: 'ti-checklist', color: 'var(--accent)', bg: 'var(--accent-light)', value: stats.taches, label: 'Mes taches', path: '/dashboard/taches' },
              { icon: 'ti-list-check', color: 'var(--warning)', bg: 'var(--warning-light)', value: stats.plansActions, label: 'Plans d actions', path: '/dashboard/conformite' },
              { icon: 'ti-books', color: 'var(--success)', bg: 'var(--success-light)', value: stats.documents, label: 'Documents', path: '/dashboard/bibliotheque' },
            ].map(k => (
              <div key={k.label} onClick={() => router.push(k.path)}
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', cursor: 'pointer' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: 'var(--radius-sm)', background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                  <i className={`ti ${k.icon}`} style={{ fontSize: '15px', color: k.color }} />
                </div>
                <div style={{ fontSize: '26px', fontWeight: '700', color: k.color, letterSpacing: '-0.5px', lineHeight: 1, marginBottom: '4px' }}>{k.value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{k.label}</div>
              </div>
            ))}
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
              const depasse = t.echeance && new Date(t.echeance) < today
              return (
                <div key={t.id} style={{ padding: '14px 18px', borderBottom: i < tachesUrgentes.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-sm)', background: pr.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="ti ti-checklist" style={{ fontSize: '16px', color: pr.color }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.titre}</div>
                    {t.echeance && <div style={{ fontSize: '11px', color: depasse ? 'var(--danger)' : 'var(--text-tertiary)', fontWeight: depasse ? '600' : '400', marginTop: '2px' }}>
                      {new Date(t.echeance).toLocaleDateString('fr-FR')}{depasse ? ' — En retard !' : ''}
                    </div>}
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: '500', color: pr.color, background: pr.bg, padding: '2px 8px', borderRadius: '20px', textTransform: 'capitalize', flexShrink: 0 }}>{t.priorite}</span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}