'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import MaterielClientPage from './client-page'
import SearchableSelect from '@/components/SearchableSelect'
import { exportToCSV, parseCSV } from '@/lib/csv'

type Equipement = {
  id: string; reference: string; designation: string; categorie: string
  fabricant: string; modele: string; numero_serie: string
  mode_dispo: string; statut: string; localisation: string
  date_achat: string; date_mes: string; date_revision: string
  etablissement_id: string
}

const statutStyle = (s: string) => {
  if (s === 'en_service') return { color: 'var(--success)', bg: 'var(--success-light)', label: 'En service' }
  if (s === 'maintenance') return { color: 'var(--warning)', bg: 'var(--warning-light)', label: 'Maintenance' }
  return { color: 'var(--danger)', bg: 'var(--danger-light)', label: 'Hors service' }
}

const modeLabel = (m: string) => {
  if (m === 'location') return 'Location'
  if (m === 'achat') return 'Achat'
  return 'MAD'
}

export default function MaterielPage() {
  const [role, setRole] = useState<string | null>(null)
  const [etablissementId, setEtablissementId] = useState<string | null>(null)
  const [equipements, setEquipements] = useState<Equipement[]>([])
  const [filtered, setFiltered] = useState<Equipement[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [categoriesFull, setCategoriesFull] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('tous')
  const [filterMode, setFilterMode] = useState('tous')
  const [filterClient, setFilterClient] = useState('')
  const [filterMois, setFilterMois] = useState('')
  const [selected, setSelected] = useState<Equipement | null>(null)
  const [loading, setLoading] = useState(true)
  const [pannDesc, setPannDesc] = useState('')
  const [panneSaving, setPanneSaving] = useState(false)
  const [panneSuccess, setPanneSuccess] = useState(false)
  const [documents, setDocuments] = useState<any[]>([])
  const [uploadLoading, setUploadLoading] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCatModal, setShowCatModal] = useState(false)
  const [addSaving, setAddSaving] = useState(false)
  const [newCat, setNewCat] = useState('')
  const [catSaving, setCatSaving] = useState(false)
  const [catDeleting, setCatDeleting] = useState<string | null>(null)
  const [etablissements, setEtablissements] = useState<any[]>([])
  const [roleLoaded, setRoleLoaded] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; errors: number } | null>(null)
  const [addForm, setAddForm] = useState({
    reference: '', designation: '', categorie: '', fabricant: '',
    modele: '', numero_serie: '', mode_dispo: 'location',
    statut: 'en_service', localisation: '', date_achat: '',
    date_mes: '', date_revision: '', etablissement_id: ''
  })
  const supabase = createClient()

  const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface)', transition: 'border-color 0.15s' }
  const labelStyle = { display: 'block', fontSize: '11px', fontWeight: '500' as const, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase' as const, letterSpacing: '0.4px' }

  useEffect(() => {
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('role, etablissement_id').eq('id', user.id).single()
      setRole(prof?.role || 'client')
      setEtablissementId(prof?.etablissement_id || null)
      setRoleLoaded(true)
    }
    checkRole()
  }, [])

  async function loadCategories() {
    const { data } = await supabase.from('categories_materiel').select('*').order('nom')
    setCategoriesFull(data || [])
    setCategories((data || []).map((c: any) => c.nom))
  }

  async function load() {
    const { data } = await supabase.from('equipements').select('*').order('created_at')
    const { data: etabs } = await supabase.from('etablissements').select('id, nom').order('nom')
    const { data: cats } = await supabase.from('categories_materiel').select('*').order('nom')
    setEquipements(data || [])
    setFiltered(data || [])
    setEtablissements(etabs || [])
    setCategoriesFull(cats || [])
    setCategories((cats || []).map((c: any) => c.nom))
    if (etabs && etabs.length > 0 && !addForm.etablissement_id) {
      setAddForm(p => ({ ...p, etablissement_id: etabs[0].id }))
    }
    setLoading(false)
  }

  useEffect(() => {
    if (roleLoaded && role === 'admin') load()
  }, [roleLoaded, role])

  useEffect(() => {
    let r = equipements
    if (search) r = r.filter(e => `${e.reference} ${e.designation} ${e.fabricant} ${e.modele} ${e.localisation}`.toLowerCase().includes(search.toLowerCase()))
    if (filterStatut !== 'tous') r = r.filter(e => e.statut === filterStatut)
    if (filterMode !== 'tous') r = r.filter(e => e.mode_dispo === filterMode)
    if (filterClient) r = r.filter(e => e.etablissement_id === filterClient)
    if (filterMois) r = r.filter(e => e.date_mes && e.date_mes.startsWith(filterMois))
    setFiltered(r)
  }, [search, filterStatut, filterMode, filterClient, filterMois, equipements])

  async function loadDocs(equipId: string) {
    const { data } = await supabase.from('documents').select('*').eq('equipement_id', equipId)
    setDocuments(data || [])
  }

  async function openFiche(eq: Equipement) {
    setSelected(eq)
    setPannDesc('')
    setPanneSuccess(false)
    loadDocs(eq.id)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || !selected) return
    const file = e.target.files[0]
    setUploadLoading(true)
    const path = `${selected.id}/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('documents').upload(path, file)
    if (!error) {
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
      await supabase.from('documents').insert([{ equipement_id: selected.id, nom: file.name, type_doc: file.type, url: urlData.publicUrl }])
      loadDocs(selected.id)
    }
    setUploadLoading(false)
  }

  async function handleDeleteDoc(docId: string) {
    await supabase.from('documents').delete().eq('id', docId)
    loadDocs(selected!.id)
  }

  async function handleAddEquip() {
    if (!addForm.reference || !addForm.designation) return
    setAddSaving(true)
    await supabase.from('equipements').insert([addForm])
    setShowAddModal(false)
    setAddForm({
      reference: '', designation: '', categorie: '', fabricant: '',
      modele: '', numero_serie: '', mode_dispo: 'location',
      statut: 'en_service', localisation: '', date_achat: '',
      date_mes: '', date_revision: '', etablissement_id: etablissements[0]?.id || ''
    })
    setAddSaving(false)
    load()
  }

  async function handleAddCat() {
    if (!newCat.trim()) return
    setCatSaving(true)
    await supabase.from('categories_materiel').insert([{ nom: newCat.trim() }])
    setNewCat('')
    setCatSaving(false)
    loadCategories()
  }

  async function handleDeleteCat(id: string) {
    setCatDeleting(id)
    await supabase.from('categories_materiel').delete().eq('id', id)
    setCatDeleting(null)
    loadCategories()
  }

  function handleExport() {
    const data = equipements.map(e => ({
      reference: e.reference, designation: e.designation,
      categorie: e.categorie || '', fabricant: e.fabricant || '',
      modele: e.modele || '', numero_serie: e.numero_serie || '',
      mode_dispo: e.mode_dispo || '', statut: e.statut || '',
      localisation: e.localisation || '', date_achat: e.date_achat || '',
      date_mes: e.date_mes || '', date_revision: e.date_revision || '',
      etablissement_id: e.etablissement_id || ''
    }))
    exportToCSV(data, `meditrack_equipements_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return
    const file = e.target.files[0]
    setImportLoading(true)
    setImportResult(null)
    const text = await file.text()
    const rows = parseCSV(text)
    let success = 0; let errors = 0
    for (const row of rows) {
      if (!row.reference || !row.designation) { errors++; continue }
      const { error } = await supabase.from('equipements').upsert([{
        reference: row.reference, designation: row.designation,
        categorie: row.categorie || null, fabricant: row.fabricant || null,
        modele: row.modele || null, numero_serie: row.numero_serie || null,
        mode_dispo: row.mode_dispo || 'location', statut: row.statut || 'en_service',
        localisation: row.localisation || null, date_achat: row.date_achat || null,
        date_mes: row.date_mes || null, date_revision: row.date_revision || null,
        etablissement_id: row.etablissement_id || etablissements[0]?.id
      }], { onConflict: 'reference' })
      if (error) errors++; else success++
    }
    setImportResult({ success, errors })
    setImportLoading(false)
    load()
    e.target.value = ''
  }

  const filterBtn = (label: string, active: boolean, onClick: () => void) => (
    <button onClick={onClick} style={{ padding: '5px 12px', borderRadius: '20px', border: active ? '1px solid var(--accent)' : '1px solid var(--border)', background: active ? 'var(--accent-light)' : 'transparent', color: active ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '12px', fontWeight: active ? '500' : '400', cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.1s' }}>
      {label}
    </button>
  )

  const hasFilters = !!(search || filterStatut !== 'tous' || filterMode !== 'tous' || filterClient || filterMois)

  if (!roleLoaded) return <div style={{ padding: '32px', color: 'var(--text-tertiary)', fontSize: '13px', fontFamily: 'var(--font)' }}>Chargement...</div>
  if (role === 'client' && etablissementId) return <MaterielClientPage etablissementId={etablissementId} />
  if (loading) return <div style={{ padding: '32px', color: 'var(--text-tertiary)', fontSize: '13px', fontFamily: 'var(--font)' }}>Chargement...</div>

  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)' }}>

      {/* Header */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{filtered.length} équipement{filtered.length > 1 ? 's' : ''}</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {importResult && (
            <div style={{ fontSize: '12px', padding: '6px 12px', borderRadius: 'var(--radius-sm)', background: importResult.errors > 0 ? 'var(--warning-light)' : 'var(--success-light)', color: importResult.errors > 0 ? 'var(--warning)' : 'var(--success)', border: `1px solid ${importResult.errors > 0 ? 'rgba(158,94,0,0.2)' : 'rgba(10,124,78,0.2)'}` }}>
              ✓ {importResult.success} importés {importResult.errors > 0 ? `· ${importResult.errors} erreurs` : ''}
            </div>
          )}
          <button onClick={handleExport}
            style={{ padding: '8px 14px', background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-hover)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'}
          >
            <i className="ti ti-download" style={{ fontSize: '14px' }} aria-hidden="true" />
            Export CSV
          </button>
          <label style={{ padding: '8px 14px', background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="ti ti-upload" style={{ fontSize: '14px' }} aria-hidden="true" />
            {importLoading ? 'Import...' : 'Import CSV'}
            <input type='file' accept='.csv' style={{ display: 'none' }} onChange={handleImport} />
          </label>
          <button onClick={() => setShowCatModal(true)}
            style={{ padding: '8px 14px', background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-hover)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'}
          >
            <i className="ti ti-tags" style={{ fontSize: '14px' }} aria-hidden="true" />
            Catégories
          </button>
          <button onClick={() => setShowAddModal(true)}
            style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 4px rgba(26,86,219,0.3)' }}>
            <i className="ti ti-plus" style={{ fontSize: '14px' }} aria-hidden="true" />
            Ajouter
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: 'var(--text-tertiary)' }} aria-hidden="true" />
          <input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, width: '180px', paddingLeft: '32px' }} />
        </div>
        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
        <div style={{ display: 'flex', gap: '4px' }}>
          {filterBtn('Tous', filterStatut === 'tous', () => setFilterStatut('tous'))}
          {filterBtn('En service', filterStatut === 'en_service', () => setFilterStatut('en_service'))}
          {filterBtn('Maintenance', filterStatut === 'maintenance', () => setFilterStatut('maintenance'))}
          {filterBtn('Hors service', filterStatut === 'hors_service', () => setFilterStatut('hors_service'))}
        </div>
        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
        <div style={{ display: 'flex', gap: '4px' }}>
          {filterBtn('Tous', filterMode === 'tous', () => setFilterMode('tous'))}
          {filterBtn('Location', filterMode === 'location', () => setFilterMode('location'))}
          {filterBtn('Achat', filterMode === 'achat', () => setFilterMode('achat'))}
          {filterBtn('MAD', filterMode === 'mad', () => setFilterMode('mad'))}
        </div>
        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
        <div style={{ width: '180px' }}>
          <SearchableSelect
            options={etablissements.map(e => ({ value: e.id, label: e.nom }))}
            value={filterClient}
            onChange={setFilterClient}
            placeholder="Tous les clients"
          />
        </div>
        <input type="month" value={filterMois} onChange={e => setFilterMois(e.target.value)}
          style={{ ...inputStyle, width: 'auto' }} />
        {hasFilters && (
          <button onClick={() => { setSearch(''); setFilterStatut('tous'); setFilterMode('tous'); setFilterClient(''); setFilterMois('') }}
            style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-secondary)', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font)' }}>
            ✕ Réinitialiser
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-hover)' }}>
              {['Référence', 'Désignation', 'Catégorie', 'Fabricant', 'Client', 'Localisation', 'Mode', 'MES', 'Statut'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: 'var(--text-tertiary)', letterSpacing: '0.4px', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '48px', textAlign: 'center' }}>
                  <i className="ti ti-box-off" style={{ fontSize: '28px', display: 'block', marginBottom: '8px', color: 'var(--text-tertiary)', opacity: 0.4 }} aria-hidden="true" />
                  <div style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>Aucun équipement trouvé</div>
                </td>
              </tr>
            ) : filtered.map((eq, i) => {
              const st = statutStyle(eq.statut)
              const etab = etablissements.find(e => e.id === eq.etablissement_id)
              return (
                <tr key={eq.id} onClick={() => openFiche(eq)}
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--surface-hover)'}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                >
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--accent)', fontFamily: 'monospace' }}>{eq.reference}</span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{eq.designation}</td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>{eq.categorie || '—'}</td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>{eq.fabricant} {eq.modele}</td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>{etab?.nom || '—'}</td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>{eq.localisation || '—'}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)', padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '500', border: '1px solid var(--border)' }}>{modeLabel(eq.mode_dispo)}</span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{eq.date_mes || '—'}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: st.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', color: st.color, fontWeight: '500', whiteSpace: 'nowrap' }}>{st.label}</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* FICHE MODALE */}
      {selected && (
        <div onClick={() => { setSelected(null); setPannDesc(''); setPanneSuccess(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '560px', maxHeight: '88vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.12)', border: '1px solid var(--border)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="ti ti-device-heart-monitor" style={{ fontSize: '20px', color: 'var(--accent)' }} aria-hidden="true" />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>{selected.designation}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{selected.reference} · {etablissements.find(e => e.id === selected.etablissement_id)?.nom}</div>
                </div>
              </div>
              <button onClick={() => { setSelected(null); setPannDesc(''); setPanneSuccess(false) }}
                style={{ width: '30px', height: '30px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-hover)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0 }}>
                <i className="ti ti-x" style={{ fontSize: '14px' }} aria-hidden="true" />
              </button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ marginBottom: '20px' }}>
                {(() => { const st = statutStyle(selected.statut); return <span style={{ background: st.bg, color: st.color, padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' }}>{st.label}</span> })()}
              </div>
              {[
                { title: 'Identification', rows: [['Référence', selected.reference], ['Catégorie', selected.categorie || '—'], ['N° de série', selected.numero_serie || '—'], ['Fabricant', selected.fabricant || '—'], ['Modèle', selected.modele || '—']] },
                { title: 'Localisation & Contrat', rows: [['Localisation', selected.localisation || '—'], ['Mode', modeLabel(selected.mode_dispo)]] },
                { title: 'Dates', rows: [['Date achat', selected.date_achat || '—'], ['Mise en service', selected.date_mes || '—'], ['Prochaine révision', selected.date_revision || '—']] },
              ].map(section => (
                <div key={section.title} style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>{section.title}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {section.rows.map(([label, value]) => (
                      <div key={label} style={{ background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Documents */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Documents</div>
                  <label style={{ fontSize: '12px', color: 'var(--accent)', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <i className="ti ti-upload" style={{ fontSize: '13px' }} aria-hidden="true" />
                    {uploadLoading ? 'Upload...' : 'Ajouter'}
                    <input type='file' style={{ display: 'none' }} onChange={handleUpload} accept='.pdf,.jpg,.jpeg,.png,.doc,.docx' />
                  </label>
                </div>
                {documents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                    <i className="ti ti-folder-open" style={{ fontSize: '20px', display: 'block', marginBottom: '4px', opacity: 0.4 }} aria-hidden="true" />
                    Aucun document
                  </div>
                ) : documents.map(doc => (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: '6px' }}>
                    <i className={`ti ${doc.type_doc?.includes('pdf') ? 'ti-file-type-pdf' : 'ti-file-description'}`} style={{ fontSize: '16px', color: doc.type_doc?.includes('pdf') ? 'var(--danger)' : 'var(--accent)', flexShrink: 0 }} aria-hidden="true" />
                    <a href={doc.url} target='_blank' rel='noreferrer' style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: '500', flex: 1, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nom}</a>
                    <a href={doc.url} target='_blank' rel='noreferrer' style={{ color: 'var(--text-tertiary)', display: 'flex' }}>
                      <i className="ti ti-external-link" style={{ fontSize: '13px' }} aria-hidden="true" />
                    </a>
                    <button onClick={() => handleDeleteDoc(doc.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-tertiary)', display: 'flex' }}
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)'}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)'}
                    >
                      <i className="ti ti-trash" style={{ fontSize: '14px' }} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Panne */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>Signaler une panne</div>
                {panneSuccess ? (
                  <div style={{ padding: '14px', background: 'var(--success-light)', border: '1px solid rgba(10,124,78,0.2)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="ti ti-check" style={{ fontSize: '16px', color: 'var(--success)' }} aria-hidden="true" />
                    <div style={{ fontSize: '13px', color: 'var(--success)', fontWeight: '500' }}>Panne signalée avec succès</div>
                  </div>
                ) : (
                  <>
                    <textarea value={pannDesc} onChange={e => setPannDesc(e.target.value)} rows={3}
                      placeholder="Décrivez le problème observé..."
                      style={{ ...inputStyle, resize: 'none', marginBottom: '10px' }} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={async () => {
                        if (!pannDesc) return
                        setPanneSaving(true)
                        await supabase.from('pannes').insert([{ equipement_id: selected.id, description: pannDesc, statut: 'ouvert' }])
                        await supabase.from('equipements').update({ statut: 'hors_service' }).eq('id', selected.id)
                        setPanneSaving(false); setPanneSuccess(true); load()
                        setTimeout(() => { setSelected(null); setPanneSuccess(false); setPannDesc('') }, 2000)
                      }} disabled={panneSaving || !pannDesc}
                        style={{ flex: 1, padding: '10px', background: panneSaving || !pannDesc ? 'var(--surface-hover)' : 'var(--danger-light)', border: `1px solid ${panneSaving || !pannDesc ? 'var(--border)' : 'rgba(194,54,42,0.3)'}`, borderRadius: 'var(--radius-md)', color: panneSaving || !pannDesc ? 'var(--text-tertiary)' : 'var(--danger)', fontSize: '13px', fontWeight: '500', cursor: panneSaving || !pannDesc ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>
                        {panneSaving ? 'Envoi...' : '🚨 Signaler la panne'}
                      </button>
                      <button onClick={() => { setSelected(null); setPannDesc(''); setPanneSuccess(false) }}
                        style={{ flex: 1, padding: '10px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                        Fermer
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AJOUT */}
      {showAddModal && (
        <div onClick={() => setShowAddModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '560px', maxHeight: '88vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.12)', border: '1px solid var(--border)' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--surface)' }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Ajouter un équipement</div>
              <button onClick={() => setShowAddModal(false)}
                style={{ width: '30px', height: '30px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-hover)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                <i className="ti ti-x" style={{ fontSize: '14px' }} aria-hidden="true" />
              </button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                {[
                  { label: 'Référence *', key: 'reference', placeholder: 'LIT-2024-004' },
                  { label: 'Désignation *', key: 'designation', placeholder: 'Lit médicalisé' },
                  { label: 'Fabricant', key: 'fabricant', placeholder: 'Invacare' },
                  { label: 'Modèle', key: 'modele', placeholder: 'Sonata Electric' },
                  { label: 'N° de série', key: 'numero_serie', placeholder: 'SN-XXX-2024' },
                  { label: 'Localisation', key: 'localisation', placeholder: 'Chambre 12' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={labelStyle}>{f.label}</label>
                    <input value={(addForm as any)[f.key]} onChange={e => setAddForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder} style={inputStyle} />
                  </div>
                ))}
                <div>
                  <label style={labelStyle}>Catégorie</label>
                  <select value={addForm.categorie} onChange={e => setAddForm(p => ({ ...p, categorie: e.target.value }))} style={inputStyle}>
                    <option value=''>Sélectionner...</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Mode</label>
                  <select value={addForm.mode_dispo} onChange={e => setAddForm(p => ({ ...p, mode_dispo: e.target.value }))} style={inputStyle}>
                    <option value='location'>Location</option>
                    <option value='achat'>Achat</option>
                    <option value='mad'>Mise à disposition</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Statut</label>
                  <select value={addForm.statut} onChange={e => setAddForm(p => ({ ...p, statut: e.target.value }))} style={inputStyle}>
                    <option value='en_service'>En service</option>
                    <option value='maintenance'>Maintenance</option>
                    <option value='hors_service'>Hors service</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Établissement</label>
                  <SearchableSelect
                    options={etablissements.map(e => ({ value: e.id, label: e.nom }))}
                    value={addForm.etablissement_id}
                    onChange={v => setAddForm(p => ({ ...p, etablissement_id: v }))}
                    placeholder="Sélectionner un établissement..."
                  />
                </div>
                <div>
                  <label style={labelStyle}>Date d'achat</label>
                  <input type='date' value={addForm.date_achat} onChange={e => setAddForm(p => ({ ...p, date_achat: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Mise en service</label>
                  <input type='date' value={addForm.date_mes} onChange={e => setAddForm(p => ({ ...p, date_mes: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Prochaine révision</label>
                  <input type='date' value={addForm.date_revision} onChange={e => setAddForm(p => ({ ...p, date_revision: e.target.value }))} style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button onClick={() => setShowAddModal(false)}
                  style={{ flex: 1, padding: '11px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  Annuler
                </button>
                <button onClick={handleAddEquip} disabled={addSaving || !addForm.reference || !addForm.designation}
                  style={{ flex: 1, padding: '11px', background: addSaving || !addForm.reference || !addForm.designation ? 'rgba(26,86,219,0.4)' : 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: addSaving || !addForm.reference || !addForm.designation ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', boxShadow: '0 1px 4px rgba(26,86,219,0.3)' }}>
                  {addSaving ? 'Enregistrement...' : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CATEGORIES */}
      {showCatModal && (
        <div onClick={() => setShowCatModal(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '420px', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.12)', border: '1px solid var(--border)' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--surface)' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Catégories</div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{categoriesFull.length} catégorie{categoriesFull.length > 1 ? 's' : ''}</div>
              </div>
              <button onClick={() => setShowCatModal(false)}
                style={{ width: '30px', height: '30px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-hover)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                <i className="ti ti-x" style={{ fontSize: '14px' }} aria-hidden="true" />
              </button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input value={newCat} onChange={e => setNewCat(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddCat()}
                  placeholder="Nouvelle catégorie..."
                  style={{ ...inputStyle, flex: 1 }} />
                <button onClick={handleAddCat} disabled={catSaving || !newCat.trim()}
                  style={{ padding: '9px 16px', background: catSaving || !newCat.trim() ? 'rgba(26,86,219,0.4)' : 'var(--accent)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff', fontSize: '12px', fontWeight: '500', cursor: catSaving || !newCat.trim() ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>
                  {catSaving ? '...' : '+ Ajouter'}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {categoriesFull.map(cat => (
                  <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', opacity: 0.5, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{cat.nom}</span>
                    <button onClick={() => handleDeleteCat(cat.id)} disabled={catDeleting === cat.id}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-tertiary)', display: 'flex' }}
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)'}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)'}
                    >
                      <i className="ti ti-trash" style={{ fontSize: '15px' }} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}