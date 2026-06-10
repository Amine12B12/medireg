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
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAccessModal, setShowAccessModal] = useState(false)
  const [selectedEtab, setSelectedEtab] = useState<Etablissement | null>(null)
  const [saving, setSaving] = useState(false)
  const [accessSaving, setAccessSaving] = useState(false)
  const [accessSuccess, setAccessSuccess] = useState(false)
  const [accessError, setAccessError] = useState('')
  const [form, setForm] = useState({ nom: '', type: 'EHPAD', ville: '', contact_nom: '', contact_email: '' })
  const [accessForm, setAccessForm] = useState({ email: '', password: '', confirmPassword: '' })
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
    setShowAddModal(false)
    setForm({ nom: '', type: 'EHPAD', ville: '', contact_nom: '', contact_email: '' })
    setSaving(false)
    load()
  }

  async function handleCreateAccess() {
    if (!accessForm.email || !accessForm.password) return
    if (accessForm.password !== accessForm.confirmPassword) {
      setAccessError('Les mots de passe ne correspondent pas')
      return
    }
    if (accessForm.password.length < 6) {
      setAccessError('Le mot de passe doit faire au moins 6 caractères')
      return
    }
    setAccessSaving(true)
    setAccessError('')
    const res = await fetch('/api/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: accessForm.email,
        password: accessForm.password,
        etablissement_id: selectedEtab?.id,
        nom: selectedEtab?.nom
      })
    })
    const data = await res.json()
    if (data.error) {
      setAccessError(data.error)
      setAccessSaving(false)
      return
    }
    setAccessSuccess(true)
    setAccessSaving(false)
    setTimeout(() => {
      setShowAccessModal(false)
      setAccessSuccess(false)
      setAccessForm({ email: '', password: '', confirmPassword: '' })
    }, 2000)
  }

  const statutBadge = (s: string) => s === 'actif'
    ? { bg: '#F0FDF4', color: '#059669', border: '#BBF7D0', label: 'Actif' }
    : { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A', label: 'En attente' }

  if (loading) return <div style={{ padding: '32px', color: '#6B7280', fontSize: '13px' }}>Chargement...</div>

  return (
    <div style={{ padding: '24px', fontFamily: 'Inter, -apple-system, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '14px', color: '#6B7280' }}>{etablissements.length} établissement{etablissements.length > 1 ? 's' : ''}</div>
        </div>
        <button onClick={() => setShowAddModal(true)}
          style={{ padding: '8px 14px', background: '#1A56DB', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="ti ti-plus" style={{ fontSize: '14px' }} aria-hidden="true" />
          Ajouter un client
        </button>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB' }}>
              {['Établissement', 'Type', 'Ville', 'Contact', 'Équipements', 'Statut', 'Accès'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#9CA3AF', letterSpacing: '0.3px', textTransform: 'uppercase', borderBottom: '0.5px solid #E5E7EB' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {etablissements.map((etab, i) => {
              const st = statutBadge(etab.statut)
              const count = equipCount[etab.id] || 0
              return (
                <tr key={etab.id} style={{ borderBottom: i < etablissements.length - 1 ? '0.5px solid #F3F4F6' : 'none' }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>{etab.nom}</div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: '#6B7280' }}>{etab.type}</td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: '#6B7280' }}>{etab.ville || '—'}</td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: '#6B7280' }}>{etab.contact_nom || '—'}</td>
                  <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: '500', color: '#1A56DB' }}>{count}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ background: st.bg, color: st.color, border: `0.5px solid ${st.border}`, padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '500' }}>
                      {st.label}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <button
                      onClick={() => { setSelectedEtab(etab); setShowAccessModal(true); setAccessSuccess(false); setAccessError(''); setAccessForm({ email: '', password: '', confirmPassword: '' }) }}
                      style={{ padding: '5px 10px', background: '#F9FAFB', border: '0.5px solid #E5E7EB', borderRadius: '6px', fontSize: '11px', fontWeight: '500', color: '#374151', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <i className="ti ti-key" style={{ fontSize: '12px' }} aria-hidden="true" />
                      Créer accès
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal ajout établissement */}
      {showAddModal && (
        <div onClick={() => setShowAddModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '460px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '18px 22px', borderBottom: '0.5px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>Ajouter un établissement</div>
              <button onClick={() => setShowAddModal(false)} style={{ background: '#F9FAFB', border: '0.5px solid #E5E7EB', color: '#6B7280', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>✕</button>
            </div>
            <div style={{ padding: '20px 22px' }}>
              {[
                { label: 'Nom *', key: 'nom', placeholder: 'EHPAD Les Pins' },
                { label: 'Ville', key: 'ville', placeholder: 'Paris' },
                { label: 'Contact', key: 'contact_nom', placeholder: 'Dr. Martin' },
                { label: 'Email contact', key: 'contact_email', placeholder: 'contact@etablissement.fr' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#6B7280', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{f.label}</label>
                  <input type='text' placeholder={f.placeholder} value={(form as any)[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: '100%', padding: '9px 12px', border: '0.5px solid #E5E7EB', borderRadius: '6px', fontSize: '13px', color: '#111827', fontFamily: 'inherit', outline: 'none' }} />
                </div>
              ))}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#6B7280', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: '0.5px solid #E5E7EB', borderRadius: '6px', fontSize: '13px', color: '#111827', fontFamily: 'inherit', outline: 'none' }}>
                  <option>EHPAD</option>
                  <option>Clinique</option>
                  <option>HAD</option>
                  <option>Autre</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
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
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
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
                  <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>Le client peut maintenant se connecter</div>
                </div>
              ) : (
                <>
                  {[
                    { label: 'Email', key: 'email', type: 'email', placeholder: 'contact@ehpad.fr' },
                    { label: 'Mot de passe', key: 'password', type: 'password', placeholder: '••••••••' },
                    { label: 'Confirmer le mot de passe', key: 'confirmPassword', type: 'password', placeholder: '••••••••' },
                  ].map(f => (
                    <div key={f.key} style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#6B7280', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{f.label}</label>
                      <input type={f.type} placeholder={f.placeholder} value={(accessForm as any)[f.key]}
                        onChange={e => setAccessForm(p => ({ ...p, [f.key]: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', border: '0.5px solid #E5E7EB', borderRadius: '6px', fontSize: '13px', color: '#111827', fontFamily: 'inherit', outline: 'none' }} />
                    </div>
                  ))}
                  {accessError && (
                    <div style={{ padding: '10px 12px', background: '#FEF2F2', border: '0.5px solid #FECACA', borderRadius: '6px', fontSize: '12px', color: '#DC2626', marginBottom: '12px' }}>
                      {accessError}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
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