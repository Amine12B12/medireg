'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const supabase = createClient()

const POSTES = ['Gérant / Directeur', 'Responsable qualité', 'Technicien SAV', 'Livreur', 'Commercial', 'Pharmacien', 'Infirmier', 'Assistant administratif', 'Autre']

const COMPETENCES_LIST = [
  'Installation matériel médical',
  'Maintenance et SAV',
  'Formation patient',
  'Gestion des prescriptions',
  'Désinfection / Hygiène',
  'Conduite véhicule utilitaire',
  'Matériovigilance',
  'Gestion des stocks',
  'Accueil téléphonique',
  'Facturation / Remboursements',
]

const TYPES_FORMATION = [
  'Formation interne',
  'Formation externe',
  'DPC (Développement Professionnel Continu)',
  'Certification',
  'Habilitation',
  'E-learning',
]

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
}

const labelStyle = {
  display: 'block' as const,
  fontSize: '11px',
  fontWeight: '600' as const,
  color: '#6B7280',
  marginBottom: '5px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.4px',
}

interface Collaborateur {
  id: string
  nom: string
  prenom: string
  poste: string
  date_embauche: string
  competences: string[]
  formations: Formation[]
  created_at: string
}

interface Formation {
  id: string
  titre: string
  type: string
  date: string
  duree: string
  organisme: string
  statut: 'planifiee' | 'realisee'
}

