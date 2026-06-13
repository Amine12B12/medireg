'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import SearchableSelect from '@/components/SearchableSelect'

export default function DevisPage() {
  const [devis, setDevis] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [etablissements, setEtablissements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [description, setDescription] = useState('')
  const [selectedEtab, setSelectedEtab] = useState('')
  const [saving, setSaving] = useState(false)
  const [filterStatut, setFilterStatut] = useState('tous')
  const supabase = createClient()

  const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface)' }
  const labelStyle = { display: 'block', fontSize: '11px', fontWeight: '500' as const, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase' as const, letterSpacing: '0.4px' }

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
    setProfile(prof)
    const { data } = await supabase
      .from('devis_demandes')
      .select('*, etablissements(nom)')
      .order('created_at', { ascending: false })
    setDevis((data || []) as any)
    if (prof?.role === 'admin') {
      const { data: etabs } = await supabase.from('etablissements').select('id, nom').order('nom')
      setEtablissements(etabs || [])
      if (etabs && etabs.length > 0) setSelectedEtab(etabs[0].id)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSend() {
    if (!description) return
    const etabId = profile?.role === 'admin' ? selectedEtab : profile?.etablissement_id
    if (!etabId) return
    setSaving(true)
    await supabase.from('devis_demandes').insert([{ description, etablissement_id: etabId, statut: 'en_attente' }])
    setShowModal(false)
    setDescription('')
    setSaving(false)
    load()
  }

  async function updateStatut(id: string, statut: string) {
    await supabase.from('devis_demandes').update({ statut }).eq('id', id)
    load()
  }

  const statutStyle = (s: string) => {
    if (s === 'en_attente') return { color: 'var(--warning)', bg: 'var(--warning-light)', label: 'En attente', icon: 'ti-clock' }
    if (s === 'en_cours') return { color: 'var(--accent)', bg: 'var(--accent-light)', label: 'En cours', icon: 'ti-refresh' }
    return { color: 'var(--success)', bg: 'var(--success-light)', label: 'Traité', icon: 'ti-check' }
  }

  const filterBtn = (label: string, active: boolean, onClick: () => void) => (
    <button onClick={onClick} style={{ padding: '5px 12px', borderRadius: '20px', border: active ? '1px solid var(--accent)' : '1px solid var(--border)', background: active ? 'var(--accent-light)' : 'transparent', color: active ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '12px', fontWeight: active ? '500' : '400', cursor: 'pointer', fontFamily: 'var(--font)' }}>
      {label}
    </button>
  )

  const filtered = devis.filter(d => filterStatut === 'tous' || d.statut === filterStatut)

  if (loading) return <div style={{ padding: '28px', color: 'var(--text-tertiary)', fontSize: '13px', fontFamily: 'var(--font)' }}>Chargement...</div>

  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)' }}>

      {/* Header */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{filtered.length} demande{filtered.length > 1 ? 's' : ''}</div>
        <button onMouseDown={e => { if (e.target === e.currentTarget) setShowModal(true)}}
          style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 4px rgba(26,86,219,0.3)' }}>
          <i className="ti ti-plus" style={{ fontSize: '14px' }} aria-hidden="true" />
          Nouvelle demande
        </button>
      </div>

      {/* Filtres */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {filterBtn('Toutes', filterStatut === 'tous', () => setFilterStatut('tous'))}
        {filterBtn('En attente', filterStatut === 'en_attente', () => setFilterStatut('en_attente'))}
        {filterBtn('En cours', filterStatut === 'en_cours', () => setFilterStatut('en_cours'))}
        {filterBtn('Traité', filterStatut === 'traite', () => setFilterStatut('traite'))}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '48px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <i className="ti ti-file-invoice" style={{ fontSize: '24px', color: 'var(--accent)' }} aria-hidden="true" />
          </div>
          <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '4px' }}>Aucune demande</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Les demandes de devis apparaîtront ici</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(d => {
            const st = statutStyle(d.statut)
            return (
              <div key={d.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: '14px', boxShadow: 'var(--shadow-sm)', borderLeft: `3px solid ${st.color}` }}>
                <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`ti ${st.icon}`} style={{ fontSize: '20px', color: st.color }} aria-hidden="true" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
                        {(d.etablissements as any)?.nom || '—'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <i className="ti ti-clock" style={{ fontSize: '12px' }} aria-hidden="true" />
                        {new Date(d.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                    <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', flexShrink: 0 }}>{st.label}</span>
                  </div>

                  <div style={{ padding: '12px 14px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: profile?.role === 'admin' ? '12px' : '0', lineHeight: 1.6 }}>
                    {d.description}
                  </div>

                  {profile?.role === 'admin' && (
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Statut :</span>
                      {['en_attente', 'en_cours', 'traite'].map(s => {
                        const ss = statutStyle(s)
                        const isActive = d.statut === s
                        return (
                          <button key={s} onClick={() => updateStatut(d.id, s)}
                            style={{ padding: '5px 12px', background: isActive ? ss.bg : 'transparent', border: `1px solid ${isActive ? ss.color : 'var(--border)'}`, borderRadius: '20px', fontSize: '11px', fontWeight: isActive ? '600' : '400', color: isActive ? ss.color : 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.1s', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {isActive && <i className="ti ti-check" style={{ fontSize: '11px' }} aria-hidden="true" />}
                            {ss.label}
                          </button>
                        )
                      })}
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
        <div onMouseDown={e => { if (e.target === e.currentTarget) setShowModal(false) }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '480px', boxShadow: '0 24px 64px rgba(0,0,0,0.12)', border: '1px solid var(--border)' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Nouvelle demande de devis</div>
              <button onMouseDown={e => { if (e.target === e.currentTarget) setShowModal(false) }} style={{ width: '30px', height: '30px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-hover)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                <i className="ti ti-x" style={{ fontSize: '14px' }} aria-hidden="true" />
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {profile?.role === 'admin' && (
                <div>
                  <label style={labelStyle}>Établissement</label>
                    <select
                      value={selectedEtab}
                      onChange={e => setSelectedEtab(e.target.value)}
              style={inputStyle}
  >
    <option value=''>Sélectionner...</option>
    {etablissements.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
  </select>
</div>
              )}
              <div>
                <label style={labelStyle}>Description *</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5}
                  placeholder="Décrivez le matériel souhaité, la quantité, le contexte d'utilisation..."
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onMouseDown={e => { if (e.target === e.currentTarget) setShowModal(false) }}
                  style={{ flex: 1, padding: '11px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  Annuler
                </button>
                <button onClick={handleSend} disabled={saving || !description}
                  style={{ flex: 1, padding: '11px', background: saving || !description ? 'rgba(26,86,219,0.4)' : 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: saving || !description ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', boxShadow: '0 1px 4px rgba(26,86,219,0.3)' }}>
                  {saving ? 'Envoi...' : 'Envoyer la demande'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}