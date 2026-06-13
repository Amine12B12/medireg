'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function LivraisonsPage() {
  const [livraisons, setLivraisons] = useState<any[]>([])
  const [equipements, setEquipements] = useState<any[]>([])
  const [etablissements, setEtablissements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterStatut, setFilterStatut] = useState('tous')
  const [form, setForm] = useState({
    equipement_id: '', etablissement_id: '',
    date_prevue: '', statut: 'planifie', notes: ''
  })
  const supabase = createClient()

  const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface)' }
  const labelStyle = { display: 'block', fontSize: '11px', fontWeight: '500' as const, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase' as const, letterSpacing: '0.4px' }

  async function load() {
    const { data: l } = await supabase
      .from('livraisons')
      .select('*, equipements(reference, designation), etablissements(nom, ville)')
      .order('date_prevue', { ascending: true })
    const { data: e } = await supabase.from('equipements').select('id, reference, designation').order('designation')
    const { data: etabs } = await supabase.from('etablissements').select('id, nom').order('nom')
    setLivraisons(l || [])
    setEquipements(e || [])
    setEtablissements(etabs || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd() {
    if (!form.equipement_id || !form.etablissement_id) return
    setSaving(true)
    const payload: any = {
      equipement_id: form.equipement_id,
      etablissement_id: form.etablissement_id,
      statut: form.statut,
      notes: form.notes || null,
    }
    if (form.date_prevue) payload.date_prevue = form.date_prevue
    const { error } = await supabase.from('livraisons').insert([payload])
    if (error) console.error('Erreur livraison:', error)
    setShowModal(false)
    setForm({ equipement_id: '', etablissement_id: '', date_prevue: '', statut: 'planifie', notes: '' })
    setSaving(false)
    load()
  }

  async function updateStatut(id: string, statut: string) {
    await supabase.from('livraisons').update({ statut }).eq('id', id)
    load()
  }

  const statutStyle = (s: string) => {
    if (s === 'planifie') return { color: 'var(--accent)', bg: 'var(--accent-light)', label: 'Planifié', icon: 'ti-calendar' }
    if (s === 'en_cours') return { color: 'var(--warning)', bg: 'var(--warning-light)', label: 'En cours', icon: 'ti-truck' }
    return { color: 'var(--success)', bg: 'var(--success-light)', label: 'Livré', icon: 'ti-check' }
  }

  const filterBtn = (label: string, active: boolean, onClick: () => void) => (
    <button onClick={onClick} style={{ padding: '5px 12px', borderRadius: '20px', border: active ? '1px solid var(--accent)' : '1px solid var(--border)', background: active ? 'var(--accent-light)' : 'transparent', color: active ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '12px', fontWeight: active ? '500' : '400', cursor: 'pointer', fontFamily: 'var(--font)' }}>
      {label}
    </button>
  )

  const filtered = livraisons.filter(l => filterStatut === 'tous' || l.statut === filterStatut)

  if (loading) return <div style={{ padding: '28px', color: 'var(--text-tertiary)', fontSize: '13px', fontFamily: 'var(--font)' }}>Chargement...</div>

  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)' }}>

      {/* Header */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{filtered.length} livraison{filtered.length > 1 ? 's' : ''}</div>
        <button onClick={() => setShowModal(true)}
          style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 4px rgba(26,86,219,0.3)' }}>
          <i className="ti ti-plus" style={{ fontSize: '14px' }} aria-hidden="true" />
          Planifier une livraison
        </button>
      </div>

      {/* Filtres */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {filterBtn('Toutes', filterStatut === 'tous', () => setFilterStatut('tous'))}
        {filterBtn('Planifié', filterStatut === 'planifie', () => setFilterStatut('planifie'))}
        {filterBtn('En cours', filterStatut === 'en_cours', () => setFilterStatut('en_cours'))}
        {filterBtn('Livré', filterStatut === 'livre', () => setFilterStatut('livre'))}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '48px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <i className="ti ti-truck" style={{ fontSize: '24px', color: 'var(--accent)' }} aria-hidden="true" />
          </div>
          <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '4px' }}>Aucune livraison</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Planifiez votre première livraison</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(l => {
            const st = statutStyle(l.statut)
            const date = l.date_prevue ? new Date(l.date_prevue) : null
            return (
              <div key={l.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: '14px', boxShadow: 'var(--shadow-sm)', borderLeft: `3px solid ${st.color}` }}>

                {date ? (
                  <div style={{ width: '48px', flexShrink: 0, textAlign: 'center', background: st.bg, borderRadius: 'var(--radius-md)', padding: '8px 4px' }}>
                    <div style={{ fontSize: '20px', fontWeight: '700', color: st.color, lineHeight: 1 }}>{date.getDate()}</div>
                    <div style={{ fontSize: '10px', fontWeight: '500', color: st.color, textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '2px' }}>
                      {date.toLocaleDateString('fr-FR', { month: 'short' })}
                    </div>
                  </div>
                ) : (
                  <div style={{ width: '48px', height: '48px', flexShrink: 0, background: st.bg, borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className={`ti ${st.icon}`} style={{ fontSize: '20px', color: st.color }} aria-hidden="true" />
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
                        {(l.equipements as any)?.designation}
                        <span style={{ fontSize: '12px', fontWeight: '400', color: 'var(--text-tertiary)', marginLeft: '8px' }}>{(l.equipements as any)?.reference}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <i className="ti ti-building-hospital" style={{ fontSize: '13px' }} aria-hidden="true" />
                          {(l.etablissements as any)?.nom || '—'}
                        </span>
                        {(l.etablissements as any)?.ville && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <i className="ti ti-map-pin" style={{ fontSize: '13px' }} aria-hidden="true" />
                            {(l.etablissements as any)?.ville}
                          </span>
                        )}
                      </div>
                    </div>
                    <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', flexShrink: 0 }}>{st.label}</span>
                  </div>
                  {l.notes && (
                    <div style={{ padding: '8px 12px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px', fontStyle: 'italic' }}>
                      "{l.notes}"
                    </div>
                  )}
                  {l.statut !== 'livre' && (
                    <div style={{ display: 'flex', gap: '6px', marginTop: '12px' }}>
                      {l.statut === 'planifie' && (
                        <button onClick={() => updateStatut(l.id, 'en_cours')}
                          style={{ padding: '6px 14px', background: 'var(--warning-light)', border: '1px solid rgba(158,94,0,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--warning)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <i className="ti ti-truck" style={{ fontSize: '13px' }} aria-hidden="true" />
                          En cours de livraison
                        </button>
                      )}
                      {l.statut === 'en_cours' && (
                        <button onClick={() => updateStatut(l.id, 'livre')}
                          style={{ padding: '6px 14px', background: 'var(--success-light)', border: '1px solid rgba(10,124,78,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--success)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <i className="ti ti-check" style={{ fontSize: '13px' }} aria-hidden="true" />
                          Marquer comme livré
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div onMouseDown={e => { if (e.target === e.currentTarget) setShowModal(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '480px', boxShadow: '0 24px 64px rgba(0,0,0,0.12)', border: '1px solid var(--border)' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Planifier une livraison</div>
              <button onClick={() => setShowModal(false)}
                style={{ width: '30px', height: '30px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-hover)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                <i className="ti ti-x" style={{ fontSize: '14px' }} aria-hidden="true" />
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Équipement *</label>
                <select value={form.equipement_id} onChange={e => setForm(p => ({ ...p, equipement_id: e.target.value }))} style={inputStyle}>
                  <option value=''>Sélectionner un équipement...</option>
                  {equipements.map(e => <option key={e.id} value={e.id}>{e.reference} — {e.designation}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Établissement *</label>
                <select value={form.etablissement_id} onChange={e => setForm(p => ({ ...p, etablissement_id: e.target.value }))} style={inputStyle}>
                  <option value=''>Sélectionner un établissement...</option>
                  {etablissements.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Date prévue</label>
                  <input type='date' value={form.date_prevue}
                    onChange={e => setForm(p => ({ ...p, date_prevue: e.target.value }))}
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Statut</label>
                  <select value={form.statut} onChange={e => setForm(p => ({ ...p, statut: e.target.value }))} style={inputStyle}>
                    <option value='planifie'>Planifié</option>
                    <option value='en_cours'>En cours</option>
                    <option value='livre'>Livré</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea rows={3} placeholder='Instructions de livraison...' value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  style={{ ...inputStyle, resize: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: '11px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  Annuler
                </button>
                <button onClick={handleAdd} disabled={saving || !form.equipement_id || !form.etablissement_id}
                  style={{ flex: 1, padding: '11px', background: saving || !form.equipement_id || !form.etablissement_id ? 'rgba(26,86,219,0.4)' : 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: saving || !form.equipement_id || !form.etablissement_id ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', boxShadow: '0 1px 4px rgba(26,86,219,0.3)' }}>
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