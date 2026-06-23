'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import MaterielClientPage from './client-page'
import SearchableSelect from '@/components/SearchableSelect'
import { exportToCSV, parseCSV } from '@/lib/csv'

type Equipement = {
  id: string; reference: string; designation: string; categorie: string
  fabricant: string; modele: string; numero_serie: string; numero_lot: string
  mode_dispo: string; statut: string; localisation: string
  date_achat: string; date_mes: string; date_revision: string
  date_retrait: string; motif_retrait: string; service: string
  etage: string; responsable_referent: string; fin_garantie: string
  date_installation: string; fournisseur: string; commentaires: string
  etablissement_id: string
}

const statutStyle = (s: string) => {
  if (s === 'en_service') return { color: 'var(--success)', bg: 'var(--success-light)', label: 'En service' }
  if (s === 'maintenance') return { color: 'var(--warning)', bg: 'var(--warning-light)', label: 'Maintenance' }
  if (s === 'en_preparation') return { color: 'var(--accent)', bg: 'var(--accent-light)', label: 'En préparation' }
  return { color: 'var(--danger)', bg: 'var(--danger-light)', label: 'Hors service' }
}

const modeLabel = (m: string) => {
  if (m === 'location') return 'Location'
  if (m === 'achat') return 'Achat'
  return 'MAD'
}

