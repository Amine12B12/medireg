'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Panne = {
  id: string; description: string; statut: string; created_at: string
  equipements: { reference: string; designation: string; localisation: string; statut: string }
}

export default function AlertesPage() {
  const [pannes, setPannes] = useState<Panne[]>([])
  const [horsService, setHorsService] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  async function load() {
    const { data: p } = await supabase
      .from('pannes')
      .select('*, equipements(reference, designation, localisation, statut)')
      .order('created_at', { ascending: false })

    const { data: hs } = await supabase
      .from('equipements')
      .select('*')
      .eq('statut', 'hors_service')

    setPannes((p || []) as any)
    setHorsService(hs || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function resoldrePanne(id: string) {
    await supabase.from('pannes').update({ statut: 'resolu' }).eq('id', id)
    load()
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

  if (loading) return <div style={{ padding: '32px', color: '#6B7A99', fontSize: '14px' }}>Chargement...</div>

  const alertesActives = pannes.filter(p => p.statut !== 'resolu')
  const totalAlertes = alertesActives.length + horsService.length

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter, -apple-system, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '22px', fontWeight: '600', color: '#0A1628', letterSpacing: '-0.3px' }}>Alertes</div>
        <div style={{ fontSize: '14px', color: '#6B7A99', marginTop: '4px' }}>
          {totalAlertes === 0 ? 'Aucune alerte active' : `${totalAlertes} alerte${totalAlertes > 1 ? 's' : ''} active${totalAlertes > 1 ? 's' : ''}`}
        </div>
      </div>

      {/* Équipements hors service */}
      {horsService.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B7A99', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
            Hors service — Intervention requise
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {horsService.map(eq => (
              <div key={eq.id} style={{ background: '#FEF2F2', border: '0.5px solid #FECACA', borderRadius: '14px', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#DC2626', boxShadow: '0 0 0 3px rgba(220,38,38,0.15)', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#0A1628' }}>{eq.designation} — {eq.reference}</div>
                  <div style={{ fontSize: '12px', color: '#6B7A99', marginTop: '2px' }}>{eq.localisation}</div>
                </div>
                <span style={{ background: '#FEF2F2', color: '#DC2626', border: '0.5px solid #FECACA', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>
                  URGENT
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pannes signalées */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B7A99', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
          Pannes signalées
        </div>

        {alertesActives.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: '14px', border: '0.5px solid #DDE5F0', padding: '32px', textAlign: 'center', color: '#6B7A99', fontSize: '13px' }}>
            Aucune panne signalée
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {alertesActives.map(p => (
              <div key={p.id} style={{ background: '#fff', border: '0.5px solid #DDE5F0', borderRadius: '14px', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#F59E0B', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#0A1628' }}>
                    {p.equipements?.designation} — {p.equipements?.reference}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7A99', marginTop: '2px' }}>{p.equipements?.localisation}</div>
                  {p.description && <div style={{ fontSize: '12px', color: '#6B7A99', marginTop: '4px', fontStyle: 'italic' }}>{p.description}</div>}
                  <div style={{ fontSize: '11px', color: '#B0BCCE', marginTop: '4px' }}>Signalé le {formatDate(p.created_at)}</div>
                </div>
                <button
                  onClick={() => resoldrePanne(p.id)}
                  style={{ padding: '7px 14px', background: '#E8F5EF', border: '0.5px solid #BBF7D0', borderRadius: '8px', color: '#00875A', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
                >
                  ✓ Résoudre
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historique */}
      {pannes.filter(p => p.statut === 'resolu').length > 0 && (
        <div style={{ marginTop: '28px' }}>
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#6B7A99', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px' }}>
            Historique résolu
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pannes.filter(p => p.statut === 'resolu').map(p => (
              <div key={p.id} style={{ background: '#F8FAFC', border: '0.5px solid #F0F4FA', borderRadius: '12px', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '14px', opacity: 0.7 }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00875A', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#0A1628' }}>{p.equipements?.designation} — {p.equipements?.reference}</div>
                  <div style={{ fontSize: '11px', color: '#B0BCCE', marginTop: '2px' }}>{formatDate(p.created_at)}</div>
                </div>
                <span style={{ fontSize: '11px', color: '#00875A', fontWeight: '500' }}>Résolu</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}