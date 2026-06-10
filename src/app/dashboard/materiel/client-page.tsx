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
  if (s === 'en_service') return { bg: '#E8F5EF', color: '#00875A', label: 'En service', dot: '#00875A' }
  if (s === 'maintenance') return { bg: '#FFF7E6', color: '#B45309', label: 'En maintenance', dot: '#B45309' }
  return { bg: '#FEF2F2', color: '#DC2626', label: 'Hors service', dot: '#DC2626' }
}

export default function MaterielClientPage({ etablissementId }: { etablissementId: string }) {
  const [equipements, setEquipements] = useState<Equipement[]>([])
  const [selected, setSelected] = useState<Equipement | null>(null)
  const [loading, setLoading] = useState(true)
  const [filterStatut, setFilterStatut] = useState('tous')
  const [pannDesc, setPannDesc] = useState('')
  const [panneSaving, setPanneSaving] = useState(false)
  const [panneSuccess, setPanneSuccess] = useState(false)
  const [documents, setDocuments] = useState<any[]>([])
  const supabase = createClient()

  async function load() {
    const { data } = await supabase
      .from('equipements')
      .select('*')
      .eq('etablissement_id', etablissementId)
      .order('created_at')
    setEquipements(data || [])
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
    loadDocs(eq.id)
  }

  const filtered = filterStatut === 'tous' ? equipements : equipements.filter(e => e.statut === filterStatut)

  const filterBtn = (label: string, active: boolean, onClick: () => void) => (
    <button onClick={onClick} style={{ padding: '7px 14px', borderRadius: '8px', border: '0.5px solid', borderColor: active ? '#1A56DB' : '#DDE5F0', background: active ? '#EEF2FF' : '#fff', color: active ? '#1A56DB' : '#6B7A99', fontSize: '12px', fontWeight: active ? '500' : '400', cursor: 'pointer', fontFamily: 'inherit' }}>
      {label}
    </button>
  )

  if (loading) return <div style={{ padding: '32px', color: '#6B7A99', fontSize: '14px' }}>Chargement...</div>

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '22px', fontWeight: '600', color: '#0A1628', letterSpacing: '-0.3px' }}>Mon matériel</div>
        <div style={{ fontSize: '14px', color: '#6B7A99', marginTop: '4px' }}>{equipements.length} équipement{equipements.length > 1 ? 's' : ''}</div>
      </div>

      {equipements.filter(e => e.statut === 'hors_service').length > 0 && (
        <div style={{ background: '#FEF2F2', border: '0.5px solid #FECACA', borderRadius: '12px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span style={{ fontSize: '13px', color: '#DC2626', fontWeight: '500' }}>
            {equipements.filter(e => e.statut === 'hors_service').length} équipement{equipements.filter(e => e.statut === 'hors_service').length > 1 ? 's' : ''} hors service — votre prestataire a été notifié
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        {filterBtn('Tous', filterStatut === 'tous', () => setFilterStatut('tous'))}
        {filterBtn('En service', filterStatut === 'en_service', () => setFilterStatut('en_service'))}
        {filterBtn('Maintenance', filterStatut === 'maintenance', () => setFilterStatut('maintenance'))}
        {filterBtn('Hors service', filterStatut === 'hors_service', () => setFilterStatut('hors_service'))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {filtered.map(eq => {
          const st = statutStyle(eq.statut)
          return (
            <div key={eq.id} onClick={() => openFiche(eq)}
              style={{ background: '#fff', borderRadius: '16px', border: '0.5px solid #DDE5F0', padding: '22px', cursor: 'pointer', transition: 'box-shadow 0.15s', borderLeft: `3px solid ${st.dot}` }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(10,22,40,0.08)'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#0A1628' }}>{eq.designation}</div>
                  <div style={{ fontSize: '12px', color: '#6B7A99', marginTop: '2px' }}>{eq.reference}</div>
                </div>
                <span style={{ background: st.bg, color: st.color, padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '500', whiteSpace: 'nowrap' }}>{st.label}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#6B7A99', lineHeight: 1.8 }}>
                <div>📍 {eq.localisation || '—'}</div>
                <div>🏭 {eq.fabricant} {eq.modele}</div>
                {eq.date_revision && <div>🔧 Révision : {eq.date_revision}</div>}
              </div>
            </div>
          )
        })}
      </div>

      {selected && (
        <div onClick={() => { setSelected(null); setPannDesc(''); setPanneSuccess(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '520px', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 20px 60px rgba(10,22,40,0.15)' }}>
            <div style={{ background: '#0A1628', padding: '22px 26px', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#fff' }}>{selected.designation}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>{selected.reference}</div>
              </div>
              <button onClick={() => { setSelected(null); setPannDesc(''); setPanneSuccess(false) }}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}>✕</button>
            </div>

            <div style={{ padding: '22px 26px' }}>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#6B7A99', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px', paddingBottom: '8px', borderBottom: '0.5px solid #F0F4FA' }}>Informations</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {[['Statut', statutStyle(selected.statut).label], ['Localisation', selected.localisation || '—'], ['Fabricant', selected.fabricant || '—'], ['Modèle', selected.modele || '—'], ['N° série', selected.numero_serie || '—'], ['Révision', selected.date_revision || '—']].map(([l, v]) => (
                    <div key={l}>
                      <div style={{ fontSize: '11px', color: '#6B7A99', marginBottom: '2px' }}>{l}</div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: '#0A1628' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>

              {documents.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: '#6B7A99', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px', paddingBottom: '8px', borderBottom: '0.5px solid #F0F4FA' }}>Documents</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {documents.map(doc => (
                      <a key={doc.id} href={doc.url} target='_blank' rel='noreferrer'
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#F8FAFC', borderRadius: '8px', border: '0.5px solid #DDE5F0', textDecoration: 'none' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A56DB" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        <span style={{ fontSize: '13px', color: '#0A1628', fontWeight: '500' }}>{doc.nom}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: '#6B7A99', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '12px', paddingBottom: '8px', borderBottom: '0.5px solid #F0F4FA' }}>Signaler une panne</div>
                {panneSuccess ? (
                  <div style={{ padding: '12px', background: '#E8F5EF', border: '0.5px solid #BBF7D0', borderRadius: '10px', color: '#00875A', fontSize: '13px', fontWeight: '500', textAlign: 'center' }}>
                    ✓ Panne signalée — Votre prestataire interviendra sous 24h
                  </div>
                ) : (
                  <>
                    <textarea value={pannDesc} onChange={e => setPannDesc(e.target.value)} rows={2}
                      placeholder="Décrivez le problème..."
                      style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #DDE5F0', borderRadius: '8px', fontSize: '13px', color: '#0A1628', fontFamily: 'inherit', outline: 'none', resize: 'none', marginBottom: '10px' }} />
                    <button
                      onClick={async () => {
                        if (!pannDesc) return
                        setPanneSaving(true)
                        await supabase.from('pannes').insert([{ equipement_id: selected.id, description: pannDesc, statut: 'ouvert' }])
                        await supabase.from('equipements').update({ statut: 'hors_service' }).eq('id', selected.id)
                        setPanneSaving(false)
                        setPanneSuccess(true)
                        load()
                        setTimeout(() => { setSelected(null); setPanneSuccess(false); setPannDesc('') }, 2500)
                      }}
                      disabled={panneSaving || !pannDesc}
                      style={{ width: '100%', padding: '11px', background: panneSaving || !pannDesc ? '#F8FAFC' : '#FEF2F2', border: '0.5px solid #FECACA', borderRadius: '10px', color: '#DC2626', fontSize: '13px', fontWeight: '500', cursor: panneSaving || !pannDesc ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
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