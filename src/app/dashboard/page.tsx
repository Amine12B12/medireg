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
    <div style={{ padding: '28px 28px', fontFamily: 'var(--font)', maxWidth: '1400px' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '22px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          Bonjour
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
          Voici l'état de votre parc — {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* KPI Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '12px' }}>
        {[
          { label: 'Total équipements', value: stats.total, sub: 'Parc complet', color: 'var(--accent)', bg: 'var(--accent-light)', icon: 'ti-device-heart-monitor', path: '/dashboard/materiel' },
          { label: 'En service', value: stats.en_service, sub: `${pct(stats.en_service)}% du parc`, color: 'var(--success)', bg: 'var(--success-light)', icon: 'ti-circle-check', path: '/dashboard/materiel' },
          { label: 'En maintenance', value: stats.maintenance, sub: `${pct(stats.maintenance)}% du parc`, color: 'var(--warning)', bg: 'var(--warning-light)', icon: 'ti-tool', path: '/dashboard/maintenance' },
          { label: 'Hors service', value: stats.hors_service, sub: `${pct(stats.hors_service)}% du parc`, color: 'var(--danger)', bg: 'var(--danger-light)', icon: 'ti-alert-circle', path: '/dashboard/alertes' },
        ].map(s => (
          <div key={s.label} onClick={() => router.push(s.path)}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', cursor: 'pointer', transition: 'all 0.15s', position: 'relative', overflow: 'hidden' }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`ti ${s.icon}`} style={{ fontSize: '18px', color: s.color }} aria-hidden="true" />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', background: 'var(--surface-hover)', padding: '3px 8px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                {s.sub}
              </div>
            </div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: s.color, letterSpacing: '-1px', lineHeight: 1, marginBottom: '4px' }}>{s.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontWeight: '400' }}>{s.label}</div>

            {/* Progress bar */}
            <div style={{ marginTop: '14px', height: '3px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct(s.value)}%`, background: s.color, borderRadius: '2px', transition: 'width 0.6s ease', opacity: 0.6 }} />
            </div>
          </div>
        ))}
      </div>

      {/* KPI Row 2 — admin only */}
      {profile?.role === 'admin' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Clients actifs', value: clients.filter(c => c.statut === 'actif').length, sub: `sur ${clients.length} total`, color: 'var(--purple)', bg: 'var(--purple-light)', icon: 'ti-building-hospital', path: '/dashboard/clients' },
            { label: 'Alertes ouvertes', value: pannes.length, sub: pannes.length > 0 ? 'Action requise' : 'Tout va bien', color: 'var(--danger)', bg: 'var(--danger-light)', icon: 'ti-bell-ringing', path: '/dashboard/alertes' },
            { label: 'Maintenances', value: maintenances.length, sub: 'En cours ou planifiées', color: 'var(--warning)', bg: 'var(--warning-light)', icon: 'ti-calendar-event', path: '/dashboard/maintenance' },
          ].map(s => (
            <div key={s.label} onClick={() => router.push(s.path)}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '14px', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}
            >
              <div style={{ width: '44px', height: '44px', borderRadius: 'var(--radius-md)', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`ti ${s.icon}`} style={{ fontSize: '20px', color: s.color }} aria-hidden="true" />
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: '600', color: s.color, letterSpacing: '-0.5px', lineHeight: 1, marginBottom: '3px' }}>{s.value}</div>
                <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>{s.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: profile?.role === 'admin' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '16px' }}>

        {/* Alertes */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-bell-ringing" style={{ fontSize: '14px', color: 'var(--danger)' }} aria-hidden="true" />
              </div>
              <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>Alertes actives</span>
              {pannes.length > 0 && (
                <span style={{ background: 'var(--danger)', color: '#fff', fontSize: '10px', fontWeight: '600', padding: '1px 6px', borderRadius: '10px' }}>{pannes.length}</span>
              )}
            </div>
            <button onClick={() => router.push('/dashboard/alertes')} style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: '500' }}>
              Voir tout →
            </button>
          </div>
          {pannes.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <i className="ti ti-check" style={{ fontSize: '20px', color: 'var(--success)' }} aria-hidden="true" />
              </div>
              <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>Aucune alerte</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Tout fonctionne normalement</div>
            </div>
          ) : pannes.slice(0, 4).map((p, i) => (
            <div key={p.id} style={{ padding: '12px 20px', borderBottom: i < Math.min(pannes.length, 4) - 1 ? '1px solid var(--border)' : 'none', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--danger)', flexShrink: 0, marginTop: '5px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>{(p.equipements as any)?.designation}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{p.description || 'Panne signalée'}</div>
              </div>
              <span style={{ fontSize: '10px', fontWeight: '500', color: 'var(--danger)', background: 'var(--danger-light)', padding: '2px 7px', borderRadius: '20px', flexShrink: 0 }}>Urgent</span>
            </div>
          ))}
        </div>

        {/* Maintenances */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', background: 'var(--warning-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-tool" style={{ fontSize: '14px', color: 'var(--warning)' }} aria-hidden="true" />
              </div>
              <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>Maintenances</span>
            </div>
            <button onClick={() => router.push('/dashboard/maintenance')} style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: '500' }}>
              Voir tout →
            </button>
          </div>
          {maintenances.length === 0 ? (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--surface-hover)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <i className="ti ti-calendar" style={{ fontSize: '20px', color: 'var(--text-tertiary)' }} aria-hidden="true" />
              </div>
              <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>Aucune maintenance</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Planifiez votre première intervention</div>
            </div>
          ) : maintenances.map((m, i) => {
            const isEnCours = m.statut === 'en_cours'
            return (
              <div key={m.id} style={{ padding: '12px 20px', borderBottom: i < maintenances.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-sm)', background: isEnCours ? 'var(--warning-light)' : 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="ti ti-tool" style={{ fontSize: '15px', color: isEnCours ? 'var(--warning)' : 'var(--accent)' }} aria-hidden="true" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(m.equipements as any)?.designation}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>
                    {m.date_prevue ? new Date(m.date_prevue).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : 'Non planifié'} · {m.type === 'preventive' ? 'Préventive' : 'Curative'}
                  </div>
                </div>
                <span style={{ fontSize: '10px', fontWeight: '500', color: isEnCours ? 'var(--warning)' : 'var(--accent)', background: isEnCours ? 'var(--warning-light)' : 'var(--accent-light)', padding: '2px 8px', borderRadius: '20px', flexShrink: 0 }}>
                  {isEnCours ? 'En cours' : 'Planifié'}
                </span>
              </div>
            )
          })}
        </div>

        {/* Clients — admin only */}
        {profile?.role === 'admin' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', background: 'var(--purple-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ti ti-building-hospital" style={{ fontSize: '14px', color: 'var(--purple)' }} aria-hidden="true" />
                </div>
                <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>Clients</span>
              </div>
              <button onClick={() => router.push('/dashboard/clients')} style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: '500' }}>
                Voir tout →
              </button>
            </div>
            {clients.slice(0, 5).map((c, i) => {
              const colors = ['var(--accent)', 'var(--purple)', 'var(--success)', 'var(--warning)', 'var(--danger)']
              const bgs = ['var(--accent-light)', 'var(--purple-light)', 'var(--success-light)', 'var(--warning-light)', 'var(--danger-light)']
              const color = colors[i % colors.length]
              const bg = bgs[i % bgs.length]
              return (
                <div key={c.id} style={{ padding: '10px 20px', borderBottom: i < Math.min(clients.length, 5) - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color, flexShrink: 0 }}>
                    {c.nom.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nom}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>{c.type} · {c.formule || 'Essentiel'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: c.statut === 'actif' ? 'var(--success)' : 'var(--border-strong)' }} />
                    <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{c.formule || 'Essentiel'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Équipements récents */}
      <div style={{ marginTop: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-device-heart-monitor" style={{ fontSize: '14px', color: 'var(--accent)' }} aria-hidden="true" />
            </div>
            <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>Aperçu du parc</span>
          </div>
          <button onClick={() => router.push('/dashboard/materiel')} style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: '500' }}>
            Voir tout →
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {equipements.slice(0, 6).map((eq, i) => {
            const statut = eq.statut === 'en_service' ? { color: 'var(--success)', bg: 'var(--success-light)', label: 'En service' } :
              eq.statut === 'maintenance' ? { color: 'var(--warning)', bg: 'var(--warning-light)', label: 'Maintenance' } :
              { color: 'var(--danger)', bg: 'var(--danger-light)', label: 'Hors service' }
            return (
              <div key={eq.id} onClick={() => router.push('/dashboard/materiel')}
                style={{ padding: '14px 20px', borderRight: (i + 1) % 3 !== 0 ? '1px solid var(--border)' : 'none', borderBottom: i < equipements.slice(0, 6).length - 3 ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-hover)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{eq.designation}</div>
                  <span style={{ fontSize: '10px', fontWeight: '500', color: statut.color, background: statut.bg, padding: '2px 7px', borderRadius: '20px', flexShrink: 0, marginLeft: '8px' }}>{statut.label}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{eq.reference} · {eq.localisation || '—'}</div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}