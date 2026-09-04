'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const meditrack = createClient(
  'https://nkfivuqomqubhpsvgdfm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZml2dXFvbXF1Ymhwc3ZnZGZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDg1Mjc5NCwiZXhwIjoyMDk2NDI4Nzk0fQ.d9MRLh_1p7HDZccijNZzUwMLEaKJ0GBNWI8oX6YWIMk'
)

const inp = {
  width: '100%',
  padding: '10px 13px',
  border: '1px solid #E5E7EB',
  borderRadius: '9px',
  fontSize: '13px',
  fontFamily: 'var(--font)',
  outline: 'none',
  background: '#fff',
  boxSizing: 'border-box' as const,
  transition: 'border-color 0.15s',
}

const CATEGORIES = ['Fauteuil roulant', 'Lit medicalisé', 'Oxygénothérapie', 'Matelas anti-escarres', 'Déambulateur', 'Lève-personne', 'Aérosolthérapie', 'Nutrition entérale', 'Autre']

interface Props {
  meditrackEtabId: string
  critereCode: string
  onClose: () => void
  onSaved: () => void
}

type Tab = 'equipements' | 'livraisons' | 'maintenances'

const TAB_CONFIG: Record<string, { tabs: Tab[]; titre: string; description: string }> = {
  '2.2.1': { tabs: ['equipements', 'livraisons'], titre: 'Gestion des prescriptions', description: 'Enregistrez vos équipements et livraisons pour prouver la prise en charge des prescriptions.' },
  '2.3.2': { tabs: ['equipements', 'livraisons'], titre: 'Traçabilité des installations', description: 'Tracez chaque installation de matériel au domicile du patient.' },
  '2.4.3': { tabs: ['equipements', 'maintenances'], titre: 'Gestion des maintenances SAV', description: 'Tracez chaque maintenance et dépannage pour prouver la continuité du service.' },
  '2.5.1': { tabs: ['equipements', 'livraisons'], titre: 'Traçabilité des reprises', description: 'Enregistrez les reprises de matériel en fin de prestation.' },
}

