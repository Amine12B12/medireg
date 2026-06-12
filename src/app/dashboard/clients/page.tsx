'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Etablissement = {
  id: string; nom: string; type: string; ville: string
  contact_nom: string; contact_email: string; statut: string
  formule: string; created_at: string
}

const TYPES_CLIENT = ['EHPAD', 'Pharmacie', 'SSIAD', 'SAD', 'Établissement seniors', 'Clinique', 'HAD', 'Autre']

export default function ClientsPage() {
  const [etablissements, setEtablissements] = useState<Etablissement[]>([])
  const [equipCount, setEquipCount] = useState<Record<string, number>>({})
  const [alertCount, setAlertCount] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAccessModal, setShowAccessModal] = useState(false)
  const [showEquipModal, setShowEquipModal] = useState(false)
  const [selectedEtab, setSelectedEtab] = useState<Etablissement | null>(null)
  const [selectedEtabEquip, setSelectedEtabEquip] = useState<Etablissement | null>(null)
  const [etabEquipements, setEtabEquipements] = useState<any[]>([])
  const [allEquipements, setAllEquipements] = useState<any[]>([])
  const [equipLoading, setEquipLoading] = useState(false)
  const [affectForm, setAffectForm] = useState({ equipement_id: '' })
  const [affectSaving, setAffectSaving] = useState(false)
  const [saving, setSaving] = useState(false)
  const [accessSaving, setAccessSaving] = useState(false)
  const [accessSuccess, setAccessSuccess] = useState(false)
  const [accessError, setAccessError] = useState('')
  const [filterStatut, setFilterStatut] = useState('tous')
  const [filterType, setFilterType] = useState('tous')
  const [form, setForm] = useState({ nom: '', type: 'EHPAD', ville: '', contact_nom: '', contact_email: '', formule: 'Essentiel' })
  const [accessForm, setAccessForm] = useState({ email: '', password: '', confirmPassword: '' })
  const supabase = createClient()

  async function load() {
    const { data: etabs } = await supabase.from('etablissements').select('*').order('nom')
    const { data: equips } = await supabase.from('equipements').select('etablissement_id')
    const { data: pannes } = await supabase.from('pannes').select('equipements(etablissement_id)').eq('statut', 'ouvert')
    const counts: Record<string, number> = {}
    equips?.forEach(e => { counts[e.etablissement_id] = (counts[e.etablissement_id] || 0) + 1 })
    const alerts: Record<string, number> = {}
    pannes?.forEach((p: any) => {
      const etabId = p.equipements?.etablissement_id
      if (etabId) alerts[etabId] = (alerts[etabId] || 0) + 1
    })
    setEtablissements(etabs || [])
    setEquipCount(counts)
    setAlertCount(alerts)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function openEquipModal(etab: Etablissement) {
    setSelectedEtabEquip(etab)
    setShowEquipModal(true)
    setEquipLoading(true)
    setAffectForm({ equipement_id: '' })
    const { data: etabEquips } = await supabase.from('equipements').select('*').eq('etablissement_id', etab.id)
    const { data: all } = await supabase.from('equipements').select('id, reference, designation').neq('etablissement_id', etab.id)
    setEtabEquipements(etabEquips || [])
    setAllEquipements(all || [])
    setEquipLoading(false)
  }

  async function handleAffectEquip() {
    if (!affectForm.equipement_id || !selectedEtabEquip) return
    setAffectSaving(true)
    await supabase.from('equipements').update({ etablissement_id: selectedEtabEquip.id }).eq('id', affectForm.equipement_id)
    setAffectForm({ equipement_id: '' })
    setAffectSaving(false)
    openEquipModal(selectedEtabEquip)
    load()
  }

  async function handleAdd() {
    if (!form.nom) return
    setSaving(true)
    await supabase.from('etablissements').insert([{ ...form }])
    setShowAddModal(false)
    setForm({ nom: '', type: 'EHPAD', ville: '', contact_nom: '', contact_email: '', formule: 'Essentiel' })
    setSaving(false)
    load()
  }

  async function handleCreateAccess() {
    if (!accessForm.email || !accessForm.password) return
    if (accessForm.password !== accessForm.confirmPassword) { setAccessError('Les mots de passe ne correspondent pas'); return }
    if (accessForm.password.length < 6) { setAccessError('Minimum 6 caractères'); return }
    setAccessSaving(true); setAccessError('')
    const res = await fetch('/api/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: accessForm.email, password: accessForm.password, etablissement_id: selectedEtab?.id, nom: selectedEtab?.nom })
    })
    const data = await res.json()
    if (data.error) { setAccessError(data.error); setAccessSaving(false); return }
    setAccessSuccess(true); setAccessSaving(false)
    setTimeout(() => { setShowAccessModal(false); setAccessSuccess(false); setAccessForm({ email: '', password: '', confirmPassword: '' }) }, 2000)
  }

  const statutBadge = (s: string) => s === 'actif'
    ? { bg: '#F0FDF4', color: '#059669', border: '#BBF7D0', label: 'Actif' }
    : { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A', label: 'En attente' }

  const formuleBadge = (f: string) => {
    if (f === 'Premium') return { bg: '#EFF6FF', color: '#1A56DB', border: '#BFDBFE' }
    if (f === 'Privilège') return { bg: '#F5F3FF', color: '#7C3AED', border: '#DDD6FE' }
    return { bg: '#F9FAFB', color: '#6B7280', border: '#E5E7EB' }
  }

  const statutEquip = (s: string) => s === 'en_service'
    ? { color: '#059669', label: 'En service' }
    : s === 'maintenance' ? { color: '#B45309', label: 'Maintenance' }
    : { color: '#DC2626', label: 'Hors service' }

  const filtered = etablissements
    .filter(e => filterStatut === 'tous' || e.statut === filterStatut)
    .filter(e => filterType === 'tous' || e.type === filterType)

  const filterBtn = (label: string, active: boolean, onClick: () => void) => (
    <button onClick={onClick} style={{ padding: '6px 12px', borderRadius: '6px', border: '0.5px solid', borderColor: active ? '#1A56DB' : '#E5E7EB', background: active ? '#EFF6FF' : '#fff', color: active ? '#1A56DB' : '#6B7280', fontSize: '12px', fontWeight: active ? '500' : '400', cursor: 'pointer', fontFamily: 'inherit' }}>
      {label}
    </button>
  )

  if (loading) return <div style={{ padding: '24px', color: '#6B7280', fontSize: '13px' }}>Chargement...</div>

  return (
    <div style={{ padding: '24px', fontFamily: 'Inter, -apple-system, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '13px', color: '#6B7280' }}>{filtered.length} établissement{filtered.length > 1 ? 's' : ''}</div>
        <button onClick={() => setShowAddModal(true)}
          style={{ padding: '8px 14px', background: '#1A56DB', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="ti ti-plus" style={{ fontSize: '14px' }} aria-hidden="true" />
          Ajouter un client
        </button>
      </div>

      {/* Filtres */}
      <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {filterBtn('Tous', filterStatut === 'tous', () => setFilterStatut('tous'))}
          {filterBtn('Actif', filterStatut === 'actif', () => setFilterStatut('actif'))}
          {filterBtn('En attente', filterStatut === 'en_attente', () => setFilterStatut('en_attente'))}
        </div>
        <div style={{ width: '1px', height: '20px', background: '#E5E7EB' }} />
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding: '6px 10px', border: '0.5px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#111827', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
          <option value='tous'>Tous les types</option>
          {TYPES_CLIENT.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB' }}>
              {['Établissement', 'Type', 'Ville', 'Contact', 'Formule', 'Équipements', 'Alertes', 'Statut', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#9CA3AF', letterSpacing: '0.3px', textTransform: 'uppercase', borderBottom: '0.5px solid #E5E7EB', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: '32px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>Aucun établissement</td></tr>
            ) : filtered.map((etab, i) => {
              const st = statutBadge(etab.statut)
              const fb = formuleBadge(etab.formule)
              const alerts = alertCount[etab.id] || 0
              return (
                <tr key={etab.id} style={{ borderBottom: i < filtered.length - 1 ? '0.5px solid #F3F4F6' : 'none' }}>
                  <td style={{ padding: '11px 12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>{etab.nom}</div>
                  </td>
                  <td style={{ padding: '11px 12px', fontSize: '12px', color: '#6B7280' }}>{etab.type}</td>
                  <td style={{ padding: '11px 12px', fontSize: '12px', color: '#6B7280' }}>{etab.ville || '—'}</td>
                  <td style={{ padding: '11px 12px' }}>
                    <div style={{ fontSize: '12px', color: '#111827' }}>{etab.contact_nom || '—'}</div>
                    {etab.contact_email && <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '1px' }}>{etab.contact_email}</div>}
                  </td>
                  <td style={{ padding: '11px 12px' }}>
                    {etab.formule ? (
                      <span style={{ background: fb.bg, color: fb.color, border: `0.5px solid ${fb.border}`, padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '500' }}>{etab.formule}</span>
                    ) : <span style={{ color: '#9CA3AF', fontSize: '12px' }}>—</span>}
                  </td>
                  <td style={{ padding: '11px 12px', fontSize: '13px', fontWeight: '500', color: '#1A56DB' }}>{equipCount[etab.id] || 0}</td>
                  <td style={{ padding: '11px 12px' }}>
                    {alerts > 0 ? (
                      <span style={{ background: '#FEF2F2', color: '#DC2626', border: '0.5px solid #FECACA', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '500' }}>
                        {alerts} alerte{alerts > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span style={{ background: '#F0FDF4', color: '#059669', border: '0.5px solid #BBF7D0', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '500' }}>OK</span>
                    )}
                  </td>
                  <td style={{ padding: '11px 12px' }}>
                    <span style={{ background: st.bg, color: st.color, border: `0.5px solid ${st.border}`, padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '500' }}>{st.label}</span>
                  </td>
                  <td style={{ padding: '11px 12px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => openEquipModal(etab)}
                        style={{ padding: '5px 8px', background: '#EFF6FF', border: '0.5px solid #BFDBFE', borderRadius: '6px', fontSize: '11px', fontWeight: '500', color: '#1A56DB', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
                        <i className="ti ti-device-heart-monitor" style={{ fontSize: '11px' }} aria-hidden="true" />
                        Équip.
                      </button>
                      <button onClick={() => { setSelectedEtab(etab); setShowAccessModal(true); setAccessSuccess(false); setAccessError(''); setAccessForm({ email: '', password: '', confirmPassword: '' }) }}
                        style={{ padding: '5px 8px', background: '#F9FAFB', border: '0.5px solid #E5E7EB', borderRadius: '6px', fontSize: '11px', fontWeight: '500', color: '#374151', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
                        <i className="ti ti-key" style={{ fontSize: '11px' }} aria-hidden="true" />
                        Accès
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal équipements établissement */}
      {showEquipModal && selectedEtabEquip && (
        <div onClick={() => setShowEquipModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '560px', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '18px 22px', borderBottom: '0.5px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>Équipements — {selectedEtabEquip.nom}</div>
                <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>{etabEquipements.length} équipement{etabEquipements.length > 1 ? 's' : ''} affecté{etabEquipements.length > 1 ? 's' : ''}</div>
              </div>
              <button onClick={() => setShowEquipModal(false)} style={{ background: '#F9FAFB', border: '0.5px solid #E5E7EB', color: '#6B7280', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>✕</button>
            </div>
            <div style={{ padding: '20px 22px' }}>

              {/* Affecter */}
              <div style={{ marginBottom: '20px', padding: '14px', background: '#F9FAFB', borderRadius: '8px', border: '0.5px solid #E5E7EB' }}>
                <div style={{ fontSize: '12px', fontWeight: '500', color: '#374151', marginBottom: '10px' }}>Affecter un équipement existant</div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select value={affectForm.equipement_id} onChange={e => setAffectForm({ equipement_id: e.target.value })}
                    style={{ flex: 1, padding: '8px 10px', border: '0.5px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#111827', fontFamily: 'inherit', outline: 'none' }}>
                    <option value=''>Sélectionner un équipement...</option>
                    {allEquipements.map(e => (
                      <option key={e.id} value={e.id}>{e.reference} — {e.designation}</option>
                    ))}
                  </select>
                  <button onClick={handleAffectEquip} disabled={affectSaving || !affectForm.equipement_id}
                    style={{ padding: '8px 14px', background: affectSaving || !affectForm.equipement_id ? '#93AEED' : '#1A56DB', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                    {affectSaving ? '...' : 'Affecter'}
                  </button>
                </div>
              </div>

              {/* Liste */}
              {equipLoading ? (
                <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: '13px', padding: '20px' }}>Chargement...</div>
              ) : etabEquipements.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: '13px', padding: '20px' }}>Aucun équipement affecté</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {etabEquipements.map(eq => {
                    const st = statutEquip(eq.statut)
                    return (
                      <div key={eq.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#F9FAFB', borderRadius: '6px', border: '0.5px solid #E5E7EB' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '12px', fontWeight: '500', color: '#111827' }}>{eq.designation}</div>
                          <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '1px' }}>{eq.reference} · {eq.localisation || '—'}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: st.color }} />
                          <span style={{ fontSize: '11px', color: st.color, fontWeight: '500' }}>{st.label}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal ajout établissement */}
      {showAddModal && (
        <div onClick={() => setShowAddModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '18px 22px', borderBottom: '0.5px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>Ajouter un établissement</div>
              <button onClick={() => setShowAddModal(false)} style={{ background: '#F9FAFB', border: '0.5px solid #E5E7EB', color: '#6B7280', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>✕</button>
            </div>
            <div style={{ padding: '20px 22px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Nom *', key: 'nom', placeholder: 'EHPAD Les Pins', full: true },
                  { label: 'Ville', key: 'ville', placeholder: 'Paris' },
                  { label: 'Contact', key: 'contact_nom', placeholder: 'Dr. Martin' },
                  { label: 'Email contact', key: 'contact_email', placeholder: 'contact@etab.fr' },
                ].map(f => (
                  <div key={f.key} style={{ gridColumn: f.full ? '1 / -1' : 'auto' }}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{f.label}</label>
                    <input type='text' placeholder={f.placeholder} value={(form as any)[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#111827', fontFamily: 'inherit', outline: 'none' }} />
                  </div>
                ))}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Type</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#111827', fontFamily: 'inherit', outline: 'none' }}>
                    {TYPES_CLIENT.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Formule</label>
                  <select value={form.formule} onChange={e => setForm(p => ({ ...p, formule: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#111827', fontFamily: 'inherit', outline: 'none' }}>
                    <option>Essentiel</option>
                    <option>Premium</option>
                    <option>Privilège</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '10px', background: '#F9FAFB', border: '0.5px solid #E5E7EB', borderRadius: '8px', color: '#6B7280', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
                <button onClick={handleAdd} disabled={saving || !form.nom}
                  style={{ flex: 1, padding: '10px', background: saving || !form.nom ? '#93AEED' : '#1A56DB', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {saving ? 'Enregistrement...' : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal créer accès */}
      {showAccessModal && selectedEtab && (
        <div onClick={() => setShowAccessModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '18px 22px', borderBottom: '0.5px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>Créer un accès client</div>
                <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>{selectedEtab.nom}</div>
              </div>
              <button onClick={() => setShowAccessModal(false)} style={{ background: '#F9FAFB', border: '0.5px solid #E5E7EB', color: '#6B7280', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>✕</button>
            </div>
            <div style={{ padding: '20px 22px' }}>
              {accessSuccess ? (
                <div style={{ padding: '16px', background: '#F0FDF4', border: '0.5px solid #BBF7D0', borderRadius: '8px', textAlign: 'center' }}>
                  <i className="ti ti-check" style={{ fontSize: '24px', color: '#059669', display: 'block', marginBottom: '6px' }} aria-hidden="true" />
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#059669' }}>Accès créé avec succès</div>
                </div>
              ) : (
                <>
                  {[
                    { label: 'Email', key: 'email', type: 'email', placeholder: 'contact@ehpad.fr' },
                    { label: 'Mot de passe', key: 'password', type: 'password', placeholder: '••••••••' },
                    { label: 'Confirmer', key: 'confirmPassword', type: 'password', placeholder: '••••••••' },
                  ].map(f => (
                    <div key={f.key} style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{f.label}</label>
                      <input type={f.type} placeholder={f.placeholder} value={(accessForm as any)[f.key]}
                        onChange={e => setAccessForm(p => ({ ...p, [f.key]: e.target.value }))}
                        style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#111827', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                  ))}
                  {accessError && (
                    <div style={{ padding: '8px 12px', background: '#FEF2F2', border: '0.5px solid #FECACA', borderRadius: '6px', fontSize: '12px', color: '#DC2626', marginBottom: '12px' }}>{accessError}</div>
                  )}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setShowAccessModal(false)} style={{ flex: 1, padding: '10px', background: '#F9FAFB', border: '0.5px solid #E5E7EB', borderRadius: '8px', color: '#6B7280', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
                    <button onClick={handleCreateAccess} disabled={accessSaving || !accessForm.email || !accessForm.password}
                      style={{ flex: 1, padding: '10px', background: accessSaving || !accessForm.email || !accessForm.password ? '#93AEED' : '#1A56DB', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>
                      {accessSaving ? 'Création...' : 'Créer l\'accès'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}