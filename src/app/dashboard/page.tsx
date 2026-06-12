'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Equipement = { id: string; reference: string; designation: string; statut: string; localisation: string; fabricant: string; modele: string; etablissement_id: string }

export default function Dashboard() {
  const [equipements, setEquipements] = useState<Equipement[]>([])
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
        const { data } = await supabase.from('equipements').select('*').order('created_at')
        equip = data
      }
      setEquipements(equip || [])
      const { data: p } = await supabase.from('pannes').select('*, equipements(reference, designation, localisation)').eq('statut', 'ouvert').order('created_at', { ascending: false })
      setPannes(p || [])
      const { data: m } = await supabase.from('maintenances').select('*, equipements(reference, designation)').in('statut', ['planifie', 'en_cours']).order('date_prevue', { ascending: true }).limit(5)
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

  const statutDot = (s: string) => {
    if (s === 'en_service') return { color: '#059669', label: 'En service' }
    if (s === 'maintenance') return { color: '#B45309', label: 'Maintenance' }
    return { color: '#DC2626', label: 'Hors service' }
  }

  const maintStatut = (s: string) => {
    if (s === 'planifie') return { color: '#1A56DB', label: 'Planifié' }
    return { color: '#B45309', label: 'En cours' }
  }

  if (loading) return <div style={{ padding: '32px', color: '#6B7280', fontSize: '13px' }}>Chargement...</div>

  return (
    <div style={{ padding: '24px', fontFamily: 'Inter, -apple-system, sans-serif' }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total équipements', value: stats.total, color: '#1A56DB', icon: 'ti-device-heart-monitor', path: '/dashboard/materiel' },
          { label: 'En service', value: stats.en_service, color: '#059669', icon: 'ti-check', path: '/dashboard/materiel' },
          { label: 'En maintenance', value: stats.maintenance, color: '#B45309', icon: 'ti-tool', path: '/dashboard/maintenance' },
          { label: 'Hors service', value: stats.hors_service, color: '#DC2626', icon: 'ti-alert-circle', path: '/dashboard/alertes' },
        ].map(s => (
          <div key={s.label} onClick={() => router.push(s.path)}
            style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: '8px', padding: '16px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
            onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'}
            onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '500' }}>{s.label}</div>
              <i className={`ti ${s.icon}`} style={{ fontSize: '16px', color: s.color, opacity: 0.7 }} aria-hidden="true" />
            </div>
            <div style={{ fontSize: '28px', fontWeight: '500', color: s.color, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Ligne 2 — stats admin */}
      {profile?.role === 'admin' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Clients actifs', value: clients.filter(c => c.statut === 'actif').length, color: '#7C3AED', icon: 'ti-building-hospital', path: '/dashboard/clients' },
            { label: 'Alertes ouvertes', value: pannes.length, color: '#DC2626', icon: 'ti-bell', path: '/dashboard/alertes' },
            { label: 'Maintenances en cours', value: maintenances.length, color: '#B45309', icon: 'ti-calendar', path: '/dashboard/maintenance' },
          ].map(s => (
            <div key={s.label} onClick={() => router.push(s.path)}
              style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: '8px', padding: '16px', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.06)'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div style={{ fontSize: '11px', color: '#9CA3AF', fontWeight: '500' }}>{s.label}</div>
                <i className={`ti ${s.icon}`} style={{ fontSize: '16px', color: s.color, opacity: 0.7 }} aria-hidden="true" />
              </div>
              <div style={{ fontSize: '28px', fontWeight: '500', color: s.color, lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: profile?.role === 'admin' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '16px' }}>

        {/* Alertes */}
        <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>Alertes actives</div>
            <button onClick={() => router.push('/dashboard/alertes')} style={{ fontSize: '11px', color: '#1A56DB', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Voir tout →</button>
          </div>
          {pannes.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: '12px', color: '#9CA3AF' }}>
              <i className="ti ti-check" style={{ fontSize: '20px', display: 'block', marginBottom: '6px', color: '#059669' }} aria-hidden="true" />
              Aucune alerte
            </div>
          ) : pannes.slice(0, 4).map(p => (
            <div key={p.id} style={{ padding: '10px 16px', borderBottom: '0.5px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#DC2626', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: '500', color: '#111827' }}>{(p.equipements as any)?.designation} — {(p.equipements as any)?.reference}</div>
                <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '1px' }}>{p.description || 'Panne signalée'}</div>
              </div>
              <span style={{ fontSize: '10px', fontWeight: '500', color: '#DC2626', background: '#FEF2F2', padding: '2px 6px', borderRadius: '4px' }}>Urgent</span>
            </div>
          ))}
        </div>

        {/* Maintenances */}
        <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>Maintenances</div>
            <button onClick={() => router.push('/dashboard/maintenance')} style={{ fontSize: '11px', color: '#1A56DB', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Voir tout →</button>
          </div>
          {maintenances.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: '12px', color: '#9CA3AF' }}>
              <i className="ti ti-check" style={{ fontSize: '20px', display: 'block', marginBottom: '6px', color: '#059669' }} aria-hidden="true" />
              Aucune maintenance
            </div>
          ) : maintenances.map(m => {
            const ms = maintStatut(m.statut)
            return (
              <div key={m.id} style={{ padding: '10px 16px', borderBottom: '0.5px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: '500', color: '#111827' }}>{(m.equipements as any)?.designation}</div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '1px' }}>
                    {m.date_prevue ? new Date(m.date_prevue).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : 'Date non définie'}
                    {' · '}{m.type === 'preventive' ? 'Préventive' : 'Curative'}
                  </div>
                </div>
                <span style={{ fontSize: '10px', fontWeight: '500', color: ms.color, background: ms.color === '#1A56DB' ? '#EFF6FF' : '#FFFBEB', padding: '2px 6px', borderRadius: '4px' }}>{ms.label}</span>
              </div>
            )
          })}
        </div>

        {/* Clients (admin uniquement) */}
        {profile?.role === 'admin' && (
          <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>Clients</div>
              <button onClick={() => router.push('/dashboard/clients')} style={{ fontSize: '11px', color: '#1A56DB', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>Voir tout →</button>
            </div>
            {clients.slice(0, 5).map((c, i) => (
              <div key={c.id} style={{ padding: '10px 16px', borderBottom: i < Math.min(clients.length, 5) - 1 ? '0.5px solid #F3F4F6' : 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: '#1A56DB', flexShrink: 0 }}>
                  {c.nom.slice(0, 2).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: '500', color: '#111827' }}>{c.nom}</div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '1px' }}>{c.type} · {c.formule || 'Essentiel'}</div>
                </div>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: c.statut === 'actif' ? '#059669' : '#E5E7EB' }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}