export default function MeditrackSaisie({ meditrackEtabId, critereCode, onClose, onSaved }: Props) {
  const config = TAB_CONFIG[critereCode] || TAB_CONFIG['2.3.2']
  const [activeTab, setActiveTab] = useState<Tab>(config.tabs[0])
  const [equipements, setEquipements] = useState<any[]>([])
  const [livraisons, setLivraisons] = useState<any[]>([])
  const [maintenances, setMaintenances] = useState<any[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Formulaires
  const [equipForm, setEquipForm] = useState({
    designation: '', categorie: '', fabricant: '', modele: '',
    numero_serie: '', mode_dispo: 'location', statut: 'en_service',
    date_mes: new Date().toISOString().split('T')[0], commentaires: ''
  })
  const [livrForm, setLivrForm] = useState({
    equipement_id: '', date_prevue: new Date().toISOString().split('T')[0],
    statut: 'planifiee', notes: ''
  })
  const [maintForm, setMaintForm] = useState({
    equipement_id: '', type: 'preventive',
    date_prevue: new Date().toISOString().split('T')[0],
    date_realisee: '', statut: 'planifiee', notes: ''
  })

  useEffect(() => { loadData() }, [meditrackEtabId])

  async function loadData() {
    const { data: eq } = await meditrack.from('equipements').select('*').eq('etablissement_id', meditrackEtabId).order('created_at', { ascending: false })
    setEquipements(eq || [])
    if (eq && eq.length > 0) {
      setLivrForm(p => ({ ...p, equipement_id: eq[0].id }))
      setMaintForm(p => ({ ...p, equipement_id: eq[0].id }))
    }
    const { data: lv } = await meditrack.from('livraisons').select('*, equipements(designation)').eq('etablissement_id', meditrackEtabId).order('created_at', { ascending: false })
    setLivraisons(lv || [])
    const eqIds = (eq || []).map((e: any) => e.id)
    if (eqIds.length > 0) {
      const { data: mn } = await meditrack.from('maintenances').select('*, equipements(designation)').in('equipement_id', eqIds).order('created_at', { ascending: false })
      setMaintenances(mn || [])
    }
  }

  async function saveEquipement() {
    if (!equipForm.designation) return
    setSaving(true)
    const payload = { ...equipForm, etablissement_id: meditrackEtabId }
    console.log('saveEquipement payload:', JSON.stringify(payload))
    const { error } = await meditrack.from('equipements').insert([payload])
    console.log('saveEquipement error:', error?.message, error?.details)
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 2000); await loadData(); setEquipForm({ designation: '', categorie: '', fabricant: '', modele: '', numero_serie: '', mode_dispo: 'location', statut: 'en_service', date_mes: new Date().toISOString().split('T')[0], commentaires: '' }) }
    setSaving(false)
  }

  async function saveLivraison() {
    if (!livrForm.equipement_id) return
    setSaving(true)
    const { error } = await meditrack.from('livraisons').insert([{ ...livrForm, etablissement_id: meditrackEtabId }])
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 2000); await loadData(); setLivrForm(p => ({ ...p, notes: '', statut: 'planifiee' })) }
    setSaving(false)
  }

  async function saveMaintenance() {
    if (!maintForm.equipement_id) return
    setSaving(true)
    const { error } = await meditrack.from('maintenances').insert([{ ...maintForm }])
    if (!error) { setSaved(true); setTimeout(() => setSaved(false), 2000); await loadData(); setMaintForm(p => ({ ...p, notes: '', statut: 'planifiee', date_realisee: '' })) }
    setSaving(false)
  }

  const labelStyle = { display: 'block' as const, fontSize: '11px', fontWeight: '600' as const, color: '#6B7280', marginBottom: '5px', textTransform: 'uppercase' as const, letterSpacing: '0.4px' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)', overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '820px', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', overflow: 'hidden', marginTop: '20px', marginBottom: '20px' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1E3A8A, #1A56DB)', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.15)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-database" style={{ fontSize: '20px', color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>MediTrack — {config.titre}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)', marginTop: '2px' }}>{config.description}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <a href="https://www.meditrack-app.fr" target="_blank"
              style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: '600', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <i className="ti ti-external-link" style={{ fontSize: '13px' }} />
              Vue complète
            </a>
            <button onClick={onClose} style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
              <i className="ti ti-x" style={{ fontSize: '16px' }} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
          {config.tabs.map(tab => {
            const labels: Record<Tab, { label: string; icon: string; count: number }> = {
              equipements: { label: 'Équipements', icon: 'ti-medical-cross', count: equipements.length },
              livraisons: { label: critereCode === '2.5.1' ? 'Reprises' : 'Livraisons', icon: 'ti-truck-delivery', count: livraisons.length },
              maintenances: { label: 'Maintenances', icon: 'ti-tool', count: maintenances.length },
            }
            const t = labels[tab]
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ flex: 1, padding: '14px 16px', background: activeTab === tab ? '#fff' : 'transparent', border: 'none', borderBottom: activeTab === tab ? '2px solid #1A56DB' : '2px solid transparent', color: activeTab === tab ? '#1A56DB' : '#6B7280', fontSize: '13px', fontWeight: activeTab === tab ? '700' : '400', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s' }}>
                <i className={`ti ${t.icon}`} style={{ fontSize: '15px' }} />
                {t.label}
                <span style={{ padding: '1px 7px', background: activeTab === tab ? '#EBF2FF' : '#F3F4F6', borderRadius: '20px', fontSize: '11px', fontWeight: '600', color: activeTab === tab ? '#1A56DB' : '#9CA3AF' }}>{t.count}</span>
              </button>
            )
          })}
        </div>

        <div style={{ padding: '24px 28px', maxHeight: '65vh', overflowY: 'auto' }}>

          {/* EQUIPEMENTS */}
          {activeTab === 'equipements' && (
            <div>
              <div style={{ background: '#F8FAFF', border: '1px solid #BFDBFE', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1A56DB', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="ti ti-plus" style={{ fontSize: '14px' }} />
                  Ajouter un équipement
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Désignation *</label>
                    <input value={equipForm.designation} onChange={e => setEquipForm(p => ({ ...p, designation: e.target.value }))} placeholder="ex: Lit médicalisé électrique 2 plans" style={inp} onFocus={e => e.target.style.borderColor = '#1A56DB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                  </div>
                  <div>
                    <label style={labelStyle}>Catégorie</label>
                    <select value={equipForm.categorie} onChange={e => setEquipForm(p => ({ ...p, categorie: e.target.value }))} style={inp}>
                      <option value="">Sélectionner...</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Mode de disposition</label>
                    <select value={equipForm.mode_dispo} onChange={e => setEquipForm(p => ({ ...p, mode_dispo: e.target.value }))} style={inp}>
                      <option value="location">Location</option>
                      <option value="achat">Achat / Vente</option>
                      <option value="mad">MAD (Mise à disposition)</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Fabricant</label>
                    <input value={equipForm.fabricant} onChange={e => setEquipForm(p => ({ ...p, fabricant: e.target.value }))} placeholder="ex: Invacare" style={inp} onFocus={e => e.target.style.borderColor = '#1A56DB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                  </div>
                  <div>
                    <label style={labelStyle}>Modèle</label>
                    <input value={equipForm.modele} onChange={e => setEquipForm(p => ({ ...p, modele: e.target.value }))} placeholder="ex: Softform Premier" style={inp} onFocus={e => e.target.style.borderColor = '#1A56DB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                  </div>
                  <div>
                    <label style={labelStyle}>N° de série</label>
                    <input value={equipForm.numero_serie} onChange={e => setEquipForm(p => ({ ...p, numero_serie: e.target.value }))} placeholder="SN-XXXXXXXX" style={inp} onFocus={e => e.target.style.borderColor = '#1A56DB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                  </div>
                  <div>
                    <label style={labelStyle}>Date de mise en service</label>
                    <input type="date" value={equipForm.date_mes} onChange={e => setEquipForm(p => ({ ...p, date_mes: e.target.value }))} style={inp} />
                  </div>
                  <div>
                    <label style={labelStyle}>Statut</label>
                    <select value={equipForm.statut} onChange={e => setEquipForm(p => ({ ...p, statut: e.target.value }))} style={inp}>
                      <option value="en_service">En service</option>
                      <option value="disponible">Disponible</option>
                      <option value="en_maintenance">En maintenance</option>
                      <option value="retire">Retiré</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Commentaires</label>
                    <textarea value={equipForm.commentaires} onChange={e => setEquipForm(p => ({ ...p, commentaires: e.target.value }))} placeholder="Informations complémentaires..." rows={2} style={{ ...inp, resize: 'vertical' }} onFocus={e => e.target.style.borderColor = '#1A56DB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                  </div>
                </div>
                <button onClick={saveEquipement} disabled={saving || !equipForm.designation}
                  style={{ marginTop: '14px', padding: '10px 20px', background: saved ? '#10B981' : saving || !equipForm.designation ? 'rgba(26,86,219,0.3)' : '#1A56DB', border: 'none', borderRadius: '9px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: saving || !equipForm.designation ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className={`ti ${saved ? 'ti-check' : 'ti-plus'}`} style={{ fontSize: '14px' }} />
                  {saved ? 'Enregistré !' : saving ? 'Enregistrement...' : 'Ajouter l\'équipement'}
                </button>
              </div>

              {/* Liste équipements */}
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>{equipements.length} équipement{equipements.length > 1 ? 's' : ''} enregistré{equipements.length > 1 ? 's' : ''}</div>
              {equipements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF', fontSize: '13px', background: '#F9FAFB', borderRadius: '10px', border: '1px dashed #E5E7EB' }}>
                  Aucun équipement — ajoutez le premier ci-dessus
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {equipements.map((eq: any) => (
                    <div key={eq.id} style={{ padding: '12px 16px', background: '#F9FAFB', borderRadius: '10px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: eq.statut === 'en_service' ? '#ECFDF5' : eq.statut === 'en_maintenance' ? '#FEF3C7' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="ti ti-medical-cross" style={{ fontSize: '16px', color: eq.statut === 'en_service' ? '#059669' : eq.statut === 'en_maintenance' ? '#D97706' : '#9CA3AF' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{eq.designation}</div>
                        <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>{eq.categorie} · {eq.fabricant} {eq.modele} · SN: {eq.numero_serie || '—'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '10px', fontWeight: '600', color: eq.statut === 'en_service' ? '#059669' : eq.statut === 'en_maintenance' ? '#D97706' : '#9CA3AF', background: eq.statut === 'en_service' ? '#D1FAE5' : eq.statut === 'en_maintenance' ? '#FEF3C7' : '#F3F4F6', padding: '3px 8px', borderRadius: '20px' }}>
                          {eq.statut?.replace('_', ' ')}
                        </span>
                        <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{eq.mode_dispo}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* LIVRAISONS */}
          {activeTab === 'livraisons' && (
            <div>
              <div style={{ background: '#F8FAFF', border: '1px solid #BFDBFE', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#1A56DB', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="ti ti-plus" style={{ fontSize: '14px' }} />
                  {critereCode === '2.5.1' ? 'Enregistrer une reprise' : 'Enregistrer une livraison'}
                </div>
                {equipements.length === 0 ? (
                  <div style={{ padding: '16px', background: '#FFFBEB', borderRadius: '8px', border: '1px solid #FDE68A', fontSize: '13px', color: '#92400E' }}>
                    <i className="ti ti-alert-triangle" style={{ fontSize: '14px', marginRight: '8px' }} />
                    Vous devez d'abord ajouter un équipement dans l'onglet "Équipements"
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>Équipement *</label>
                      <select value={livrForm.equipement_id} onChange={e => setLivrForm(p => ({ ...p, equipement_id: e.target.value }))} style={inp}>
                        {equipements.map((eq: any) => <option key={eq.id} value={eq.id}>{eq.designation} — {eq.categorie}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Date {critereCode === '2.5.1' ? 'de reprise' : 'de livraison'}</label>
                      <input type="date" value={livrForm.date_prevue} onChange={e => setLivrForm(p => ({ ...p, date_prevue: e.target.value }))} style={inp} />
                    </div>
                    <div>
                      <label style={labelStyle}>Statut</label>
                      <select value={livrForm.statut} onChange={e => setLivrForm(p => ({ ...p, statut: e.target.value }))} style={inp}>
                        <option value="planifiee">Planifiée</option>
                        <option value="realisee">Réalisée</option>
                        <option value="annulee">Annulée</option>
                      </select>
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>Notes (référence anonymisée)</label>
                      <textarea value={livrForm.notes} onChange={e => setLivrForm(p => ({ ...p, notes: e.target.value }))} placeholder="ex: Dossier 001 — Installation avec formation patient" rows={2} style={{ ...inp, resize: 'vertical' }} onFocus={e => e.target.style.borderColor = '#1A56DB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                    </div>
                  </div>
                )}
                {equipements.length > 0 && (
                  <button onClick={saveLivraison} disabled={saving || !livrForm.equipement_id}
                    style={{ marginTop: '14px', padding: '10px 20px', background: saved ? '#10B981' : '#1A56DB', border: 'none', borderRadius: '9px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className={`ti ${saved ? 'ti-check' : 'ti-truck-delivery'}`} style={{ fontSize: '14px' }} />
                    {saved ? 'Enregistré !' : saving ? 'Enregistrement...' : critereCode === '2.5.1' ? 'Enregistrer la reprise' : 'Enregistrer la livraison'}
                  </button>
                )}
              </div>

              {/* Liste livraisons */}
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>{livraisons.length} {critereCode === '2.5.1' ? 'reprise' : 'livraison'}{livraisons.length > 1 ? 's' : ''} enregistrée{livraisons.length > 1 ? 's' : ''}</div>
              {livraisons.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF', fontSize: '13px', background: '#F9FAFB', borderRadius: '10px', border: '1px dashed #E5E7EB' }}>Aucune entrée pour le moment</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {livraisons.map((lv: any) => (
                    <div key={lv.id} style={{ padding: '12px 16px', background: '#F9FAFB', borderRadius: '10px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: lv.statut === 'realisee' ? '#ECFDF5' : '#EBF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="ti ti-truck-delivery" style={{ fontSize: '16px', color: lv.statut === 'realisee' ? '#059669' : '#1A56DB' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{(lv as any).equipements?.designation || 'Équipement'}</div>
                        <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>{lv.notes || '—'}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                        <span style={{ fontSize: '10px', fontWeight: '600', color: lv.statut === 'realisee' ? '#059669' : '#1A56DB', background: lv.statut === 'realisee' ? '#D1FAE5' : '#EBF2FF', padding: '2px 8px', borderRadius: '20px' }}>{lv.statut}</span>
                        <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{new Date(lv.date_prevue).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MAINTENANCES */}
          {activeTab === 'maintenances' && (
            <div>
              <div style={{ background: '#FFF7F0', border: '1px solid #FED7AA', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#C2410C', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="ti ti-tool" style={{ fontSize: '14px' }} />
                  Enregistrer une maintenance
                </div>
                {equipements.length === 0 ? (
                  <div style={{ padding: '16px', background: '#FFFBEB', borderRadius: '8px', border: '1px solid #FDE68A', fontSize: '13px', color: '#92400E' }}>
                    Vous devez d'abord ajouter un équipement
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>Équipement *</label>
                      <select value={maintForm.equipement_id} onChange={e => setMaintForm(p => ({ ...p, equipement_id: e.target.value }))} style={inp}>
                        {equipements.map((eq: any) => <option key={eq.id} value={eq.id}>{eq.designation}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Type</label>
                      <select value={maintForm.type} onChange={e => setMaintForm(p => ({ ...p, type: e.target.value }))} style={inp}>
                        <option value="preventive">Préventive</option>
                        <option value="corrective">Corrective (panne)</option>
                        <option value="revision">Révision périodique</option>
                        <option value="nettoyage">Nettoyage / Désinfection</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Statut</label>
                      <select value={maintForm.statut} onChange={e => setMaintForm(p => ({ ...p, statut: e.target.value }))} style={inp}>
                        <option value="planifiee">Planifiée</option>
                        <option value="en_cours">En cours</option>
                        <option value="realisee">Réalisée</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Date prévue</label>
                      <input type="date" value={maintForm.date_prevue} onChange={e => setMaintForm(p => ({ ...p, date_prevue: e.target.value }))} style={inp} />
                    </div>
                    <div>
                      <label style={labelStyle}>Date réalisée</label>
                      <input type="date" value={maintForm.date_realisee} onChange={e => setMaintForm(p => ({ ...p, date_realisee: e.target.value }))} style={inp} />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>Notes</label>
                      <textarea value={maintForm.notes} onChange={e => setMaintForm(p => ({ ...p, notes: e.target.value }))} placeholder="Description de l'intervention..." rows={2} style={{ ...inp, resize: 'vertical' }} />
                    </div>
                  </div>
                )}
                {equipements.length > 0 && (
                  <button onClick={saveMaintenance} disabled={saving}
                    style={{ marginTop: '14px', padding: '10px 20px', background: saved ? '#10B981' : '#C2410C', border: 'none', borderRadius: '9px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className={`ti ${saved ? 'ti-check' : 'ti-tool'}`} style={{ fontSize: '14px' }} />
                    {saved ? 'Enregistré !' : saving ? 'Enregistrement...' : 'Enregistrer la maintenance'}
                  </button>
                )}
              </div>

              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>{maintenances.length} maintenance{maintenances.length > 1 ? 's' : ''} enregistrée{maintenances.length > 1 ? 's' : ''}</div>
              {maintenances.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF', fontSize: '13px', background: '#F9FAFB', borderRadius: '10px', border: '1px dashed #E5E7EB' }}>Aucune maintenance enregistrée</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {maintenances.map((mn: any) => (
                    <div key={mn.id} style={{ padding: '12px 16px', background: '#F9FAFB', borderRadius: '10px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: mn.statut === 'realisee' ? '#ECFDF5' : '#FFF7F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="ti ti-tool" style={{ fontSize: '16px', color: mn.statut === 'realisee' ? '#059669' : '#C2410C' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{(mn as any).equipements?.designation || 'Équipement'}</div>
                        <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '2px' }}>{mn.type} · {mn.notes || '—'}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                        <span style={{ fontSize: '10px', fontWeight: '600', color: mn.statut === 'realisee' ? '#059669' : '#C2410C', background: mn.statut === 'realisee' ? '#D1FAE5' : '#FFF7F0', padding: '2px 8px', borderRadius: '20px' }}>{mn.statut}</span>
                        <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{mn.date_realisee ? new Date(mn.date_realisee).toLocaleDateString('fr-FR') : new Date(mn.date_prevue).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 28px', borderTop: '1px solid #E5E7EB', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '12px', color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="ti ti-shield-check" style={{ fontSize: '13px', color: '#10B981' }} />
            Données synchronisées avec MediTrack — preuve de conformité HAS
          </div>
          <button onClick={() => { onSaved(); onClose() }}
            style={{ padding: '8px 18px', background: '#1A56DB', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)' }}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}