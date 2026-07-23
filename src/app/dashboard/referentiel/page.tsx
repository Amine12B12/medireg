'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface)' }
const labelStyle = { display: 'block', fontSize: '11px', fontWeight: '500' as const, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase' as const, letterSpacing: '0.4px' }

function Modal({ onClose, children, maxWidth = '560px' }: { onClose: () => void; children: React.ReactNode; maxWidth?: string }) {
  return (
    <div onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.12)', border: '1px solid var(--border)' }}>
        {children}
      </div>
    </div>
  )
}

function ModalHeader({ title, sub, onClose }: { title: string; sub?: string; onClose: () => void }) {
  return (
    <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10 }}>
      <div>
        <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>{title}</div>
        {sub && <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{sub}</div>}
      </div>
      <button onClick={onClose} style={{ width: '30px', height: '30px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-hover)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        <i className="ti ti-x" style={{ fontSize: '14px' }} />
      </button>
    </div>
  )
}

const ORGANISMES = ['HAS', 'ANSM', 'Ministere Sante Maroc', 'ISO', 'COFRAC', 'ARS', 'Autre']
const PAYS = ['France', 'Maroc', 'International']

const organismeStyle = (o: string) => {
  if (o === 'HAS') return { color: '#1A56DB', bg: '#EBF2FF' }
  if (o === 'ANSM') return { color: '#0891B2', bg: '#E0F2FE' }
  if (o === 'Ministere Sante Maroc') return { color: '#D97706', bg: '#FEF3C7' }
  if (o === 'ISO') return { color: '#7C3AED', bg: '#F5F3FF' }
  if (o === 'COFRAC') return { color: '#059669', bg: '#D1FAE5' }
  return { color: 'var(--text-secondary)', bg: 'var(--surface-hover)' }
}

