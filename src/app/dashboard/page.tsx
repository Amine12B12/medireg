'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Equipement = { id: string; reference: string; designation: string; statut: string; localisation: string; fabricant: string; modele: string; etablissement_id: string }

export default function Dashboard() {
  const [equipements, setEquipements] = useState<Equipement[]>([])
  const [pannes, setPannes] = useState<any[]>([])
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

  if (loading) return <div style={{ padding: '32px', color: '#6B7280', fontSize: '13px' }}>Chargement...</div>

  return (
    <div style={{ padding: '24px', fontFamily: 'Inter, -apple-system, sans-serif' }}>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total équipements', value: stats.total, color: '#1A56DB' },
          { label: 'En service', value: stats.en_service, color: '#059669' },
          { label: 'En maintenance', value: stats.maintenance, color: '#B45309' },
          { label: 'Hors service', value: stats.hors_service, color: '#DC2626' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '8px', fontWeight: '500' }}>{s.label}</div>
            <div style={{ fontSize: '28px', fontWeight: '500', color: s.color, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Alertes actives */}
        <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>Alertes actives</div>
            <button onClick={() => router.push('/dashboard/alertes')} style={{ fontSize: '11px', color: '#1A56DB', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              Voir tout →
            </button>
          </div>
          {pannes.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: '12px', color: '#9CA3AF' }}>
              <i className="ti ti-check" style={{ fontSize: '20px', display: 'block', marginBottom: '6px', color: '#059669' }} aria-hidden="true" />
              Aucune alerte active
            </div>
          ) : pannes.slice(0, 4).map(p => (
            <div key={p.id} style={{ padding: '12px 16px', borderBottom: '0.5px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#DC2626', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: '500', color: '#111827' }}>{(p.equipements as any)?.designation} — {(p.equipements as any)?.reference}</div>
                <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '1px' }}>{p.description || 'Panne signalée'}</div>
              </div>
              <span style={{ fontSize: '10px', fontWeight: '500', color: '#DC2626', background: '#FEF2F2', padding: '2px 6px', borderRadius: '4px' }}>Ouvert</span>
            </div>
          ))}
        </div>

        {/* Équipements récents */}
        <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>Équipements</div>
            <button onClick={() => router.push('/dashboard/materiel')} style={{ fontSize: '11px', color: '#1A56DB', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              Voir tout →
            </button>
          </div>
          {equipements.slice(0, 5).map((eq, i) => {
            const st = statutDot(eq.statut)
            return (
              <div key={eq.id} style={{ padding: '11px 16px', borderBottom: i < Math.min(equipements.length, 5) - 1 ? '0.5px solid #F3F4F6' : 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '12px', fontWeight: '500', color: '#111827' }}>{eq.designation}</div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '1px' }}>{eq.reference} · {eq.localisation}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#6B7280' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: st.color }} />
                  {st.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}