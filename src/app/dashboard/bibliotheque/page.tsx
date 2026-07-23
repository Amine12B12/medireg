'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface)' }
const labelStyle = { display: 'block', fontSize: '11px', fontWeight: '500' as const, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase' as const, letterSpacing: '0.4px' }

const TYPES_DOC = ['procedure', 'modele', 'formulaire', 'checklist', 'registre', 'preuve', 'certificat']

const typeDocStyle = (t: string) => {
  if (t === 'procedure') return { color: '#1A56DB', bg: '#EBF2FF', icon: 'ti-file-description' }
  if (t === 'modele') return { color: '#7C3AED', bg: '#F5F3FF', icon: 'ti-template' }
  if (t === 'formulaire') return { color: '#0891B2', bg: '#E0F2FE', icon: 'ti-forms' }
  if (t === 'checklist') return { color: '#059669', bg: '#D1FAE5', icon: 'ti-checklist' }
  if (t === 'registre') return { color: '#D97706', bg: '#FEF3C7', icon: 'ti-notebook' }
  if (t === 'preuve') return { color: '#DC2626', bg: '#FEE2E2', icon: 'ti-certificate' }
  if (t === 'certificat') return { color: '#7C3AED', bg: '#F5F3FF', icon: 'ti-award' }
  return { color: 'var(--text-secondary)', bg: 'var(--surface-hover)', icon: 'ti-file' }
}

function FilterBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ padding: '5px 12px', borderRadius: '20px', border: active ? '1px solid var(--accent)' : '1px solid var(--border)', background: active ? 'var(--accent-light)' : 'transparent', color: active ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '12px', fontWeight: active ? '500' : '400', cursor: 'pointer', fontFamily: 'var(--font)', textTransform: 'capitalize' }}>
      {label}
    </button>
  )
}

