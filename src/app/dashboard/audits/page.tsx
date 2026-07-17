'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Audit = {
  id: string; titre: string; statut: string; score: number | null
  date_audit: string; date_fin: string; notes: string; client_id: string
  referentiel_id: string
}

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

export default function AuditsPage() {
  const [audits, setAudits] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [referentiels, setReferentiels] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedAudit, setSelectedAudit] = useState<any>(null)
  const [nonConformites, setNonConformites] = useState<any[]>([])
  const [plansActions, setPlansActions] = useState<any[]>([])
  const [showNcModal, setShowNcModal] = useState(false)
  const [showPaModal, setShowPaModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filterStatut, setFilterStatut] = useState('tous')
  const [filterClient, setFilterClient] = useState('')
  const [form, setForm] = useState({ titre: '', client_id: '', referentiel_id: '', date_audit: '', date_fin: '', notes: '', statut: 'en_cours' })
  const [ncForm, setNcForm] = useState({ titre: '', description: '', niveau: 'mineure' })
  const [paForm, setPaForm] = useState({ titre: '', description: '', responsable: '', echeance: '', non_conformite_id: '' })
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('role, client_id').eq('id', user.id).single()
      setRole(prof?.role || 'client')
      await load(prof?.role || 'client', prof?.client_id)
    }
    init()
  }, [])

  async function load(r?: string, clientId?: string) {
    const { data: refs } = await supabase.from('referentiels').select('*').order('nom')
    setReferentiels(refs || [])

    if (r === 'consultant') {
      const { data: cls } = await supabase.from('clients').select('*').order('nom')
      setClients(cls || [])
      const { data: aud } = await supabase
        .from('audits')
        .select('*, clients(nom), referentiels(nom, organisme)')
        .order('created_at', { ascending: false })
      setAudits(aud || [])
    } else {
      const { data: aud } = await supabase
        .from('audits')
        .select('*, clients(nom), referentiels(nom, organisme)')
        .eq('client_id', clientId || '')
        .order('created_at', { ascending: false })
      setAudits(aud || [])
    }
    setLoading(false)
  }

  async function openDetail(audit: any) {
    setSelectedAudit(audit)
    setShowDetailModal(true)
    const { data: ncs } = await supabase.from('non_conformites').select('*').eq('audit_id', audit.id).order('created_at', { ascending: false })
    setNonConformites(ncs || [])
    const ncIds = (ncs || []).map(n => n.id)
    if (ncIds.length > 0) {
      const { data: pas } = await supabase.from('plans_actions').select('*').in('non_conformite_id', ncIds).order('created_at', { ascending: false })
      setPlansActions(pas || [])
    } else {
      setPlansActions([])
    }
  }

  async function handleAdd() {
    if (!form.titre || !form.client_id) return
    setSaving(true)
    await supabase.from('audits').insert([{
      titre: form.titre,
      client_id: form.client_id,
      referentiel_id: form.referentiel_id || null,
      date_audit: form.date_audit || null,
      date_fin: form.date_fin || null,
      notes: form.notes || null,
      statut: form.statut
    }])
    setShowAddModal(false)
    setForm({ titre: '', client_id: '', referentiel_id: '', date_audit: '', date_fin: '', notes: '', statut: 'en_cours' })
    setSaving(false)
    load(role || undefined)
  }

  async function handleAddNc() {
    if (!ncForm.titre || !selectedAudit) return
    setSaving(true)
    await supabase.from('non_conformites').insert([{
      audit_id: selectedAudit.id,
      client_id: selectedAudit.client_id,
      titre: ncForm.titre,
      description: ncForm.description || null,
      niveau: ncForm.niveau,
      statut: 'ouverte'
    }])
    setShowNcModal(false)
    setNcForm({ titre: '', description: '', niveau: 'mineure' })
    setSaving(false)
    openDetail(selectedAudit)
  }

  async function handleAddPa() {
    if (!paForm.titre || !paForm.non_conformite_id || !selectedAudit) return
    setSaving(true)
    await supabase.from('plans_actions').insert([{
      non_conformite_id: paForm.non_conformite_id,
      client_id: selectedAudit.client_id,
      titre: paForm.titre,
      description: paForm.description || null,
      responsable: paForm.responsable || null,
      echeance: paForm.echeance || null,
      statut: 'a_faire'
    }])
    setShowPaModal(false)
    setPaForm({ titre: '', description: '', responsable: '', echeance: '', non_conformite_id: '' })
    setSaving(false)
    openDetail(selectedAudit)
  }

  async function updateStatutAudit(id: string, statut: string) {
    await supabase.from('audits').update({ statut }).eq('id', id)
    load(role || undefined)
    if (selectedAudit?.id === id) setSelectedAudit((prev: any) => ({ ...prev, statut }))
  }

  async function updateStatutNc(id: string, statut: string) {
    await supabase.from('non_conformites').update({ statut }).eq('id', id)
    openDetail(selectedAudit)
  }

  async function updateStatutPa(id: string, statut: string) {
    await supabase.from('plans_actions').update({ statut }).eq('id', id)
    openDetail(selectedAudit)
  }

  async function updateScore(id: string, score: number) {
    await supabase.from('audits').update({ score }).eq('id', id)
    load(role || undefined)
    setSelectedAudit((prev: any) => ({ ...prev, score }))
  }

  const statutStyle = (s: string) => {
    if (s === 'en_cours') return { color: 'var(--warning)', bg: 'var(--warning-light)', label: 'En cours' }
    if (s === 'termine') return { color: 'var(--success)', bg: 'var(--success-light)', label: 'Termine' }
    return { color: 'var(--text-tertiary)', bg: 'var(--surface-hover)', label: 'Archive' }
  }

  const niveauStyle = (n: string) => {
    if (n === 'majeure') return { color: 'var(--danger)', bg: 'var(--danger-light)' }
    if (n === 'mineure') return { color: 'var(--warning)', bg: 'var(--warning-light)' }
    return { color: 'var(--text-tertiary)', bg: 'var(--surface-hover)' }
  }

  const scoreColor = (s: number | null) => {
    if (s === null) return 'var(--text-tertiary)'
    if (s >= 80) return 'var(--success)'
    if (s >= 60) return 'var(--warning)'
    return 'var(--danger)'
  }

  const filtered = audits
    .filter(a => filterStatut === 'tous' || a.statut === filterStatut)
    .filter(a => !filterClient || a.client_id === filterClient)

  const filterBtn = (label: string, active: boolean, onClick: () => void) => (
    <button onClick={onClick} style={{ padding: '5px 12px', borderRadius: '20px', border: active ? '1px solid var(--accent)' : '1px solid var(--border)', background: active ? 'var(--accent-light)' : 'transparent', color: active ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '12px', fontWeight: active ? '500' : '400', cursor: 'pointer', fontFamily: 'var(--font)' }}>
      {label}
    </button>
  )

  if (loading) return <div style={{ padding: '28px', color: 'var(--text-tertiary)', fontSize: '13px', fontFamily: 'var(--font)' }}>Chargement...</div>

  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)' }}>

      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{filtered.length} audit{filtered.length > 1 ? 's' : ''}</div>
        {role === 'consultant' && (
          <button onClick={() => setShowAddModal(true)}
            style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 4px rgba(26,86,219,0.3)' }}>
            <i className="ti ti-plus" style={{ fontSize: '14px' }} />
            Nouvel audit
          </button>
        )}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {filterBtn('Tous', filterStatut === 'tous', () => setFilterStatut('tous'))}
          {filterBtn('En cours', filterStatut === 'en_cours', () => setFilterStatut('en_cours'))}
          {filterBtn('Termine', filterStatut === 'termine', () => setFilterStatut('termine'))}
          {filterBtn('Archive', filterStatut === 'archive', () => setFilterStatut('archive'))}
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
          <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <i className="ti ti-clipboard-check" style={{ fontSize: '26px', color: '#7C3AED' }} />
          </div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>Aucun audit</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
            {role === 'consultant' ? 'Creez votre premier audit de preparation a la certification' : 'Aucun audit en cours pour votre etablissement'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(audit => {
            const st = statutStyle(audit.statut)
            return (
              <div key={audit.id} onClick={() => openDetail(audit)}
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', cursor: 'pointer', boxShadow: 'var(--shadow-sm)', borderLeft: '3px solid #7C3AED' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-hover)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface)'}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>{audit.titre}</div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {audit.clients?.nom && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <i className="ti ti-building-hospital" style={{ fontSize: '13px' }} />
                          {audit.clients.nom}
                        </span>
                      )}
                      {audit.referentiels?.nom && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <i className="ti ti-book" style={{ fontSize: '13px' }} />
                          {audit.referentiels.nom}
                        </span>
                      )}
                      {audit.date_audit && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <i className="ti ti-calendar" style={{ fontSize: '13px' }} />
                          {new Date(audit.date_audit).toLocaleDateString('fr-FR')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                    {audit.score !== null && (
                      <div style={{ fontSize: '22px', fontWeight: '700', color: scoreColor(audit.score) }}>{audit.score}%</div>
                    )}
                    <span style={{ background: st.bg, color: st.color, padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>{st.label}</span>
                  </div>
                </div>
                {audit.notes && (
                  <div style={{ marginTop: '10px', padding: '8px 12px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    "{audit.notes}"
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL DETAIL AUDIT */}
      {showDetailModal && selectedAudit && (
        <Modal onClose={() => setShowDetailModal(false)} maxWidth="700px">
          <ModalHeader title={selectedAudit.titre} sub={selectedAudit.clients?.nom || ''} onClose={() => setShowDetailModal(false)} />
          <div style={{ padding: '20px 24px' }}>

            {/* Infos audit */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              {[
                ['Referentiel', selectedAudit.referentiels?.nom || '-'],
                ['Date audit', selectedAudit.date_audit ? new Date(selectedAudit.date_audit).toLocaleDateString('fr-FR') : '-'],
                ['Date fin', selectedAudit.date_fin ? new Date(selectedAudit.date_fin).toLocaleDateString('fr-FR') : '-'],
              ].map(([l, v]) => (
                <div key={l} style={{ background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{l}</div>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Score + statut */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', padding: '14px 16px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Score de conformite</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type='range' min='0' max='100' value={selectedAudit.score || 0}
                    onChange={e => updateScore(selectedAudit.id, parseInt(e.target.value))}
                    style={{ flex: 1, accentColor: scoreColor(selectedAudit.score) }} />
                  <div style={{ fontSize: '24px', fontWeight: '700', color: scoreColor(selectedAudit.score), minWidth: '50px', textAlign: 'right' }}>
                    {selectedAudit.score !== null ? `${selectedAudit.score}%` : '-'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                {['en_cours', 'termine', 'archive'].map(s => {
                  const st = statutStyle(s)
                  return (
                    <button key={s} onClick={() => updateStatutAudit(selectedAudit.id, s)}
                      style={{ padding: '6px 12px', background: selectedAudit.statut === s ? st.bg : 'transparent', border: `1px solid ${selectedAudit.statut === s ? st.color : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', color: selectedAudit.statut === s ? st.color : 'var(--text-tertiary)', fontSize: '11px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                      {st.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Non-conformites */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="ti ti-alert-triangle" style={{ fontSize: '15px', color: 'var(--danger)' }} />
                  Non-conformites
                  {nonConformites.length > 0 && <span style={{ background: 'var(--danger)', color: '#fff', fontSize: '10px', fontWeight: '600', padding: '1px 6px', borderRadius: '10px' }}>{nonConformites.length}</span>}
                </div>
                {role === 'consultant' && (
                  <button onClick={() => setShowNcModal(true)}
                    style={{ padding: '5px 12px', background: 'var(--danger-light)', border: '1px solid rgba(194,54,42,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--danger)', fontSize: '11px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <i className="ti ti-plus" style={{ fontSize: '12px' }} />Ajouter
                  </button>
                )}
              </div>
              {nonConformites.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                  <i className="ti ti-check" style={{ fontSize: '24px', display: 'block', marginBottom: '6px', color: 'var(--success)' }} />
                  Aucune non-conformite identifiee
                </div>
              ) : nonConformites.map(nc => {
                const nv = niveauStyle(nc.niveau)
                return (
                  <div key={nc.id} style={{ padding: '12px 14px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: '6px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '2px' }}>{nc.titre}</div>
                      {nc.description && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{nc.description}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                      <span style={{ background: nv.bg, color: nv.color, padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '500', textTransform: 'capitalize' }}>{nc.niveau}</span>
                      {role === 'consultant' && (
                        <select value={nc.statut} onChange={e => updateStatutNc(nc.id, e.target.value)}
                          style={{ padding: '3px 6px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface)', cursor: 'pointer' }}>
                          <option value='ouverte'>Ouverte</option>
                          <option value='en_cours'>En cours</option>
                          <option value='resolue'>Resolue</option>
                        </select>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Plans d'actions */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="ti ti-list-check" style={{ fontSize: '15px', color: 'var(--warning)' }} />
                  Plans d actions
                  {plansActions.length > 0 && <span style={{ background: 'var(--warning)', color: '#fff', fontSize: '10px', fontWeight: '600', padding: '1px 6px', borderRadius: '10px' }}>{plansActions.length}</span>}
                </div>
                {role === 'consultant' && nonConformites.length > 0 && (
                  <button onClick={() => setShowPaModal(true)}
                    style={{ padding: '5px 12px', background: 'var(--warning-light)', border: '1px solid rgba(158,94,0,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--warning)', fontSize: '11px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <i className="ti ti-plus" style={{ fontSize: '12px' }} />Ajouter
                  </button>
                )}
              </div>
              {plansActions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-tertiary)', fontSize: '12px' }}>Aucun plan d action</div>
              ) : plansActions.map(pa => (
                <div key={pa.id} style={{ padding: '12px 14px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: '6px', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '2px' }}>{pa.titre}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {pa.responsable && <span>Responsable : {pa.responsable}</span>}
                      {pa.echeance && <span>Echeance : {new Date(pa.echeance).toLocaleDateString('fr-FR')}</span>}
                    </div>
                  </div>
                  <select value={pa.statut} onChange={e => updateStatutPa(pa.id, e.target.value)}
                    style={{ padding: '3px 6px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface)', cursor: 'pointer', flexShrink: 0 }}>
                    <option value='a_faire'>A faire</option>
                    <option value='en_cours'>En cours</option>
                    <option value='termine'>Termine</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL NOUVEL AUDIT */}
      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)}>
          <ModalHeader title="Nouvel audit" onClose={() => setShowAddModal(false)} />
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Titre *</label>
              <input value={form.titre} onChange={e => setForm(p => ({ ...p, titre: e.target.value }))} placeholder="Audit HAS 2025 — Clinique X" style={inputStyle} autoFocus />
            </div>
            <div>
              <label style={labelStyle}>Client *</label>
              <select value={form.client_id} onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))} style={inputStyle}>
                <option value=''>Selectionner un client...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Referentiel</label>
              <select value={form.referentiel_id} onChange={e => setForm(p => ({ ...p, referentiel_id: e.target.value }))} style={inputStyle}>
                <option value=''>Selectionner un referentiel...</option>
                {referentiels.map(r => <option key={r.id} value={r.id}>{r.nom} ({r.organisme})</option>)}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Date debut</label>
                <input type='date' value={form.date_audit} onChange={e => setForm(p => ({ ...p, date_audit: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Date fin prevue</label>
                <input type='date' value={form.date_fin} onChange={e => setForm(p => ({ ...p, date_fin: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Notes</label>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} placeholder="Observations, contexte..." style={{ ...inputStyle, resize: 'none' }} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowAddModal(false)}
                style={{ flex: 1, padding: '11px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                Annuler
              </button>
              <button onClick={handleAdd} disabled={saving || !form.titre || !form.client_id}
                style={{ flex: 1, padding: '11px', background: saving || !form.titre || !form.client_id ? 'rgba(26,86,219,0.4)' : 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: saving || !form.titre || !form.client_id ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>
                {saving ? 'Enregistrement...' : 'Creer l audit'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL NON-CONFORMITE */}
      {showNcModal && (
        <Modal onClose={() => setShowNcModal(false)} maxWidth="480px">
          <ModalHeader title="Ajouter une non-conformite" onClose={() => setShowNcModal(false)} />
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Titre *</label>
              <input value={ncForm.titre} onChange={e => setNcForm(p => ({ ...p, titre: e.target.value }))} placeholder="Ex: Absence de procedure de traçabilite" style={inputStyle} autoFocus />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea value={ncForm.description} onChange={e => setNcForm(p => ({ ...p, description: e.target.value }))} rows={3} placeholder="Details de la non-conformite..." style={{ ...inputStyle, resize: 'none' }} />
            </div>
            <div>
              <label style={labelStyle}>Niveau</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[['majeure', 'var(--danger)', 'var(--danger-light)'], ['mineure', 'var(--warning)', 'var(--warning-light)'], ['observation', 'var(--text-tertiary)', 'var(--surface-hover)']].map(([n, c, bg]) => (
                  <button key={n} onClick={() => setNcForm(p => ({ ...p, niveau: n }))}
                    style={{ flex: 1, padding: '9px', border: `1px solid ${ncForm.niveau === n ? c : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', background: ncForm.niveau === n ? bg : 'transparent', color: ncForm.niveau === n ? c : 'var(--text-secondary)', fontSize: '12px', fontWeight: ncForm.niveau === n ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)', textTransform: 'capitalize' }}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowNcModal(false)}
                style={{ flex: 1, padding: '11px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                Annuler
              </button>
              <button onClick={handleAddNc} disabled={saving || !ncForm.titre}
                style={{ flex: 1, padding: '11px', background: saving || !ncForm.titre ? 'rgba(194,54,42,0.3)' : 'var(--danger)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: saving || !ncForm.titre ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>
                {saving ? 'Enregistrement...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL PLAN D'ACTION */}
      {showPaModal && (
        <Modal onClose={() => setShowPaModal(false)} maxWidth="480px">
          <ModalHeader title="Ajouter un plan d action" onClose={() => setShowPaModal(false)} />
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={labelStyle}>Non-conformite liee *</label>
              <select value={paForm.non_conformite_id} onChange={e => setPaForm(p => ({ ...p, non_conformite_id: e.target.value }))} style={inputStyle}>
                <option value=''>Selectionner...</option>
                {nonConformites.map(nc => <option key={nc.id} value={nc.id}>{nc.titre}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Titre *</label>
              <input value={paForm.titre} onChange={e => setPaForm(p => ({ ...p, titre: e.target.value }))} placeholder="Ex: Rediger la procedure de traçabilite" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Description</label>
              <textarea value={paForm.description} onChange={e => setPaForm(p => ({ ...p, description: e.target.value }))} rows={2} style={{ ...inputStyle, resize: 'none' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Responsable</label>
                <input value={paForm.responsable} onChange={e => setPaForm(p => ({ ...p, responsable: e.target.value }))} placeholder="Dr. Martin" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Echeance</label>
                <input type='date' value={paForm.echeance} onChange={e => setPaForm(p => ({ ...p, echeance: e.target.value }))} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowPaModal(false)}
                style={{ flex: 1, padding: '11px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                Annuler
              </button>
              <button onClick={handleAddPa} disabled={saving || !paForm.titre || !paForm.non_conformite_id}
                style={{ flex: 1, padding: '11px', background: saving || !paForm.titre || !paForm.non_conformite_id ? 'rgba(26,86,219,0.4)' : 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: saving || !paForm.titre || !paForm.non_conformite_id ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>
                {saving ? 'Enregistrement...' : 'Ajouter'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}