export default function RHPage() {
  const [collaborateurs, setCollaborateurs] = useState<Collaborateur[]>([])
  const [societeId, setSocieteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedCollab, setSelectedCollab] = useState<Collaborateur | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showFormationForm, setShowFormationForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()

  const [form, setForm] = useState({
    nom: '', prenom: '', poste: '', date_embauche: '', competences: [] as string[]
  })

  const [formationForm, setFormationForm] = useState<Formation>({
    id: '', titre: '', type: 'Formation interne', date: new Date().toISOString().split('T')[0],
    duree: '', organisme: '', statut: 'planifiee'
  })

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('client_id').eq('id', user.id).single()
    if (!prof?.client_id) return
    const { data: soc } = await supabase.from('societes').select('id').eq('client_id', prof.client_id).single()
    if (!soc) return
    setSocieteId(soc.id)
    const { data: collabs } = await supabase.from('rh_collaborateurs').select('*').eq('societe_id', soc.id).order('created_at')
    setCollaborateurs(collabs || [])
    setLoading(false)
  }

  async function saveCollab() {
    if (!societeId || !form.nom || !form.prenom) return
    setSaving(true)
    const payload = { ...form, societe_id: societeId, formations: [] }
    if (selectedCollab) {
      await supabase.from('rh_collaborateurs').update({ nom: form.nom, prenom: form.prenom, poste: form.poste, date_embauche: form.date_embauche, competences: form.competences }).eq('id', selectedCollab.id)
    } else {
      await supabase.from('rh_collaborateurs').insert([payload])
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setShowForm(false)
    setForm({ nom: '', prenom: '', poste: '', date_embauche: '', competences: [] })
    setSelectedCollab(null)
    await load()
    setSaving(false)
  }

  async function saveFormation() {
    if (!selectedCollab || !formationForm.titre) return
    setSaving(true)
    const newFormation = { ...formationForm, id: Date.now().toString() }
    const formations = [...(selectedCollab.formations || []), newFormation]
    await supabase.from('rh_collaborateurs').update({ formations }).eq('id', selectedCollab.id)
    setShowFormationForm(false)
    setFormationForm({ id: '', titre: '', type: 'Formation interne', date: new Date().toISOString().split('T')[0], duree: '', organisme: '', statut: 'planifiee' })
    await load()
    const { data } = await supabase.from('rh_collaborateurs').select('*').eq('id', selectedCollab.id).single()
    if (data) setSelectedCollab(data)
    setSaving(false)
  }

  async function deleteFormation(formationId: string) {
    if (!selectedCollab) return
    const formations = selectedCollab.formations.filter(f => f.id !== formationId)
    await supabase.from('rh_collaborateurs').update({ formations }).eq('id', selectedCollab.id)
    const { data } = await supabase.from('rh_collaborateurs').select('*').eq('id', selectedCollab.id).single()
    if (data) setSelectedCollab(data)
    await load()
  }

  const toggleCompetence = (comp: string) => {
    setForm(prev => ({
      ...prev,
      competences: prev.competences.includes(comp)
        ? prev.competences.filter(c => c !== comp)
        : [...prev.competences, comp]
    }))
  }

  const totalFormations = collaborateurs.reduce((acc, c) => acc + (c.formations?.length || 0), 0)
  const formationsRealisees = collaborateurs.reduce((acc, c) => acc + (c.formations?.filter(f => f.statut === 'realisee').length || 0), 0)

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: 'var(--font)', color: 'var(--text-tertiary)', fontSize: '13px' }}>
      Chargement...
    </div>
  )

  if (selectedCollab) {
    return (
      <div style={{ padding: '28px', fontFamily: 'var(--font)', maxWidth: '900px' }}>
        {/* Header fiche collab */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button onClick={() => setSelectedCollab(null)}
            style={{ width: '36px', height: '36px', border: '1px solid var(--border)', borderRadius: '9px', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            <i className="ti ti-arrow-left" style={{ fontSize: '16px' }} />
          </button>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #7C3AED, #1A56DB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', color: '#fff' }}>
            {selectedCollab.prenom[0]}{selectedCollab.nom[0]}
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{selectedCollab.prenom} {selectedCollab.nom}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{selectedCollab.poste} · Depuis {selectedCollab.date_embauche ? new Date(selectedCollab.date_embauche).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : '—'}</div>
          </div>
          <button onClick={() => {
            setForm({ nom: selectedCollab.nom, prenom: selectedCollab.prenom, poste: selectedCollab.poste, date_embauche: selectedCollab.date_embauche, competences: selectedCollab.competences || [] })
            setShowForm(true)
          }}
            style={{ marginLeft: 'auto', padding: '8px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '9px', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="ti ti-edit" style={{ fontSize: '14px' }} />
            Modifier
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Compétences */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="ti ti-star" style={{ fontSize: '15px', color: '#7C3AED' }} />
              Compétences ({selectedCollab.competences?.length || 0})
            </div>
            {selectedCollab.competences?.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '16px' }}>Aucune compétence renseignée</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {selectedCollab.competences?.map(comp => (
                  <span key={comp} style={{ padding: '5px 12px', background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: '20px', fontSize: '12px', color: '#7C3AED', fontWeight: '500' }}>
                    {comp}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Stats formations */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="ti ti-school" style={{ fontSize: '15px', color: '#1A56DB' }} />
              Formations ({selectedCollab.formations?.length || 0})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { label: 'Réalisées', value: selectedCollab.formations?.filter(f => f.statut === 'realisee').length || 0, color: '#059669', bg: '#ECFDF5' },
                { label: 'Planifiées', value: selectedCollab.formations?.filter(f => f.statut === 'planifiee').length || 0, color: '#1A56DB', bg: '#EBF2FF' },
              ].map(s => (
                <div key={s.label} style={{ padding: '12px', background: s.bg, borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '11px', color: s.color, marginTop: '2px' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Journal formations */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="ti ti-notebook" style={{ fontSize: '15px', color: '#1A56DB' }} />
              Journal des formations
            </div>
            <button onClick={() => setShowFormationForm(true)}
              style={{ padding: '7px 14px', background: '#1A56DB', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <i className="ti ti-plus" style={{ fontSize: '13px' }} />
              Ajouter une formation
            </button>
          </div>

          {showFormationForm && (
            <div style={{ background: '#F8FAFF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Intitulé de la formation *</label>
                  <input value={formationForm.titre} onChange={e => setFormationForm(p => ({ ...p, titre: e.target.value }))} placeholder="ex: Formation bientraitance ANFH" style={inp} onFocus={e => e.target.style.borderColor = '#1A56DB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                </div>
                <div>
                  <label style={labelStyle}>Type</label>
                  <select value={formationForm.type} onChange={e => setFormationForm(p => ({ ...p, type: e.target.value }))} style={inp}>
                    {TYPES_FORMATION.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Statut</label>
                  <select value={formationForm.statut} onChange={e => setFormationForm(p => ({ ...p, statut: e.target.value as any }))} style={inp}>
                    <option value="planifiee">Planifiée</option>
                    <option value="realisee">Réalisée</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Date</label>
                  <input type="date" value={formationForm.date} onChange={e => setFormationForm(p => ({ ...p, date: e.target.value }))} style={inp} />
                </div>
                <div>
                  <label style={labelStyle}>Durée</label>
                  <input value={formationForm.duree} onChange={e => setFormationForm(p => ({ ...p, duree: e.target.value }))} placeholder="ex: 7h, 2 jours" style={inp} onFocus={e => e.target.style.borderColor = '#1A56DB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Organisme</label>
                  <input value={formationForm.organisme} onChange={e => setFormationForm(p => ({ ...p, organisme: e.target.value }))} placeholder="ex: ANFH, OPCO Santé, interne..." style={inp} onFocus={e => e.target.style.borderColor = '#1A56DB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setShowFormationForm(false)} style={{ padding: '8px 16px', background: '#F3F4F6', border: 'none', borderRadius: '8px', color: '#6B7280', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font)' }}>Annuler</button>
                <button onClick={saveFormation} disabled={!formationForm.titre || saving}
                  style={{ padding: '8px 16px', background: '#1A56DB', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </div>
          )}

          {!selectedCollab.formations?.length ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF', fontSize: '13px', background: '#F9FAFB', borderRadius: '10px', border: '1px dashed #E5E7EB' }}>
              Aucune formation enregistrée — ajoutez la première ci-dessus
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {selectedCollab.formations.map(f => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: f.statut === 'realisee' ? '#F0FDF4' : '#EBF2FF', borderRadius: '10px', border: `1px solid ${f.statut === 'realisee' ? '#A7F3D0' : '#BFDBFE'}` }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: f.statut === 'realisee' ? '#ECFDF5' : '#EBF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className={`ti ${f.statut === 'realisee' ? 'ti-certificate' : 'ti-calendar'}`} style={{ fontSize: '16px', color: f.statut === 'realisee' ? '#059669' : '#1A56DB' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{f.titre}</div>
                    <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
                      {f.type} · {f.organisme || '—'} · {f.duree || '—'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <span style={{ fontSize: '10px', fontWeight: '600', color: f.statut === 'realisee' ? '#059669' : '#1A56DB', background: f.statut === 'realisee' ? '#D1FAE5' : '#DBEAFE', padding: '2px 8px', borderRadius: '20px' }}>
                      {f.statut === 'realisee' ? '✓ Réalisée' : 'Planifiée'}
                    </span>
                    <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{new Date(f.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                    <button onClick={() => deleteFormation(f.id)}
                      style={{ width: '28px', height: '28px', border: 'none', borderRadius: '6px', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="ti ti-trash" style={{ fontSize: '13px' }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)', maxWidth: '1000px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Ressources Humaines</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '3px' }}>Compétences, formations et habilitations — Critères HAS 3.1.x</div>
        </div>
        <button onClick={() => { setShowForm(true); setSelectedCollab(null); setForm({ nom: '', prenom: '', poste: '', date_embauche: '', competences: [] }) }}
          style={{ padding: '9px 18px', background: '#1A56DB', border: 'none', borderRadius: '9px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="ti ti-user-plus" style={{ fontSize: '15px' }} />
          Ajouter un collaborateur
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Collaborateurs', value: collaborateurs.length, icon: 'ti-users', color: '#1A56DB', bg: '#EBF2FF' },
          { label: 'Formations réalisées', value: formationsRealisees, icon: 'ti-certificate', color: '#059669', bg: '#ECFDF5' },
          { label: 'Formations planifiées', value: totalFormations - formationsRealisees, icon: 'ti-calendar', color: '#7C3AED', bg: '#F5F3FF' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={`ti ${s.icon}`} style={{ fontSize: '20px', color: s.color }} />
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '800', color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '3px' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Formulaire ajout collaborateur */}
      {showForm && (
        <div style={{ background: 'var(--surface)', border: '1px solid #BFDBFE', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px' }}>
            {selectedCollab ? 'Modifier le collaborateur' : 'Nouveau collaborateur'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Prénom *</label>
              <input value={form.prenom} onChange={e => setForm(p => ({ ...p, prenom: e.target.value }))} placeholder="Sophie" style={inp} onFocus={e => e.target.style.borderColor = '#1A56DB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
            </div>
            <div>
              <label style={labelStyle}>Nom *</label>
              <input value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))} placeholder="Leblanc" style={inp} onFocus={e => e.target.style.borderColor = '#1A56DB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
            </div>
            <div>
              <label style={labelStyle}>Poste</label>
              <select value={form.poste} onChange={e => setForm(p => ({ ...p, poste: e.target.value }))} style={inp}>
                <option value="">Sélectionner...</option>
                {POSTES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Date d'embauche</label>
              <input type="date" value={form.date_embauche} onChange={e => setForm(p => ({ ...p, date_embauche: e.target.value }))} style={inp} />
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Compétences</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
              {COMPETENCES_LIST.map(comp => {
                const selected = form.competences.includes(comp)
                return (
                  <button key={comp} onClick={() => toggleCompetence(comp)}
                    style={{ padding: '6px 12px', border: `1px solid ${selected ? '#7C3AED' : '#E5E7EB'}`, borderRadius: '20px', background: selected ? '#F5F3FF' : '#fff', color: selected ? '#7C3AED' : '#6B7280', fontSize: '12px', fontWeight: selected ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {selected && <i className="ti ti-check" style={{ fontSize: '11px' }} />}
                    {comp}
                  </button>
                )
              })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => { setShowForm(false); setSelectedCollab(null) }} style={{ padding: '9px 18px', background: '#F3F4F6', border: 'none', borderRadius: '9px', color: '#6B7280', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font)' }}>Annuler</button>
            <button onClick={saveCollab} disabled={saving || !form.nom || !form.prenom}
              style={{ padding: '9px 18px', background: saved ? '#10B981' : '#1A56DB', border: 'none', borderRadius: '9px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className={`ti ${saved ? 'ti-check' : 'ti-device-floppy'}`} style={{ fontSize: '14px' }} />
              {saved ? 'Enregistré !' : saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {/* Liste collaborateurs */}
      {collaborateurs.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '64px', textAlign: 'center' }}>
          <i className="ti ti-users" style={{ fontSize: '32px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '12px', opacity: 0.3 }} />
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>Aucun collaborateur</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>Ajoutez vos collaborateurs pour répondre aux critères 3.1.x</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {collaborateurs.map(collab => {
            const formationsRealisees = collab.formations?.filter(f => f.statut === 'realisee').length || 0
            const formationsPlanifiees = collab.formations?.filter(f => f.statut === 'planifiee').length || 0
            return (
              <div key={collab.id} onClick={() => setSelectedCollab(collab)}
                style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)'; el.style.borderColor = '#1A56DB' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'none'; el.style.boxShadow = 'none'; el.style.borderColor = 'var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                  <div style={{ width: '44px', height: '44px', borderRadius: '11px', background: 'linear-gradient(135deg, #7C3AED, #1A56DB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
                    {collab.prenom[0]}{collab.nom[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{collab.prenom} {collab.nom}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{collab.poste || 'Poste non renseigné'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                  {(collab.competences || []).slice(0, 3).map(comp => (
                    <span key={comp} style={{ fontSize: '10px', color: '#7C3AED', background: '#F5F3FF', padding: '2px 8px', borderRadius: '20px', fontWeight: '500' }}>{comp}</span>
                  ))}
                  {(collab.competences || []).length > 3 && (
                    <span style={{ fontSize: '10px', color: '#9CA3AF', background: '#F3F4F6', padding: '2px 8px', borderRadius: '20px' }}>+{collab.competences.length - 3}</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ flex: 1, padding: '8px', background: '#ECFDF5', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#059669' }}>{formationsRealisees}</div>
                    <div style={{ fontSize: '10px', color: '#059669' }}>formations</div>
                  </div>
                  {formationsPlanifiees > 0 && (
                    <div style={{ flex: 1, padding: '8px', background: '#EBF2FF', borderRadius: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: '16px', fontWeight: '700', color: '#1A56DB' }}>{formationsPlanifiees}</div>
                      <div style={{ fontSize: '10px', color: '#1A56DB' }}>planifiées</div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}