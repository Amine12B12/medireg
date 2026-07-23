'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface)' }
const labelStyle = { display: 'block', fontSize: '11px', fontWeight: '500' as const, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase' as const, letterSpacing: '0.4px' }

const prioriteStyle = (p: string) => {
  if (p === 'urgente') return { color: 'var(--danger)', bg: 'var(--danger-light)' }
  if (p === 'haute') return { color: 'var(--warning)', bg: 'var(--warning-light)' }
  if (p === 'normale') return { color: 'var(--accent)', bg: 'var(--accent-light)' }
  return { color: 'var(--text-tertiary)', bg: 'var(--surface-hover)' }
}

function Modal({ onClose, children, maxWidth = '480px' }: { onClose: () => void; children: React.ReactNode; maxWidth?: string }) {
  return (
    <div onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth, maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.12)', border: '1px solid var(--border)' }}>
        {children}
      </div>
    </div>
  )
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10 }}>
      <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>{title}</div>
      <button onClick={onClose} style={{ width: '30px', height: '30px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-hover)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        <i className="ti ti-x" style={{ fontSize: '14px' }} />
      </button>
    </div>
  )
}

function TacheCard({ tache, role, onUpdateStatut, onDelete }: { tache: any; role: string | null; onUpdateStatut: (id: string, statut: string) => void; onDelete: (id: string) => void }) {
  const pr = prioriteStyle(tache.priorite)
  const depasse = tache.echeance && new Date(tache.echeance) < new Date() && tache.statut !== 'termine'
  return (
    <div style={{ background: 'var(--surface)', border: `1px solid ${depasse ? 'rgba(194,54,42,0.3)' : 'var(--border)'}`, borderRadius: 'var(--radius-lg)', padding: '14px 16px', boxShadow: 'var(--shadow-sm)', borderLeft: `3px solid ${pr.color}` }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tache.titre}</div>
          {tache.description && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tache.description}</div>}
        </div>
        <span style={{ background: pr.bg, color: pr.color, padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '600', flexShrink: 0, textTransform: 'capitalize' }}>{tache.priorite}</span>
      </div>

      <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '10px', flexWrap: 'wrap' }}>
        {tache.clients?.nom && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <i className="ti ti-building-hospital" style={{ fontSize: '12px' }} />{tache.clients.nom}
          </span>
        )}
        {tache.profiles && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <i className="ti ti-user" style={{ fontSize: '12px' }} />
            {tache.profiles.prenom || ''} {tache.profiles.nom || tache.profiles.email}
          </span>
        )}
        {tache.echeance && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: depasse ? 'var(--danger)' : 'var(--text-tertiary)', fontWeight: depasse ? '600' : '400' }}>
            <i className="ti ti-calendar" style={{ fontSize: '12px' }} />
            {new Date(tache.echeance).toLocaleDateString('fr-FR')}
            {depasse && ' — Depasse'}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {tache.statut === 'a_faire' && (
          <button onClick={() => onUpdateStatut(tache.id, 'en_cours')}
            style={{ padding: '5px 10px', background: 'var(--warning-light)', border: '1px solid rgba(158,94,0,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--warning)', fontSize: '11px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <i className="ti ti-player-play" style={{ fontSize: '12px' }} />Demarrer
          </button>
        )}
        {tache.statut === 'en_cours' && (
          <button onClick={() => onUpdateStatut(tache.id, 'termine')}
            style={{ padding: '5px 10px', background: 'var(--success-light)', border: '1px solid rgba(10,124,78,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--success)', fontSize: '11px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <i className="ti ti-check" style={{ fontSize: '12px' }} />Terminer
          </button>
        )}
        {tache.statut === 'termine' && (
          <button onClick={() => onUpdateStatut(tache.id, 'a_faire')}
            style={{ padding: '5px 10px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <i className="ti ti-refresh" style={{ fontSize: '12px' }} />Rouvrir
          </button>
        )}
        {(role === 'consultant' || role === 'admin') && (
          <button onClick={() => onDelete(tache.id)}
            style={{ padding: '5px 8px', background: 'var(--danger-light)', border: '1px solid rgba(194,54,42,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center' }}>
            <i className="ti ti-trash" style={{ fontSize: '12px' }} />
          </button>
        )}
      </div>
    </div>
  )
}

export default function TachesPage() {
  const [taches, setTaches] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)
  const [clientId, setClientId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterStatut, setFilterStatut] = useState('tous')
  const [filterPriorite, setFilterPriorite] = useState('tous')
  const [filterClient, setFilterClient] = useState('')
  const [form, setForm] = useState({ titre: '', description: '', client_id: '', assignee_id: '', echeance: '', priorite: 'normale' })
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      const { data: prof } = await supabase.from('profiles').select('role, client_id').eq('id', user.id).single()
      setRole(prof?.role || 'client')
      setClientId(prof?.client_id || null)
      if (prof?.role === 'consultant') {
        const { data: cls } = await supabase.from('clients').select('id, nom').order('nom')
        setClients(cls || [])
        const { data: usrs } = await supabase.from('profiles').select('id, nom, prenom, email').order('nom')
        setUsers(usrs || [])
      } else if (prof?.role === 'admin') {
        const { data: usrs } = await supabase.from('profiles').select('id, nom, prenom, email').eq('client_id', prof.client_id || '').order('nom')
        setUsers(usrs || [])
      }
      await load(prof?.role || 'client', prof?.client_id)
    }
    init()
  }, [])

  async function load(r?: string, cId?: string) {
    if (r === 'consultant') {
      const { data } = await supabase.from('taches').select('*, clients(nom), profiles(nom, prenom, email)').order('echeance', { ascending: true })
      setTaches(data || [])
    } else {
      const { data } = await supabase.from('taches').select('*, clients(nom), profiles(nom, prenom, email)').eq('client_id', cId || '').order('echeance', { ascending: true })
      setTaches(data || [])
    }
    setLoading(false)
  }

  async function handleAdd() {
    if (!form.titre) return
    setSaving(true)
    await supabase.from('taches').insert([{
      titre: form.titre,
      description: form.description || null,
      client_id: form.client_id || clientId || null,
      assignee_id: form.assignee_id || userId || null,
      echeance: form.echeance || null,
      priorite: form.priorite,
      statut: 'a_faire'
    }])
    setShowAddModal(false)
    setForm({ titre: '', description: '', client_id: '', assignee_id: '', echeance: '', priorite: 'normale' })
    setSaving(false)
    load(role || undefined, clientId || undefined)
  }

  async function updateStatut(id: string, statut: string) {
    await supabase.from('taches').update({ statut }).eq('id', id)
    load(role || undefined, clientId || undefined)
  }

  async function handleDelete(id: string) {
    await supabase.from('taches').delete().eq('id', id)
    load(role || undefined, clientId || undefined)
  }

  const filtered = taches
    .filter(t => filterStatut === 'tous' || t.statut === filterStatut)
    .filter(t => filterPriorite === 'tous' || t.priorite === filterPriorite)
    .filter(t => !filterClient || t.client_id === filterClient)

  const tachesAFaire = filtered.filter(t => t.statut === 'a_faire')
  const tachesEnCours = filtered.filter(t => t.statut === 'en_cours')
  const tachesTerminees = filtered.filter(t => t.statut === 'termine')

  if (loading) return <div style={{ padding: '28px', color: 'var(--text-tertiary)', fontSize: '13px', fontFamily: 'var(--font)' }}>Chargement...</div>

  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)' }}>

      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{filtered.length} tache{filtered.length > 1 ? 's' : ''}</div>
        {(role === 'consultant' || role === 'admin') && (
          <button onClick={() => setShowAddModal(true)}
            style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 4px rgba(26,86,219,0.3)' }}>
            <i className="ti ti-plus" style={{ fontSize: '14px' }} />Nouvelle tache
          </button>
        )}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        {(['tous', 'a_faire', 'en_cours', 'termine'] as const).map(s => (
          <button key={s} onClick={() => setFilterStatut(s)}
            style={{ padding: '5px 12px', borderRadius: '20px', border: filterStatut === s ? '1px solid var(--accent)' : '1px solid var(--border)', background: filterStatut === s ? 'var(--accent-light)' : 'transparent', color: filterStatut === s ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '12px', fontWeight: filterStatut === s ? '500' : '400', cursor: 'pointer', fontFamily: 'var(--font)' }}>
            {s === 'tous' ? 'Toutes' : s === 'a_faire' ? 'A faire' : s === 'en_cours' ? 'En cours' : 'Terminees'}
          </button>
        ))}
        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
        {(['tous', 'urgente', 'haute', 'normale', 'basse'] as const).map(pr => (
          <button key={pr} onClick={() => setFilterPriorite(pr)}
            style={{ padding: '5px 12px', borderRadius: '20px', border: filterPriorite === pr ? '1px solid var(--accent)' : '1px solid var(--border)', background: filterPriorite === pr ? 'var(--accent-light)' : 'transparent', color: filterPriorite === pr ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '12px', fontWeight: filterPriorite === pr ? '500' : '400', cursor: 'pointer', fontFamily: 'var(--font)', textTransform: 'capitalize' }}>
            {pr === 'tous' ? 'Toutes' : pr}
          </button>
        ))}
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
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <i className="ti ti-check" style={{ fontSize: '26px', color: 'var(--success)' }} />
          </div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>Aucune tache</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Tout est a jour</div>
        </div>
      ) : filterStatut !== 'tous' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(t => <TacheCard key={t.id} tache={t} role={role} onUpdateStatut={updateStatut} onDelete={handleDelete} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          {[
            { label: 'A faire', taches: tachesAFaire, color: 'var(--accent)', bg: 'var(--accent-light)' },
            { label: 'En cours', taches: tachesEnCours, color: 'var(--warning)', bg: 'var(--warning-light)' },
            { label: 'Terminees', taches: tachesTerminees, color: 'var(--success)', bg: 'var(--success-light)' },
          ].map(col => (
            <div key={col.label}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', padding: '8px 12px', background: col.bg, borderRadius: 'var(--radius-md)', border: `1px solid ${col.color}22` }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: col.color }}>{col.label}</span>
                <span style={{ fontSize: '11px', color: col.color, background: 'rgba(255,255,255,0.5)', padding: '1px 6px', borderRadius: '10px' }}>{col.taches.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {col.taches.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px', background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border)' }}>
                    Aucune tache
                  </div>
                ) : col.taches.map(t => (
                  <TacheCard key={t.id} tache={t} role={role} onUpdateStatut={updateStatut} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)}>
          <ModalHeader title="Nouvelle tache" onClose={() => setShowAddModal(false)} />
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Titre *</label>
              <input value={form.titre} onChange={e => setForm(prev => ({ ...prev, titre: e.target.value }))} placeholder="Rediger la procedure de traçabilite" style={inputStyle} autoFocus />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))} rows={3} style={{ ...inputStyle, resize: 'none' }} />
            </div>
            {role === 'consultant' && clients.length > 0 && (
              <div>
                <label style={labelStyle}>Client</label>
                <select value={form.client_id} onChange={e => setForm(prev => ({ ...prev, client_id: e.target.value }))} style={inputStyle}>
                  <option value=''>Selectionner un client...</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
            )}
            {users.length > 0 && (
              <div>
                <label style={labelStyle}>Assigner a</label>
                <select value={form.assignee_id} onChange={e => setForm(prev => ({ ...prev, assignee_id: e.target.value }))} style={inputStyle}>
                  <option value=''>Non assigne</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.prenom || ''} {u.nom || u.email}</option>)}
                </select>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Priorite</label>
                <select value={form.priorite} onChange={e => setForm(prev => ({ ...prev, priorite: e.target.value }))} style={inputStyle}>
                  <option value='urgente'>Urgente</option>
                  <option value='haute'>Haute</option>
                  <option value='normale'>Normale</option>
                  <option value='basse'>Basse</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Echeance</label>
                <input type='date' value={form.echeance} onChange={e => setForm(prev => ({ ...prev, echeance: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowAddModal(false)}
                style={{ flex: 1, padding: '11px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                Annuler
              </button>
              <button onClick={handleAdd} disabled={saving || !form.titre}
                style={{ flex: 1, padding: '11px', background: saving || !form.titre ? 'rgba(26,86,219,0.4)' : 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: saving || !form.titre ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>
                {saving ? 'Enregistrement...' : 'Creer'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}