function Modal({ onClose, children, maxWidth = '520px' }: { onClose: () => void; children: React.ReactNode; maxWidth?: string }) {
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

function DocCard({ doc, role, onDelete }: { doc: any; role: string | null; onDelete: () => void }) {
  const ts = typeDocStyle(doc.type_doc)
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: ts.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className={`ti ${ts.icon}`} style={{ fontSize: '18px', color: ts.color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nom}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {doc.clients?.nom && <span>{doc.clients.nom}</span>}
            {doc.referentiels?.nom && <span>· {doc.referentiels.nom}</span>}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <a href={doc.url} target='_blank' rel='noreferrer'
          style={{ flex: 1, padding: '7px 12px', background: 'var(--accent-light)', border: '1px solid rgba(26,86,219,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--accent)', fontSize: '12px', fontWeight: '500', textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
          <i className="ti ti-download" style={{ fontSize: '13px' }} />
          Ouvrir
        </a>
        {(role === 'consultant' || role === 'admin') && (
          <button onClick={onDelete}
            style={{ padding: '7px 10px', background: 'var(--danger-light)', border: '1px solid rgba(194,54,42,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center' }}>
            <i className="ti ti-trash" style={{ fontSize: '13px' }} />
          </button>
        )}
      </div>
    </div>
  )
}

export default function BibliothequePage() {
  const [documents, setDocuments] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [referentiels, setReferentiels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)
  const [clientId, setClientId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterType, setFilterType] = useState('tous')
  const [filterClient, setFilterClient] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ nom: '', type_doc: 'procedure', client_id: '', referentiel_id: '', url: '' })
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('role, client_id').eq('id', user.id).single()
      setRole(prof?.role || 'client')
      setClientId(prof?.client_id || null)
      if (prof?.role === 'consultant') {
        const { data: cls } = await supabase.from('clients').select('id, nom').order('nom')
        setClients(cls || [])
      }
      const { data: refs } = await supabase.from('referentiels').select('id, nom').order('nom')
      setReferentiels(refs || [])
      await load(prof?.role || 'client', prof?.client_id)
    }
    init()
  }, [])

  async function load(r?: string, cId?: string) {
    if (r === 'consultant') {
      const { data } = await supabase.from('documents').select('*, clients(nom), referentiels(nom)').order('created_at', { ascending: false })
      setDocuments(data || [])
    } else {
      const { data } = await supabase.from('documents').select('*, clients(nom), referentiels(nom)').eq('client_id', cId || '').order('created_at', { ascending: false })
      setDocuments(data || [])
    }
    setLoading(false)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return
    const file = e.target.files[0]
    setUploadLoading(true)
    const path = `documents/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('documents').upload(path, file)
    if (!error) {
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
      setForm(prev => ({ ...prev, nom: form.nom || file.name, url: urlData.publicUrl }))
    }
    setUploadLoading(false)
    e.target.value = ''
  }

  async function handleAdd() {
    if (!form.nom || !form.url) return
    setSaving(true)
    await supabase.from('documents').insert([{
      nom: form.nom,
      type_doc: form.type_doc,
      client_id: form.client_id || clientId || null,
      referentiel_id: form.referentiel_id || null,
      url: form.url
    }])
    setShowAddModal(false)
    setForm({ nom: '', type_doc: 'procedure', client_id: '', referentiel_id: '', url: '' })
    setSaving(false)
    load(role || undefined, clientId || undefined)
  }

  async function handleDelete(id: string) {
    await supabase.from('documents').delete().eq('id', id)
    load(role || undefined, clientId || undefined)
  }

  const filtered = documents
    .filter(d => filterType === 'tous' || d.type_doc === filterType)
    .filter(d => !filterClient || d.client_id === filterClient)
    .filter(d => !search || d.nom.toLowerCase().includes(search.toLowerCase()))

  const groupedByType = TYPES_DOC.reduce((acc, type) => {
    const docs = filtered.filter(d => d.type_doc === type)
    if (docs.length > 0) acc[type] = docs
    return acc
  }, {} as Record<string, any[]>)

  if (loading) return <div style={{ padding: '28px', color: 'var(--text-tertiary)', fontSize: '13px', fontFamily: 'var(--font)' }}>Chargement...</div>

  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)' }}>

      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{filtered.length} document{filtered.length > 1 ? 's' : ''}</div>
        {(role === 'consultant' || role === 'admin') && (
          <button onClick={() => setShowAddModal(true)}
            style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 4px rgba(26,86,219,0.3)' }}>
            <i className="ti ti-upload" style={{ fontSize: '14px' }} />
            Ajouter un document
          </button>
        )}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'var(--text-tertiary)' }} />
          <input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, width: '180px', paddingLeft: '32px' }} />
        </div>
        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <FilterBtn label="Tous" active={filterType === 'tous'} onClick={() => setFilterType('tous')} />
          {TYPES_DOC.map(t => (
            <FilterBtn key={t} label={t} active={filterType === t} onClick={() => setFilterType(t)} />
          ))}
        </div>
        {role === 'consultant' && clients.length > 0 && (
          <>
            <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
            <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
              style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface)', cursor: 'pointer' }}>
              <option value=''>Tous les clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </>
        )}
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '64px', textAlign: 'center' }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <i className="ti ti-books" style={{ fontSize: '26px', color: 'var(--accent)' }} />
          </div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>Aucun document</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Ajoutez des procedures, modeles et formulaires</div>
        </div>
      ) : filterType === 'tous' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {Object.entries(groupedByType).map(([type, docs]) => {
            const ts = typeDocStyle(type)
            return (
              <div key={type}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                  <div style={{ width: '26px', height: '26px', borderRadius: 'var(--radius-sm)', background: ts.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className={`ti ${ts.icon}`} style={{ fontSize: '13px', color: ts.color }} />
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: ts.color, textTransform: 'capitalize' }}>{type}s</div>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>({docs.length})</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                  {docs.map(doc => <DocCard key={doc.id} doc={doc} role={role} onDelete={() => handleDelete(doc.id)} />)}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
          {filtered.map(doc => <DocCard key={doc.id} doc={doc} role={role} onDelete={() => handleDelete(doc.id)} />)}
        </div>
      )}

      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)}>
          <ModalHeader title="Ajouter un document" onClose={() => setShowAddModal(false)} />
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Fichier *</label>
              {form.url ? (
                <div style={{ padding: '10px 14px', background: 'var(--success-light)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(10,124,78,0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="ti ti-check" style={{ fontSize: '15px', color: 'var(--success)' }} />
                  <span style={{ fontSize: '12px', color: 'var(--success)', fontWeight: '500' }}>Fichier uploade</span>
                  <button onClick={() => setForm(prev => ({ ...prev, url: '' }))}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--success)', fontSize: '12px', fontFamily: 'var(--font)' }}>
                    Changer
                  </button>
                </div>
              ) : (
                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer', background: 'var(--surface-hover)' }}>
                  <i className="ti ti-upload" style={{ fontSize: '24px', color: 'var(--text-tertiary)', marginBottom: '8px' }} />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500' }}>{uploadLoading ? 'Upload en cours...' : 'Cliquez pour uploader'}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>PDF, Word, Excel, images</span>
                  <input type='file' style={{ display: 'none' }} onChange={handleUpload} disabled={uploadLoading} />
                </label>
              )}
            </div>
            <div>
              <label style={labelStyle}>Nom *</label>
              <input value={form.nom} onChange={e => setForm(prev => ({ ...prev, nom: e.target.value }))} placeholder="Procedure de traçabilite V2" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Type</label>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {TYPES_DOC.map(t => {
                  const ts = typeDocStyle(t)
                  return (
                    <button key={t} onClick={() => setForm(prev => ({ ...prev, type_doc: t }))}
                      style={{ padding: '6px 12px', border: `1px solid ${form.type_doc === t ? ts.color : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', background: form.type_doc === t ? ts.bg : 'transparent', color: form.type_doc === t ? ts.color : 'var(--text-secondary)', fontSize: '12px', fontWeight: form.type_doc === t ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)', textTransform: 'capitalize' }}>
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>
            {role === 'consultant' && clients.length > 0 && (
              <div>
                <label style={labelStyle}>Client</label>
                <select value={form.client_id} onChange={e => setForm(prev => ({ ...prev, client_id: e.target.value }))} style={inputStyle}>
                  <option value=''>Document general</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
            )}
            <div>
              <label style={labelStyle}>Referentiel lie</label>
              <select value={form.referentiel_id} onChange={e => setForm(prev => ({ ...prev, referentiel_id: e.target.value }))} style={inputStyle}>
                <option value=''>Aucun</option>
                {referentiels.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowAddModal(false)}
                style={{ flex: 1, padding: '11px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                Annuler
              </button>
              <button onClick={handleAdd} disabled={saving || !form.nom || !form.url}
                style={{ flex: 1, padding: '11px', background: saving || !form.nom || !form.url ? 'rgba(26,86,219,0.4)' : 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: saving || !form.nom || !form.url ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>
                {saving ? 'Enregistrement...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}