function generateFicheEquipementPDF(eq: Equipement, etabNom: string, docs: any[], historique: any[]) {
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #1a1a1a; padding: 32px; font-size: 12px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 2px solid #1A56DB; }
    .logo { font-size: 20px; font-weight: 700; color: #1A56DB; }
    .subtitle { font-size: 11px; color: #999; margin-top: 2px; }
    .title { font-size: 15px; font-weight: 600; color: #1a1a1a; margin-bottom: 3px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 600; }
    .badge-service { background: #E8F5EE; color: #0A7C4E; }
    .badge-maintenance { background: #FEF3E2; color: #9E5E00; }
    .badge-hors { background: #FEF0EE; color: #C2362A; }
    .badge-prep { background: #EBF2FF; color: #1A56DB; }
    .section { margin-bottom: 16px; }
    .section-title { font-size: 10px; font-weight: 700; color: #1A56DB; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px solid #1A56DB; }
    .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
    .field { background: #f9f9f9; border-radius: 5px; padding: 8px 10px; }
    .field-label { font-size: 9px; color: #999; text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 2px; }
    .field-value { font-size: 12px; font-weight: 500; color: #1a1a1a; min-height: 16px; }
    .doc-item { padding: 5px 8px; background: #f9f9f9; border-radius: 4px; margin-bottom: 4px; font-size: 11px; }
    .hist-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: #f9f9f9; border-radius: 4px; margin-bottom: 4px; font-size: 11px; }
    .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; font-size: 10px; color: #999; display: flex; justify-content: space-between; }
    @media print { body { padding: 16px; } }
  </style></head><body>
    <div class="header">
      <div><div class="logo">MediTrack</div><div class="subtitle">Fiche équipement universelle</div></div>
      <div style="text-align:right;">
        <div class="title">${eq.designation}</div>
        <div class="subtitle">${eq.reference || '—'}</div>
        <div style="margin-top:5px;">
          <span class="badge ${eq.statut === 'en_service' ? 'badge-service' : eq.statut === 'maintenance' ? 'badge-maintenance' : eq.statut === 'en_preparation' ? 'badge-prep' : 'badge-hors'}">
            ${eq.statut === 'en_service' ? 'En service' : eq.statut === 'maintenance' ? 'En maintenance' : eq.statut === 'en_preparation' ? 'En préparation' : 'Hors service'}
          </span>
        </div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Bloc 1 — Identification</div>
      <div class="grid">
        <div class="field"><div class="field-label">Référence</div><div class="field-value">${eq.reference || '—'}</div></div>
        <div class="field"><div class="field-label">Désignation</div><div class="field-value">${eq.designation || '—'}</div></div>
        <div class="field"><div class="field-label">Catégorie</div><div class="field-value">${eq.categorie || '—'}</div></div>
        <div class="field"><div class="field-label">Fabricant</div><div class="field-value">${eq.fabricant || '—'}</div></div>
        <div class="field"><div class="field-label">Modèle</div><div class="field-value">${eq.modele || '—'}</div></div>
        <div class="field"><div class="field-label">N° de série</div><div class="field-value">${eq.numero_serie || '—'}</div></div>
        <div class="field"><div class="field-label">N° de lot</div><div class="field-value">${eq.numero_lot || '—'}</div></div>
        <div class="field"><div class="field-label">Date MES</div><div class="field-value">${eq.date_mes || '—'}</div></div>
        <div class="field"><div class="field-label">Fin de garantie</div><div class="field-value">${eq.fin_garantie || '—'}</div></div>
        ${eq.date_retrait ? `<div class="field"><div class="field-label">Date retrait</div><div class="field-value">${eq.date_retrait}</div></div>` : ''}
        ${eq.motif_retrait ? `<div class="field"><div class="field-label">Motif retrait</div><div class="field-value">${eq.motif_retrait}</div></div>` : ''}
      </div>
    </div>
    <div class="section">
      <div class="section-title">Bloc 2 — Localisation</div>
      <div class="grid">
        <div class="field"><div class="field-label">Établissement</div><div class="field-value">${etabNom || '—'}</div></div>
        <div class="field"><div class="field-label">Service</div><div class="field-value">${eq.service || '—'}</div></div>
        <div class="field"><div class="field-label">Étage</div><div class="field-value">${eq.etage || '—'}</div></div>
        <div class="field"><div class="field-label">Chambre / Zone</div><div class="field-value">${eq.localisation || '—'}</div></div>
        <div class="field"><div class="field-label">Responsable référent</div><div class="field-value">${eq.responsable_referent || '—'}</div></div>
        <div class="field"><div class="field-label">Date installation</div><div class="field-value">${eq.date_installation || '—'}</div></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Bloc 3 — Fournisseur / Contrat</div>
      <div class="grid">
        <div class="field"><div class="field-label">Fournisseur</div><div class="field-value">${eq.fournisseur || '—'}</div></div>
        <div class="field"><div class="field-label">Mode</div><div class="field-value">${eq.mode_dispo === 'location' ? 'Location' : eq.mode_dispo === 'achat' ? 'Achat' : 'MAD'}</div></div>
        <div class="field"><div class="field-label">Date livraison</div><div class="field-value">${eq.date_achat || '—'}</div></div>
        <div class="field"><div class="field-label">Prochaine révision</div><div class="field-value">${eq.date_revision || '—'}</div></div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">Bloc 4 — Documents associés</div>
      ${docs.length > 0 ? docs.map(d => `<div class="doc-item"><a href="${d.url}" target="_blank" style="color:#1A56DB;text-decoration:none;">📄 ${d.nom}</a></div>`).join('') : `<div style="color:#999;font-size:11px;padding:8px;">Aucun document associé</div>`}
    </div>
    <div class="section">
      <div class="section-title">Bloc 5 — Historique des déplacements</div>
      ${historique.length > 0 ? historique.map(h => `<div class="hist-item"><span style="color:#999;text-decoration:line-through;">${h.ancienne_localisation || '—'}</span><span style="color:#999;">→</span><span style="font-weight:500;">${h.nouvelle_localisation || '—'}</span><span style="margin-left:auto;color:#999;font-size:10px;">${new Date(h.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>`).join('') : `<div style="color:#999;font-size:11px;padding:8px;">Aucun déplacement enregistré</div>`}
    </div>
    <div class="section">
      <div class="section-title">Bloc 6 — Commentaires</div>
      <div style="min-height:60px;background:#f9f9f9;border-radius:5px;padding:10px;font-size:12px;color:#1a1a1a;">${eq.commentaires || '<span style="color:#ccc;">Aucun commentaire</span>'}</div>
    </div>
    <div class="footer">
      <span>MediTrack · Plateforme de gestion PSDM · www.meditrack-app.fr</span>
      <span>Généré le ${new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
    </div>
  </body></html>`
  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => { w.print() }, 500) }
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
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Equipement>>({})
  const [editSaving, setEditSaving] = useState(false)
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
  const [editingCommentaire, setEditingCommentaire] = useState(false)
  const [newCommentaire, setNewCommentaire] = useState('')
  const [commentaireSaving, setCommentaireSaving] = useState(false)
  const [addError, setAddError] = useState('')
  const [addForm, setAddForm] = useState({
    reference: '', designation: '', categorie: '', fabricant: '',
    modele: '', numero_serie: '', numero_lot: '', mode_dispo: 'location',
    statut: 'en_service', localisation: '', service: '', etage: '',
    responsable_referent: '', fournisseur: '', date_achat: '',
    date_mes: '', date_revision: '', fin_garantie: '',
    date_installation: '', date_retrait: '', motif_retrait: '',
    commentaires: '', etablissement_id: ''
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
    setEditingCommentaire(false)
    setNewCommentaire(eq.commentaires || '')
    loadDocs(eq.id)
  }

  function openEditModal(eq: Equipement) {
    setEditForm({ ...eq })
    setShowEditModal(true)
  }

  async function handleEdit() {
    if (!editForm.id || !editForm.designation) return
    setEditSaving(true)
    const payload = {
      designation: editForm.designation,
      reference: editForm.reference || null,
      categorie: editForm.categorie || null,
      fabricant: editForm.fabricant || null,
      modele: editForm.modele || null,
      numero_serie: editForm.numero_serie || null,
      numero_lot: editForm.numero_lot || null,
      mode_dispo: editForm.mode_dispo || 'location',
      statut: editForm.statut || 'en_service',
      localisation: editForm.localisation || null,
      service: editForm.service || null,
      etage: editForm.etage || null,
      responsable_referent: editForm.responsable_referent || null,
      fournisseur: editForm.fournisseur || null,
      date_achat: editForm.date_achat || null,
      date_mes: editForm.date_mes || null,
      date_revision: editForm.date_revision || null,
      fin_garantie: editForm.fin_garantie || null,
      date_installation: editForm.date_installation || null,
      date_retrait: editForm.date_retrait || null,
      motif_retrait: editForm.motif_retrait || null,
      commentaires: editForm.commentaires || null,
      etablissement_id: editForm.etablissement_id || null,
    }
    await supabase.from('equipements').update(payload).eq('id', editForm.id)
    setShowEditModal(false)
    setEditSaving(false)
    if (selected?.id === editForm.id) {
      setSelected({ ...selected, ...payload } as Equipement)
    }
    load()
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
    if (!addForm.designation) return
    setAddSaving(true)
    setAddError('')

    if (addForm.numero_serie) {
      const { data: existing } = await supabase.from('equipements').select('id, reference, designation').eq('numero_serie', addForm.numero_serie).maybeSingle()
      if (existing) {
        setAddError(`Ce numéro de série existe déjà — ${existing.reference} · ${existing.designation}`)
        setAddSaving(false)
        return
      }
    }

    if (addForm.reference) {
      const { data: existingRef } = await supabase.from('equipements').select('id, designation').eq('reference', addForm.reference).maybeSingle()
      if (existingRef) {
        setAddError(`Cette référence existe déjà — ${existingRef.designation}`)
        setAddSaving(false)
        return
      }
    }

    const payload = {
      designation: addForm.designation,
      reference: addForm.reference || null,
      categorie: addForm.categorie || null,
      fabricant: addForm.fabricant || null,
      modele: addForm.modele || null,
      numero_serie: addForm.numero_serie || null,
      numero_lot: addForm.numero_lot || null,
      mode_dispo: addForm.mode_dispo || 'location',
      statut: addForm.statut || 'en_service',
      localisation: addForm.localisation || null,
      service: addForm.service || null,
      etage: addForm.etage || null,
      responsable_referent: addForm.responsable_referent || null,
      fournisseur: addForm.fournisseur || null,
      date_achat: addForm.date_achat || null,
      date_mes: addForm.date_mes || null,
      date_revision: addForm.date_revision || null,
      fin_garantie: addForm.fin_garantie || null,
      date_installation: addForm.date_installation || null,
      date_retrait: addForm.date_retrait || null,
      motif_retrait: addForm.motif_retrait || null,
      commentaires: addForm.commentaires || null,
      etablissement_id: addForm.etablissement_id || null,
    }

    const { error } = await supabase.from('equipements').insert([payload])
    if (error) {
      setAddError(`Erreur : ${error.message}`)
      setAddSaving(false)
      return
    }

    setShowAddModal(false)
    setAddForm({
      reference: '', designation: '', categorie: '', fabricant: '',
      modele: '', numero_serie: '', numero_lot: '', mode_dispo: 'location',
      statut: 'en_service', localisation: '', service: '', etage: '',
      responsable_referent: '', fournisseur: '', date_achat: '',
      date_mes: '', date_revision: '', fin_garantie: '',
      date_installation: '', date_retrait: '', motif_retrait: '',
      commentaires: '', etablissement_id: ''
    })
    setAddError('')
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
      numero_lot: e.numero_lot || '', mode_dispo: e.mode_dispo || '',
      statut: e.statut || '', localisation: e.localisation || '',
      service: e.service || '', etage: e.etage || '',
      responsable_referent: e.responsable_referent || '',
      fournisseur: e.fournisseur || '', date_achat: e.date_achat || '',
      date_mes: e.date_mes || '', date_revision: e.date_revision || '',
      fin_garantie: e.fin_garantie || '', date_installation: e.date_installation || '',
      commentaires: e.commentaires || '', etablissement_id: e.etablissement_id || ''
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
      if (!row.designation) { errors++; continue }
      const { error } = await supabase.from('equipements').upsert([{
        reference: row.reference || null, designation: row.designation,
        categorie: row.categorie || null, fabricant: row.fabricant || null,
        modele: row.modele || null, numero_serie: row.numero_serie || null,
        numero_lot: row.numero_lot || null, mode_dispo: row.mode_dispo || 'location',
        statut: row.statut || 'en_service', localisation: row.localisation || null,
        service: row.service || null, etage: row.etage || null,
        responsable_referent: row.responsable_referent || null,
        fournisseur: row.fournisseur || null, date_achat: row.date_achat || null,
        date_mes: row.date_mes || null, date_revision: row.date_revision || null,
        fin_garantie: row.fin_garantie || null, date_installation: row.date_installation || null,
        commentaires: row.commentaires || null,
        etablissement_id: row.etablissement_id || null
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
  const statutOptions = [
    { value: 'en_service', label: 'En service' },
    { value: 'en_preparation', label: 'En préparation / Livraison planifiée' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'hors_service', label: 'Hors service' },
  ]

  if (!roleLoaded) return <div style={{ padding: '32px', color: 'var(--text-tertiary)', fontSize: '13px', fontFamily: 'var(--font)' }}>Chargement...</div>
  if (role === 'client' && etablissementId) return <MaterielClientPage etablissementId={etablissementId} />
  if (loading) return <div style={{ padding: '32px', color: 'var(--text-tertiary)', fontSize: '13px', fontFamily: 'var(--font)' }}>Chargement...</div>

  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)' }}>

      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{filtered.length} équipement{filtered.length > 1 ? 's' : ''}</div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {importResult && (
            <div style={{ fontSize: '12px', padding: '6px 12px', borderRadius: 'var(--radius-sm)', background: importResult.errors > 0 ? 'var(--warning-light)' : 'var(--success-light)', color: importResult.errors > 0 ? 'var(--warning)' : 'var(--success)', border: `1px solid ${importResult.errors > 0 ? 'rgba(158,94,0,0.2)' : 'rgba(10,124,78,0.2)'}` }}>
              ✓ {importResult.success} importés {importResult.errors > 0 ? `· ${importResult.errors} erreurs` : ''}
            </div>
          )}
          <button onClick={handleExport} style={{ padding: '8px 14px', background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-hover)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'}>
            <i className="ti ti-download" style={{ fontSize: '14px' }} aria-hidden="true" />Export CSV
          </button>
          <label style={{ padding: '8px 14px', background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="ti ti-upload" style={{ fontSize: '14px' }} aria-hidden="true" />
            {importLoading ? 'Import...' : 'Import CSV'}
            <input type='file' accept='.csv' style={{ display: 'none' }} onChange={handleImport} />
          </label>
          <button onClick={() => setShowCatModal(true)} style={{ padding: '8px 14px', background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-hover)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'}>
            <i className="ti ti-tags" style={{ fontSize: '14px' }} aria-hidden="true" />Catégories
          </button>
          <button onClick={() => { setShowAddModal(true); setAddError('') }} style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 1px 4px rgba(26,86,219,0.3)' }}>
            <i className="ti ti-plus" style={{ fontSize: '14px' }} aria-hidden="true" />Ajouter
          </button>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: 'var(--text-tertiary)' }} aria-hidden="true" />
          <input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, width: '180px', paddingLeft: '32px' }} />
        </div>
        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
        <div style={{ display: 'flex', gap: '4px' }}>
          {filterBtn('Tous', filterStatut === 'tous', () => setFilterStatut('tous'))}
          {filterBtn('En service', filterStatut === 'en_service', () => setFilterStatut('en_service'))}
          {filterBtn('En préparation', filterStatut === 'en_preparation', () => setFilterStatut('en_preparation'))}
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
          <SearchableSelect options={etablissements.map(e => ({ value: e.id, label: e.nom }))} value={filterClient} onChange={setFilterClient} placeholder="Tous les clients" />
        </div>
        <input type="month" value={filterMois} onChange={e => setFilterMois(e.target.value)} style={{ ...inputStyle, width: 'auto' }} />
        {hasFilters && (
          <button onClick={() => { setSearch(''); setFilterStatut('tous'); setFilterMode('tous'); setFilterClient(''); setFilterMois('') }}
            style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-secondary)', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font)' }}>
            ✕ Réinitialiser
          </button>
        )}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-hover)' }}>
              {['Référence', 'Désignation', 'Catégorie', 'Fabricant', 'Client', 'Localisation', 'Mode', 'MES', 'Statut', ''].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: 'var(--text-tertiary)', letterSpacing: '0.4px', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: '48px', textAlign: 'center' }}>
                <i className="ti ti-box-off" style={{ fontSize: '28px', display: 'block', marginBottom: '8px', color: 'var(--text-tertiary)', opacity: 0.4 }} aria-hidden="true" />
                <div style={{ color: 'var(--text-tertiary)', fontSize: '13px' }}>Aucun équipement trouvé</div>
              </td></tr>
            ) : filtered.map((eq, i) => {
              const st = statutStyle(eq.statut)
              const etab = etablissements.find(e => e.id === eq.etablissement_id)
              return (
                <tr key={eq.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--surface-hover)'}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}>
                  <td style={{ padding: '12px 14px', cursor: 'pointer' }} onClick={() => openFiche(eq)}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--accent)', fontFamily: 'monospace' }}>{eq.reference || '—'}</span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', cursor: 'pointer' }} onClick={() => openFiche(eq)}>{eq.designation}</td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => openFiche(eq)}>{eq.categorie || '—'}</td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => openFiche(eq)}>{eq.fabricant} {eq.modele}</td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => openFiche(eq)}>{etab?.nom || <span style={{ color: 'var(--warning)', fontStyle: 'italic' }}>Non affecté</span>}</td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }} onClick={() => openFiche(eq)}>{eq.localisation || '—'}</td>
                  <td style={{ padding: '12px 14px', cursor: 'pointer' }} onClick={() => openFiche(eq)}>
                    <span style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)', padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '500', border: '1px solid var(--border)' }}>{modeLabel(eq.mode_dispo)}</span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '11px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap', cursor: 'pointer' }} onClick={() => openFiche(eq)}>{eq.date_mes || '—'}</td>
                  <td style={{ padding: '12px 14px', cursor: 'pointer' }} onClick={() => openFiche(eq)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: st.color, flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', color: st.color, fontWeight: '500', whiteSpace: 'nowrap' }}>{st.label}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <button onClick={e => { e.stopPropagation(); openEditModal(eq) }}
                      style={{ padding: '5px 10px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontWeight: '500', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <i className="ti ti-edit" style={{ fontSize: '12px' }} aria-hidden="true" />Modifier
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* FICHE MODALE */}
      {selected && (
        <div onMouseDown={e => { if (e.target === e.currentTarget) { setSelected(null); setPannDesc(''); setPanneSuccess(false) } }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '560px', maxHeight: '88vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.12)', border: '1px solid var(--border)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="ti ti-device-heart-monitor" style={{ fontSize: '20px', color: 'var(--accent)' }} aria-hidden="true" />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>{selected.designation}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{selected.reference || '—'} · {etablissements.find(e => e.id === selected.etablissement_id)?.nom || 'Non affecté'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <button onClick={() => { setSelected(null); openEditModal(selected) }}
                  style={{ padding: '6px 12px', background: 'var(--warning-light)', border: '1px solid rgba(158,94,0,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--warning)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <i className="ti ti-edit" style={{ fontSize: '14px' }} aria-hidden="true" />Modifier
                </button>
                <button onClick={async () => {
                  const { data: hist } = await supabase.from('historique_localisation').select('*').eq('equipement_id', selected.id).order('created_at', { ascending: false })
                  generateFicheEquipementPDF(selected, etablissements.find(e => e.id === selected.etablissement_id)?.nom || '', documents, hist || [])
                }}
                  style={{ padding: '6px 12px', background: 'var(--accent-light)', border: '1px solid rgba(26,86,219,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--accent)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <i className="ti ti-file-type-pdf" style={{ fontSize: '14px' }} aria-hidden="true" />PDF
                </button>
                <button onClick={() => { setSelected(null); setPannDesc(''); setPanneSuccess(false) }}
                  style={{ width: '30px', height: '30px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-hover)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                  <i className="ti ti-x" style={{ fontSize: '14px' }} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <div style={{ marginBottom: '20px' }}>
                {(() => { const st = statutStyle(selected.statut); return <span style={{ background: st.bg, color: st.color, padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' }}>{st.label}</span> })()}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>Bloc 1 — Identification</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[['Référence', selected.reference || '—'], ['Catégorie', selected.categorie || '—'], ['N° de série', selected.numero_serie || '—'], ['N° de lot', selected.numero_lot || '—'], ['Fabricant', selected.fabricant || '—'], ['Modèle', selected.modele || '—'], ['Fin de garantie', selected.fin_garantie || '—'], ['Date MES', selected.date_mes || '—']].map(([label, value]) => (
                    <div key={label} style={{ background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>Bloc 2 — Localisation</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[['Service', selected.service || '—'], ['Étage', selected.etage || '—'], ['Chambre / Zone', selected.localisation || '—'], ['Responsable', selected.responsable_referent || '—']].map(([label, value]) => (
                    <div key={label} style={{ background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>Bloc 3 — Fournisseur / Contrat</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[['Fournisseur', selected.fournisseur || '—'], ['Mode', modeLabel(selected.mode_dispo)], ['Date livraison', selected.date_achat || '—'], ['Date installation', selected.date_installation || '—'], ['Prochaine révision', selected.date_revision || '—']].map(([label, value]) => (
                    <div key={label} style={{ background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Bloc 4 — Documents</div>
                  <label style={{ fontSize: '12px', color: 'var(--accent)', cursor: 'pointer', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <i className="ti ti-upload" style={{ fontSize: '13px' }} aria-hidden="true" />
                    {uploadLoading ? 'Upload...' : 'Ajouter'}
                    <input type='file' style={{ display: 'none' }} onChange={handleUpload} accept='.pdf,.jpg,.jpeg,.png,.doc,.docx' />
                  </label>
                </div>
                {documents.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-tertiary)', fontSize: '12px' }}>
                    <i className="ti ti-folder-open" style={{ fontSize: '20px', display: 'block', marginBottom: '4px', opacity: 0.4 }} aria-hidden="true" />Aucun document
                  </div>
                ) : documents.map(doc => (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: '6px' }}>
                    <i className={`ti ${doc.type_doc?.includes('pdf') ? 'ti-file-type-pdf' : 'ti-file-description'}`} style={{ fontSize: '16px', color: doc.type_doc?.includes('pdf') ? 'var(--danger)' : 'var(--accent)', flexShrink: 0 }} aria-hidden="true" />
                    <a href={doc.url} target='_blank' rel='noreferrer' style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: '500', flex: 1, textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nom}</a>
                    <a href={doc.url} target='_blank' rel='noreferrer' style={{ color: 'var(--text-tertiary)', display: 'flex' }}><i className="ti ti-external-link" style={{ fontSize: '13px' }} aria-hidden="true" /></a>
                    <button onClick={() => handleDeleteDoc(doc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--text-tertiary)', display: 'flex' }}
                      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--danger)'}
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)'}>
                      <i className="ti ti-trash" style={{ fontSize: '14px' }} aria-hidden="true" />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Bloc 6 — Commentaires</div>
                  {!editingCommentaire && (
                    <button onClick={() => { setEditingCommentaire(true); setNewCommentaire(selected.commentaires || '') }}
                      style={{ fontSize: '12px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <i className="ti ti-edit" style={{ fontSize: '13px' }} aria-hidden="true" />Modifier
                    </button>
                  )}
                </div>
                {editingCommentaire ? (
                  <div>
                    <textarea value={newCommentaire} onChange={e => setNewCommentaire(e.target.value)} rows={4}
                      placeholder="Observations, notes techniques..." style={{ ...inputStyle, resize: 'none', marginBottom: '8px' }} autoFocus />
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={async () => {
                        setCommentaireSaving(true)
                        await supabase.from('equipements').update({ commentaires: newCommentaire }).eq('id', selected.id)
                        setSelected({ ...selected, commentaires: newCommentaire })
                        setEquipements(prev => prev.map(e => e.id === selected.id ? { ...e, commentaires: newCommentaire } : e))
                        setEditingCommentaire(false)
                        setCommentaireSaving(false)
                      }} disabled={commentaireSaving}
                        style={{ flex: 1, padding: '8px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                        {commentaireSaving ? '...' : 'Sauvegarder'}
                      </button>
                      <button onClick={() => setEditingCommentaire(false)}
                        style={{ padding: '8px 12px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: '12px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', minHeight: '60px', fontSize: '13px', color: selected.commentaires ? 'var(--text-primary)' : 'var(--text-tertiary)', fontStyle: selected.commentaires ? 'normal' : 'italic' }}>
                    {selected.commentaires || 'Aucun commentaire'}
                  </div>
                )}
              </div>

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
                      placeholder="Décrivez le problème observé..." style={{ ...inputStyle, resize: 'none', marginBottom: '10px' }} />
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

      {/* MODAL MODIFIER */}
      {showEditModal && editForm && (
        <div onMouseDown={e => { if (e.target === e.currentTarget) setShowEditModal(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.12)', border: '1px solid var(--border)' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10 }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Modifier l'équipement</div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{editForm.designation}</div>
              </div>
              <button onClick={() => setShowEditModal(false)} style={{ width: '30px', height: '30px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-hover)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                <i className="ti ti-x" style={{ fontSize: '14px' }} aria-hidden="true" />
              </button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.6px', paddingBottom: '8px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>Bloc 1 — Identification</div>
                </div>
                {[
                  { label: 'Désignation *', key: 'designation', placeholder: 'Lit médicalisé' },
                  { label: 'Référence', key: 'reference', placeholder: 'LIT-2024-004' },
                  { label: 'Fabricant', key: 'fabricant', placeholder: 'Invacare' },
                  { label: 'Fournisseur / PSDM', key: 'fournisseur', placeholder: 'GLOBAL MEDICAL' },
                  { label: 'Modèle', key: 'modele', placeholder: 'Sonata Electric' },
                  { label: 'N° de série', key: 'numero_serie', placeholder: 'SN-XXX-2024' },
                  { label: 'N° de lot', key: 'numero_lot', placeholder: 'LOT-2024-001' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={labelStyle}>{f.label}</label>
                    <input value={(editForm as any)[f.key] || ''} onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={inputStyle} />
                  </div>
                ))}
                <div>
                  <label style={labelStyle}>Catégorie</label>
                  <select value={editForm.categorie || ''} onChange={e => setEditForm(p => ({ ...p, categorie: e.target.value }))} style={inputStyle}>
                    <option value=''>Sélectionner...</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Statut</label>
                  <select value={editForm.statut || 'en_service'} onChange={e => setEditForm(p => ({ ...p, statut: e.target.value }))} style={inputStyle}>
                    {statutOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Date MES</label>
                  <input type='date' value={editForm.date_mes || ''} onChange={e => setEditForm(p => ({ ...p, date_mes: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Fin de garantie</label>
                  <input type='date' value={editForm.fin_garantie || ''} onChange={e => setEditForm(p => ({ ...p, fin_garantie: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Date retrait</label>
                  <input type='date' value={editForm.date_retrait || ''} onChange={e => setEditForm(p => ({ ...p, date_retrait: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Motif retrait</label>
                  <select value={editForm.motif_retrait || ''} onChange={e => setEditForm(p => ({ ...p, motif_retrait: e.target.value }))} style={inputStyle}>
                    <option value=''>—</option>
                    <option value='panne'>Panne</option>
                    <option value='remplacement'>Remplacement</option>
                    <option value='obsolescence'>Obsolescence</option>
                    <option value='restitution'>Restitution</option>
                  </select>
                </div>

                <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.6px', paddingBottom: '8px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>Bloc 2 — Localisation</div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Établissement</label>
                  <select value={editForm.etablissement_id || ''} onChange={e => setEditForm(p => ({ ...p, etablissement_id: e.target.value }))} style={inputStyle}>
                    <option value=''>Non affecté</option>
                    {etablissements.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                  </select>
                </div>
                {[
                  { label: 'Service', key: 'service', placeholder: 'Soins intensifs' },
                  { label: 'Étage', key: 'etage', placeholder: '2ème étage' },
                  { label: 'Chambre / Zone', key: 'localisation', placeholder: 'Chambre 12' },
                  { label: 'Responsable référent', key: 'responsable_referent', placeholder: 'Dr. Martin' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={labelStyle}>{f.label}</label>
                    <input value={(editForm as any)[f.key] || ''} onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={inputStyle} />
                  </div>
                ))}

                <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.6px', paddingBottom: '8px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>Bloc 3 — Fournisseur / Contrat</div>
                </div>
                <div>
                  <label style={labelStyle}>Mode</label>
                  <select value={editForm.mode_dispo || 'location'} onChange={e => setEditForm(p => ({ ...p, mode_dispo: e.target.value }))} style={inputStyle}>
                    <option value='location'>Location</option>
                    <option value='achat'>Achat</option>
                    <option value='mad'>Mise à disposition</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Date livraison</label>
                  <input type='date' value={editForm.date_achat || ''} onChange={e => setEditForm(p => ({ ...p, date_achat: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Date installation</label>
                  <input type='date' value={editForm.date_installation || ''} onChange={e => setEditForm(p => ({ ...p, date_installation: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Prochaine révision</label>
                  <input type='date' value={editForm.date_revision || ''} onChange={e => setEditForm(p => ({ ...p, date_revision: e.target.value }))} style={inputStyle} />
                </div>

                <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.6px', paddingBottom: '8px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>Bloc 6 — Commentaires</div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Observations / Notes</label>
                  <textarea value={editForm.commentaires || ''} onChange={e => setEditForm(p => ({ ...p, commentaires: e.target.value }))}
                    placeholder="Observations, notes techniques..." rows={3} style={{ ...inputStyle, resize: 'none' }} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button onClick={() => setShowEditModal(false)}
                  style={{ flex: 1, padding: '11px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  Annuler
                </button>
                <button onClick={handleEdit} disabled={editSaving || !editForm.designation}
                  style={{ flex: 1, padding: '11px', background: editSaving || !editForm.designation ? 'rgba(26,86,219,0.4)' : 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: editSaving || !editForm.designation ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', boxShadow: '0 1px 4px rgba(26,86,219,0.3)' }}>
                  {editSaving ? 'Enregistrement...' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL AJOUT */}
      {showAddModal && (
        <div onMouseDown={e => { if (e.target === e.currentTarget) { setShowAddModal(false); setAddError('') } }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.12)', border: '1px solid var(--border)' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10 }}>
              <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Ajouter un équipement</div>
              <button onClick={() => { setShowAddModal(false); setAddError('') }} style={{ width: '30px', height: '30px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-hover)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                <i className="ti ti-x" style={{ fontSize: '14px' }} aria-hidden="true" />
              </button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.6px', paddingBottom: '8px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>Bloc 1 — Identification</div>
                </div>
                {[
                  { label: 'Désignation *', key: 'designation', placeholder: 'Lit médicalisé' },
                  { label: 'Référence', key: 'reference', placeholder: 'LIT-2024-004' },
                  { label: 'Fabricant', key: 'fabricant', placeholder: 'Invacare' },
                  { label: 'Fournisseur / PSDM', key: 'fournisseur', placeholder: 'GLOBAL MEDICAL' },
                  { label: 'Modèle', key: 'modele', placeholder: 'Sonata Electric' },
                  { label: 'N° de série', key: 'numero_serie', placeholder: 'SN-XXX-2024' },
                  { label: 'N° de lot', key: 'numero_lot', placeholder: 'LOT-2024-001' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={labelStyle}>{f.label}</label>
                    <input value={(addForm as any)[f.key]} onChange={e => setAddForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={inputStyle} />
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
                  <label style={labelStyle}>Statut</label>
                  <select value={addForm.statut} onChange={e => setAddForm(p => ({ ...p, statut: e.target.value }))} style={inputStyle}>
                    {statutOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Date MES</label>
                  <input type='date' value={addForm.date_mes} onChange={e => setAddForm(p => ({ ...p, date_mes: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Fin de garantie</label>
                  <input type='date' value={addForm.fin_garantie} onChange={e => setAddForm(p => ({ ...p, fin_garantie: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Date retrait</label>
                  <input type='date' value={addForm.date_retrait} onChange={e => setAddForm(p => ({ ...p, date_retrait: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Motif retrait</label>
                  <select value={addForm.motif_retrait} onChange={e => setAddForm(p => ({ ...p, motif_retrait: e.target.value }))} style={inputStyle}>
                    <option value=''>—</option>
                    <option value='panne'>Panne</option>
                    <option value='remplacement'>Remplacement</option>
                    <option value='obsolescence'>Obsolescence</option>
                    <option value='restitution'>Restitution</option>
                  </select>
                </div>

                <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.6px', paddingBottom: '8px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>Bloc 2 — Localisation</div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ ...labelStyle, color: !addForm.etablissement_id ? 'var(--warning)' : 'var(--text-secondary)' }}>
                    Établissement — requis pour que le client voit le matériel
                  </label>
                  <select value={addForm.etablissement_id} onChange={e => setAddForm(p => ({ ...p, etablissement_id: e.target.value }))}
                    style={{ ...inputStyle, borderColor: !addForm.etablissement_id ? 'var(--warning)' : 'var(--border)' }}>
                    <option value=''>Non affecté</option>
                    {etablissements.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
                  </select>
                  {!addForm.etablissement_id && (
                    <div style={{ fontSize: '11px', color: 'var(--warning)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <i className="ti ti-alert-triangle" style={{ fontSize: '12px' }} aria-hidden="true" />
                      Sans établissement, l'équipement n'apparaîtra pas chez le client
                    </div>
                  )}
                </div>
                {[
                  { label: 'Service', key: 'service', placeholder: 'Soins intensifs' },
                  { label: 'Étage', key: 'etage', placeholder: '2ème étage' },
                  { label: 'Chambre / Zone', key: 'localisation', placeholder: 'Chambre 12' },
                  { label: 'Responsable référent', key: 'responsable_referent', placeholder: 'Dr. Martin' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={labelStyle}>{f.label}</label>
                    <input value={(addForm as any)[f.key]} onChange={e => setAddForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} style={inputStyle} />
                  </div>
                ))}

                <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.6px', paddingBottom: '8px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>Bloc 3 — Fournisseur / Contrat</div>
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
                  <label style={labelStyle}>Date livraison</label>
                  <input type='date' value={addForm.date_achat} onChange={e => setAddForm(p => ({ ...p, date_achat: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Date installation</label>
                  <input type='date' value={addForm.date_installation} onChange={e => setAddForm(p => ({ ...p, date_installation: e.target.value }))} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Prochaine révision</label>
                  <input type='date' value={addForm.date_revision} onChange={e => setAddForm(p => ({ ...p, date_revision: e.target.value }))} style={inputStyle} />
                </div>

                <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.6px', paddingBottom: '8px', borderBottom: '1px solid var(--border)', marginBottom: '4px' }}>Bloc 6 — Commentaires</div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Observations / Notes</label>
                  <textarea value={addForm.commentaires} onChange={e => setAddForm(p => ({ ...p, commentaires: e.target.value }))}
                    placeholder="Observations, notes techniques..." rows={3} style={{ ...inputStyle, resize: 'none' }} />
                </div>
              </div>

              {addError && (
                <div style={{ padding: '10px 14px', background: 'var(--danger-light)', border: '1px solid rgba(194,54,42,0.2)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--danger)', marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="ti ti-alert-circle" style={{ fontSize: '14px', flexShrink: 0 }} aria-hidden="true" />
                  {addError}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button onClick={() => { setShowAddModal(false); setAddError('') }}
                  style={{ flex: 1, padding: '11px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  Annuler
                </button>
                <button onClick={handleAddEquip} disabled={addSaving || !addForm.designation}
                  style={{ flex: 1, padding: '11px', background: addSaving || !addForm.designation ? 'rgba(26,86,219,0.4)' : 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: addSaving || !addForm.designation ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', boxShadow: '0 1px 4px rgba(26,86,219,0.3)' }}>
                  {addSaving ? 'Enregistrement...' : 'Ajouter l\'équipement'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CATEGORIES */}
      {showCatModal && (
        <div onMouseDown={e => { if (e.target === e.currentTarget) setShowCatModal(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '420px', maxHeight: '80vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.12)', border: '1px solid var(--border)' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--surface)' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Catégories</div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{categoriesFull.length} catégorie{categoriesFull.length > 1 ? 's' : ''}</div>
              </div>
              <button onClick={() => setShowCatModal(false)} style={{ width: '30px', height: '30px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-hover)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                <i className="ti ti-x" style={{ fontSize: '14px' }} aria-hidden="true" />
              </button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <input value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCat()} placeholder="Nouvelle catégorie..." style={{ ...inputStyle, flex: 1 }} />
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
                      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-tertiary)'}>
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