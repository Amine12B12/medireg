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
  if (s === 'en_service') return { bg: '#E8F5EF', color: '#00875A', label: 'En service' }
  if (s === 'maintenance') return { bg: '#FFF7E6', color: '#B45309', label: 'Maintenance' }
  return { bg: '#FEF2F2', color: '#DC2626', label: 'Hors service' }
}

const modeLabel = (m: string) => {
  if (m === 'location') return 'Location'
  if (m === 'achat') return 'Achat'
  return 'Mise à dispo'
}

export default function MaterielPage() {
  const [equipements, setEquipements] = useState<Equipement[]>([])
  const [filtered, setFiltered] = useState<Equipement[]>([])
  const [search, setSearch] = useState('')
  const [filterStatut, setFilterStatut] = useState('tous')
  const [filterMode, setFilterMode] = useState('tous')
  const [selected, setSelected] = useState<Equipement | null>(null)
  const [loading, setLoading] = useState(true)
  const [pannDesc, setPannDesc] = useState('')
  const [panneSaving, setPanneSaving] = useState(false)
  const [panneSuccess, setPanneSuccess] = useState(false)
  const [documents, setDocuments] = useState<any[]>([])
  const [uploadLoading, setUploadLoading] = useState(false)
  const supabase = createClient()

  async function load() {
    const { data } = await supabase.from('equipements').select('*').order('created_at')
    setEquipements(data || [])
    setFiltered(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    let r = equipements
    if (search) r = r.filter(e => `${e.reference} ${e.designation} ${e.fabricant} ${e.modele} ${e.localisation}`.toLowerCase().includes(search.toLowerCase()))
    if (filterStatut !== 'tous') r = r.filter(e => e.statut === filterStatut)
    if (filterMode !== 'tous') r = r.filter(e => e.mode_dispo === filterMode)
    setFiltered(r)
  }, [search, filterStatut, filterMode, equipements])

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

  const filterBtn = (label: string, active: boolean, onClick: () => void) => (
    <button onClick={onClick} style={{ padding: '7px 14px', borderRadius: '8px', border: '0.5px solid', borderColor: active ? '#1A56DB' : '#DDE5F0', background: active ? '#EEF2FF' : '#fff', color: active ? '#1A56DB' : '#6B7A99', fontSize: '12px', fontWeight: active ? '500' : '400', cursor: 'pointer', fontFamily: 'inherit' }}>
      {label}
    </button>
  )

  if (loading) return <div style={{ padding: '32px', color: '#6B7A99', fontSize: '14px' }}>Chargement...</div>

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '22px', fontWeight: '600', color: '#0A1628', letterSpacing: '-0.3px' }}>Matériel</div>
        <div style={{ fontSize: '14px', color: '#6B7A99', marginTop: '4px' }}>{filtered.length} équipement{filtered.length > 1 ? 's' : ''}</div>
      </div>

      <div style={{ background: '#fff', borderRadius: '12px', border: '0.5px solid #DDE5F0', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ padding: '8px 12px', border: '0.5px solid #DDE5F0', borderRadius: '8px', fontSize: '13px', color: '#0A1628', fontFamily: 'inherit', outline: 'none', width: '200px' }} />
        <div style={{ width: '1px', height: '24px', background: '#DDE5F0' }} />
        <div style={{ display: 'flex', gap: '6px' }}>
          {filterBtn('Tous', filterStatut === 'tous', () => setFilterStatut('tous'))}
          {filterBtn('En service', filterStatut === 'en_service', () => setFilterStatut('en_service'))}
          {filterBtn('Maintenance', filterStatut === 'maintenance', () => setFilterStatut('maintenance'))}
          {filterBtn('Hors service', filterStatut === 'hors_service', () => setFilterStatut('hors_service'))}
        </div>
        <div style={{ width: '1px', height: '24px', background: '#DDE5F0' }} />
        <div style={{ display: 'flex', gap: '6px' }}>
          {filterBtn('Tous modes', filterMode === 'tous', () => setFilterMode('tous'))}
          {filterBtn('Location', filterMode === 'location', () => setFilterMode('location'))}
          {filterBtn('Achat', filterMode === 'achat', () => setFilterMode('achat'))}
          {filterBtn('MAD', filterMode === 'mad', () => setFilterMode('mad'))}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: '16px', border: '0.5px solid #DDE5F0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {['Référence', 'Désignation', 'Fabricant / Modèle', 'N° Série', 'Localisation', 'Mode', 'Statut'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#6B7A99', letterSpacing: '0.3px', textTransform: 'uppercase', borderBottom: '0.5px solid #DDE5F0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#6B7A99', fontSize: '13px' }}>Aucun équipement trouvé</td></tr>
            ) : filtered.map((eq, i) => {
              const st = statutStyle(eq.statut)
              return (
                <tr key={eq.id} onClick={() => openFiche(eq)}
                  style={{ borderBottom: i < filtered.length - 1 ? '0.5px solid #F0F4FA' : 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#F8FAFC'}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                >
                  <td style={{ padding: '14px 16px', fontSize: '13px', fontWeight: '600', color: '#1A56DB' }}>{eq.reference}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#0A1628' }}>{eq.designation}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6B7A99' }}>{eq.fabricant} {eq.modele}</td>
                  <td style={{ padding: '14px 16px', fontSize: '12px', color: '#6B7A99', fontFamily: 'monospace' }}>{eq.numero_serie}</td>
                  <td style={{ padding: '14px 16px', fontSize: '13px', color: '#6B7A99' }}>{eq.localisation}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: '#F0F4FA', color: '#6B7A99', padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>{modeLabel(eq.mode_dispo)}</span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: st.bg, color: st.color, padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '500' }}>{st.label}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <div onClick={() => { setSelected(null); setPannDesc(''); setPanneSuccess(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '580px', maxHeight: '88vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(10,22,40,0.15)' }}>
            <div style={{ background: '#0A1628', padding: '24px 28px', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0 }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#fff' }}>{selected.designation}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>{selected.reference}</div>
              </div>
              <button onClick={() => { setSelected(null); setPannDesc(''); setPanneSuccess(false) }}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>

            <div style={{ padding: '24px 28px' }}>
              {[
                { title: 'Identification', rows: [['Référence', selected.reference], ['N° de série', selected.numero_serie || '—'], ['Fabricant', selected.fabricant || '—'], ['Modèle', selected.modele || '—']] },
                { title: 'Statut & Localisation', rows: [['Statut', statutStyle(selected.statut).label], ['Localisation', selected.localisation || '—'], ['Mode', modeLabel(selected.mode_dispo)]] },
                { title: 'Dates', rows: [['Date achat', selected.date_achat || '—'], ['Mise en service', selected.date_mes || '—'], ['Prochaine révision', selected.date_revision || 'Non planifiée']] },
              ].map(section => (
                <div key={section.title} style={{ marginBottom: '24px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#6B7A99', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px', paddingBottom: '8px', borderBottom: '0.5px solid #F0F4FA' }}>{section.title}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {section.rows.map(([label, value]) => (
                      <div key={label}>
                        <div style={{ fontSize: '11px', color: '#6B7A99', marginBottom: '2px' }}>{label}</div>
                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#0A1628' }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#6B7A99', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px', paddingBottom: '8px', borderBottom: '0.5px solid #F0F4FA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>Documents</span>
                  <label style={{ fontSize: '11px', color: '#1A56DB', cursor: 'pointer', fontWeight: '500' }}>
                    {uploadLoading ? 'Upload...' : '+ Ajouter'}
                    <input type='file' style={{ display: 'none' }} onChange={handleUpload} accept='.pdf,.jpg,.jpeg,.png,.doc,.docx' />
                  </label>
                </div>
                {documents.length === 0 ? (
                  <div style={{ fontSize: '13px', color: '#B0BCCE', textAlign: 'center', padding: '16px' }}>Aucun document</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {documents.map(doc => (
                      <a key={doc.id} href={doc.url} target='_blank' rel='noreferrer'
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#F8FAFC', borderRadius: '8px', border: '0.5px solid #DDE5F0', textDecoration: 'none' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A56DB" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <span style={{ fontSize: '13px', color: '#0A1628', fontWeight: '500', flex: 1 }}>{doc.nom}</span>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7A99" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#6B7A99', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px', paddingBottom: '8px', borderBottom: '0.5px solid #F0F4FA' }}>Signaler une panne</div>
                {panneSuccess ? (
                  <div style={{ padding: '12px', background: '#E8F5EF', border: '0.5px solid #BBF7D0', borderRadius: '10px', color: '#00875A', fontSize: '13px', fontWeight: '500', textAlign: 'center' }}>
                    ✓ Panne signalée — Le prestataire a été notifié
                  </div>
                ) : (
                  <>
                    <textarea value={pannDesc} onChange={e => setPannDesc(e.target.value)} rows={2} placeholder="Décrivez le problème observé..."
                      style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #DDE5F0', borderRadius: '8px', fontSize: '13px', color: '#0A1628', fontFamily: 'inherit', outline: 'none', resize: 'none', marginBottom: '10px' }} />
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button
                        onClick={async () => {
                          if (!pannDesc) return
                          setPanneSaving(true)
                          await supabase.from('pannes').insert([{ equipement_id: selected.id, description: pannDesc, statut: 'ouvert' }])
                          await supabase.from('equipements').update({ statut: 'hors_service' }).eq('id', selected.id)
                          setPanneSaving(false)
                          setPanneSuccess(true)
                          load()
                          setTimeout(() => { setSelected(null); setPanneSuccess(false); setPannDesc('') }, 2000)
                        }}
                        disabled={panneSaving || !pannDesc}
                        style={{ flex: 1, padding: '11px', background: panneSaving || !pannDesc ? '#F8FAFC' : '#FEF2F2', border: '0.5px solid #FECACA', borderRadius: '10px', color: '#DC2626', fontSize: '13px', fontWeight: '500', cursor: panneSaving || !pannDesc ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                        {panneSaving ? 'Envoi...' : '🚨 Signaler la panne'}
                      </button>
                      <button onClick={() => { setSelected(null); setPannDesc(''); setPanneSuccess(false) }}
                        style={{ flex: 1, padding: '11px', background: '#F0F4FA', border: '0.5px solid #DDE5F0', borderRadius: '10px', color: '#6B7A99', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>
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
    </div>
  )
}
