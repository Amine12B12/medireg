'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Equipement = {
  id: string; reference: string; designation: string; categorie: string
  fabricant: string; modele: string; numero_serie: string
  mode_dispo: string; statut: string; localisation: string
  date_achat: string; date_mes: string; date_revision: string
  etablissement_id: string
}

const statutStyle = (s: string) => {
  if (s === 'en_service') return { bg: '#F0FDF4', color: '#059669', label: 'En service', dot: '#059669' }
  if (s === 'maintenance') return { bg: '#FFFBEB', color: '#B45309', label: 'En maintenance', dot: '#B45309' }
  return { bg: '#FEF2F2', color: '#DC2626', label: 'Hors service', dot: '#DC2626' }
}

export default function MaterielClientPage({ etablissementId }: { etablissementId: string }) {
  const [equipements, setEquipements] = useState<Equipement[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selected, setSelected] = useState<Equipement | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterStatut, setFilterStatut] = useState('tous')
  const [filterType, setFilterType] = useState('tous')
  const [filterContrat, setFilterContrat] = useState('tous')
  const [filterMaintenance, setFilterMaintenance] = useState('tous')
  const [pannDesc, setPannDesc] = useState('')
  const [panneSaving, setPanneSaving] = useState(false)
  const [panneSuccess, setPanneSuccess] = useState(false)
  const [documents, setDocuments] = useState<any[]>([])
  const [editingLoc, setEditingLoc] = useState(false)
  const [newLoc, setNewLoc] = useState('')
  const [locSaving, setLocSaving] = useState(false)
  const supabase = createClient()

  async function load() {
    const { data } = await supabase.from('equipements').select('*').eq('etablissement_id', etablissementId).order('created_at')
    const { data: cats } = await supabase.from('categories_materiel').select('nom').order('nom')
    setEquipements(data || [])
    setCategories(cats?.map(c => c.nom) || [])
    setLoading(false)
  }

  useEffect(() => { if (etablissementId) load() }, [etablissementId])

  async function loadDocs(equipId: string) {
    const { data } = await supabase.from('documents').select('*').eq('equipement_id', equipId)
    setDocuments(data || [])
  }

  async function openFiche(eq: Equipement) {
    setSelected(eq)
    setPannDesc('')
    setPanneSuccess(false)
    setEditingLoc(false)
    setNewLoc(eq.localisation || '')
    loadDocs(eq.id)
  }

  const filtered = equipements
    .filter(e => filterStatut === 'tous' || e.statut === filterStatut)
    .filter(e => filterType === 'tous' || e.categorie?.toLowerCase() === filterType.toLowerCase())
    .filter(e => filterContrat === 'tous' || e.mode_dispo === filterContrat)
    .filter(e => {
      if (filterMaintenance === 'tous') return true
      if (filterMaintenance === 'urgent') return e.statut === 'hors_service'
      if (filterMaintenance === 'en_cours') return e.statut === 'maintenance'
      if (filterMaintenance === 'planifie') return e.date_revision !== null
      return true
    })

  const filterBtn = (label: string, active: boolean, onClick: () => void) => (
    <button onClick={onClick} style={{ padding: '6px 12px', borderRadius: '6px', border: '0.5px solid', borderColor: active ? '#1A56DB' : '#E5E7EB', background: active ? '#EFF6FF' : '#fff', color: active ? '#1A56DB' : '#6B7280', fontSize: '12px', fontWeight: active ? '500' : '400', cursor: 'pointer', fontFamily: 'inherit' }}>
      {label}
    </button>
  )

  const hasFilters = filterStatut !== 'tous' || filterType !== 'tous' || filterContrat !== 'tous' || filterMaintenance !== 'tous'

  if (loading) return <div style={{ padding: '24px', color: '#6B7280', fontSize: '13px' }}>Chargement...</div>

  return (
    <div style={{ padding: '24px', fontFamily: 'Inter, -apple-system, sans-serif' }}>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: '#6B7280' }}>{filtered.length} équipement{filtered.length > 1 ? 's' : ''} {hasFilters ? `(sur ${equipements.length})` : ''}</div>
      </div>

      {equipements.filter(e => e.statut === 'hors_service').length > 0 && (
        <div style={{ background: '#FEF2F2', border: '0.5px solid #FECACA', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="ti ti-alert-circle" style={{ fontSize: '16px', color: '#DC2626', flexShrink: 0 }} aria-hidden="true" />
          <span style={{ fontSize: '13px', color: '#DC2626', fontWeight: '500' }}>
            {equipements.filter(e => e.statut === 'hors_service').length} équipement{equipements.filter(e => e.statut === 'hors_service').length > 1 ? 's' : ''} hors service — votre prestataire a été notifié
          </span>
        </div>
      )}

      {/* Filtres */}
      <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {filterBtn('Tous', filterStatut === 'tous', () => setFilterStatut('tous'))}
          {filterBtn('En service', filterStatut === 'en_service', () => setFilterStatut('en_service'))}
          {filterBtn('Maintenance', filterStatut === 'maintenance', () => setFilterStatut('maintenance'))}
          {filterBtn('Hors service', filterStatut === 'hors_service', () => setFilterStatut('hors_service'))}
        </div>
        <div style={{ width: '1px', height: '20px', background: '#E5E7EB' }} />
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding: '6px 10px', border: '0.5px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#111827', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
          <option value='tous'>Tous les types</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterContrat} onChange={e => setFilterContrat(e.target.value)}
          style={{ padding: '6px 10px', border: '0.5px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#111827', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
          <option value='tous'>Tous les contrats</option>
          <option value='location'>Location</option>
          <option value='achat'>Achat</option>
          <option value='mad'>MAD</option>
        </select>
        <select value={filterMaintenance} onChange={e => setFilterMaintenance(e.target.value)}
          style={{ padding: '6px 10px', border: '0.5px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#111827', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
          <option value='tous'>Toutes maintenances</option>
          <option value='urgent'>Urgent</option>
          <option value='en_cours'>En cours</option>
          <option value='planifie'>Planifié</option>
        </select>
        {hasFilters && (
          <button onClick={() => { setFilterStatut('tous'); setFilterType('tous'); setFilterContrat('tous'); setFilterMaintenance('tous') }}
            style={{ padding: '6px 10px', border: '0.5px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#6B7280', background: '#F9FAFB', cursor: 'pointer', fontFamily: 'inherit' }}>
            ✕ Réinitialiser
          </button>
        )}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: '8px', padding: '48px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
          Aucun équipement pour ces filtres
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
          {filtered.map(eq => {
            const st = statutStyle(eq.statut)
            return (
              <div key={eq.id} onClick={() => openFiche(eq)}
                style={{ background: '#fff', borderRadius: '8px', border: '0.5px solid #E5E7EB', padding: '18px', cursor: 'pointer', borderLeft: `3px solid ${st.dot}`, transition: 'box-shadow 0.15s' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{eq.designation}</div>
                    <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>{eq.reference}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: st.dot }} />
                    <span style={{ fontSize: '11px', color: st.color, fontWeight: '500', whiteSpace: 'nowrap' }}>{st.label}</span>
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#6B7280', lineHeight: 1.8 }}>
                  <div>📍 {eq.localisation || '—'}</div>
                  <div>🏭 {eq.fabricant} {eq.modele}</div>
                  {eq.categorie && <div>🏷️ {eq.categorie}</div>}
                  {eq.date_revision && <div>🔧 Révision : {eq.date_revision}</div>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Fiche modale */}
      {selected && (
        <div onClick={() => { setSelected(null); setPannDesc(''); setPanneSuccess(false); setEditingLoc(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '520px', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ background: '#111827', padding: '18px 22px', borderRadius: '12px 12px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0 }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#fff' }}>{selected.designation}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{selected.reference}</div>
              </div>
              <button onClick={() => { setSelected(null); setPannDesc(''); setPanneSuccess(false); setEditingLoc(false) }}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>✕</button>
            </div>
            <div style={{ padding: '20px 22px' }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '10px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px', paddingBottom: '6px', borderBottom: '0.5px solid #F3F4F6' }}>Informations</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[
                    ['Statut', statutStyle(selected.statut).label],
                    ['Catégorie', selected.categorie || '—'],
                    ['Fabricant', selected.fabricant || '—'],
                    ['Modèle', selected.modele || '—'],
                    ['N° série', selected.numero_serie || '—'],
                    ['Contrat', selected.mode_dispo === 'location' ? 'Location' : selected.mode_dispo === 'achat' ? 'Achat' : 'MAD'],
                    ['Mise en service', selected.date_mes || '—'],
                    ['Révision', selected.date_revision || '—'],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <div style={{ fontSize: '10px', color: '#9CA3AF', marginBottom: '2px' }}>{l}</div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Localisation éditable */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '10px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px', paddingBottom: '6px', borderBottom: '0.5px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Localisation</span>
                  {!editingLoc && (
                    <button onClick={() => { setEditingLoc(true); setNewLoc(selected.localisation || '') }}
                      style={{ fontSize: '11px', color: '#1A56DB', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textTransform: 'none', letterSpacing: 0, fontWeight: '500' }}>
                      ✏️ Modifier
                    </button>
                  )}
                </div>
                {editingLoc ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input value={newLoc} onChange={e => setNewLoc(e.target.value)} placeholder="Ex: Chambre 17" autoFocus
                      style={{ flex: 1, padding: '8px 10px', border: '0.5px solid #1A56DB', borderRadius: '6px', fontSize: '12px', color: '#111827', fontFamily: 'inherit', outline: 'none' }} />
                    <button onClick={async () => {
                      setLocSaving(true)
                      await supabase.from('equipements').update({ localisation: newLoc }).eq('id', selected.id)
                      setSelected({ ...selected, localisation: newLoc })
                      setEquipements(prev => prev.map(e => e.id === selected.id ? { ...e, localisation: newLoc } : e))
                      setEditingLoc(false); setLocSaving(false)
                    }} disabled={locSaving}
                      style={{ padding: '8px 12px', background: '#1A56DB', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                      {locSaving ? '...' : 'Sauver'}
                    </button>
                    <button onClick={() => setEditingLoc(false)}
                      style={{ padding: '8px 10px', background: '#F9FAFB', border: '0.5px solid #E5E7EB', borderRadius: '6px', color: '#6B7280', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                  </div>
                ) : (
                  <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827' }}>📍 {selected.localisation || '—'}</div>
                )}
              </div>

              {documents.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '10px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px', paddingBottom: '6px', borderBottom: '0.5px solid #F3F4F6' }}>Documents</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {documents.map(doc => (
                      <a key={doc.id} href={doc.url} target='_blank' rel='noreferrer'
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#F9FAFB', borderRadius: '6px', border: '0.5px solid #E5E7EB', textDecoration: 'none' }}>
                        <i className="ti ti-file-description" style={{ fontSize: '14px', color: '#1A56DB' }} aria-hidden="true" />
                        <span style={{ fontSize: '12px', color: '#111827', fontWeight: '500', flex: 1 }}>{doc.nom}</span>
                        <i className="ti ti-external-link" style={{ fontSize: '12px', color: '#9CA3AF' }} aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div style={{ fontSize: '10px', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px', paddingBottom: '6px', borderBottom: '0.5px solid #F3F4F6' }}>Signaler une panne</div>
                {panneSuccess ? (
                  <div style={{ padding: '12px', background: '#F0FDF4', border: '0.5px solid #BBF7D0', borderRadius: '8px', color: '#059669', fontSize: '13px', fontWeight: '500', textAlign: 'center' }}>
                    ✓ Panne signalée — Votre prestataire interviendra sous 24h
                  </div>
                ) : (
                  <>
                    <textarea value={pannDesc} onChange={e => setPannDesc(e.target.value)} rows={2} placeholder="Décrivez le problème..."
                      style={{ width: '100%', padding: '9px 12px', border: '0.5px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#111827', fontFamily: 'inherit', outline: 'none', resize: 'none', marginBottom: '8px' }} />
                    <button onClick={async () => {
                      if (!pannDesc) return
                      setPanneSaving(true)
                      await supabase.from('pannes').insert([{ equipement_id: selected.id, description: pannDesc, statut: 'ouvert' }])
                      await supabase.from('equipements').update({ statut: 'hors_service' }).eq('id', selected.id)
                      setPanneSaving(false); setPanneSuccess(true); load()
                      setTimeout(() => { setSelected(null); setPanneSuccess(false); setPannDesc('') }, 2500)
                    }} disabled={panneSaving || !pannDesc}
                      style={{ width: '100%', padding: '10px', background: panneSaving || !pannDesc ? '#F9FAFB' : '#FEF2F2', border: '0.5px solid #FECACA', borderRadius: '6px', color: '#DC2626', fontSize: '13px', fontWeight: '500', cursor: panneSaving || !pannDesc ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                      {panneSaving ? 'Envoi...' : '🚨 Signaler la panne'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}