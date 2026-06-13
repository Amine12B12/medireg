'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const [equipements, setEquipements] = useState<any[]>([])
  const [pannes, setPannes] = useState<any[]>([])
  const [maintenances, setMaintenances] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      let equip
      if (prof?.role === 'client' && prof?.etablissement_id) {
        const { data } = await supabase.from('equipements').select('*').eq('etablissement_id', prof.etablissement_id)
        equip = data
      } else {
        const { data } = await supabase.from('equipements').select('*')
        equip = data
      }
      setEquipements(equip || [])
      const { data: p } = await supabase.from('pannes').select('*, equipements(reference, designation, localisation, etablissement_id, etablissements(nom))').eq('statut', 'ouvert').order('created_at', { ascending: false })
      setPannes(p || [])
      const { data: m } = await supabase.from('maintenances').select('*, equipements(reference, designation)').in('statut', ['planifie', 'en_cours']).order('date_prevue', { ascending: true }).limit(4)
      setMaintenances(m || [])
      if (prof?.role === 'admin') {
        const { data: c } = await supabase.from('etablissements').select('*').order('nom')
        setClients(c || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const stats = {
    total: equipements.length,
    en_service: equipements.filter(e => e.statut === 'en_service').length,
    maintenance: equipements.filter(e => e.statut === 'maintenance').length,
    hors_service: equipements.filter(e => e.statut === 'hors_service').length,
  }

  const pct = (n: number) => stats.total > 0 ? Math.round((n / stats.total) * 100) : 0

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: 'var(--font)', color: 'var(--text-tertiary)', fontSize: '13px' }}>
      Chargement...
    </div>
  )

  return (
    <div style={{ padding: '20px', fontFamily: 'var(--font)', maxWidth: '1400px' }}>

      <style>{`
        .kpi-grid-1 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 10px; }
        .kpi-grid-2 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 20px; }
        .main-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
        .equip-grid { display: grid; grid-template-columns: repeat(3, 1fr); }
        @media (max-width: 1024px) {
          .kpi-grid-1 { grid-template-columns: repeat(2, 1fr); }
          .kpi-grid-2 { grid-template-columns: repeat(2, 1fr); }
          .main-grid { grid-template-columns: 1fr 1fr; }
          .equip-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 640px) {
          .kpi-grid-1 { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .kpi-grid-2 { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .main-grid { grid-template-columns: 1fr; }
          .equip-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          Bonjour
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* KPI Row 1 */}
      <div className="kpi-grid-1">
        {[
          { label: 'Total équipements', value: stats.total, sub: 'Parc complet', color: 'var(--accent)', bg: 'var(--accent-light)', icon: 'ti-device-heart-monitor', path: '/dashboard/materiel' },
          { label: 'En service', value: stats.en_service, sub: `${pct(stats.en_service)}% du parc`, color: 'var(--success)', bg: 'var(--success-light)', icon: 'ti-circle-check', path: '/dashboard/materiel' },
          { label: 'Maintenance', value: stats.maintenance, sub: `${pct(stats.maintenance)}% du parc`, color: 'var(--warning)', bg: 'var(--warning-light)', icon: 'ti-tool', path: '/dashboard/maintenance' },
          { label: 'Hors service', value: stats.hors_service, sub: `${pct(stats.hors_service)}% du parc`, color: 'var(--danger)', bg: 'var(--danger-light)', icon: 'ti-alert-circle', path: '/dashboard/alertes' },
        ].map(s => (
          <div key={s.label} onClick={() => router.push(s.path)}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`ti ${s.icon}`} style={{ fontSize: '16px', color: s.color }} aria-hidden="true" />
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', background: 'var(--surface-hover)', padding: '2px 7px', borderRadius: '20px', border: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                {s.sub}
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '600', color: s.color, letterSpacing: '-1px', lineHeight: 1, marginBottom: '4px' }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{s.label}</div>
            <div style={{ marginTop: '10px', height: '3px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct(s.value)}%`, background: s.color, borderRadius: '2px', opacity: 0.5 }} />
            </div>
          </div>
        ))}
      </div>

      {/* KPI Row 2 — admin */}
      {profile?.role === 'admin' && (
        <div className="kpi-grid-2">
          {[
            { label: 'Clients actifs', value: clients.filter(c => c.statut === 'actif').length, sub: `sur ${clients.length} total`, color: 'var(--purple)', bg: 'var(--purple-light)', icon: 'ti-building-hospital', path: '/dashboard/clients' },
            { label: 'Alertes ouvertes', value: pannes.length, sub: pannes.length > 0 ? 'Action requise' : 'Tout va bien', color: 'var(--danger)', bg: 'var(--danger-light)', icon: 'ti-bell-ringing', path: '/dashboard/alertes' },
            { label: 'Maintenances', value: maintenances.length, sub: 'En cours ou planifiées', color: 'var(--warning)', bg: 'var(--warning-light)', icon: 'ti-calendar-event', path: '/dashboard/maintenance' },
          ].map(s => (
            <div key={s.label} onClick={() => router.push(s.path)}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`ti ${s.icon}`} style={{ fontSize: '18px', color: s.color }} aria-hidden="true" />
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '22px', fontWeight: '600', color: s.color, letterSpacing: '-0.5px', lineHeight: 1, marginBottom: '2px' }}>{s.value}</div>
                <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main grid */}
      <div className="main-grid">

        {/* Alertes */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: 'var(--radius-sm)', background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-bell-ringing" style={{ fontSize: '13px', color: 'var(--danger)' }} aria-hidden="true" />
              </div>
              <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>Alertes</span>
              {pannes.length > 0 && (
                <span style={{ background: 'var(--danger)', color: '#fff', fontSize: '10px', fontWeight: '600', padding: '1px 6px', borderRadius: '10px' }}>{pannes.length}</span>
              )}
            </div>
            <button onClick={() => router.push('/dashboard/alertes')} style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: '500', whiteSpace: 'nowrap' }}>
              Voir tout →
            </button>
          </div>
          {pannes.length === 0 ? (
            <div style={{ padding: '28px 16px', textAlign: 'center' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                <i className="ti ti-check" style={{ fontSize: '18px', color: 'var(--success)' }} aria-hidden="true" />
              </div>
              <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>Aucune alerte</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Tout fonctionne normalement</div>
            </div>
          ) : pannes.slice(0, 4).map((p, i) => (
            <div key={p.id} style={{ padding: '10px 16px', borderBottom: i < Math.min(pannes.length, 4) - 1 ? '1px solid var(--border)' : 'none', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--danger)', flexShrink: 0, marginTop: '4px' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(p.equipements as any)?.designation}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description || 'Panne signalée'}</div>
              </div>
              <span style={{ fontSize: '10px', fontWeight: '500', color: 'var(--danger)', background: 'var(--danger-light)', padding: '2px 6px', borderRadius: '20px', flexShrink: 0 }}>Urgent</span>
            </div>
          ))}
        </div>

        {/* Maintenances */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: 'var(--radius-sm)', background: 'var(--warning-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-tool" style={{ fontSize: '13px', color: 'var(--warning)' }} aria-hidden="true" />
              </div>
              <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>Maintenances</span>
            </div>
            <button onClick={() => router.push('/dashboard/maintenance')} style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: '500', whiteSpace: 'nowrap' }}>
              Voir tout →
            </button>
          </div>
          {maintenances.length === 0 ? (
            <div style={{ padding: '28px 16px', textAlign: 'center' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                <i className="ti ti-calendar" style={{ fontSize: '18px', color: 'var(--text-tertiary)' }} aria-hidden="true" />
              </div>
              <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>Aucune maintenance</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Planifiez une intervention</div>
            </div>
          ) : maintenances.map((m, i) => {
            const isEnCours = m.statut === 'en_cours'
            return (
              <div key={m.id} style={{ padding: '10px 16px', borderBottom: i < maintenances.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ width: '30px', height: '30px', borderRadius: 'var(--radius-sm)', background: isEnCours ? 'var(--warning-light)' : 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="ti ti-tool" style={{ fontSize: '13px', color: isEnCours ? 'var(--warning)' : 'var(--accent)' }} aria-hidden="true" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(m.equipements as any)?.designation}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>
                    {m.date_prevue ? new Date(m.date_prevue).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'} · {m.type === 'preventive' ? 'Préventive' : 'Curative'}
                  </div>
                </div>
                <span style={{ fontSize: '10px', fontWeight: '500', color: isEnCours ? 'var(--warning)' : 'var(--accent)', background: isEnCours ? 'var(--warning-light)' : 'var(--accent-light)', padding: '2px 7px', borderRadius: '20px', flexShrink: 0 }}>
                  {isEnCours ? 'En cours' : 'Planifié'}
                </span>
              </div>
            )
          })}
        </div>

        {/* Clients admin */}
        {profile?.role === 'admin' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: 'var(--radius-sm)', background: 'var(--purple-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ti ti-building-hospital" style={{ fontSize: '13px', color: 'var(--purple)' }} aria-hidden="true" />
                </div>
                <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>Clients</span>
              </div>
              <button onClick={() => router.push('/dashboard/clients')} style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: '500', whiteSpace: 'nowrap' }}>
                Voir tout →
              </button>
            </div>
            {clients.length === 0 ? (
              <div style={{ padding: '28px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Aucun client</div>
              </div>
            ) : clients.slice(0, 5).map((c, i) => {
              const colors = ['var(--accent)', 'var(--purple)', 'var(--success)', 'var(--warning)', 'var(--danger)']
              const bgs = ['var(--accent-light)', 'var(--purple-light)', 'var(--success-light)', 'var(--warning-light)', 'var(--danger-light)']
              return (
                <div key={c.id} style={{ padding: '10px 16px', borderBottom: i < Math.min(clients.length, 5) - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', background: bgs[i % 5], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '600', color: colors[i % 5], flexShrink: 0 }}>
                    {c.nom.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nom}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{c.type} · {c.formule || 'Essentiel'}</div>
                  </div>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: c.statut === 'actif' ? 'var(--success)' : 'var(--border-strong)', flexShrink: 0 }} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Aperçu parc */}
      {equipements.length > 0 && (
        <div style={{ marginTop: '14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-device-heart-monitor" style={{ fontSize: '13px', color: 'var(--accent)' }} aria-hidden="true" />
              </div>
              <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>Aperçu du parc</span>
            </div>
            <button onClick={() => router.push('/dashboard/materiel')} style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: '500', whiteSpace: 'nowrap' }}>
              Voir tout →
            </button>
          </div>
          <div className="equip-grid">
            {equipements.slice(0, 6).map((eq, i) => {
              const statut = eq.statut === 'en_service' ? { color: 'var(--success)', bg: 'var(--success-light)', label: 'En service' } :
                eq.statut === 'maintenance' ? { color: 'var(--warning)', bg: 'var(--warning-light)', label: 'Maintenance' } :
                { color: 'var(--danger)', bg: 'var(--danger-light)', label: 'Hors service' }
              return (
                <div key={eq.id} onClick={() => router.push('/dashboard/materiel')}
                  style={{ padding: '12px 16px', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-hover)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', gap: '6px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{eq.designation}</div>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: statut.color, flexShrink: 0 }} />
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{eq.reference} · {eq.localisation || '—'}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}