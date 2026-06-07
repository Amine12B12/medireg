'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Maintenance = {
  id: string; type: string; statut: string
  date_prevue: string; date_realisee: string; notes: string
  equipement_id: string
  equipements: { reference: string; designation: string; localisation: string }
}

const statutStyle = (s: string) => {
  if (s === 'planifie') return { bg: '#EEF2FF', color: '#3730A3', label: 'Planifié' }
  if (s === 'en_cours') return { bg: '#FFF7E6', color: '#B45309', label: 'En cours' }
  return { bg: '#E8F5EF', color: '#00875A', label: 'Terminé' }
}

const typeLabel = (t: string) => t === 'preventive' ? 'Préventive' : 'Curative'

export default function MaintenancePage() {
  const [maintenances, setMaintenances] = useState<Maintenance[]>([])
  const [equipements, setEquipements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ equipement_id: '', type: 'preventive', statut: 'planifie', date_prevue: '', notes: '' })
  const supabase = createClient()

  async function load() {
    const { data } = await supabase
      .from('maintenances')
      .select('*, equipements(reference, designation, localisation)')
      .order('date_prevue', { ascending: true })
    const { data: equips } = await supabase.from('equipements').select('id, reference, designation')
    setMaintenances((data || []) as any)
    setEquipements(equips || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd() {
    if (!form.equipement_id) return
    setSaving(true)
    await supabase.from('maintenances').insert([form])
    setShowModal(false)
    setForm({ equipement_id: '', type: 'preventive', statut: 'planifie', date_prevue: '', notes: '' })
    setSaving(false)
    load()
  }

  const formatDate = (d: string) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  if (loading) return <div style={{ padding: '32px', color: '#6B7A99', fontSize: '14px' }}>Chargement...</div>

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter, -apple-system, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '600', color: '#0A1628', letterSpacing: '-0.3px' }}>Maintenance</div>
          <div style={{ fontSize: '14px', color: '#6B7A99', marginTop: '4px' }}>Planning des interventions</div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ padding: '10px 18px', background: '#1A56DB', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          + Planifier une intervention
        </button>
      </div>

      {/* Liste */}
      {maintenances.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '16px', border: '0.5px solid #DDE5F0', padding: '48px', textAlign: 'center', color: '#6B7A99', fontSize: '14px' }}>
          Aucune intervention planifiée
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {maintenances.map(m => {
            const st = statutStyle(m.statut)
            return (
              <div key={m.id} style={{ background: '#fff', borderRadius: '14px', border: '0.5px solid #DDE5F0', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '20px' }}>

                {/* Date */}
                <div style={{ minWidth: '64px', textAlign: 'center', padding: '10px', background: '#F8FAFC', borderRadius: '10px' }}>
                  {m.date_prevue ? (
                    <>
                      <div style={{ fontSize: '22px', fontWeight: '700', color: '#0A1628', lineHeight: 1 }}>
                        {new Date(m.date_prevue).getDate()}
                      </div>
                      <div style={{ fontSize: '11px', color: '#6B7A99', textTransform: 'uppercase', marginTop: '2px' }}>
                        {new Date(m.date_prevue).toLocaleDateString('fr-FR', { month: 'short' })}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#DC2626', fontWeight: '600' }}>Urgent</div>
                  )}
                </div>

                {/* Divider */}
                <div style={{ width: '1px', height: '48px', background: '#F0F4FA' }} />

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#0A1628' }}>
                    {m.equipements?.designation} — {m.equipements?.reference}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6B7A99', marginTop: '3px' }}>
                    {m.equipements?.localisation} · {typeLabel(m.type)}
                  </div>
                  {m.notes && (
                    <div style={{ fontSize: '12px', color: '#6B7A99', marginTop: '4px', fontStyle: 'italic' }}>{m.notes}</div>
                  )}
                </div>

                {/* Statut */}
                <span style={{ background: st.bg, color: st.color, padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', whiteSpace: 'nowrap' }}>
                  {st.label}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '460px', boxShadow: '0 20px 60px rgba(10,22,40,0.15)' }}>
            <div style={{ padding: '22px 28px', borderBottom: '0.5px solid #F0F4FA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#0A1628' }}>Planifier une intervention</div>
              <button onClick={() => setShowModal(false)} style={{ background: '#F0F4FA', border: 'none', color: '#6B7A99', width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '24px 28px' }}>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6B7A99', marginBottom: '6px' }}>Équipement *</label>
                <select value={form.equipement_id} onChange={e => setForm(p => ({ ...p, equipement_id: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #DDE5F0', borderRadius: '8px', fontSize: '13px', color: '#0A1628', fontFamily: 'inherit', outline: 'none' }}>
                  <option value=''>Sélectionner un équipement</option>
                  {equipements.map(e => <option key={e.id} value={e.id}>{e.reference} — {e.designation}</option>)}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6B7A99', marginBottom: '6px' }}>Type</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #DDE5F0', borderRadius: '8px', fontSize: '13px', color: '#0A1628', fontFamily: 'inherit', outline: 'none' }}>
                    <option value='preventive'>Préventive</option>
                    <option value='curative'>Curative</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6B7A99', marginBottom: '6px' }}>Statut</label>
                  <select value={form.statut} onChange={e => setForm(p => ({ ...p, statut: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #DDE5F0', borderRadius: '8px', fontSize: '13px', color: '#0A1628', fontFamily: 'inherit', outline: 'none' }}>
                    <option value='planifie'>Planifié</option>
                    <option value='en_cours'>En cours</option>
                    <option value='termine'>Terminé</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6B7A99', marginBottom: '6px' }}>Date prévue</label>
                <input type='date' value={form.date_prevue} onChange={e => setForm(p => ({ ...p, date_prevue: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #DDE5F0', borderRadius: '8px', fontSize: '13px', color: '#0A1628', fontFamily: 'inherit', outline: 'none' }} />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6B7A99', marginBottom: '6px' }}>Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} placeholder='Détails de l intervention...'
                  style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #DDE5F0', borderRadius: '8px', fontSize: '13px', color: '#0A1628', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '11px', background: '#F0F4FA', border: '0.5px solid #DDE5F0', borderRadius: '10px', color: '#6B7A99', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
                <button onClick={handleAdd} disabled={saving || !form.equipement_id} style={{ flex: 1, padding: '11px', background: saving || !form.equipement_id ? '#93AEED' : '#1A56DB', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {saving ? 'Enregistrement...' : 'Planifier'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}