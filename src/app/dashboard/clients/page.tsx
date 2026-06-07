'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Etablissement = {
  id: string; nom: string; type: string; ville: string
  contact_nom: string; contact_email: string; statut: string
  created_at: string
}

export default function ClientsPage() {
  const [etablissements, setEtablissements] = useState<Etablissement[]>([])
  const [equipCount, setEquipCount] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ nom: '', type: 'EHPAD', ville: '', contact_nom: '', contact_email: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function load() {
    const { data: etabs } = await supabase.from('etablissements').select('*').order('created_at')
    const { data: equips } = await supabase.from('equipements').select('etablissement_id')
    const counts: Record<string, number> = {}
    equips?.forEach(e => { counts[e.etablissement_id] = (counts[e.etablissement_id] || 0) + 1 })
    setEtablissements(etabs || [])
    setEquipCount(counts)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd() {
    if (!form.nom) return
    setSaving(true)
    await supabase.from('etablissements').insert([{ ...form }])
    setShowModal(false)
    setForm({ nom: '', type: 'EHPAD', ville: '', contact_nom: '', contact_email: '' })
    setSaving(false)
    load()
  }

  const statutBadge = (s: string) => s === 'actif'
    ? { bg: '#E8F5EF', color: '#00875A', label: 'Actif' }
    : { bg: '#FFF7E6', color: '#B45309', label: 'En attente' }

  if (loading) return <div style={{ padding: '32px', color: '#6B7A99', fontSize: '14px' }}>Chargement...</div>

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter, -apple-system, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '600', color: '#0A1628', letterSpacing: '-0.3px' }}>Clients</div>
          <div style={{ fontSize: '14px', color: '#6B7A99', marginTop: '4px' }}>{etablissements.length} établissement{etablissements.length > 1 ? 's' : ''}</div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ padding: '10px 18px', background: '#1A56DB', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          + Ajouter un client
        </button>
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {etablissements.map(etab => {
          const st = statutBadge(etab.statut)
          const count = equipCount[etab.id] || 0
          return (
            <div key={etab.id} style={{ background: '#fff', borderRadius: '16px', border: '0.5px solid #DDE5F0', padding: '22px', transition: 'box-shadow 0.15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(10,22,40,0.08)'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', background: '#EEF2FF', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: '#1A56DB' }}>
                    {etab.nom.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: '#0A1628' }}>{etab.nom}</div>
                    <div style={{ fontSize: '12px', color: '#6B7A99', marginTop: '1px' }}>{etab.type}{etab.ville ? ` · ${etab.ville}` : ''}</div>
                  </div>
                </div>
                <span style={{ background: st.bg, color: st.color, padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>{st.label}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '14px 0', borderTop: '0.5px solid #F0F4FA', borderBottom: '0.5px solid #F0F4FA', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: '#6B7A99', marginBottom: '2px' }}>Équipements</div>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: '#1A56DB' }}>{count}</div>
                </div>
                <div>
                  <div style={{ fontSize: '11px', color: '#6B7A99', marginBottom: '2px' }}>Contact</div>
                  <div style={{ fontSize: '12px', color: '#0A1628', fontWeight: '500' }}>{etab.contact_nom || '—'}</div>
                </div>
              </div>

              {etab.contact_email && (
                <div style={{ fontSize: '12px', color: '#6B7A99' }}>✉ {etab.contact_email}</div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal ajout client */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(10,22,40,0.15)' }}>
            <div style={{ padding: '22px 28px', borderBottom: '0.5px solid #F0F4FA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#0A1628' }}>Ajouter un établissement</div>
              <button onClick={() => setShowModal(false)} style={{ background: '#F0F4FA', border: 'none', color: '#6B7A99', width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>✕</button>
            </div>
            <div style={{ padding: '24px 28px' }}>
              {[
                { label: 'Nom de l\'établissement *', key: 'nom', type: 'text', placeholder: 'EHPAD Les Pins' },
                { label: 'Ville', key: 'ville', type: 'text', placeholder: 'Paris' },
                { label: 'Contact', key: 'contact_nom', type: 'text', placeholder: 'Dr. Martin' },
                { label: 'Email contact', key: 'contact_email', type: 'email', placeholder: 'contact@etablissement.fr' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6B7A99', marginBottom: '6px' }}>{f.label}</label>
                  <input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={(form as any)[f.key]}
                    onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #DDE5F0', borderRadius: '8px', fontSize: '13px', color: '#0A1628', fontFamily: 'inherit', outline: 'none' }}
                  />
                </div>
              ))}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6B7A99', marginBottom: '6px' }}>Type</label>
                <select value={form.type} onChange={e => setForm(prev => ({ ...prev, type: e.target.value }))} style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #DDE5F0', borderRadius: '8px', fontSize: '13px', color: '#0A1628', fontFamily: 'inherit', outline: 'none' }}>
                  <option>EHPAD</option>
                  <option>Clinique</option>
                  <option>HAD</option>
                  <option>Autre</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '11px', background: '#F0F4FA', border: '0.5px solid #DDE5F0', borderRadius: '10px', color: '#6B7A99', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
                <button onClick={handleAdd} disabled={saving || !form.nom} style={{ flex: 1, padding: '11px', background: saving || !form.nom ? '#93AEED' : '#1A56DB', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: saving || !form.nom ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {saving ? 'Enregistrement...' : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}