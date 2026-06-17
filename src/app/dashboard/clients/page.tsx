'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'

type Etablissement = {
  id: string; nom: string; type: string; ville: string
  contact_nom: string; contact_email: string; statut: string
  formule: string; created_at: string
}

const TYPES_CLIENT = ['EHPAD', 'Pharmacie', 'SSIAD', 'SAD', 'Établissement seniors', 'Clinique', 'HAD', 'Autre']

const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'Inter, -apple-system, sans-serif', outline: 'none', background: 'var(--surface)' }
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
        <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>{title}</div>
        {sub && <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{sub}</div>}
      </div>
      <button onClick={onClose} style={{ width: '30px', height: '30px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-hover)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        <i className="ti ti-x" style={{ fontSize: '14px' }} aria-hidden="true" />
      </button>
    </div>
  )
}

export default function ClientsPage() {
  const [etablissements, setEtablissements] = useState<Etablissement[]>([])
  const [equipCount, setEquipCount] = useState<Record<string, number>>({})
  const [alertCount, setAlertCount] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAccessModal, setShowAccessModal] = useState(false)
  const [showEquipModal, setShowEquipModal] = useState(false)
  const [showDocsModal, setShowDocsModal] = useState(false)
  const [selectedEtab, setSelectedEtab] = useState<Etablissement | null>(null)
  const [selectedEtabEquip, setSelectedEtabEquip] = useState<Etablissement | null>(null)
  const [selectedEtabDocs, setSelectedEtabDocs] = useState<Etablissement | null>(null)
  const [etabEquipements, setEtabEquipements] = useState<any[]>([])
  const [allEquipements, setAllEquipements] = useState<any[]>([])
  const [etabDocs, setEtabDocs] = useState<any[]>([])
  const [equipLoading, setEquipLoading] = useState(false)
  const [docsLoading, setDocsLoading] = useState(false)
  const [affectEquipId, setAffectEquipId] = useState('')
  const [affectSaving, setAffectSaving] = useState(false)
  const [saving, setSaving] = useState(false)
  const [accessSaving, setAccessSaving] = useState(false)
  const [accessSuccess, setAccessSuccess] = useState(false)
  const [accessError, setAccessError] = useState('')
  const [filterStatut, setFilterStatut] = useState('tous')
  const [filterType, setFilterType] = useState('tous')
  const [formuleSelected, setFormuleSelected] = useState('Essentiel')

  const nomRef = useRef<HTMLInputElement>(null)
  const villeRef = useRef<HTMLInputElement>(null)
  const contactNomRef = useRef<HTMLInputElement>(null)
  const contactEmailRef = useRef<HTMLInputElement>(null)
  const typeRef = useRef<HTMLSelectElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)

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
    setAffectEquipId('')
    const { data: etabEquips } = await supabase.from('equipements').select('*').eq('etablissement_id', etab.id)
    const { data: all } = await supabase.from('equipements').select('id, reference, designation').neq('etablissement_id', etab.id)
    setEtabEquipements(etabEquips || [])
    setAllEquipements(all || [])
    setEquipLoading(false)
  }

  async function openDocsModal(etab: Etablissement) {
    setSelectedEtabDocs(etab)
    setShowDocsModal(true)
    setDocsLoading(true)
    const { data: equips } = await supabase.from('equipements').select('id, reference, designation').eq('etablissement_id', etab.id)
    if (!equips || equips.length === 0) { setEtabDocs([]); setDocsLoading(false); return }
    const { data: docs } = await supabase.from('documents').select('*').in('equipement_id', equips.map(e => e.id))
    setEtabDocs((docs || []).map(d => ({ ...d, equip: equips.find(e => e.id === d.equipement_id) })))
    setDocsLoading(false)
  }

  async function handleAffectEquip() {
    if (!affectEquipId || !selectedEtabEquip) return
    setAffectSaving(true)
    await supabase.from('equipements').update({ etablissement_id: selectedEtabEquip.id }).eq('id', affectEquipId)
    setAffectEquipId('')
    setAffectSaving(false)
    openEquipModal(selectedEtabEquip)
    load()
  }

  async function handleAdd() {
    const nom = nomRef.current?.value?.trim()
    if (!nom) return
    setSaving(true)
    await supabase.from('etablissements').insert([{
      nom,
      ville: villeRef.current?.value || '',
      contact_nom: contactNomRef.current?.value || '',
      contact_email: contactEmailRef.current?.value || '',
      type: typeRef.current?.value || 'EHPAD',
      formule: formuleSelected
    }])
    setShowAddModal(false)
    setFormuleSelected('Essentiel')
    setSaving(false)
    load()
  }

  async function handleCreateAccess() {
    const email = emailRef.current?.value?.trim()
    if (!email) return
    setAccessSaving(true)
    setAccessError('')

    const res = await fetch('/api/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
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
    setTimeout(() => { setShowAccessModal(false); setAccessSuccess(false) }, 3000)
  }

  async function handleBloquerClient(etab: Etablissement) {
    const nouveauStatut = etab.statut === 'actif' ? 'bloque' : 'actif'
    await supabase.from('etablissements').update({ statut: nouveauStatut }).eq('id', etab.id)
    load()
  }

  const formuleBadge = (f: string) => {
    if (f === 'Premium') return { color: 'var(--accent)', bg: 'var(--accent-light)' }
    if (f === 'Privilège') return { color: 'var(--purple)', bg: 'var(--purple-light)' }
    return { color: 'var(--text-secondary)', bg: 'var(--surface-hover)' }
  }

  const statutEquip = (s: string) => s === 'en_service'
    ? { color: 'var(--success)', label: 'En service' }
    : s === 'maintenance' ? { color: 'var(--warning)', label: 'Maintenance' }
    : { color: 'var(--danger)', label: 'Hors service' }

  const filtered = etablissements
    .filter(e => filterStatut === 'tous' || e.statut === filterStatut)
    .filter(e => filterType === 'tous' || e.type === filterType)

  const filterBtn = (label: string, active: boolean, onClick: () => void) => (
    <button onClick={onClick} style={{ padding: '5px 12px', borderRadius: '20px', border: active ? '1px solid var(--accent)' : '1px solid var(--border)', background: active ? 'var(--accent-light)' : 'transparent', color: active ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '12px', fontWeight: active ? '500' : '400', cursor: 'pointer', fontFamily: 'var(--font)' }}>
      {label}
    </button>
  )

  if (loading) return <div style={{ padding: '28px', color: 'var(--text-tertiary)', fontSize: '13px', fontFamily: 'var(--font)' }}>Chargement...</div>

  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)' }}>

      {/* Header */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{filtered.length} établissement{filtered.length > 1 ? 's' : ''}</div>
        <button onClick={() => { setShowAddModal(true); setFormuleSelected('Essentiel') }}
          style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 4px rgba(26,86,219,0.3)' }}>
          <i className="ti ti-plus" style={{ fontSize: '14px' }} aria-hidden="true" />
          Ajouter un client
        </button>
      </div>

      {/* Filtres */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {filterBtn('Tous', filterStatut === 'tous', () => setFilterStatut('tous'))}
          {filterBtn('Actif', filterStatut === 'actif', () => setFilterStatut('actif'))}
          {filterBtn('Bloqué', filterStatut === 'bloque', () => setFilterStatut('bloque'))}
          {filterBtn('En attente', filterStatut === 'en_attente', () => setFilterStatut('en_attente'))}
        </div>
        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface)', cursor: 'pointer' }}>
          <option value='tous'>Tous les types</option>
          {TYPES_CLIENT.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-hover)' }}>
              {['Établissement', 'Type', 'Contact', 'Formule', 'Équip.', 'Alertes', 'Statut', 'Actions'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: 'var(--text-tertiary)', letterSpacing: '0.4px', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>Aucun établissement</td></tr>
            ) : filtered.map((etab, i) => {
              const fb = formuleBadge(etab.formule)
              const alerts = alertCount[etab.id] || 0
              const isBloque = etab.statut === 'bloque'
              return (
                <tr key={etab.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', opacity: isBloque ? 0.6 : 1 }}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: isBloque ? 'var(--surface-hover)' : 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: isBloque ? 'var(--text-tertiary)' : 'var(--accent)', flexShrink: 0 }}>
                        {etab.nom.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{etab.nom}</div>
                        {etab.ville && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{etab.ville}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>{etab.type}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{etab.contact_nom || '—'}</div>
                    {etab.contact_email && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{etab.contact_email}</div>}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ background: fb.bg, color: fb.color, padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>{etab.formule || 'Essentiel'}</span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: '600', color: 'var(--accent)' }}>{equipCount[etab.id] || 0}</td>
                  <td style={{ padding: '12px 14px' }}>
                    {alerts > 0 ? (
                      <span style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>{alerts} alerte{alerts > 1 ? 's' : ''}</span>
                    ) : (
                      <span style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>OK</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isBloque ? 'var(--danger)' : etab.statut === 'actif' ? 'var(--success)' : 'var(--border-strong)' }} />
                      <span style={{ fontSize: '12px', color: isBloque ? 'var(--danger)' : etab.statut === 'actif' ? 'var(--success)' : 'var(--text-tertiary)', fontWeight: '500' }}>
                        {isBloque ? 'Bloqué' : etab.statut === 'actif' ? 'Actif' : 'En attente'}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {[
                        { icon: 'ti-device-heart-monitor', label: 'Équip.', color: 'var(--accent)', bg: 'var(--accent-light)', onClick: () => openEquipModal(etab) },
                        { icon: 'ti-files', label: 'Docs', color: 'var(--success)', bg: 'var(--success-light)', onClick: () => openDocsModal(etab) },
                        { icon: 'ti-key', label: 'Accès', color: 'var(--text-secondary)', bg: 'var(--surface-hover)', onClick: () => { setSelectedEtab(etab); setShowAccessModal(true); setAccessSuccess(false); setAccessError('') } },
                        { icon: isBloque ? 'ti-lock-open' : 'ti-lock', label: isBloque ? 'Activer' : 'Bloquer', color: isBloque ? 'var(--success)' : 'var(--danger)', bg: isBloque ? 'var(--success-light)' : 'var(--danger-light)', onClick: () => handleBloquerClient(etab) },
                      ].map(btn => (
                        <button key={btn.label} onClick={btn.onClick}
                          style={{ padding: '5px 8px', background: btn.bg, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontWeight: '500', color: btn.color, cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap' }}>
                          <i className={`ti ${btn.icon}`} style={{ fontSize: '12px' }} aria-hidden="true" />
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

      {/* Modal Documents */}
      {showDocsModal && selectedEtabDocs && (
        <Modal onClose={() => setShowDocsModal(false)} maxWidth="540px">
          <ModalHeader title={`Documents — ${selectedEtabDocs.nom}`} sub={`${etabDocs.length} document${etabDocs.length > 1 ? 's' : ''}`} onClose={() => setShowDocsModal(false)} />
          <div style={{ padding: '20px 24px' }}>
            {docsLoading ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-tertiary)', fontSize: '13px' }}>Chargement...</div>
            ) : etabDocs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <i className="ti ti-folder-open" style={{ fontSize: '36px', display: 'block', marginBottom: '10px', color: 'var(--text-tertiary)', opacity: 0.4 }} aria-hidden="true" />
                <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Aucun document pour cet établissement</div>
              </div>
            ) : etabDocs.map(doc => (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '8px' }}>
                <i className={`ti ${doc.type_doc?.includes('pdf') ? 'ti-file-type-pdf' : doc.type_doc?.includes('image') ? 'ti-photo' : 'ti-file-description'}`}
                  style={{ fontSize: '22px', color: doc.type_doc?.includes('pdf') ? 'var(--danger)' : doc.type_doc?.includes('image') ? 'var(--purple)' : 'var(--accent)', flexShrink: 0 }} aria-hidden="true" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nom}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{doc.equip?.designation} · {doc.equip?.reference}</div>
                </div>
                <a href={doc.url} target='_blank' rel='noreferrer'
                  style={{ padding: '6px 14px', background: 'var(--accent-light)', border: '1px solid rgba(26,86,219,0.2)', borderRadius: 'var(--radius-sm)', fontSize: '12px', fontWeight: '500', color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  <i className="ti ti-download" style={{ fontSize: '13px' }} aria-hidden="true" />
                  Ouvrir
                </a>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Modal Équipements */}
      {showEquipModal && selectedEtabEquip && (
        <Modal onClose={() => setShowEquipModal(false)} maxWidth="540px">
          <ModalHeader title={`Équipements — ${selectedEtabEquip.nom}`} sub={`${etabEquipements.length} équipement${etabEquipements.length > 1 ? 's' : ''} affecté${etabEquipements.length > 1 ? 's' : ''}`} onClose={() => setShowEquipModal(false)} />
          <div style={{ padding: '20px 24px' }}>
            <div style={{ padding: '14px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '10px' }}>Affecter un équipement</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select value={affectEquipId} onChange={e => setAffectEquipId(e.target.value)}
                  style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface)' }}>
                  <option value=''>Sélectionner un équipement...</option>
                  {allEquipements.map(e => <option key={e.id} value={e.id}>{e.reference} — {e.designation}</option>)}
                </select>
                <button onClick={handleAffectEquip} disabled={affectSaving || !affectEquipId}
                  style={{ padding: '8px 16px', background: affectSaving || !affectEquipId ? 'rgba(26,86,219,0.3)' : 'var(--accent)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>
                  {affectSaving ? '...' : 'Affecter'}
                </button>
              </div>
            </div>
            {equipLoading ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-tertiary)', fontSize: '13px' }}>Chargement...</div>
            ) : etabEquipements.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-tertiary)', fontSize: '13px' }}>Aucun équipement affecté</div>
            ) : etabEquipements.map(eq => {
              const st = statutEquip(eq.statut)
              return (
                <div key={eq.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '6px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>{eq.designation}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>{eq.reference} · {eq.localisation || '—'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: st.color }} />
                    <span style={{ fontSize: '11px', color: st.color, fontWeight: '500' }}>{st.label}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </Modal>
      )}

      {/* Modal Ajout établissement */}
      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)}>
          <ModalHeader title="Ajouter un établissement" onClose={() => setShowAddModal(false)} />
          <div style={{ padding: '20px 24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Nom *</label>
                <input ref={nomRef} type='text' placeholder='EHPAD Les Pins' style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Ville</label>
                <input ref={villeRef} type='text' placeholder='Paris' style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Type</label>
                <select ref={typeRef} style={inputStyle}>
                  {TYPES_CLIENT.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Contact</label>
                <input ref={contactNomRef} type='text' placeholder='Dr. Martin' style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email contact</label>
                <input ref={contactEmailRef} type='email' placeholder='contact@etab.fr' style={inputStyle} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Formule</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['Essentiel', 'Premium', 'Privilège'].map(f => (
                    <button key={f} type="button" onClick={() => setFormuleSelected(f)}
                      style={{ flex: 1, padding: '10px', border: `1px solid ${formuleSelected === f ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', background: formuleSelected === f ? 'var(--accent-light)' : 'var(--surface)', color: formuleSelected === f ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '12px', fontWeight: formuleSelected === f ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.1s' }}>
                      {f}
                    </button>
                  ))}
                </div>
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

      {/* Modal Accès — invitation par email uniquement */}
      {showAccessModal && selectedEtab && (
        <Modal onClose={() => setShowAccessModal(false)} maxWidth="400px">
          <ModalHeader title="Inviter un client" sub={selectedEtab.nom} onClose={() => setShowAccessModal(false)} />
          <div style={{ padding: '20px 24px' }}>
            {accessSuccess ? (
              <div style={{ padding: '20px', background: 'var(--success-light)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                <i className="ti ti-mail-check" style={{ fontSize: '32px', color: 'var(--success)', display: 'block', marginBottom: '10px' }} aria-hidden="true" />
                <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--success)', marginBottom: '6px' }}>Invitation envoyée !</div>
                <div style={{ fontSize: '12px', color: 'var(--success)', opacity: 0.8 }}>Le client va recevoir un email pour créer son mot de passe et accéder à son espace MediTrack.</div>
              </div>
            ) : (
              <>
                <div style={{ padding: '12px 16px', background: 'var(--accent-light)', border: '1px solid rgba(26,86,219,0.15)', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '12px', color: 'var(--accent)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <i className="ti ti-info-circle" style={{ fontSize: '15px', flexShrink: 0, marginTop: '1px' }} aria-hidden="true" />
                  <span>Un email d'invitation sera envoyé au client. Il pourra créer son propre mot de passe et accéder directement à son espace.</span>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <label style={labelStyle}>Email du client</label>
                  <input ref={emailRef} type='email' placeholder='contact@ehpad.fr' style={inputStyle} autoFocus />
                </div>
                {accessError && (
                  <div style={{ padding: '10px 14px', background: 'var(--danger-light)', border: '1px solid rgba(194,54,42,0.2)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--danger)', marginBottom: '14px' }}>{accessError}</div>
                )}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setShowAccessModal(false)}
                    style={{ flex: 1, padding: '11px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                    Annuler
                  </button>
                  <button onClick={handleCreateAccess} disabled={accessSaving}
                    style={{ flex: 1, padding: '11px', background: accessSaving ? 'rgba(26,86,219,0.4)' : 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: accessSaving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', boxShadow: '0 1px 4px rgba(26,86,219,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <i className="ti ti-send" style={{ fontSize: '14px' }} aria-hidden="true" />
                    {accessSaving ? 'Envoi...' : "Envoyer l'invitation"}
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