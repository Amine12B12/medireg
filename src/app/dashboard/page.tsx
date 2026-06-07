'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Profile = { role: string; nom: string; etablissement_id: string | null }
type Equipement = { id: string; reference: string; designation: string; statut: string; localisation: string; fabricant: string; modele: string; etablissement_id: string }

export default function Dashboard() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [equipements, setEquipements] = useState<Equipement[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      const { data: equip } = await supabase.from('equipements').select('*').order('created_at')
      setEquipements(equip || [])
      setLoading(false)
    }
    load()
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const stats = {
    total: equipements.length,
    en_service: equipements.filter(e => e.statut === 'en_service').length,
    maintenance: equipements.filter(e => e.statut === 'maintenance').length,
    hors_service: equipements.filter(e => e.statut === 'hors_service').length,
  }

  const statutStyle = (s: string) => {
    if (s === 'en_service') return { bg: '#E8F5EF', color: '#00875A', label: 'En service' }
    if (s === 'maintenance') return { bg: '#FFF7E6', color: '#B45309', label: 'Maintenance' }
    return { bg: '#FEF2F2', color: '#DC2626', label: 'Hors service' }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F0F4FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <div style={{ color: '#6B7A99', fontSize: '14px' }}>Chargement...</div>
    </div>
  )
return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ fontSize: '22px', fontWeight: '600', color: '#0A1628', letterSpacing: '-0.3px' }}>Tableau de bord</div>
        <div style={{ fontSize: '14px', color: '#6B7A99', marginTop: '4px' }}>
          {profile?.role === 'admin' ? 'Vue globale du parc PSDM' : 'Vos équipements médicaux'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Total équipements', value: stats.total, color: '#1A56DB' },
          { label: 'En service', value: stats.en_service, color: '#00875A' },
          { label: 'En maintenance', value: stats.maintenance, color: '#B45309' },
          { label: 'Hors service', value: stats.hors_service, color: '#DC2626' },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: '14px', padding: '20px 22px', border: '0.5px solid #DDE5F0' }}>
            <div style={{ fontSize: '12px', color: '#6B7A99', marginBottom: '10px', fontWeight: '500' }}>{s.label}</div>
            <div style={{ fontSize: '32px', fontWeight: '600', color: s.color, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {stats.hors_service > 0 && (
        <div style={{ background: '#FEF2F2', border: '0.5px solid #FECACA', borderRadius: '12px', padding: '14px 18px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span style={{ fontSize: '13px', color: '#DC2626', fontWeight: '500' }}>
            {stats.hors_service} équipement{stats.hors_service > 1 ? 's' : ''} hors service — intervention requise
          </span>
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: '16px', border: '0.5px solid #DDE5F0', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '0.5px solid #DDE5F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '15px', fontWeight: '600', color: '#0A1628' }}>Équipements</div>
          <div style={{ fontSize: '12px', color: '#6B7A99' }}>{equipements.length} équipement{equipements.length > 1 ? 's' : ''}</div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {['Référence', 'Désignation', 'Fabricant / Modèle', 'Localisation', 'Statut'].map(h => (
                <th key={h} style={{ padding: '12px 20px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#6B7A99', letterSpacing: '0.3px', textTransform: 'uppercase', borderBottom: '0.5px solid #DDE5F0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {equipements.map((eq, i) => {
              const st = statutStyle(eq.statut)
              return (
                <tr key={eq.id} style={{ borderBottom: i < equipements.length - 1 ? '0.5px solid #F0F4FA' : 'none' }}>
                  <td style={{ padding: '14px 20px', fontSize: '13px', fontWeight: '600', color: '#1A56DB' }}>{eq.reference}</td>
                  <td style={{ padding: '14px 20px', fontSize: '13px', color: '#0A1628' }}>{eq.designation}</td>
                  <td style={{ padding: '14px 20px', fontSize: '13px', color: '#6B7A99' }}>{eq.fabricant} {eq.modele}</td>
                  <td style={{ padding: '14px 20px', fontSize: '13px', color: '#6B7A99' }}>{eq.localisation}</td>
                  <td style={{ padding: '14px 20px' }}>
                    <span style={{ background: st.bg, color: st.color, padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' }}>{st.label}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
  }