function CritereItem({ critere, role, onDelete }: { critere: any; role: string | null; onDelete: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: '6px', overflow: 'hidden' }}>
      <div onClick={() => setOpen(!open)} style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
        {critere.code && (
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--accent)', background: 'var(--accent-light)', padding: '2px 8px', borderRadius: 'var(--radius-sm)', flexShrink: 0, fontFamily: 'monospace' }}>{critere.code}</span>
        )}
        <div style={{ flex: 1, fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{critere.titre}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {critere.obligatoire && <span style={{ fontSize: '10px', color: 'var(--danger)', background: 'var(--danger-light)', padding: '1px 6px', borderRadius: '20px', fontWeight: '500' }}>Obligatoire</span>}
          <i className={`ti ${open ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: '14px', color: 'var(--text-tertiary)' }} />
        </div>
      </div>
      {open && (
        <div style={{ padding: '0 14px 12px', borderTop: '1px solid var(--border)' }}>
          {critere.description && (
            <div style={{ padding: '10px 12px', background: 'var(--surface)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-secondary)', marginTop: '10px', marginBottom: '8px' }}>
              {critere.description}
            </div>
          )}
          {role === 'consultant' && (
            <button onClick={onDelete}
              style={{ padding: '5px 10px', background: 'var(--danger-light)', border: '1px solid rgba(194,54,42,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <i className="ti ti-trash" style={{ fontSize: '12px' }} />Supprimer
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function ReferentielPage() {
  const [referentiels, setReferentiels] = useState<any[]>([])
  const [criteres, setCriteres] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)
  const [selectedRef, setSelectedRef] = useState<any>(null)
  const [showRefModal, setShowRefModal] = useState(false)
  const [showCritereModal, setShowCritereModal] = useState(false)
  const [showEditRefModal, setShowEditRefModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterPays, setFilterPays] = useState('tous')
  const [refForm, setRefForm] = useState({ nom: '', organisme: 'HAS', pays: 'France', version: '', description: '' })
  const [critereForm, setCritereForm] = useState({ code: '', titre: '', description: '', categorie: '', obligatoire: true })
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setRole(prof?.role || 'client')
      load()
    }
    init()
  }, [])

  async function load() {
    const { data } = await supabase.from('referentiels').select('*').order('organisme').order('nom')
    setReferentiels(data || [])
    setLoading(false)
  }

  async function loadCriteres(refId: string) {
    const { data } = await supabase.from('criteres').select('*').eq('referentiel_id', refId).order('code')
    setCriteres(data || [])
  }

  async function openRef(ref: any) {
    setSelectedRef(ref)
    await loadCriteres(ref.id)
  }

  async function handleAddRef() {
    if (!refForm.nom) return
    setSaving(true)
    await supabase.from('referentiels').insert([{
      nom: refForm.nom,
      organisme: refForm.organisme,
      pays: refForm.pays,
      version: refForm.version || null,
      description: refForm.description || null
    }])
    setShowRefModal(false)
    setRefForm({ nom: '', organisme: 'HAS', pays: 'France', version: '', description: '' })
    setSaving(false)
    load()
  }

  async function handleEditRef() {
    if (!selectedRef || !refForm.nom) return
    setSaving(true)
    await supabase.from('referentiels').update({
      nom: refForm.nom,
      organisme: refForm.organisme,
      pays: refForm.pays,
      version: refForm.version || null,
      description: refForm.description || null
    }).eq('id', selectedRef.id)
    setShowEditRefModal(false)
    setSaving(false)
    load()
    setSelectedRef((prev: any) => ({ ...prev, ...refForm }))
  }

  async function handleDeleteRef(id: string) {
    await supabase.from('referentiels').delete().eq('id', id)
    setSelectedRef(null)
    load()
  }

  async function handleAddCritere() {
    if (!critereForm.titre || !selectedRef) return
    setSaving(true)
    await supabase.from('criteres').insert([{
      referentiel_id: selectedRef.id,
      code: critereForm.code || null,
      titre: critereForm.titre,
      description: critereForm.description || null,
      categorie: critereForm.categorie || null,
      obligatoire: critereForm.obligatoire
    }])
    setShowCritereModal(false)
    setCritereForm({ code: '', titre: '', description: '', categorie: '', obligatoire: true })
    setSaving(false)
    loadCriteres(selectedRef.id)
  }

  async function handleDeleteCritere(id: string) {
    await supabase.from('criteres').delete().eq('id', id)
    loadCriteres(selectedRef.id)
  }

  const filtered = referentiels.filter(r => filterPays === 'tous' || r.pays === filterPays)
  const categoriesUniques = [...new Set(criteres.map(c => c.categorie).filter(Boolean))]

  const filterBtn = (label: string, active: boolean, onClick: () => void) => (
    <button onClick={onClick} style={{ padding: '5px 12px', borderRadius: '20px', border: active ? '1px solid var(--accent)' : '1px solid var(--border)', background: active ? 'var(--accent-light)' : 'transparent', color: active ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '12px', fontWeight: active ? '500' : '400', cursor: 'pointer', fontFamily: 'var(--font)' }}>
      {label}
    </button>
  )

  if (loading) return <div style={{ padding: '28px', color: 'var(--text-tertiary)', fontSize: '13px', fontFamily: 'var(--font)' }}>Chargement...</div>

  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)', display: 'flex', gap: '20px', height: 'calc(100vh - 58px)', overflow: 'hidden' }}>

      {/* LISTE REFERENTIELS */}
      <div style={{ width: '320px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{filtered.length} referentiel{filtered.length > 1 ? 's' : ''}</div>
          {role === 'consultant' && (
            <button onClick={() => setShowRefModal(true)}
              style={{ padding: '7px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '5px', boxShadow: '0 1px 4px rgba(26,86,219,0.3)' }}>
              <i className="ti ti-plus" style={{ fontSize: '13px' }} />Ajouter
            </button>
          )}
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {filterBtn('Tous', filterPays === 'tous', () => setFilterPays('tous'))}
          {filterBtn('France', filterPays === 'France', () => setFilterPays('France'))}
          {filterBtn('Maroc', filterPays === 'Maroc', () => setFilterPays('Maroc'))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.length === 0 ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '32px', textAlign: 'center' }}>
              <i className="ti ti-book" style={{ fontSize: '28px', display: 'block', marginBottom: '8px', color: 'var(--text-tertiary)', opacity: 0.4 }} />
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Aucun referentiel</div>
            </div>
          ) : filtered.map(ref => {
            const os = organismeStyle(ref.organisme)
            const isSelected = selectedRef?.id === ref.id
            return (
              <div key={ref.id} onClick={() => openRef(ref)}
                style={{ background: isSelected ? 'var(--accent-light)' : 'var(--surface)', border: `1px solid ${isSelected ? 'rgba(26,86,219,0.3)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: '14px 16px', cursor: 'pointer' }}
                onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-hover)' }}
                onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'var(--surface)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: isSelected ? 'var(--accent)' : 'var(--text-primary)' }}>{ref.nom}</div>
                  <span style={{ background: os.bg, color: os.color, padding: '2px 7px', borderRadius: '20px', fontSize: '10px', fontWeight: '600', flexShrink: 0 }}>{ref.organisme}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  {ref.version && <span>v{ref.version}</span>}
                  <span>{ref.pays}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* DETAIL REFERENTIEL */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {!selectedRef ? (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ textAlign: 'center' }}>
              <i className="ti ti-book-open" style={{ fontSize: '40px', display: 'block', marginBottom: '12px', color: 'var(--text-tertiary)', opacity: 0.3 }} />
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '4px' }}>Selectionnez un referentiel</div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Cliquez sur un referentiel pour voir ses criteres</div>
            </div>
          </div>
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)' }}>{selectedRef.nom}</div>
                  {(() => { const os = organismeStyle(selectedRef.organisme); return <span style={{ background: os.bg, color: os.color, padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>{selectedRef.organisme}</span> })()}
                  {selectedRef.version && <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', background: 'var(--surface-hover)', padding: '2px 8px', borderRadius: '20px', border: '1px solid var(--border)' }}>v{selectedRef.version}</span>}
                </div>
                {selectedRef.description && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{selectedRef.description}</div>}
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{criteres.length} critere{criteres.length > 1 ? 's' : ''} · {selectedRef.pays}</div>
              </div>
              {role === 'consultant' && (
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => { setRefForm({ nom: selectedRef.nom, organisme: selectedRef.organisme, pays: selectedRef.pays, version: selectedRef.version || '', description: selectedRef.description || '' }); setShowEditRefModal(true) }}
                    style={{ padding: '6px 12px', background: 'var(--warning-light)', border: '1px solid rgba(158,94,0,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--warning)', fontSize: '11px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <i className="ti ti-edit" style={{ fontSize: '12px' }} />Modifier
                  </button>
                  <button onClick={() => setShowCritereModal(true)}
                    style={{ padding: '6px 12px', background: 'var(--accent-light)', border: '1px solid rgba(26,86,219,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--accent)', fontSize: '11px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <i className="ti ti-plus" style={{ fontSize: '12px' }} />Critere
                  </button>
                  <button onClick={() => handleDeleteRef(selectedRef.id)}
                    style={{ padding: '6px 10px', background: 'var(--danger-light)', border: '1px solid rgba(194,54,42,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center' }}>
                    <i className="ti ti-trash" style={{ fontSize: '13px' }} />
                  </button>
                </div>
              )}
            </div>

            <div style={{ padding: '20px 24px' }}>
              {criteres.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                  <i className="ti ti-list" style={{ fontSize: '32px', display: 'block', marginBottom: '10px', opacity: 0.3 }} />
                  <div style={{ fontSize: '13px' }}>Aucun critere — ajoutez des criteres a ce referentiel</div>
                </div>
              ) : (
                <>
                  {categoriesUniques.map(cat => (
                    <div key={cat} style={{ marginBottom: '20px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px', paddingBottom: '6px', borderBottom: '2px solid var(--accent-light)' }}>
                        {cat}
                      </div>
                      {criteres.filter(c => c.categorie === cat).map(critere => (
                        <CritereItem key={critere.id} critere={critere} role={role} onDelete={() => handleDeleteCritere(critere.id)} />
                      ))}
                    </div>
                  ))}
                  {criteres.filter(c => !c.categorie).map(critere => (
                    <CritereItem key={critere.id} critere={critere} role={role} onDelete={() => handleDeleteCritere(critere.id)} />
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL AJOUTER REFERENTIEL */}
      {showRefModal && (
        <Modal onClose={() => setShowRefModal(false)}>
          <ModalHeader title="Ajouter un referentiel" onClose={() => setShowRefModal(false)} />
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Nom *</label>
              <input value={refForm.nom} onChange={e => setRefForm(prev => ({ ...prev, nom: e.target.value }))} placeholder="Certification HAS V2024" style={inputStyle} autoFocus />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Organisme</label>
                <select value={refForm.organisme} onChange={e => setRefForm(prev => ({ ...prev, organisme: e.target.value }))} style={inputStyle}>
                  {ORGANISMES.map(org => <option key={org}>{org}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Pays</label>
                <select value={refForm.pays} onChange={e => setRefForm(prev => ({ ...prev, pays: e.target.value }))} style={inputStyle}>
                  {PAYS.map(pays => <option key={pays}>{pays}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Version</label>
              <input value={refForm.version} onChange={e => setRefForm(prev => ({ ...prev, version: e.target.value }))} placeholder="2024" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea value={refForm.description} onChange={e => setRefForm(prev => ({ ...prev, description: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowRefModal(false)}
                style={{ flex: 1, padding: '11px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                Annuler
              </button>
              <button onClick={handleAddRef} disabled={saving || !refForm.nom}
                style={{ flex: 1, padding: '11px', background: saving || !refForm.nom ? 'rgba(26,86,219,0.4)' : 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: saving || !refForm.nom ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>
                {saving ? 'Enregistrement...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL MODIFIER REFERENTIEL */}
      {showEditRefModal && selectedRef && (
        <Modal onClose={() => setShowEditRefModal(false)}>
          <ModalHeader title="Modifier le referentiel" onClose={() => setShowEditRefModal(false)} />
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Nom *</label>
              <input value={refForm.nom} onChange={e => setRefForm(prev => ({ ...prev, nom: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Organisme</label>
                <select value={refForm.organisme} onChange={e => setRefForm(prev => ({ ...prev, organisme: e.target.value }))} style={inputStyle}>
                  {ORGANISMES.map(org => <option key={org}>{org}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Pays</label>
                <select value={refForm.pays} onChange={e => setRefForm(prev => ({ ...prev, pays: e.target.value }))} style={inputStyle}>
                  {PAYS.map(pays => <option key={pays}>{pays}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label style={labelStyle}>Version</label>
              <input value={refForm.version} onChange={e => setRefForm(prev => ({ ...prev, version: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea value={refForm.description} onChange={e => setRefForm(prev => ({ ...prev, description: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowEditRefModal(false)}
                style={{ flex: 1, padding: '11px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                Annuler
              </button>
              <button onClick={handleEditRef} disabled={saving || !refForm.nom}
                style={{ flex: 1, padding: '11px', background: saving || !refForm.nom ? 'rgba(26,86,219,0.4)' : 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: saving || !refForm.nom ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>
                {saving ? 'Enregistrement...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL AJOUTER CRITERE */}
      {showCritereModal && selectedRef && (
        <Modal onClose={() => setShowCritereModal(false)} maxWidth="480px">
          <ModalHeader title="Ajouter un critere" sub={selectedRef.nom} onClose={() => setShowCritereModal(false)} />
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Code</label>
                <input value={critereForm.code} onChange={e => setCritereForm(prev => ({ ...prev, code: e.target.value }))} placeholder="1.1.a" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Categorie</label>
                <input value={critereForm.categorie} onChange={e => setCritereForm(prev => ({ ...prev, categorie: e.target.value }))} placeholder="Gouvernance" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Titre *</label>
              <input value={critereForm.titre} onChange={e => setCritereForm(prev => ({ ...prev, titre: e.target.value }))} placeholder="Le directeur assure la gouvernance..." style={inputStyle} autoFocus />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea value={critereForm.description} onChange={e => setCritereForm(prev => ({ ...prev, description: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'none' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input type='checkbox' id='obligatoire' checked={critereForm.obligatoire} onChange={e => setCritereForm(prev => ({ ...prev, obligatoire: e.target.checked }))}
                style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: 'var(--accent)' }} />
              <label htmlFor='obligatoire' style={{ fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>Critere obligatoire</label>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowCritereModal(false)}
                style={{ flex: 1, padding: '11px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                Annuler
              </button>
              <button onClick={handleAddCritere} disabled={saving || !critereForm.titre}
                style={{ flex: 1, padding: '11px', background: saving || !critereForm.titre ? 'rgba(26,86,219,0.4)' : 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: saving || !critereForm.titre ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>
                {saving ? 'Enregistrement...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}