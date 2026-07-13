'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type FicheData = {
  technicien: string
  entreprise: string
  resultat: string
  statut_materiel: string
}

function generateFicheInterventionPDF(m: any, fiche: FicheData) {
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #1a1a1a; padding: 32px; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #1A56DB; }
    .logo { font-size: 20px; font-weight: 700; color: #1A56DB; }
    .subtitle { font-size: 12px; color: #999; margin-top: 2px; }
    .title { font-size: 16px; font-weight: 600; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 11px; font-weight: 600; color: #999; text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #eee; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .field { background: #f9f9f9; border-radius: 6px; padding: 10px 12px; }
    .field-label { font-size: 10px; color: #999; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 3px; }
    .field-value { font-size: 13px; font-weight: 500; color: #1a1a1a; min-height: 18px; }
    .field-full { grid-column: 1 / -1; }
    .checkbox-row { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid #f5f5f5; font-size: 12px; }
    .checkbox { width: 14px; height: 14px; border: 1px solid #ccc; border-radius: 3px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; }
    .checked { background: #1A56DB; border-color: #1A56DB; color: white; }
    .signature-box { height: 60px; border: 1px dashed #ccc; border-radius: 6px; margin-top: 8px; display: flex; align-items: center; justify-content: center; color: #ccc; font-size: 12px; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #eee; font-size: 11px; color: #999; display: flex; justify-content: space-between; }
    @media print { body { padding: 16px; } }
  </style></head><body>
    <div class="header">
      <div><div class="logo">MediTrack</div><div class="subtitle">Fiche intervention universelle</div></div>
      <div style="text-align:right;">
        <div class="title">Intervention</div>
        <div class="subtitle">${new Date(m.created_at || Date.now()).toLocaleDateString('fr-FR')}</div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">1. Informations generales</div>
      <div class="grid">
        <div class="field"><div class="field-label">Date intervention</div><div class="field-value">${m.date_prevue ? new Date(m.date_prevue).toLocaleDateString('fr-FR') : '____/____/________'}</div></div>
        <div class="field"><div class="field-label">Heure</div><div class="field-value">${m.date_prevue ? new Date(m.date_prevue).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '__________'}</div></div>
        <div class="field"><div class="field-label">Type intervention</div><div class="field-value">${m.type === 'preventive' ? 'Preventive' : 'Curative'}</div></div>
        <div class="field"><div class="field-label">Statut</div><div class="field-value">${m.statut === 'planifie' ? 'Planifie' : m.statut === 'en_cours' ? 'En cours' : 'Termine'}</div></div>
        <div class="field field-full"><div class="field-label">Intervenant / Technicien</div><div class="field-value">${fiche.technicien || '____________________________'}</div></div>
        <div class="field field-full"><div class="field-label">Entreprise / PSDM</div><div class="field-value">${fiche.entreprise || '_________________________________'}</div></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">2. Materiel concerne</div>
      <div class="grid">
        <div class="field"><div class="field-label">Designation</div><div class="field-value">${m.equipements?.designation || '-'}</div></div>
        <div class="field"><div class="field-label">Reference</div><div class="field-value">${m.equipements?.reference || '-'}</div></div>
        <div class="field"><div class="field-label">Etablissement</div><div class="field-value">${m.equipements?.etablissements?.nom || '-'}</div></div>
        <div class="field"><div class="field-label">Localisation</div><div class="field-value">${m.equipements?.localisation || '-'}</div></div>
        <div class="field"><div class="field-label">Prochaine revision</div><div class="field-value">${m.equipements?.date_revision || '-'}</div></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">3. Objet de l intervention</div>
      <div class="field field-full" style="min-height:70px;">
        <div class="field-label">Description</div>
        <div class="field-value" style="margin-top:4px;">${m.notes || '&nbsp;'}</div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">4. Resultat de l intervention</div>
      <div class="grid">
        <div>
          ${['Resolu', 'Partiellement resolu', 'A revoir', 'Materiel immobilise'].map(r => `
            <div class="checkbox-row">
              <div class="checkbox ${fiche.resultat === r ? 'checked' : ''}">${fiche.resultat === r ? '✓' : ''}</div>
              ${r}
            </div>
          `).join('')}
        </div>
        <div>
          <div class="field-label" style="margin-bottom:8px;">Statut materiel apres intervention</div>
          ${['En service', 'En maintenance', 'Hors service'].map(s => `
            <div class="checkbox-row">
              <div class="checkbox ${fiche.statut_materiel === s ? 'checked' : ''}">${fiche.statut_materiel === s ? '✓' : ''}</div>
              ${s}
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">5. Signature</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div>
          <div class="field-label" style="margin-bottom:6px;">Signature technicien</div>
          <div class="signature-box">Signature</div>
        </div>
        <div>
          <div class="field-label" style="margin-bottom:6px;">Signature responsable etablissement</div>
          <div class="signature-box">Signature</div>
        </div>
      </div>
    </div>
    <div class="footer">
      <span>MediTrack - Plateforme de gestion PSDM - www.meditrack-app.fr</span>
      <span>Genere le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
    </div>
    <div style="margin-top:24px;text-align:center;display:flex;gap:12px;justify-content:center;">
      <button onclick="window.print()" style="padding:10px 28px;background:#1A56DB;color:white;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:Arial,sans-serif;">Imprimer</button>
      <button onclick="window.close()" style="padding:10px 28px;background:#f5f5f5;color:#333;border:1px solid #ddd;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:Arial,sans-serif;">Fermer</button>
    </div>
  </body></html>`
  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close(); w.focus() }
}

function revisionStatus(dateRevision: string | null) {
  if (!dateRevision) return null
  const today = new Date()
  const rev = new Date(dateRevision)
  const diffDays = Math.ceil((rev.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return { label: 'Revision depassee', color: 'var(--danger)', bg: 'var(--danger-light)', icon: 'ti-alert-triangle' }
  if (diffDays <= 30) return { label: `Revision dans ${diffDays}j`, color: 'var(--warning)', bg: 'var(--warning-light)', icon: 'ti-clock' }
  return { label: `Revision le ${new Date(dateRevision).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`, color: 'var(--success)', bg: 'var(--success-light)', icon: 'ti-tool' }
}

export default function MaintenancePage() {
  const [maintenances, setMaintenances] = useState<any[]>([])
  const [equipements, setEquipements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showFicheModal, setShowFicheModal] = useState(false)
  const [selectedMaintenance, setSelectedMaintenance] = useState<any>(null)
  const [ficheData, setFicheData] = useState<FicheData>({ technicien: '', entreprise: '', resultat: '', statut_materiel: '' })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [filterStatut, setFilterStatut] = useState('tous')
  const [role, setRole] = useState<string | null>(null)
  const [etablissementId, setEtablissementId] = useState<string | null>(null)
  const [searchEquip, setSearchEquip] = useState('')
  const [form, setForm] = useState({
    equipement_id: '', type: 'preventive', statut: 'planifie',
    date_prevue: '', notes: ''
  })
  const supabase = createClient()

  const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface)' }
  const labelStyle = { display: 'block', fontSize: '11px', fontWeight: '500' as const, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase' as const, letterSpacing: '0.4px' }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('role, etablissement_id').eq('id', user.id).single()
      setRole(prof?.role || 'client')
      setEtablissementId(prof?.etablissement_id || null)
    }
    init()
  }, [])

  useEffect(() => { if (role) load() }, [role])

  async function load() {
    if (role === 'client' && etablissementId) {
      const { data: equipsEtab } = await supabase.from('equipements').select('id').eq('etablissement_id', etablissementId)
      const equipIds = (equipsEtab || []).map(e => e.id)
      if (equipIds.length === 0) { setMaintenances([]); setEquipements([]); setLoading(false); return }
      const { data: m } = await supabase
        .from('maintenances')
        .select('*, equipements(reference, designation, localisation, date_revision, etablissement_id, etablissements(nom))')
        .in('equipement_id', equipIds)
        .order('date_prevue', { ascending: true })
      setMaintenances(m || []); setEquipements([]); setLoading(false)
    } else {
      const { data: m } = await supabase
        .from('maintenances')
        .select('*, equipements(reference, designation, localisation, date_revision, etablissement_id, etablissements(nom))')
        .order('date_prevue', { ascending: true })
      const { data: e } = await supabase.from('equipements').select('id, reference, designation, date_revision').order('designation')
      setMaintenances(m || []); setEquipements(e || []); setLoading(false)
    }
  }

  async function handleAdd() {
    if (!form.equipement_id) return
    setSaving(true); setFormError('')
    if (form.date_prevue) {
      const { data: livraison } = await supabase.from('livraisons').select('date_prevue')
        .eq('equipement_id', form.equipement_id).order('date_prevue', { ascending: true }).limit(1).maybeSingle()
      if (livraison?.date_prevue && new Date(form.date_prevue) < new Date(livraison.date_prevue)) {
        setFormError(`La date de maintenance ne peut pas etre anterieure a la date de livraison (${new Date(livraison.date_prevue).toLocaleDateString('fr-FR')})`)
        setSaving(false); return
      }
    }
    const payload: any = { equipement_id: form.equipement_id, type: form.type, statut: form.statut, notes: form.notes || null }
    if (form.date_prevue) payload.date_prevue = form.date_prevue
    await supabase.from('maintenances').insert([payload])
    setShowModal(false)
    setForm({ equipement_id: '', type: 'preventive', statut: 'planifie', date_prevue: '', notes: '' })
    setFormError(''); setSearchEquip(''); setSaving(false); load()
  }

  async function updateStatut(id: string, statut: string) {
    await supabase.from('maintenances').update({ statut }).eq('id', id)
    load()
  }

  function openFicheModal(m: any) {
    setSelectedMaintenance(m)
    setFicheData({ technicien: '', entreprise: '', resultat: '', statut_materiel: '' })
    setShowFicheModal(true)
  }

  const statutStyle = (s: string) => {
    if (s === 'planifie') return { color: 'var(--accent)', bg: 'var(--accent-light)', label: 'Planifie', icon: 'ti-calendar' }
    if (s === 'en_cours') return { color: 'var(--warning)', bg: 'var(--warning-light)', label: 'En cours', icon: 'ti-tool' }
    return { color: 'var(--success)', bg: 'var(--success-light)', label: 'Termine', icon: 'ti-check' }
  }

  const filtered = maintenances.filter(m => filterStatut === 'tous' || m.statut === filterStatut)
  const equipFiltered = equipements.filter(e =>
    `${e.reference || ''} ${e.designation}`.toLowerCase().includes(searchEquip.toLowerCase())
  )

  const filterBtn = (label: string, active: boolean, onClick: () => void) => (
    <button onClick={onClick} style={{ padding: '5px 12px', borderRadius: '20px', border: active ? '1px solid var(--accent)' : '1px solid var(--border)', background: active ? 'var(--accent-light)' : 'transparent', color: active ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '12px', fontWeight: active ? '500' : '400', cursor: 'pointer', fontFamily: 'var(--font)' }}>
      {label}
    </button>
  )

  const CheckBtn = ({ value, current, onChange, label }: { value: string; current: string; onChange: (v: string) => void; label: string }) => (
    <button onClick={() => onChange(value)}
      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: current === value ? 'var(--accent-light)' : 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', border: `1px solid ${current === value ? 'var(--accent)' : 'var(--border)'}`, cursor: 'pointer', fontFamily: 'var(--font)', width: '100%', marginBottom: '6px' }}>
      <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: `2px solid ${current === value ? 'var(--accent)' : 'var(--border)'}`, background: current === value ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {current === value && <i className="ti ti-check" style={{ fontSize: '10px', color: 'white' }} />}
      </div>
      <span style={{ fontSize: '13px', color: current === value ? 'var(--accent)' : 'var(--text-primary)', fontWeight: current === value ? '500' : '400' }}>{label}</span>
    </button>
  )

  if (loading || role === null) return <div style={{ padding: '28px', color: 'var(--text-tertiary)', fontSize: '13px', fontFamily: 'var(--font)' }}>Chargement...</div>

  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)' }}>

      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{filtered.length} intervention{filtered.length > 1 ? 's' : ''}</div>
        {role === 'admin' && (
          <button onClick={() => { setShowModal(true); setFormError(''); setSearchEquip('') }}
            style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 4px rgba(26,86,219,0.3)' }}>
            <i className="ti ti-plus" style={{ fontSize: '14px' }} aria-hidden="true" />Planifier une intervention
          </button>
        )}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {filterBtn('Toutes', filterStatut === 'tous', () => setFilterStatut('tous'))}
        {filterBtn('Planifie', filterStatut === 'planifie', () => setFilterStatut('planifie'))}
        {filterBtn('En cours', filterStatut === 'en_cours', () => setFilterStatut('en_cours'))}
        {filterBtn('Termine', filterStatut === 'termine', () => setFilterStatut('termine'))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '48px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <i className="ti ti-calendar" style={{ fontSize: '24px', color: 'var(--accent)' }} aria-hidden="true" />
          </div>
          <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '4px' }}>Aucune intervention</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
            {role === 'client' ? 'Aucune intervention planifiee pour votre etablissement' : 'Planifiez votre premiere intervention de maintenance'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(m => {
            const st = statutStyle(m.statut)
            const isTermine = m.statut === 'termine'
            const rev = revisionStatus((m.equipements as any)?.date_revision)
            return (
              <div key={m.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: '14px', boxShadow: 'var(--shadow-sm)', opacity: isTermine ? 0.7 : 1, borderLeft: `3px solid ${st.color}` }}>
                <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: st.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`ti ${st.icon}`} style={{ fontSize: '20px', color: st.color }} aria-hidden="true" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {(m.equipements as any)?.designation}
                        <span style={{ fontSize: '12px', fontWeight: '400', color: 'var(--text-tertiary)', marginLeft: '8px' }}>{(m.equipements as any)?.reference}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <i className="ti ti-building-hospital" style={{ fontSize: '13px' }} aria-hidden="true" />
                          {(m.equipements as any)?.etablissements?.nom || '-'}
                        </span>
                        {m.date_prevue && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <i className="ti ti-calendar" style={{ fontSize: '13px' }} aria-hidden="true" />
                            {new Date(m.date_prevue).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            {' a '}
                            {new Date(m.date_prevue).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
                      <span style={{ background: m.type === 'preventive' ? 'var(--accent-light)' : 'var(--warning-light)', color: m.type === 'preventive' ? 'var(--accent)' : 'var(--warning)', padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>
                        {m.type === 'preventive' ? 'Preventive' : 'Curative'}
                      </span>
                      <span style={{ background: st.bg, color: st.color, padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>{st.label}</span>
                    </div>
                  </div>

                  {rev && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 12px', background: rev.bg, borderRadius: 'var(--radius-sm)', border: `1px solid ${rev.color}22`, marginBottom: '10px', width: 'fit-content' }}>
                      <i className={`ti ${rev.icon}`} style={{ fontSize: '13px', color: rev.color }} aria-hidden="true" />
                      <span style={{ fontSize: '11px', fontWeight: '500', color: rev.color }}>{rev.label}</span>
                    </div>
                  )}

                  {m.notes && (
                    <div style={{ padding: '10px 14px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', fontStyle: 'italic' }}>
                      "{m.notes}"
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {role === 'admin' && !isTermine && m.statut === 'planifie' && (
                      <button onClick={() => updateStatut(m.id, 'en_cours')}
                        style={{ padding: '6px 14px', background: 'var(--warning-light)', border: '1px solid rgba(158,94,0,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--warning)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <i className="ti ti-player-play" style={{ fontSize: '13px' }} aria-hidden="true" />Demarrer
                      </button>
                    )}
                    {role === 'admin' && !isTermine && m.statut === 'en_cours' && (
                      <button onClick={() => updateStatut(m.id, 'termine')}
                        style={{ padding: '6px 14px', background: 'var(--success-light)', border: '1px solid rgba(10,124,78,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--success)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <i className="ti ti-check" style={{ fontSize: '13px' }} aria-hidden="true" />Terminer
                      </button>
                    )}
                    <button onClick={() => openFicheModal(m)}
                      style={{ padding: '6px 14px', background: 'var(--accent-light)', border: '1px solid rgba(26,86,219,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--accent)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <i className="ti ti-file-type-pdf" style={{ fontSize: '13px' }} aria-hidden="true" />Fiche PDF
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL REMPLIR FICHE AVANT PDF */}
      {showFicheModal && selectedMaintenance && (
        <div onMouseDown={e => { if (e.target === e.currentTarget) setShowFicheModal(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.12)', border: '1px solid var(--border)' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10 }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>Remplir la fiche intervention</div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{(selectedMaintenance.equipements as any)?.designation}</div>
              </div>
              <button onClick={() => setShowFicheModal(false)}
                style={{ width: '30px', height: '30px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-hover)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                <i className="ti ti-x" style={{ fontSize: '14px' }} aria-hidden="true" />
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

              <div>
                <label style={labelStyle}>Intervenant / Technicien</label>
                <input value={ficheData.technicien} onChange={e => setFicheData(p => ({ ...p, technicien: e.target.value }))}
                  placeholder="Nom du technicien..." style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Entreprise / PSDM</label>
                <input value={ficheData.entreprise} onChange={e => setFicheData(p => ({ ...p, entreprise: e.target.value }))}
                  placeholder="Nom de l entreprise..." style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Resultat de l intervention</label>
                <CheckBtn value="Resolu" current={ficheData.resultat} onChange={v => setFicheData(p => ({ ...p, resultat: v }))} label="Resolu" />
                <CheckBtn value="Partiellement resolu" current={ficheData.resultat} onChange={v => setFicheData(p => ({ ...p, resultat: v }))} label="Partiellement resolu" />
                <CheckBtn value="A revoir" current={ficheData.resultat} onChange={v => setFicheData(p => ({ ...p, resultat: v }))} label="A revoir" />
                <CheckBtn value="Materiel immobilise" current={ficheData.resultat} onChange={v => setFicheData(p => ({ ...p, resultat: v }))} label="Materiel immobilise" />
              </div>

              <div>
                <label style={labelStyle}>Statut materiel apres intervention</label>
                <CheckBtn value="En service" current={ficheData.statut_materiel} onChange={v => setFicheData(p => ({ ...p, statut_materiel: v }))} label="En service" />
                <CheckBtn value="En maintenance" current={ficheData.statut_materiel} onChange={v => setFicheData(p => ({ ...p, statut_materiel: v }))} label="En maintenance" />
                <CheckBtn value="Hors service" current={ficheData.statut_materiel} onChange={v => setFicheData(p => ({ ...p, statut_materiel: v }))} label="Hors service" />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button onClick={() => setShowFicheModal(false)}
                  style={{ flex: 1, padding: '11px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  Annuler
                </button>
                <button onClick={() => { setShowFicheModal(false); generateFicheInterventionPDF(selectedMaintenance, ficheData) }}
                  style={{ flex: 1, padding: '11px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: '0 1px 4px rgba(26,86,219,0.3)' }}>
                  <i className="ti ti-file-type-pdf" style={{ fontSize: '14px' }} aria-hidden="true" />
                  Generer le PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PLANIFIER */}
      {showModal && role === 'admin' && (
        <div onMouseDown={e => { if (e.target === e.currentTarget) { setShowModal(false); setFormError(''); setSearchEquip('') } }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '480px', boxShadow: '0 24px 64px rgba(0,0,0,0.12)', border: '1px solid var(--border)' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>Planifier une intervention</div>
              <button onClick={() => { setShowModal(false); setFormError(''); setSearchEquip('') }}
                style={{ width: '30px', height: '30px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-hover)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                <i className="ti ti-x" style={{ fontSize: '14px' }} aria-hidden="true" />
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>Equipement *</label>
                <div style={{ position: 'relative', marginBottom: '6px' }}>
                  <i className="ti ti-search" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'var(--text-tertiary)' }} aria-hidden="true" />
                  <input type='text' placeholder='Rechercher un equipement...' value={searchEquip}
                    onChange={e => setSearchEquip(e.target.value)} style={{ ...inputStyle, paddingLeft: '32px' }} />
                </div>
                <select value={form.equipement_id} onChange={e => {
                  const eq = equipements.find(eq => eq.id === e.target.value)
                  setForm(p => ({ ...p, equipement_id: e.target.value, date_prevue: eq?.date_revision ? `${eq.date_revision}T09:00` : p.date_prevue }))
                }} style={{ ...inputStyle, height: '110px' }} size={4}>
                  <option value=''>-- Selectionner --</option>
                  {equipFiltered.map(e => (
                    <option key={e.id} value={e.id}>
                      {e.reference ? `${e.reference} - ` : ''}{e.designation}{e.date_revision ? ` (revision: ${e.date_revision})` : ''}
                    </option>
                  ))}
                </select>
                {form.equipement_id && (
                  <div style={{ fontSize: '11px', color: 'var(--success)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <i className="ti ti-check" style={{ fontSize: '12px' }} aria-hidden="true" />
                    {equipements.find(e => e.id === form.equipement_id)?.designation} selectionne
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Type</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={inputStyle}>
                    <option value='preventive'>Preventive</option>
                    <option value='curative'>Curative</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Statut</label>
                  <select value={form.statut} onChange={e => setForm(p => ({ ...p, statut: e.target.value }))} style={inputStyle}>
                    <option value='planifie'>Planifie</option>
                    <option value='en_cours'>En cours</option>
                    <option value='termine'>Termine</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Date et heure prevue</label>
                <input type='datetime-local' value={form.date_prevue} onChange={e => setForm(p => ({ ...p, date_prevue: e.target.value }))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea rows={3} placeholder='Instructions ou observations...' value={form.notes}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} style={{ ...inputStyle, resize: 'none' }} />
              </div>
              {formError && (
                <div style={{ padding: '10px 14px', background: 'var(--danger-light)', border: '1px solid rgba(194,54,42,0.2)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--danger)' }}>
                  {formError}
                </div>
              )}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => { setShowModal(false); setFormError(''); setSearchEquip('') }}
                  style={{ flex: 1, padding: '11px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>Annuler</button>
                <button onClick={handleAdd} disabled={saving || !form.equipement_id}
                  style={{ flex: 1, padding: '11px', background: saving || !form.equipement_id ? 'rgba(26,86,219,0.4)' : 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: saving || !form.equipement_id ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', boxShadow: '0 1px 4px rgba(26,86,219,0.3)' }}>
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