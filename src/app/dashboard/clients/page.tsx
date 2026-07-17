'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'

type Client = {
  id: string; nom: string; type: string; ville: string; pays: string
  contact_nom: string; contact_email: string; contact_tel: string
  statut: string; created_at: string
}

const TYPES_CLIENT = ['Hopital', 'Clinique', 'PSDM', 'EHPAD', 'Pharmacie', 'Centre de soins', 'Autre']

const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface)' }
const labelStyle = { display: 'block', fontSize: '11px', fontWeight: '500' as const, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase' as const, letterSpacing: '0.4px' }

function Modal({ onClose, children, maxWidth = '480px' }: { onClose: () => void; children: React.ReactNode; maxWidth?: string }) {
  return (
    <div onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.12)', border: '1px solid var(--border)' }}>
        {children}
      </div>
    </div>
  )
}

function ModalHeader({ title, sub, onClose }: { title: string; sub?: string; onClose: () => void }) {
  return (
    <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--surface)' }}>
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

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [auditCount, setAuditCount] = useState<Record<string, number>>({})
  const [ncCount, setNcCount] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showAccessModal, setShowAccessModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [saving, setSaving] = useState(false)
  const [editSaving, setEditSaving] = useState(false)
  const [deleteSaving, setDeleteSaving] = useState(false)
  const [accessSaving, setAccessSaving] = useState(false)
  const [accessSuccess, setAccessSuccess] = useState(false)
  const [accessError, setAccessError] = useState('')
  const [accessEmail, setAccessEmail] = useState('')
  const [filterStatut, setFilterStatut] = useState('tous')
  const [filterType, setFilterType] = useState('tous')
  const [editForm, setEditForm] = useState({ nom: '', ville: '', pays: 'France', type: 'EHPAD', contact_nom: '', contact_email: '', contact_tel: '' })
  const nomRef = useRef<HTMLInputElement>(null)
  const villeRef = useRef<HTMLInputElement>(null)
  const paysRef = useRef<HTMLInputElement>(null)
  const contactNomRef = useRef<HTMLInputElement>(null)
  const contactEmailRef = useRef<HTMLInputElement>(null)
  const contactTelRef = useRef<HTMLInputElement>(null)
  const typeRef = useRef<HTMLSelectElement>(null)
  const supabase = createClient()

  async function load() {
    const { data } = await supabase.from('clients').select('*').order('nom')
    const { data: audits } = await supabase.from('audits').select('client_id')
    const { data: ncs } = await supabase.from('non_conformites').select('client_id').eq('statut', 'ouverte')
    const ac: Record<string, number> = {}
    audits?.forEach(a => { ac[a.client_id] = (ac[a.client_id] || 0) + 1 })
    const nc: Record<string, number> = {}
    ncs?.forEach(n => { nc[n.client_id] = (nc[n.client_id] || 0) + 1 })
    setClients(data || [])
    setAuditCount(ac)
    setNcCount(nc)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd() {
    const nom = nomRef.current?.value?.trim()
    if (!nom) return
    setSaving(true)
    await supabase.from('clients').insert([{
      nom,
      ville: villeRef.current?.value || '',
      pays: paysRef.current?.value || 'France',
      type: typeRef.current?.value || 'EHPAD',
      contact_nom: contactNomRef.current?.value || '',
      contact_email: contactEmailRef.current?.value || '',
      contact_tel: contactTelRef.current?.value || '',
      statut: 'actif'
    }])
    setShowAddModal(false)
    setSaving(false)
    load()
  }

  async function handleEdit() {
    if (!selectedClient || !editForm.nom.trim()) return
    setEditSaving(true)
    await supabase.from('clients').update({
      nom: editForm.nom.trim(),
      ville: editForm.ville,
      pays: editForm.pays,
      type: editForm.type,
      contact_nom: editForm.contact_nom,
      contact_email: editForm.contact_email,
      contact_tel: editForm.contact_tel
    }).eq('id', selectedClient.id)
    setShowEditModal(false)
    setEditSaving(false)
    load()
  }

  async function handleDelete() {
    if (!selectedClient) return
    setDeleteSaving(true)
    await supabase.from('clients').delete().eq('id', selectedClient.id)
    setShowDeleteConfirm(false)
    setDeleteSaving(false)
    setSelectedClient(null)
    load()
  }

  async function handleBloquer(client: Client) {
    const nouveauStatut = client.statut === 'actif' ? 'inactif' : 'actif'
    await supabase.from('clients').update({ statut: nouveauStatut }).eq('id', client.id)
    load()
  }

  async function handleCreateAccess() {
    if (!accessEmail || !selectedClient) return
    setAccessSaving(true)
    setAccessError('')
    const res = await fetch('/api/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: accessEmail, client_id: selectedClient.id, nom: selectedClient.nom })
    })
    const data = await res.json()
    if (data.error) { setAccessError(data.error); setAccessSaving(false); return }
    setAccessSuccess(true)
    setAccessSaving(false)
    setTimeout(() => { setShowAccessModal(false); setAccessSuccess(false) }, 3000)
  }

  function openEditModal(client: Client) {
    setSelectedClient(client)
    setEditForm({ nom: client.nom, ville: client.ville || '', pays: client.pays || 'France', type: client.type || 'EHPAD', contact_nom: client.contact_nom || '', contact_email: client.contact_email || '', contact_tel: client.contact_tel || '' })
    setShowEditModal(true)
  }

  const filtered = clients
    .filter(c => filterStatut === 'tous' || c.statut === filterStatut)
    .filter(c => filterType === 'tous' || c.type === filterType)

  const filterBtn = (label: string, active: boolean, onClick: () => void) => (
    <button onClick={onClick} style={{ padding: '5px 12px', borderRadius: '20px', border: active ? '1px solid var(--accent)' : '1px solid var(--border)', background: active ? 'var(--accent-light)' : 'transparent', color: active ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '12px', fontWeight: active ? '500' : '400', cursor: 'pointer', fontFamily: 'var(--font)' }}>
      {label}
    </button>
  )

  const typeColors: Record<string, { color: string; bg: string }> = {
    'Hopital': { color: 'var(--danger)', bg: 'var(--danger-light)' },
    'Clinique': { color: '#7C3AED', bg: '#F5F3FF' },
    'PSDM': { color: 'var(--accent)', bg: 'var(--accent-light)' },
    'EHPAD': { color: 'var(--success)', bg: 'var(--success-light)' },
    'Pharmacie': { color: 'var(--warning)', bg: 'var(--warning-light)' },
    'Centre de soins': { color: '#0891B2', bg: '#E0F2FE' },
  }

  if (loading) return <div style={{ padding: '28px', color: 'var(--text-tertiary)', fontSize: '13px', fontFamily: 'var(--font)' }}>Chargement...</div>

  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)' }}>

      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{filtered.length} client{filtered.length > 1 ? 's' : ''}</div>
        <button onClick={() => setShowAddModal(true)}
          style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 4px rgba(26,86,219,0.3)' }}>
          <i className="ti ti-plus" style={{ fontSize: '14px' }} />
          Ajouter un client
        </button>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {filterBtn('Tous', filterStatut === 'tous', () => setFilterStatut('tous'))}
          {filterBtn('Actif', filterStatut === 'actif', () => setFilterStatut('actif'))}
          {filterBtn('Inactif', filterStatut === 'inactif', () => setFilterStatut('inactif'))}
        </div>
        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface)', cursor: 'pointer' }}>
          <option value='tous'>Tous les types</option>
          {TYPES_CLIENT.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-hover)' }}>
              {['Client', 'Type', 'Contact', 'Pays', 'Audits', 'Non-conformites', 'Statut', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: 'var(--text-tertiary)', letterSpacing: '0.4px', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>Aucun client</td></tr>
            ) : filtered.map((client, i) => {
              const tc = typeColors[client.type] || { color: 'var(--text-secondary)', bg: 'var(--surface-hover)' }
              const isInactif = client.statut === 'inactif'
              const audits = auditCount[client.id] || 0
              const ncs = ncCount[client.id] || 0
              return (
                <tr key={client.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', opacity: isInactif ? 0.6 : 1 }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-sm)', background: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: tc.color, flexShrink: 0 }}>
                        {client.nom.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{client.nom}</div>
                        {client.ville && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{client.ville}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ background: tc.bg, color: tc.color, padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>{client.type}</span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{client.contact_nom || '-'}</div>
                    {client.contact_email && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{client.contact_email}</div>}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>{client.pays || 'France'}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', color: audits > 0 ? '#7C3AED' : 'var(--text-tertiary)' }}>{audits}</span>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {ncs > 0 ? (
                      <span style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>{ncs} ouverte{ncs > 1 ? 's' : ''}</span>
                    ) : (
                      <span style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>OK</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isInactif ? 'var(--danger)' : 'var(--success)' }} />
                      <span style={{ fontSize: '12px', color: isInactif ? 'var(--danger)' : 'var(--success)', fontWeight: '500' }}>{isInactif ? 'Inactif' : 'Actif'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {[
                        { icon: 'ti-key', label: 'Acces', color: 'var(--accent)', bg: 'var(--accent-light)', onClick: () => { setSelectedClient(client); setAccessEmail(client.contact_email || ''); setShowAccessModal(true); setAccessSuccess(false); setAccessError('') } },
                        { icon: 'ti-edit', label: 'Modifier', color: 'var(--warning)', bg: 'var(--warning-light)', onClick: () => openEditModal(client) },
                        { icon: isInactif ? 'ti-lock-open' : 'ti-lock', label: isInactif ? 'Activer' : 'Desactiver', color: isInactif ? 'var(--success)' : 'var(--danger)', bg: isInactif ? 'var(--success-light)' : 'var(--danger-light)', onClick: () => handleBloquer(client) },
                        { icon: 'ti-trash', label: 'Supprimer', color: 'var(--danger)', bg: 'var(--danger-light)', onClick: () => { setSelectedClient(client); setShowDeleteConfirm(true) } },
                      ].map(btn => (
                        <button key={btn.label} onClick={btn.onClick}
                          style={{ padding: '5px 8px', background: btn.bg, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontWeight: '500', color: btn.color, cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
                          <i className={`ti ${btn.icon}`} style={{ fontSize: '12px' }} />
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Ajout */}
      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)}>
          <ModalHeader title="Ajouter un client" onClose={() => setShowAddModal(false)} />
          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Nom *</label>
                <input ref={nomRef} type='text' placeholder='CHU de Paris' style={inputStyle} autoFocus />
              </div>
              <div>
                <label style={labelStyle}>Type</label>
                <select ref={typeRef} style={inputStyle}>
                  {TYPES_CLIENT.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Ville</label>
                <input ref={villeRef} type='text' placeholder='Paris' style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Pays</label>
                <input ref={paysRef} type='text' placeholder='France' defaultValue='France' style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Contact</label>
                <input ref={contactNomRef} type='text' placeholder='Dr. Martin' style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input ref={contactEmailRef} type='email' placeholder='contact@etab.fr' style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Telephone</label>
                <input ref={contactTelRef} type='tel' placeholder='+33 1 23 45 67 89' style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setShowAddModal(false)}
                style={{ flex: 1, padding: '11px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                Annuler
              </button>
              <button onClick={handleAdd} disabled={saving}
                style={{ flex: 1, padding: '11px', background: saving ? 'rgba(26,86,219,0.4)' : 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', boxShadow: '0 1px 4px rgba(26,86,219,0.3)' }}>
                {saving ? 'Enregistrement...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Modifier */}
      {showEditModal && selectedClient && (
        <Modal onClose={() => setShowEditModal(false)}>
          <ModalHeader title="Modifier le client" sub={selectedClient.nom} onClose={() => setShowEditModal(false)} />
          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Nom *</label>
                <input type='text' value={editForm.nom} onChange={e => setEditForm(p => ({ ...p, nom: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Type</label>
                <select value={editForm.type} onChange={e => setEditForm(p => ({ ...p, type: e.target.value }))} style={inputStyle}>
                  {TYPES_CLIENT.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Ville</label>
                <input type='text' value={editForm.ville} onChange={e => setEditForm(p => ({ ...p, ville: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Pays</label>
                <input type='text' value={editForm.pays} onChange={e => setEditForm(p => ({ ...p, pays: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Contact</label>
                <input type='text' value={editForm.contact_nom} onChange={e => setEditForm(p => ({ ...p, contact_nom: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type='email' value={editForm.contact_email} onChange={e => setEditForm(p => ({ ...p, contact_email: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Telephone</label>
                <input type='tel' value={editForm.contact_tel} onChange={e => setEditForm(p => ({ ...p, contact_tel: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setShowEditModal(false)}
                style={{ flex: 1, padding: '11px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                Annuler
              </button>
              <button onClick={handleEdit} disabled={editSaving || !editForm.nom.trim()}
                style={{ flex: 1, padding: '11px', background: editSaving || !editForm.nom.trim() ? 'rgba(26,86,219,0.4)' : 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: editSaving || !editForm.nom.trim() ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', boxShadow: '0 1px 4px rgba(26,86,219,0.3)' }}>
                {editSaving ? 'Enregistrement...' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Suppression */}
      {showDeleteConfirm && selectedClient && (
        <Modal onClose={() => setShowDeleteConfirm(false)} maxWidth="400px">
          <ModalHeader title="Supprimer le client" onClose={() => setShowDeleteConfirm(false)} />
          <div style={{ padding: '24px' }}>
            <div style={{ padding: '16px', background: 'var(--danger-light)', borderRadius: 'var(--radius-md)', marginBottom: '20px', display: 'flex', gap: '12px' }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: '20px', color: 'var(--danger)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--danger)', marginBottom: '4px' }}>Action irreversible</div>
                <div style={{ fontSize: '12px', color: 'var(--danger)', opacity: 0.8 }}>
                  Supprimer <strong>{selectedClient.nom}</strong> supprimera aussi tous ses audits, non-conformites et plans d actions associes.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowDeleteConfirm(false)}
                style={{ flex: 1, padding: '11px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                Annuler
              </button>
              <button onClick={handleDelete} disabled={deleteSaving}
                style={{ flex: 1, padding: '11px', background: 'var(--danger)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: deleteSaving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>
                {deleteSaving ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Acces */}
      {showAccessModal && selectedClient && (
        <Modal onClose={() => setShowAccessModal(false)} maxWidth="400px">
          <ModalHeader title="Inviter un utilisateur" sub={selectedClient.nom} onClose={() => setShowAccessModal(false)} />
          <div style={{ padding: '20px 24px' }}>
            {accessSuccess ? (
              <div style={{ padding: '20px', background: 'var(--success-light)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <i className="ti ti-mail-check" style={{ fontSize: '32px', color: 'var(--success)', display: 'block', marginBottom: '10px' }} />
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--success)', marginBottom: '6px' }}>Invitation envoyee</div>
                <div style={{ fontSize: '12px', color: 'var(--success)', opacity: 0.8 }}>L utilisateur va recevoir un email pour acceder a son espace MediReg.</div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Email *</label>
                  <input type='email' value={accessEmail} onChange={e => setAccessEmail(e.target.value)} placeholder='contact@etablissement.fr' style={inputStyle} autoFocus />
                </div>
                {accessError && (
                  <div style={{ padding: '10px 14px', background: 'var(--danger-light)', border: '1px solid rgba(194,54,42,0.2)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--danger)', marginBottom: '14px' }}>{accessError}</div>
                )}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setShowAccessModal(false)}
                    style={{ flex: 1, padding: '11px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                    Annuler
                  </button>
                  <button onClick={handleCreateAccess} disabled={accessSaving || !accessEmail}
                    style={{ flex: 1, padding: '11px', background: accessSaving || !accessEmail ? 'rgba(26,86,219,0.4)' : 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: accessSaving || !accessEmail ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <i className="ti ti-send" style={{ fontSize: '14px' }} />
                    {accessSaving ? 'Envoi...' : 'Envoyer'}
                  </button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}