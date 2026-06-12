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
  if (s === 'en_service') return { bg: '#F0FDF4', color: '#059669', label: 'En service' }
  if (s === 'maintenance') return { bg: '#FFFBEB', color: '#B45309', label: 'Maintenance' }
  return { bg: '#FEF2F2', color: '#DC2626', label: 'Hors service' }
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
  const [addSaving, setAddSaving] = useState(false)
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

  async function load() {
    const { data } = await supabase.from('equipements').select('*').order('created_at')
    const { data: etabs } = await supabase.from('etablissements').select('id, nom').order('nom')
    const { data: cats } = await supabase.from('categories_materiel').select('nom').order('nom')
    setEquipements(data || [])
    setFiltered(data || [])
    setEtablissements(etabs || [])
    setCategories(cats?.map(c => c.nom) || [])
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
    <button onClick={onClick} style={{ padding: '6px 12px', borderRadius: '6px', border: '0.5px solid', borderColor: active ? '#1A56DB' : '#E5E7EB', background: active ? '#EFF6FF' : '#fff', color: active ? '#1A56DB' : '#6B7280', fontSize: '12px', fontWeight: active ? '500' : '400', cursor: 'pointer', fontFamily: 'inherit' }}>
      {label}
    </button>
  )

  const hasFilters = !!(search || filterStatut !== 'tous' || filterMode !== 'tous' || filterClient || filterMois)

  if (!roleLoaded) return <div style={{ padding: '32px', color: '#6B7280', fontSize: '13px' }}>Chargement...</div>
  if (role === 'client' && etablissementId) return <MaterielClientPage etablissementId={etablissementId} />
  if (loading) return <div style={{ padding: '32px', color: '#6B7280', fontSize: '13px' }}>Chargement...</div>

  return (
    <div style={{ padding: '24px', fontFamily: 'Inter, -apple-system, sans-serif' }}>

      {/* Header */}
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ fontSize: '13px', color: '#6B7280' }}>{filtered.length} équipement{filtered.length > 1 ? 's' : ''}</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {importResult && (
            <div style={{ fontSize: '12px', padding: '6px 10px', borderRadius: '6px', background: importResult.errors > 0 ? '#FFFBEB' : '#F0FDF4', color: importResult.errors > 0 ? '#B45309' : '#059669', border: `0.5px solid ${importResult.errors > 0 ? '#FDE68A' : '#BBF7D0'}` }}>
              ✓ {importResult.success} importés {importResult.errors > 0 ? `· ${importResult.errors} erreurs` : ''}
            </div>
          )}
          <button onClick={handleExport}
            style={{ padding: '8px 14px', background: '#fff', color: '#374151', border: '0.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="ti ti-download" style={{ fontSize: '14px' }} aria-hidden="true" />
            Exporter CSV
          </button>
          <label style={{ padding: '8px 14px', background: '#fff', color: '#374151', border: '0.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="ti ti-upload" style={{ fontSize: '14px' }} aria-hidden="true" />
            {importLoading ? 'Import...' : 'Importer CSV'}
            <input type='file' accept='.csv' style={{ display: 'none' }} onChange={handleImport} />
          </label>
          <button onClick={() => setShowAddModal(true)}
            style={{ padding: '8px 14px', background: '#1A56DB', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="ti ti-plus" style={{ fontSize: '14px' }} aria-hidden="true" />
            Ajouter
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <input placeholder="🔍 Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '7px 10px', border: '0.5px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#111827', fontFamily: 'inherit', outline: 'none', width: '160px' }} />
        <div style={{ width: '1px', height: '20px', background: '#E5E7EB' }} />
        <div style={{ display: 'flex', gap: '4px' }}>
          {filterBtn('Tous', filterStatut === 'tous', () => setFilterStatut('tous'))}
          {filterBtn('En service', filterStatut === 'en_service', () => setFilterStatut('en_service'))}
          {filterBtn('Maintenance', filterStatut === 'maintenance', () => setFilterStatut('maintenance'))}
          {filterBtn('Hors service', filterStatut === 'hors_service', () => setFilterStatut('hors_service'))}
        </div>
        <div style={{ width: '1px', height: '20px', background: '#E5E7EB' }} />
        <div style={{ display: 'flex', gap: '4px' }}>
          {filterBtn('Tous modes', filterMode === 'tous', () => setFilterMode('tous'))}
          {filterBtn('Location', filterMode === 'location', () => setFilterMode('location'))}
          {filterBtn('Achat', filterMode === 'achat', () => setFilterMode('achat'))}
          {filterBtn('MAD', filterMode === 'mad', () => setFilterMode('mad'))}
        </div>
        <div style={{ width: '1px', height: '20px', background: '#E5E7EB' }} />
        <div style={{ width: '180px' }}>
          <SearchableSelect
            options={etablissements.map(e => ({ value: e.id, label: e.nom }))}
            value={filterClient}
            onChange={setFilterClient}
            placeholder="Tous les clients"
          />
        </div>
        <input type="month" value={filterMois} onChange={e => setFilterMois(e.target.value)}
          style={{ padding: '7px 10px', border: '0.5px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#111827', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }} />
        {hasFilters && (
          <button onClick={() => { setSearch(''); setFilterStatut('tous'); setFilterMode('tous'); setFilterClient(''); setFilterMois('') }}
            style={{ padding: '6px 10px', border: '0.5px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#6B7280', background: '#F9FAFB', cursor: 'pointer', fontFamily: 'inherit' }}>
            ✕ Réinitialiser
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F9FAFB' }}>
              {['Référence', 'Désignation', 'Catégorie', 'Fabricant / Modèle', 'N° Série', 'Client', 'Localisation', 'Mode', 'MES', 'Statut'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#9CA3AF', letterSpacing: '0.3px', textTransform: 'uppercase', borderBottom: '0.5px solid #E5E7EB', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: '32px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>Aucun équipement trouvé</td></tr>
            ) : filtered.map((eq, i) => {
              const st = statutStyle(eq.statut)
              const etab = etablissements.find(e => e.id === eq.etablissement_id)
              return (
                <tr key={eq.id} onClick={() => openFiche(eq)}
                  style={{ borderBottom: i < filtered.length - 1 ? '0.5px solid #F3F4F6' : 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#F9FAFB'}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                >
                  <td style={{ padding: '11px 12px', fontSize: '12px', fontWeight: '600', color: '#1A56DB', whiteSpace: 'nowrap' }}>{eq.reference}</td>
                  <td style={{ padding: '11px 12px', fontSize: '12px', color: '#111827' }}>{eq.designation}</td>
                  <td style={{ padding: '11px 12px', fontSize: '12px', color: '#6B7280' }}>{eq.categorie || '—'}</td>
                  <td style={{ padding: '11px 12px', fontSize: '12px', color: '#6B7280' }}>{eq.fabricant} {eq.modele}</td>
                  <td style={{ padding: '11px 12px', fontSize: '11px', color: '#6B7280', fontFamily: 'monospace' }}>{eq.numero_serie || '—'}</td>
                  <td style={{ padding: '11px 12px', fontSize: '12px', color: '#6B7280' }}>{etab?.nom || '—'}</td>
                  <td style={{ padding: '11px 12px', fontSize: '12px', color: '#6B7280' }}>{eq.localisation || '—'}</td>
                  <td style={{ padding: '11px 12px' }}>
                    <span style={{ background: '#F3F4F6', color: '#6B7280', padding: '2px 7px', borderRadius: '4px', fontSize: '11px', fontWeight: '500' }}>{modeLabel(eq.mode_dispo)}</span>
                  </td>
                  <td style={{ padding: '11px 12px', fontSize: '11px', color: '#6B7280', whiteSpace: 'nowrap' }}>{eq.date_mes || '—'}</td>
                  <td style={{ padding: '11px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
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
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '580px', maxHeight: '88vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ background: '#111827', padding: '18px 22px', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0 }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#fff' }}>{selected.designation}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{selected.reference} · {etablissements.find(e => e.id === selected.etablissement_id)?.nom}</div>
              </div>
              <button onClick={() => { setSelected(null); setPannDesc(''); setPanneSuccess(false) }}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '30px', height: '30px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>✕</button>
            </div>
            <div style={{ padding: '20px 22px' }}>
              {[
                { title: 'Identification', rows: [['Référence', selected.reference], ['Catégorie', selected.categorie || '—'], ['N° de série', selected.numero_serie || '—'], ['Fabricant', selected.fabricant || '—'], ['Modèle', selected.modele || '—']] },
                { title: 'Statut & Localisation', rows: [['Statut', statutStyle(selected.statut).label], ['Localisation', selected.localisation || '—'], ['Mode', modeLabel(selected.mode_dispo)]] },
                { title: 'Dates', rows: [['Date achat', selected.date_achat || '—'], ['Mise en service', selected.date_mes || '—'], ['Prochaine révision', selected.date_revision || '—']] },
              ].map(section => (
                <div key={section.title} style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px', paddingBottom: '6px', borderBottom: '0.5px solid #F3F4F6' }}>{section.title}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    {section.rows.map(([label, value]) => (
                      <div key={label}>
                        <div style={{ fontSize: '10px', color: '#9CA3AF', marginBottom: '2px' }}>{label}</div>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '10px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px', paddingBottom: '6px', borderBottom: '0.5px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Documents</span>
                  <label style={{ fontSize: '11px', color: '#1A56DB', cursor: 'pointer', fontWeight: '500', textTransform: 'none', letterSpacing: 0 }}>
                    {uploadLoading ? 'Upload...' : '+ Ajouter'}
                    <input type='file' style={{ display: 'none' }} onChange={handleUpload} accept='.pdf,.jpg,.jpeg,.png,.doc,.docx' />
                  </label>
                </div>
                {documents.length === 0 ? (
                  <div style={{ fontSize: '12px', color: '#9CA3AF', textAlign: 'center', padding: '12px' }}>Aucun document</div>
                ) : documents.map(doc => (
                  <a key={doc.id} href={doc.url} target='_blank' rel='noreferrer'
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#F9FAFB', borderRadius: '6px', border: '0.5px solid #E5E7EB', textDecoration: 'none', marginBottom: '6px' }}>
                    <i className="ti ti-file-description" style={{ fontSize: '14px', color: '#1A56DB' }} aria-hidden="true" />
                    <span style={{ fontSize: '12px', color: '#111827', fontWeight: '500', flex: 1 }}>{doc.nom}</span>
                    <i className="ti ti-external-link" style={{ fontSize: '12px', color: '#9CA3AF' }} aria-hidden="true" />
                  </a>
                ))}
              </div>

              <div>
                <div style={{ fontSize: '10px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px', paddingBottom: '6px', borderBottom: '0.5px solid #F3F4F6' }}>Signaler une panne</div>
                {panneSuccess ? (
                  <div style={{ padding: '12px', background: '#F0FDF4', border: '0.5px solid #BBF7D0', borderRadius: '8px', color: '#059669', fontSize: '13px', fontWeight: '500', textAlign: 'center' }}>✓ Panne signalée</div>
                ) : (
                  <>
                    <textarea value={pannDesc} onChange={e => setPannDesc(e.target.value)} rows={2} placeholder="Décrivez le problème..."
                      style={{ width: '100%', padding: '9px 12px', border: '0.5px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#111827', fontFamily: 'inherit', outline: 'none', resize: 'none', marginBottom: '8px' }} />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={async () => {
                        if (!pannDesc) return
                        setPanneSaving(true)
                        await supabase.from('pannes').insert([{ equipement_id: selected.id, description: pannDesc, statut: 'ouvert' }])
                        await supabase.from('equipements').update({ statut: 'hors_service' }).eq('id', selected.id)
                        setPanneSaving(false); setPanneSuccess(true); load()
                        setTimeout(() => { setSelected(null); setPanneSuccess(false); setPannDesc('') }, 2000)
                      }} disabled={panneSaving || !pannDesc}
                        style={{ flex: 1, padding: '9px', background: panneSaving || !pannDesc ? '#F9FAFB' : '#FEF2F2', border: '0.5px solid #FECACA', borderRadius: '6px', color: '#DC2626', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>
                        {panneSaving ? 'Envoi...' : '🚨 Signaler'}
                      </button>
                      <button onClick={() => { setSelected(null); setPannDesc(''); setPanneSuccess(false) }}
                        style={{ flex: 1, padding: '9px', background: '#F9FAFB', border: '0.5px solid #E5E7EB', borderRadius: '6px', color: '#6B7280', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>
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
        <div onClick={() => setShowAddModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '560px', maxHeight: '88vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '18px 22px', borderBottom: '0.5px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#fff' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>Ajouter un équipement</div>
              <button onClick={() => setShowAddModal(false)} style={{ background: '#F9FAFB', border: '0.5px solid #E5E7EB', color: '#6B7280', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '20px 22px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  { label: 'Référence *', key: 'reference', placeholder: 'LIT-2024-004' },
                  { label: 'Désignation *', key: 'designation', placeholder: 'Lit médicalisé' },
                  { label: 'Fabricant', key: 'fabricant', placeholder: 'Invacare' },
                  { label: 'Modèle', key: 'modele', placeholder: 'Sonata Electric' },
                  { label: 'N° de série', key: 'numero_serie', placeholder: 'SN-XXX-2024' },
                  { label: 'Localisation', key: 'localisation', placeholder: 'Chambre 12' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>{f.label}</label>
                    <input value={(addForm as any)[f.key]} onChange={e => setAddForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#111827', fontFamily: 'inherit', outline: 'none' }} />
                  </div>
                ))}
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Catégorie</label>
                  <select value={addForm.categorie} onChange={e => setAddForm(p => ({ ...p, categorie: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#111827', fontFamily: 'inherit', outline: 'none' }}>
                    <option value=''>Sélectionner...</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Mode</label>
                  <select value={addForm.mode_dispo} onChange={e => setAddForm(p => ({ ...p, mode_dispo: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#111827', fontFamily: 'inherit', outline: 'none' }}>
                    <option value='location'>Location</option>
                    <option value='achat'>Achat</option>
                    <option value='mad'>Mise à disposition</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Statut</label>
                  <select value={addForm.statut} onChange={e => setAddForm(p => ({ ...p, statut: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#111827', fontFamily: 'inherit', outline: 'none' }}>
                    <option value='en_service'>En service</option>
                    <option value='maintenance'>Maintenance</option>
                    <option value='hors_service'>Hors service</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Établissement</label>
                  <SearchableSelect
                    options={etablissements.map(e => ({ value: e.id, label: e.nom }))}
                    value={addForm.etablissement_id}
                    onChange={v => setAddForm(p => ({ ...p, etablissement_id: v }))}
                    placeholder="Sélectionner un établissement..."
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Date d'achat</label>
                  <input type='date' value={addForm.date_achat} onChange={e => setAddForm(p => ({ ...p, date_achat: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#111827', fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Mise en service</label>
                  <input type='date' value={addForm.date_mes} onChange={e => setAddForm(p => ({ ...p, date_mes: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#111827', fontFamily: 'inherit', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Prochaine révision</label>
                  <input type='date' value={addForm.date_revision} onChange={e => setAddForm(p => ({ ...p, date_revision: e.target.value }))}
                    style={{ width: '100%', padding: '8px 10px', border: '0.5px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#111827', fontFamily: 'inherit', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '10px', background: '#F9FAFB', border: '0.5px solid #E5E7EB', borderRadius: '8px', color: '#6B7280', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
                <button onClick={handleAddEquip} disabled={addSaving || !addForm.reference || !addForm.designation}
                  style={{ flex: 1, padding: '10px', background: addSaving || !addForm.reference || !addForm.designation ? '#93AEED' : '#1A56DB', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {addSaving ? 'Enregistrement...' : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}