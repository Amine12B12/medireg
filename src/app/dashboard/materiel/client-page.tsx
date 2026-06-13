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
  if (s === 'en_service') return { color: 'var(--success)', bg: 'var(--success-light)', label: 'En service', dot: 'var(--success)' }
  if (s === 'maintenance') return { color: 'var(--warning)', bg: 'var(--warning-light)', label: 'En maintenance', dot: 'var(--warning)' }
  return { color: 'var(--danger)', bg: 'var(--danger-light)', label: 'Hors service', dot: 'var(--danger)' }
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

  const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface)' }

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
    <button onClick={onClick} style={{ padding: '5px 12px', borderRadius: '20px', border: active ? '1px solid var(--accent)' : '1px solid var(--border)', background: active ? 'var(--accent-light)' : 'transparent', color: active ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '12px', fontWeight: active ? '500' : '400', cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.1s' }}>
      {label}
    </button>
  )

  const hasFilters = filterStatut !== 'tous' || filterType !== 'tous' || filterContrat !== 'tous' || filterMaintenance !== 'tous'

  if (loading) return <div style={{ padding: '28px', color: 'var(--text-tertiary)', fontSize: '13px', fontFamily: 'var(--font)' }}>Chargement...</div>

  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)' }}>

      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
          {filtered.length} équipement{filtered.length > 1 ? 's' : ''} {hasFilters ? `(sur ${equipements.length})` : ''}
        </div>
      </div>

      {/* Alerte hors service */}
      {equipements.filter(e => e.statut === 'hors_service').length > 0 && (
        <div style={{ background: 'var(--danger-light)', border: '1px solid rgba(194,54,42,0.2)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'rgba(194,54,42,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-alert-circle" style={{ fontSize: '16px', color: 'var(--danger)' }} aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--danger)' }}>
              {equipements.filter(e => e.statut === 'hors_service').length} équipement{equipements.filter(e => e.statut === 'hors_service').length > 1 ? 's' : ''} hors service
            </div>
            <div style={{ fontSize: '12px', color: 'var(--danger)', opacity: 0.8, marginTop: '1px' }}>Votre prestataire a été notifié et interviendra sous 24h</div>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {filterBtn('Tous', filterStatut === 'tous', () => setFilterStatut('tous'))}
          {filterBtn('En service', filterStatut === 'en_service', () => setFilterStatut('en_service'))}
          {filterBtn('Maintenance', filterStatut === 'maintenance', () => setFilterStatut('maintenance'))}
          {filterBtn('Hors service', filterStatut === 'hors_service', () => setFilterStatut('hors_service'))}
        </div>
        <div style={{ width: '1px', height: '20px', background: 'var(--border)' }} />
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface)', cursor: 'pointer' }}>
          <option value='tous'>Tous les types</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterContrat} onChange={e => setFilterContrat(e.target.value)}
          style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface)', cursor: 'pointer' }}>
          <option value='tous'>Tous les contrats</option>
          <option value='location'>Location</option>
          <option value='achat'>Achat</option>
          <option value='mad'>MAD</option>
        </select>
        <select value={filterMaintenance} onChange={e => setFilterMaintenance(e.target.value)}
          style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface)', cursor: 'pointer' }}>
          <option value='tous'>Toutes maintenances</option>
          <option value='urgent'>Urgent</option>
          <option value='en_cours'>En cours</option>
          <option value='planifie'>Planifié</option>
        </select>
        {hasFilters && (
          <button onClick={() => { setFilterStatut('tous'); setFilterType('tous'); setFilterContrat('tous'); setFilterMaintenance('tous') }}
            style={{ padding: '5px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-secondary)', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font)' }}>
            ✕ Réinitialiser
          </button>
        )}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '48px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
          <i className="ti ti-box-off" style={{ fontSize: '32px', display: 'block', marginBottom: '10px', color: 'var(--text-tertiary)', opacity: 0.4 }} aria-hidden="true" />
          <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '4px' }}>Aucun équipement</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Modifiez les filtres pour afficher plus de résultats</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {filtered.map(eq => {
            const st = statutStyle(eq.statut)
            return (
              <div key={eq.id} onClick={() => openFiche(eq)}
                style={{ background: 'var(--surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: '18px 20px', cursor: 'pointer', borderLeft: `3px solid ${st.dot}`, transition: 'all 0.15s', boxShadow: 'var(--shadow-sm)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{eq.designation}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px', fontFamily: 'monospace' }}>{eq.reference}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0, marginLeft: '8px' }}>
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: st.dot }} />
                    <span style={{ fontSize: '11px', color: st.color, fontWeight: '500', whiteSpace: 'nowrap' }}>{st.label}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <i className="ti ti-map-pin" style={{ fontSize: '13px', color: 'var(--text-tertiary)', flexShrink: 0 }} aria-hidden="true" />
                    {eq.localisation || '—'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <i className="ti ti-building" style={{ fontSize: '13px', color: 'var(--text-tertiary)', flexShrink: 0 }} aria-hidden="true" />
                    {eq.fabricant} {eq.modele}
                  </div>
                  {eq.categorie && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <i className="ti ti-tag" style={{ fontSize: '13px', color: 'var(--text-tertiary)', flexShrink: 0 }} aria-hidden="true" />
                      {eq.categorie}
                    </div>
                  )}
                  {eq.date_revision && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      <i className="ti ti-tool" style={{ fontSize: '13px', color: 'var(--text-tertiary)', flexShrink: 0 }} aria-hidden="true" />
                      Révision : {eq.date_revision}
                    </div>
                  )}
                </div>
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '500', border: '1px solid var(--border)' }}>
                    {eq.mode_dispo === 'location' ? 'Location' : eq.mode_dispo === 'achat' ? 'Achat' : 'MAD'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: '500' }}>Voir détails →</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Fiche modale */}
      {selected && (
        <div onClick={() => { setSelected(null); setPannDesc(''); setPanneSuccess(false); setEditingLoc(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '520px', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.12)', border: '1px solid var(--border)' }}>

            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="ti ti-device-heart-monitor" style={{ fontSize: '20px', color: 'var(--accent)' }} aria-hidden="true" />
                </div>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>{selected.designation}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px', fontFamily: 'monospace' }}>{selected.reference}</div>
                </div>
              </div>
              <button onClick={() => { setSelected(null); setPannDesc(''); setPanneSuccess(false); setEditingLoc(false) }}
                style={{ width: '30px', height: '30px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-hover)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0 }}>
                <i className="ti ti-x" style={{ fontSize: '14px' }} aria-hidden="true" />
              </button>
            </div>

            <div style={{ padding: '20px 24px' }}>

              {/* Statut */}
              <div style={{ marginBottom: '20px' }}>
                {(() => { const st = statutStyle(selected.statut); return <span style={{ background: st.bg, color: st.color, padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' }}>{st.label}</span> })()}
              </div>

              {/* Infos */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>Informations</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[
                    ['Catégorie', selected.categorie || '—'],
                    ['Fabricant', selected.fabricant || '—'],
                    ['Modèle', selected.modele || '—'],
                    ['N° série', selected.numero_serie || '—'],
                    ['Contrat', selected.mode_dispo === 'location' ? 'Location' : selected.mode_dispo === 'achat' ? 'Achat' : 'MAD'],
                    ['Révision', selected.date_revision || '—'],
                    ['Mise en service', selected.date_mes || '—'],
                  ].map(([l, v]) => (
                    <div key={l} style={{ background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', padding: '10px 12px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{l}</div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Localisation éditable */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Localisation</div>
                  {!editingLoc && (
                    <button onClick={() => { setEditingLoc(true); setNewLoc(selected.localisation || '') }}
                      style={{ fontSize: '12px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <i className="ti ti-edit" style={{ fontSize: '13px' }} aria-hidden="true" />
                      Modifier
                    </button>
                  )}
                </div>
                {editingLoc ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input value={newLoc} onChange={e => setNewLoc(e.target.value)}
                      placeholder="Ex: Chambre 17" autoFocus
                      style={{ ...inputStyle, flex: 1, borderColor: 'var(--accent)' }} />
                    <button onClick={async () => {
                      setLocSaving(true)
                      await supabase.from('equipements').update({ localisation: newLoc }).eq('id', selected.id)
                      setSelected({ ...selected, localisation: newLoc })
                      setEquipements(prev => prev.map(e => e.id === selected.id ? { ...e, localisation: newLoc } : e))
                      setEditingLoc(false); setLocSaving(false)
                    }} disabled={locSaving}
                      style={{ padding: '8px 14px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>
                      {locSaving ? '...' : 'Sauver'}
                    </button>
                    <button onClick={() => setEditingLoc(false)}
                      style={{ padding: '8px 10px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font)' }}>✕</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <i className="ti ti-map-pin" style={{ fontSize: '14px', color: 'var(--text-tertiary)' }} aria-hidden="true" />
                    <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{selected.localisation || '—'}</span>
                  </div>
                )}
              </div>

              {/* Documents */}
              {documents.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>Documents</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {documents.map(doc => (
                      <a key={doc.id} href={doc.url} target='_blank' rel='noreferrer'
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', textDecoration: 'none', transition: 'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = 'var(--accent-light)'}
                        onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = 'var(--surface-hover)'}
                      >
                        <i className={`ti ${doc.type_doc?.includes('pdf') ? 'ti-file-type-pdf' : doc.type_doc?.includes('image') ? 'ti-photo' : 'ti-file-description'}`}
                          style={{ fontSize: '16px', color: doc.type_doc?.includes('pdf') ? 'var(--danger)' : 'var(--accent)', flexShrink: 0 }} aria-hidden="true" />
                        <span style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: '500', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nom}</span>
                        <i className="ti ti-external-link" style={{ fontSize: '13px', color: 'var(--text-tertiary)' }} aria-hidden="true" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Signaler panne */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>Signaler une panne</div>
                {panneSuccess ? (
                  <div style={{ padding: '14px', background: 'var(--success-light)', border: '1px solid rgba(10,124,78,0.2)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <i className="ti ti-check" style={{ fontSize: '16px', color: 'var(--success)' }} aria-hidden="true" />
                    <div>
                      <div style={{ fontSize: '13px', color: 'var(--success)', fontWeight: '600' }}>Panne signalée</div>
                      <div style={{ fontSize: '12px', color: 'var(--success)', opacity: 0.8 }}>Votre prestataire interviendra sous 24h</div>
                    </div>
                  </div>
                ) : (
                  <>
                    <textarea value={pannDesc} onChange={e => setPannDesc(e.target.value)} rows={3}
                      placeholder="Décrivez le problème observé..."
                      style={{ ...inputStyle, resize: 'none', marginBottom: '10px' }} />
                    <button onClick={async () => {
                      if (!pannDesc) return
                      setPanneSaving(true)
                      await supabase.from('pannes').insert([{ equipement_id: selected.id, description: pannDesc, statut: 'ouvert' }])
                      await supabase.from('equipements').update({ statut: 'hors_service' }).eq('id', selected.id)
                      setPanneSaving(false); setPanneSuccess(true); load()
                      setTimeout(() => { setSelected(null); setPanneSuccess(false); setPannDesc('') }, 2500)
                    }} disabled={panneSaving || !pannDesc}
                      style={{ width: '100%', padding: '11px', background: panneSaving || !pannDesc ? 'var(--surface-hover)' : 'var(--danger-light)', border: `1px solid ${panneSaving || !pannDesc ? 'var(--border)' : 'rgba(194,54,42,0.3)'}`, borderRadius: 'var(--radius-md)', color: panneSaving || !pannDesc ? 'var(--text-tertiary)' : 'var(--danger)', fontSize: '13px', fontWeight: '600', cursor: panneSaving || !pannDesc ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <i className="ti ti-alert-circle" style={{ fontSize: '15px' }} aria-hidden="true" />
                      {panneSaving ? 'Envoi...' : 'Signaler la panne'}
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