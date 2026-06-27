'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type DossierMV = {
  id: string
  numero: string
  statut: string
  decision: string
  description_initiale: string
  date_evenement: string
  created_at: string
  declaration_ansm: boolean
  date_cloture: string
  cause_retenue: string
  actions_correctives: string
  materiel_retire: boolean
  materiel_remplace: boolean
  materiel_quarantaine: boolean
  fabricant_contacte: boolean
  distributeur_contacte: boolean
  date_information_fabricant: string
  date_retour_fabricant: string
  date_declaration_ansm: string
  commentaire_ansm: string
  equipement_id: string
  etablissement_id: string
  panne_id: string
}

export default function MateriovigilancePage() {
  const [dossiers, setDossiers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any | null>(null)
  const [saving, setSaving] = useState(false)
  const [filterStatut, setFilterStatut] = useState('tous')
  const supabase = createClient()

  const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface)' }
  const labelStyle = { display: 'block', fontSize: '11px', fontWeight: '500' as const, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase' as const, letterSpacing: '0.4px' }
  const checkStyle = { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', cursor: 'pointer', marginBottom: '6px' }

  async function load() {
    const { data } = await supabase
      .from('materiovigilance')
      .select('*, equipements(designation, reference, numero_serie, fabricant, modele), etablissements(nom)')
      .order('created_at', { ascending: false })
    setDossiers(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSave() {
    if (!selected) return
    setSaving(true)
    await supabase.from('materiovigilance').update({
      statut: selected.statut,
      materiel_retire: selected.materiel_retire,
      materiel_remplace: selected.materiel_remplace,
      materiel_quarantaine: selected.materiel_quarantaine,
      fabricant_contacte: selected.fabricant_contacte,
      distributeur_contacte: selected.distributeur_contacte,
      date_information_fabricant: selected.date_information_fabricant || null,
      date_retour_fabricant: selected.date_retour_fabricant || null,
      declaration_ansm: selected.declaration_ansm,
      date_declaration_ansm: selected.date_declaration_ansm || null,
      commentaire_ansm: selected.commentaire_ansm || null,
      cause_retenue: selected.cause_retenue || null,
      actions_correctives: selected.actions_correctives || null,
      date_cloture: selected.statut === 'cloture' ? (selected.date_cloture || new Date().toISOString().slice(0, 10)) : null,
      updated_at: new Date().toISOString(),
    }).eq('id', selected.id)
    setSaving(false)
    setSelected(null)
    load()
  }

  const statutStyle = (s: string) => {
    if (s === 'ouvert') return { color: 'var(--danger)', bg: 'var(--danger-light)', label: 'Ouvert' }
    if (s === 'en_cours') return { color: 'var(--warning)', bg: 'var(--warning-light)', label: 'En cours' }
    if (s === 'declare_ansm') return { color: 'var(--purple)', bg: 'var(--purple-light)', label: 'Déclaré ANSM' }
    return { color: 'var(--success)', bg: 'var(--success-light)', label: 'Clôturé' }
  }

  const decisionLabel = (d: string) => {
    if (d === 'sav') return 'SAV'
    if (d === 'incident_qualite') return 'Incident qualité'
    return 'Matériovigilance'
  }

  const filterBtn = (label: string, active: boolean, onClick: () => void) => (
    <button onClick={onClick} style={{ padding: '5px 12px', borderRadius: '20px', border: active ? '1px solid var(--accent)' : '1px solid var(--border)', background: active ? 'var(--accent-light)' : 'transparent', color: active ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '12px', fontWeight: active ? '500' : '400', cursor: 'pointer', fontFamily: 'var(--font)' }}>
      {label}
    </button>
  )

  const filtered = dossiers.filter(d => filterStatut === 'tous' || d.statut === filterStatut)

  if (loading) return <div style={{ padding: '28px', color: 'var(--text-tertiary)', fontSize: '13px', fontFamily: 'var(--font)' }}>Chargement...</div>

  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)' }}>

      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{filtered.length} dossier{filtered.length > 1 ? 's' : ''}</div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '12px 16px', marginBottom: '16px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {filterBtn('Tous', filterStatut === 'tous', () => setFilterStatut('tous'))}
        {filterBtn('Ouvert', filterStatut === 'ouvert', () => setFilterStatut('ouvert'))}
        {filterBtn('En cours', filterStatut === 'en_cours', () => setFilterStatut('en_cours'))}
        {filterBtn('Déclaré ANSM', filterStatut === 'declare_ansm', () => setFilterStatut('declare_ansm'))}
        {filterBtn('Clôturé', filterStatut === 'cloture', () => setFilterStatut('cloture'))}
      </div>

      {filtered.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '48px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <i className="ti ti-shield-check" style={{ fontSize: '24px', color: 'var(--success)' }} aria-hidden="true" />
          </div>
          <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '4px' }}>Aucun dossier de matériovigilance</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Les dossiers sont créés depuis la page Alertes</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map(d => {
            const st = statutStyle(d.statut)
            return (
              <div key={d.id} onClick={() => setSelected(d)}
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: '14px', boxShadow: 'var(--shadow-sm)', borderLeft: '3px solid var(--danger)', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-hover)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface)'}
              >
                <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="ti ti-shield-exclamation" style={{ fontSize: '20px', color: 'var(--danger)' }} aria-hidden="true" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
                        {d.numero}
                        <span style={{ fontSize: '12px', fontWeight: '400', color: 'var(--text-tertiary)', marginLeft: '8px' }}>{d.equipements?.designation}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <i className="ti ti-building-hospital" style={{ fontSize: '13px' }} aria-hidden="true" />
                          {d.etablissements?.nom || '—'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <i className="ti ti-calendar" style={{ fontSize: '13px' }} aria-hidden="true" />
                          {d.date_evenement ? new Date(d.date_evenement).toLocaleDateString('fr-FR') : new Date(d.created_at).toLocaleDateString('fr-FR')}
                        </span>
                        {d.equipements?.numero_serie && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <i className="ti ti-barcode" style={{ fontSize: '13px' }} aria-hidden="true" />
                            N°{d.equipements.numero_serie}
                          </span>
                        )}
                      </div>
                      {d.description_initiale && (
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', fontStyle: 'italic' }}>
                          "{d.description_initiale}"
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flexShrink: 0 }}>
                      <span style={{ background: st.bg, color: st.color, padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '600' }}>{st.label}</span>
                      {d.declaration_ansm && (
                        <span style={{ background: 'var(--purple-light)', color: 'var(--purple)', padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>ANSM ✓</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal dossier MV */}
      {selected && (
        <div onMouseDown={e => { if (e.target === e.currentTarget) setSelected(null) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.12)', border: '1px solid var(--border)' }}>

            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10 }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>{selected.numero}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  {selected.equipements?.designation} · {selected.etablissements?.nom}
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{ width: '30px', height: '30px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-hover)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                <i className="ti ti-x" style={{ fontSize: '14px' }} aria-hidden="true" />
              </button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Infos matériel */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.6px', paddingBottom: '8px', borderBottom: '1px solid var(--border)', marginBottom: '10px' }}>Matériel concerné</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {[
                    ['Désignation', selected.equipements?.designation || '—'],
                    ['Référence', selected.equipements?.reference || '—'],
                    ['N° de série', selected.equipements?.numero_serie || '—'],
                    ['Fabricant', selected.equipements?.fabricant || '—'],
                    ['Modèle', selected.equipements?.modele || '—'],
                    ['Établissement', selected.etablissements?.nom || '—'],
                  ].map(([label, value]) => (
                    <div key={label} style={{ background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{label}</div>
                      <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description */}
              {selected.description_initiale && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.6px', paddingBottom: '8px', borderBottom: '1px solid var(--border)', marginBottom: '10px' }}>Description de l'incident</div>
                  <div style={{ padding: '12px', background: 'var(--danger-light)', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--danger)', fontStyle: 'italic' }}>
                    "{selected.description_initiale}"
                  </div>
                </div>
              )}

              {/* Statut */}
              <div>
                <label style={labelStyle}>Statut du dossier</label>
                <select value={selected.statut} onChange={e => setSelected({ ...selected, statut: e.target.value })} style={inputStyle}>
                  <option value='ouvert'>Ouvert</option>
                  <option value='en_cours'>En cours d'investigation</option>
                  <option value='declare_ansm'>Déclaré à l'ANSM</option>
                  <option value='cloture'>Clôturé</option>
                </select>
              </div>

              {/* Mesures prises */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.6px', paddingBottom: '8px', borderBottom: '1px solid var(--border)', marginBottom: '10px' }}>Mesures prises</div>
                {[
                  { key: 'materiel_retire', label: 'Matériel retiré du service' },
                  { key: 'materiel_remplace', label: 'Matériel remplacé' },
                  { key: 'materiel_quarantaine', label: 'Matériel mis en quarantaine' },
                  { key: 'fabricant_contacte', label: 'Fabricant contacté' },
                  { key: 'distributeur_contacte', label: 'Distributeur contacté' },
                ].map(item => (
                  <div key={item.key} style={checkStyle} onClick={() => setSelected({ ...selected, [item.key]: !selected[item.key] })}>
                    <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: `2px solid ${selected[item.key] ? 'var(--accent)' : 'var(--border)'}`, background: selected[item.key] ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.1s' }}>
                      {selected[item.key] && <i className="ti ti-check" style={{ fontSize: '10px', color: 'white' }} aria-hidden="true" />}
                    </div>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{item.label}</span>
                  </div>
                ))}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                  <div>
                    <label style={labelStyle}>Date information fabricant</label>
                    <input type='date' value={selected.date_information_fabricant || ''} onChange={e => setSelected({ ...selected, date_information_fabricant: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Date retour fabricant</label>
                    <input type='date' value={selected.date_retour_fabricant || ''} onChange={e => setSelected({ ...selected, date_retour_fabricant: e.target.value })} style={inputStyle} />
                  </div>
                </div>
              </div>

              {/* Déclaration ANSM */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.6px', paddingBottom: '8px', borderBottom: '1px solid var(--border)', marginBottom: '10px' }}>Déclaration ANSM</div>
                <div style={checkStyle} onClick={() => setSelected({ ...selected, declaration_ansm: !selected.declaration_ansm })}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '4px', border: `2px solid ${selected.declaration_ansm ? 'var(--accent)' : 'var(--border)'}`, background: selected.declaration_ansm ? 'var(--accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {selected.declaration_ansm && <i className="ti ti-check" style={{ fontSize: '10px', color: 'white' }} aria-hidden="true" />}
                  </div>
                  <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>Déclaration ANSM réalisée</span>
                </div>
                {selected.declaration_ansm && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                    <div>
                      <label style={labelStyle}>Date de déclaration</label>
                      <input type='date' value={selected.date_declaration_ansm || ''} onChange={e => setSelected({ ...selected, date_declaration_ansm: e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Commentaire</label>
                      <input type='text' value={selected.commentaire_ansm || ''} onChange={e => setSelected({ ...selected, commentaire_ansm: e.target.value })} placeholder="N° accusé réception..." style={inputStyle} />
                    </div>
                  </div>
                )}
              </div>

              {/* Clôture */}
              {selected.statut === 'cloture' && (
                <div>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.6px', paddingBottom: '8px', borderBottom: '1px solid var(--border)', marginBottom: '10px' }}>Clôture du dossier</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <label style={labelStyle}>Cause retenue</label>
                      <textarea value={selected.cause_retenue || ''} onChange={e => setSelected({ ...selected, cause_retenue: e.target.value })}
                        placeholder="Cause identifiée de l'incident..." rows={2} style={{ ...inputStyle, resize: 'none' }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Actions correctives réalisées</label>
                      <textarea value={selected.actions_correctives || ''} onChange={e => setSelected({ ...selected, actions_correctives: e.target.value })}
                        placeholder="Actions mises en place..." rows={2} style={{ ...inputStyle, resize: 'none' }} />
                    </div>
                    <div>
                      <label style={labelStyle}>Date de clôture</label>
                      <input type='date' value={selected.date_cloture || new Date().toISOString().slice(0, 10)} onChange={e => setSelected({ ...selected, date_cloture: e.target.value })} style={inputStyle} />
                    </div>
                  </div>
                </div>
              )}

              {/* Boutons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setSelected(null)}
                  style={{ flex: 1, padding: '11px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  Annuler
                </button>
                <button onClick={handleSave} disabled={saving}
                  style={{ flex: 1, padding: '11px', background: saving ? 'rgba(26,86,219,0.4)' : 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', boxShadow: '0 1px 4px rgba(26,86,219,0.3)' }}>
                  {saving ? 'Enregistrement...' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}