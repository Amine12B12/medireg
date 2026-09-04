'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const supabase = createClient()

const COMPETENCES_LIST = [
  'Installation matériel médical', 'Maintenance et SAV', 'Formation patient',
  'Gestion des prescriptions', 'Désinfection / Hygiène', 'Conduite véhicule utilitaire',
  'Matériovigilance', 'Gestion des stocks', 'Accueil téléphonique', 'Facturation / Remboursements',
]

const TYPES_FORMATION = ['Formation interne', 'Formation externe', 'DPC', 'Certification', 'Habilitation', 'E-learning']
const TYPES_ENTRETIEN = ['Entretien annuel', 'Entretien professionnel', 'Entretien de mi-année', 'Entretien de période d\'essai', 'Entretien de retour d\'absence']

const RESP_LABELS: Record<string, string> = {
  direction: 'Direction', garant_psdm: 'Garant PSDM', materiovigilance: 'Matériovigilance',
  pharmacien: 'Pharmacien', responsable_etablissement: 'Resp. établissement',
  desinfection: 'Désinfection', sav_maintenance: 'SAV / Maintenance',
  reclamations: 'Réclamations', pilote_certification: 'Pilote certification', dpo: 'DPO',
}

const inp = {
  width: '100%', padding: '10px 13px', border: '1px solid #E5E7EB',
  borderRadius: '9px', fontSize: '13px', fontFamily: 'var(--font)',
  outline: 'none', background: '#fff', boxSizing: 'border-box' as const,
}

const labelStyle = {
  display: 'block' as const, fontSize: '11px', fontWeight: '600' as const,
  color: '#6B7280', marginBottom: '5px', textTransform: 'uppercase' as const, letterSpacing: '0.4px',
}

type View = 'list' | 'detail' | 'entretien' | 'habilitation'

interface Personne {
  id: string
  nom: string
  prenom: string
  fonction_reelle: string
  telephone: string
  email: string
  responsabilites_personnes?: { responsabilite: string }[]
}

interface Formation {
  id: string; personne_id: string; titre: string; type: string
  date: string; duree: string; organisme: string; statut: 'planifiee' | 'realisee'
}

interface Competence { id: string; personne_id: string; competence: string }

interface Entretien {
  id: string; personne_id: string; date_entretien: string; type: string
  bilan: string; points_forts: string; points_amelioration: string
  formation_souhaitee: string; statut: string
  objectifs_annee_precedente: string[]; objectifs_annee_suivante: string[]
}

interface Habilitation {
  id: string; personne_id: string; titre: string; organisme: string
  date_obtention: string; date_expiration: string; statut: string
}

export default function RHPage() {
  const [personnes, setPersonnes] = useState<Personne[]>([])
  const [formations, setFormations] = useState<Formation[]>([])
  const [competences, setCompetences] = useState<Competence[]>([])
  const [entretiens, setEntretiens] = useState<Entretien[]>([])
  const [habilitations, setHabilitations] = useState<Habilitation[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>('list')
  const [selectedPersonne, setSelectedPersonne] = useState<Personne | null>(null)
  const [activeTab, setActiveTab] = useState<'formations' | 'entretiens' | 'habilitations' | 'competences'>('competences')
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState<string | null>(null)
  const router = useRouter()

  const [formationForm, setFormationForm] = useState({ titre: '', type: 'Formation interne', date: new Date().toISOString().split('T')[0], duree: '', organisme: '', statut: 'planifiee' })
  const [entretienForm, setEntretienForm] = useState({ date_entretien: new Date().toISOString().split('T')[0], type: 'Entretien annuel', bilan: '', points_forts: '', points_amelioration: '', formation_souhaitee: '', statut: 'planifie', objectifs_annee_precedente: [] as string[], objectifs_annee_suivante: [] as string[], newObj1: '', newObj2: '' })
  const [habilitationForm, setHabilitationForm] = useState({ titre: '', organisme: '', date_obtention: '', date_expiration: '', statut: 'valide' })

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('client_id').eq('id', user.id).single()
    if (!prof?.client_id) return
    const { data: soc } = await supabase.from('societes').select('id').eq('client_id', prof.client_id).single()
    if (!soc) { router.push('/dashboard/onboarding'); return }

    const { data: pers } = await supabase.from('personnes').select('*, responsabilites_personnes(responsabilite)').eq('societe_id', soc.id).order('created_at')
    setPersonnes(pers || [])

    if (pers && pers.length > 0) {
      const ids = pers.map((p: any) => p.id)
      const [f, c, e, h] = await Promise.all([
        supabase.from('rh_formations').select('*').in('personne_id', ids).order('date', { ascending: false }),
        supabase.from('rh_competences').select('*').in('personne_id', ids),
        supabase.from('rh_entretiens').select('*').in('personne_id', ids).order('date_entretien', { ascending: false }),
        supabase.from('rh_habilitations').select('*').in('personne_id', ids).order('date_expiration'),
      ])
      setFormations(f.data || [])
      setCompetences(c.data || [])
      setEntretiens(e.data || [])
      setHabilitations(h.data || [])
    }
    setLoading(false)
  }

  async function saveFormation() {
    if (!selectedPersonne || !formationForm.titre) return
    setSaving(true)
    await supabase.from('rh_formations').insert([{ ...formationForm, personne_id: selectedPersonne.id }])
    setShowForm(null)
    setFormationForm({ titre: '', type: 'Formation interne', date: new Date().toISOString().split('T')[0], duree: '', organisme: '', statut: 'planifiee' })
    await load(); setSaving(false)
  }

  async function saveEntretien() {
    if (!selectedPersonne) return
    setSaving(true)
    const { newObj1, newObj2, ...rest } = entretienForm
    await supabase.from('rh_entretiens').insert([{ ...rest, personne_id: selectedPersonne.id }])
    setShowForm(null)
    await load(); setSaving(false)
  }

  async function saveHabilitation() {
    if (!selectedPersonne || !habilitationForm.titre) return
    setSaving(true)
    await supabase.from('rh_habilitations').insert([{ ...habilitationForm, personne_id: selectedPersonne.id }])
    setShowForm(null)
    setHabilitationForm({ titre: '', organisme: '', date_obtention: '', date_expiration: '', statut: 'valide' })
    await load(); setSaving(false)
  }

  async function toggleCompetence(personneId: string, comp: string) {
    const existing = competences.find(c => c.personne_id === personneId && c.competence === comp)
    if (existing) await supabase.from('rh_competences').delete().eq('id', existing.id)
    else await supabase.from('rh_competences').insert([{ personne_id: personneId, competence: comp }])
    await load()
  }

  async function deleteItem(table: string, id: string) {
    await supabase.from(table).delete().eq('id', id)
    await load()
  }

  const getPersFormations = (id: string) => formations.filter(f => f.personne_id === id)
  const getPersCompetences = (id: string) => competences.filter(c => c.personne_id === id).map(c => c.competence)
  const getPersEntretiens = (id: string) => entretiens.filter(e => e.personne_id === id)
  const getPersHabilitations = (id: string) => habilitations.filter(h => h.personne_id === id)

  // Alertes globales
  const today = new Date()
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
  const habilsExpiring = habilitations.filter(h => h.date_expiration && new Date(h.date_expiration) <= in30Days && new Date(h.date_expiration) >= today)
  const habilsExpired = habilitations.filter(h => h.date_expiration && new Date(h.date_expiration) < today)
  const entretiensDus = personnes.filter(p => {
    const lastEntretien = getPersEntretiens(p.id).find(e => e.statut === 'realise')
    if (!lastEntretien) return true
    const lastDate = new Date(lastEntretien.date_entretien)
    const oneYearAgo = new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)
    return lastDate < oneYearAgo
  })

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: 'var(--font)', color: 'var(--text-tertiary)', fontSize: '13px' }}>Chargement...</div>

  // VUE DETAIL COLLABORATEUR
  if (view === 'detail' && selectedPersonne) {
    const persFormations = getPersFormations(selectedPersonne.id)
    const persCompetences = getPersCompetences(selectedPersonne.id)
    const persEntretiens = getPersEntretiens(selectedPersonne.id)
    const persHabilitations = getPersHabilitations(selectedPersonne.id)
    const responsabilites = (selectedPersonne as any).responsabilites_personnes || []

    const habExpirees = persHabilitations.filter(h => h.date_expiration && new Date(h.date_expiration) < today)
    const habExpirantes = persHabilitations.filter(h => h.date_expiration && new Date(h.date_expiration) >= today && new Date(h.date_expiration) <= in30Days)

    return (
      <div style={{ padding: '28px', fontFamily: 'var(--font)', maxWidth: '960px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button onClick={() => { setView('list'); setSelectedPersonne(null) }}
            style={{ width: '36px', height: '36px', border: '1px solid var(--border)', borderRadius: '9px', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            <i className="ti ti-arrow-left" style={{ fontSize: '16px' }} />
          </button>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'linear-gradient(135deg, #7C3AED, #1A56DB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
            {selectedPersonne.prenom?.[0]}{selectedPersonne.nom?.[0]}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>{selectedPersonne.prenom} {selectedPersonne.nom}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px' }}>
              <span>{selectedPersonne.fonction_reelle || 'Fonction non renseignée'}</span>
              {selectedPersonne.email && <span>· {selectedPersonne.email}</span>}
              {selectedPersonne.telephone && <span>· {selectedPersonne.telephone}</span>}
            </div>
          </div>
        </div>

        {/* Alertes */}
        {(habExpirees.length > 0 || habExpirantes.length > 0) && (
          <div style={{ marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {habExpirees.map(h => (
              <div key={h.id} style={{ padding: '10px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '9px', fontSize: '12px', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="ti ti-alert-circle" style={{ fontSize: '14px', flexShrink: 0 }} />
                <strong>Habilitation expirée :</strong> {h.titre} — expirée le {new Date(h.date_expiration).toLocaleDateString('fr-FR')}
              </div>
            ))}
            {habExpirantes.map(h => (
              <div key={h.id} style={{ padding: '10px 16px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '9px', fontSize: '12px', color: '#D97706', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="ti ti-alert-triangle" style={{ fontSize: '14px', flexShrink: 0 }} />
                <strong>Habilitation bientôt expirée :</strong> {h.titre} — expire le {new Date(h.date_expiration).toLocaleDateString('fr-FR')}
              </div>
            ))}
          </div>
        )}

        {/* Responsabilités */}
        {responsabilites.length > 0 && (
          <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: '12px', padding: '14px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#7C3AED', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="ti ti-shield" style={{ fontSize: '14px' }} />
              Responsabilités HAS :
            </div>
            {responsabilites.map((r: any, i: number) => (
              <span key={i} style={{ padding: '4px 12px', background: '#fff', border: '1px solid #DDD6FE', borderRadius: '20px', fontSize: '12px', color: '#7C3AED', fontWeight: '500' }}>
                {RESP_LABELS[r.responsabilite] || r.responsabilite}
              </span>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '20px', gap: '0' }}>
          {([
            { key: 'competences', label: 'Compétences', icon: 'ti-star', count: persCompetences.length },
            { key: 'formations', label: 'Formations', icon: 'ti-school', count: persFormations.length },
            { key: 'entretiens', label: 'Entretiens', icon: 'ti-clipboard-list', count: persEntretiens.length },
            { key: 'habilitations', label: 'Habilitations', icon: 'ti-certificate', count: persHabilitations.length },
          ] as const).map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              style={{ padding: '12px 18px', background: 'transparent', border: 'none', borderBottom: activeTab === tab.key ? '2px solid #1A56DB' : '2px solid transparent', color: activeTab === tab.key ? '#1A56DB' : 'var(--text-secondary)', fontSize: '13px', fontWeight: activeTab === tab.key ? '700' : '400', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className={`ti ${tab.icon}`} style={{ fontSize: '15px' }} />
              {tab.label}
              <span style={{ padding: '1px 6px', background: activeTab === tab.key ? '#EBF2FF' : '#F3F4F6', borderRadius: '20px', fontSize: '11px', color: activeTab === tab.key ? '#1A56DB' : '#9CA3AF', fontWeight: '600' }}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* COMPETENCES */}
        {activeTab === 'competences' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px' }}>Cliquez pour ajouter ou retirer une compétence</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {COMPETENCES_LIST.map(comp => {
                const selected = persCompetences.includes(comp)
                return (
                  <button key={comp} onClick={() => toggleCompetence(selectedPersonne.id, comp)}
                    style={{ padding: '8px 14px', border: `1px solid ${selected ? '#7C3AED' : '#E5E7EB'}`, borderRadius: '20px', background: selected ? '#F5F3FF' : '#fff', color: selected ? '#7C3AED' : '#9CA3AF', fontSize: '12px', fontWeight: selected ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.15s' }}>
                    {selected && <i className="ti ti-check" style={{ fontSize: '11px' }} />}
                    {comp}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* FORMATIONS */}
        {activeTab === 'formations' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
              <button onClick={() => setShowForm('formation')}
                style={{ padding: '8px 16px', background: '#1A56DB', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <i className="ti ti-plus" style={{ fontSize: '13px' }} />Ajouter une formation
              </button>
            </div>

            {showForm === 'formation' && (
              <div style={{ background: '#F8FAFF', border: '1px solid #BFDBFE', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Intitulé *</label>
                    <input value={formationForm.titre} onChange={e => setFormationForm(p => ({ ...p, titre: e.target.value }))} placeholder="ex: Formation bientraitance ANFH" style={inp} onFocus={e => e.target.style.borderColor = '#1A56DB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                  </div>
                  <div><label style={labelStyle}>Type</label><select value={formationForm.type} onChange={e => setFormationForm(p => ({ ...p, type: e.target.value }))} style={inp}>{TYPES_FORMATION.map(t => <option key={t}>{t}</option>)}</select></div>
                  <div><label style={labelStyle}>Statut</label><select value={formationForm.statut} onChange={e => setFormationForm(p => ({ ...p, statut: e.target.value }))} style={inp}><option value="planifiee">Planifiée</option><option value="realisee">Réalisée</option></select></div>
                  <div><label style={labelStyle}>Date</label><input type="date" value={formationForm.date} onChange={e => setFormationForm(p => ({ ...p, date: e.target.value }))} style={inp} /></div>
                  <div><label style={labelStyle}>Durée</label><input value={formationForm.duree} onChange={e => setFormationForm(p => ({ ...p, duree: e.target.value }))} placeholder="ex: 7h, 2 jours" style={inp} onFocus={e => e.target.style.borderColor = '#1A56DB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} /></div>
                  <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Organisme</label><input value={formationForm.organisme} onChange={e => setFormationForm(p => ({ ...p, organisme: e.target.value }))} placeholder="ex: ANFH, OPCO Santé..." style={inp} onFocus={e => e.target.style.borderColor = '#1A56DB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} /></div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setShowForm(null)} style={{ padding: '8px 16px', background: '#F3F4F6', border: 'none', borderRadius: '8px', color: '#6B7280', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font)' }}>Annuler</button>
                  <button onClick={saveFormation} disabled={!formationForm.titre || saving} style={{ padding: '8px 16px', background: '#1A56DB', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)' }}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
                </div>
              </div>
            )}

            {persFormations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF', fontSize: '13px', background: '#F9FAFB', borderRadius: '12px', border: '1px dashed #E5E7EB' }}>Aucune formation enregistrée</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {persFormations.map(f => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: f.statut === 'realisee' ? '#F0FDF4' : '#F8FAFF', borderRadius: '10px', border: `1px solid ${f.statut === 'realisee' ? '#A7F3D0' : '#BFDBFE'}` }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '9px', background: f.statut === 'realisee' ? '#ECFDF5' : '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`ti ${f.statut === 'realisee' ? 'ti-certificate' : 'ti-calendar'}`} style={{ fontSize: '18px', color: f.statut === 'realisee' ? '#059669' : '#1A56DB' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{f.titre}</div>
                      <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>{f.type} · {f.organisme || '—'} · {f.duree || '—'}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span style={{ fontSize: '10px', fontWeight: '600', color: f.statut === 'realisee' ? '#059669' : '#1A56DB', background: f.statut === 'realisee' ? '#D1FAE5' : '#DBEAFE', padding: '3px 10px', borderRadius: '20px' }}>{f.statut === 'realisee' ? '✓ Réalisée' : 'Planifiée'}</span>
                      <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{new Date(f.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      <button onClick={() => deleteItem('rh_formations', f.id)} style={{ width: '28px', height: '28px', border: 'none', borderRadius: '6px', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="ti ti-trash" style={{ fontSize: '13px' }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ENTRETIENS */}
        {activeTab === 'entretiens' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
              <button onClick={() => setShowForm('entretien')}
                style={{ padding: '8px 16px', background: '#7C3AED', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <i className="ti ti-plus" style={{ fontSize: '13px' }} />Planifier un entretien
              </button>
            </div>

            {showForm === 'entretien' && (
              <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                  <div><label style={labelStyle}>Type d'entretien</label><select value={entretienForm.type} onChange={e => setEntretienForm(p => ({ ...p, type: e.target.value }))} style={inp}>{TYPES_ENTRETIEN.map(t => <option key={t}>{t}</option>)}</select></div>
                  <div><label style={labelStyle}>Date</label><input type="date" value={entretienForm.date_entretien} onChange={e => setEntretienForm(p => ({ ...p, date_entretien: e.target.value }))} style={inp} /></div>
                  <div><label style={labelStyle}>Statut</label><select value={entretienForm.statut} onChange={e => setEntretienForm(p => ({ ...p, statut: e.target.value }))} style={inp}><option value="planifie">Planifié</option><option value="realise">Réalisé</option></select></div>
                </div>
                {entretienForm.statut === 'realise' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div><label style={labelStyle}>Bilan de l'année</label><textarea value={entretienForm.bilan} onChange={e => setEntretienForm(p => ({ ...p, bilan: e.target.value }))} placeholder="Bilan des missions réalisées cette année..." rows={3} style={{ ...inp, resize: 'vertical' }} /></div>
                    <div><label style={labelStyle}>Points forts</label><textarea value={entretienForm.points_forts} onChange={e => setEntretienForm(p => ({ ...p, points_forts: e.target.value }))} placeholder="Points forts identifiés..." rows={2} style={{ ...inp, resize: 'vertical' }} /></div>
                    <div><label style={labelStyle}>Points d'amélioration</label><textarea value={entretienForm.points_amelioration} onChange={e => setEntretienForm(p => ({ ...p, points_amelioration: e.target.value }))} placeholder="Axes de développement..." rows={2} style={{ ...inp, resize: 'vertical' }} /></div>
                    <div><label style={labelStyle}>Formation souhaitée</label><input value={entretienForm.formation_souhaitee} onChange={e => setEntretienForm(p => ({ ...p, formation_souhaitee: e.target.value }))} placeholder="Formation demandée par le collaborateur..." style={inp} /></div>
                    <div>
                      <label style={labelStyle}>Objectifs année suivante</label>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input value={entretienForm.newObj2} onChange={e => setEntretienForm(p => ({ ...p, newObj2: e.target.value }))} placeholder="Ajouter un objectif..." style={{ ...inp }} onKeyDown={e => { if (e.key === 'Enter' && entretienForm.newObj2) { setEntretienForm(p => ({ ...p, objectifs_annee_suivante: [...p.objectifs_annee_suivante, p.newObj2], newObj2: '' })) } }} />
                        <button onClick={() => { if (entretienForm.newObj2) setEntretienForm(p => ({ ...p, objectifs_annee_suivante: [...p.objectifs_annee_suivante, p.newObj2], newObj2: '' })) }} style={{ padding: '0 14px', background: '#7C3AED', border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>Ajouter</button>
                      </div>
                      {entretienForm.objectifs_annee_suivante.map((obj, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#F5F3FF', borderRadius: '8px', marginBottom: '4px', fontSize: '12px', color: '#7C3AED' }}>
                          <i className="ti ti-target" style={{ fontSize: '13px' }} />
                          <span style={{ flex: 1 }}>{obj}</span>
                          <button onClick={() => setEntretienForm(p => ({ ...p, objectifs_annee_suivante: p.objectifs_annee_suivante.filter((_, idx) => idx !== i) }))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontSize: '12px', padding: 0 }}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                  <button onClick={() => setShowForm(null)} style={{ padding: '8px 16px', background: '#F3F4F6', border: 'none', borderRadius: '8px', color: '#6B7280', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font)' }}>Annuler</button>
                  <button onClick={saveEntretien} disabled={saving} style={{ padding: '8px 16px', background: '#7C3AED', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)' }}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
                </div>
              </div>
            )}

            {persEntretiens.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF', fontSize: '13px', background: '#F9FAFB', borderRadius: '12px', border: '1px dashed #E5E7EB' }}>Aucun entretien enregistré</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {persEntretiens.map(e => (
                  <div key={e.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: e.bilan ? '14px' : '0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '9px', background: e.statut === 'realise' ? '#ECFDF5' : '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <i className={`ti ${e.statut === 'realise' ? 'ti-clipboard-check' : 'ti-clipboard-list'}`} style={{ fontSize: '18px', color: e.statut === 'realise' ? '#059669' : '#7C3AED' }} />
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>{e.type}</div>
                          <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{new Date(e.date_entretien).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '10px', fontWeight: '600', color: e.statut === 'realise' ? '#059669' : '#7C3AED', background: e.statut === 'realise' ? '#D1FAE5' : '#F5F3FF', padding: '3px 10px', borderRadius: '20px' }}>{e.statut === 'realise' ? '✓ Réalisé' : 'Planifié'}</span>
                        <button onClick={() => deleteItem('rh_entretiens', e.id)} style={{ width: '28px', height: '28px', border: 'none', borderRadius: '6px', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className="ti ti-trash" style={{ fontSize: '13px' }} />
                        </button>
                      </div>
                    </div>
                    {e.bilan && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #F3F4F6' }}>
                        {e.bilan && <div><div style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Bilan</div><div style={{ fontSize: '12px', color: '#374151', lineHeight: '1.6' }}>{e.bilan}</div></div>}
                        {e.points_forts && <div><div style={{ fontSize: '11px', fontWeight: '700', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Points forts</div><div style={{ fontSize: '12px', color: '#374151', lineHeight: '1.6' }}>{e.points_forts}</div></div>}
                        {e.points_amelioration && <div><div style={{ fontSize: '11px', fontWeight: '700', color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Axes d'amélioration</div><div style={{ fontSize: '12px', color: '#374151', lineHeight: '1.6' }}>{e.points_amelioration}</div></div>}
                        {e.formation_souhaitee && <div><div style={{ fontSize: '11px', fontWeight: '700', color: '#1A56DB', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>Formation souhaitée</div><div style={{ fontSize: '12px', color: '#374151' }}>{e.formation_souhaitee}</div></div>}
                        {e.objectifs_annee_suivante?.length > 0 && (
                          <div style={{ gridColumn: '1 / -1' }}>
                            <div style={{ fontSize: '11px', fontWeight: '700', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>Objectifs</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {e.objectifs_annee_suivante.map((obj, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#374151' }}>
                                  <i className="ti ti-target" style={{ fontSize: '13px', color: '#7C3AED' }} />{obj}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* HABILITATIONS */}
        {activeTab === 'habilitations' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
              <button onClick={() => setShowForm('habilitation')}
                style={{ padding: '8px 16px', background: '#059669', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <i className="ti ti-plus" style={{ fontSize: '13px' }} />Ajouter une habilitation
              </button>
            </div>

            {showForm === 'habilitation' && (
              <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '12px', padding: '18px', marginBottom: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Titre *</label><input value={habilitationForm.titre} onChange={e => setHabilitationForm(p => ({ ...p, titre: e.target.value }))} placeholder="ex: CACES R489, Habilitation électrique..." style={inp} onFocus={e => e.target.style.borderColor = '#059669'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} /></div>
                  <div><label style={labelStyle}>Organisme</label><input value={habilitationForm.organisme} onChange={e => setHabilitationForm(p => ({ ...p, organisme: e.target.value }))} style={inp} /></div>
                  <div><label style={labelStyle}>Statut</label><select value={habilitationForm.statut} onChange={e => setHabilitationForm(p => ({ ...p, statut: e.target.value }))} style={inp}><option value="valide">Valide</option><option value="expire">Expiré</option><option value="a_renouveler">À renouveler</option></select></div>
                  <div><label style={labelStyle}>Date d'obtention</label><input type="date" value={habilitationForm.date_obtention} onChange={e => setHabilitationForm(p => ({ ...p, date_obtention: e.target.value }))} style={inp} /></div>
                  <div><label style={labelStyle}>Date d'expiration</label><input type="date" value={habilitationForm.date_expiration} onChange={e => setHabilitationForm(p => ({ ...p, date_expiration: e.target.value }))} style={inp} /></div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => setShowForm(null)} style={{ padding: '8px 16px', background: '#F3F4F6', border: 'none', borderRadius: '8px', color: '#6B7280', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font)' }}>Annuler</button>
                  <button onClick={saveHabilitation} disabled={!habilitationForm.titre || saving} style={{ padding: '8px 16px', background: '#059669', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)' }}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
                </div>
              </div>
            )}

            {persHabilitations.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9CA3AF', fontSize: '13px', background: '#F9FAFB', borderRadius: '12px', border: '1px dashed #E5E7EB' }}>Aucune habilitation enregistrée</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {persHabilitations.map(h => {
                  const isExpired = h.date_expiration && new Date(h.date_expiration) < today
                  const isExpiring = h.date_expiration && new Date(h.date_expiration) >= today && new Date(h.date_expiration) <= in30Days
                  const color = isExpired ? '#DC2626' : isExpiring ? '#D97706' : '#059669'
                  const bg = isExpired ? '#FEF2F2' : isExpiring ? '#FFFBEB' : '#ECFDF5'
                  const border = isExpired ? '#FECACA' : isExpiring ? '#FDE68A' : '#A7F3D0'
                  return (
                    <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: bg, borderRadius: '10px', border: `1px solid ${border}` }}>
                      <div style={{ width: '38px', height: '38px', borderRadius: '9px', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="ti ti-certificate" style={{ fontSize: '18px', color }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>{h.titre}</div>
                        <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>{h.organisme || '—'}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                        {h.date_obtention && <span style={{ fontSize: '11px', color: '#6B7280' }}>Obtenue : {new Date(h.date_obtention).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>}
                        {h.date_expiration && <span style={{ fontSize: '11px', fontWeight: '600', color, background: '#fff', padding: '2px 8px', borderRadius: '20px', border: `1px solid ${border}` }}>
                          {isExpired ? '⚠ Expirée' : isExpiring ? '⚡ Expire bientôt'  : 'Valide jusqu\'au'} {new Date(h.date_expiration).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>}
                        <button onClick={() => deleteItem('rh_habilitations', h.id)} style={{ width: '28px', height: '28px', border: 'none', borderRadius: '6px', background: '#FEF2F2', color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <i className="ti ti-trash" style={{ fontSize: '13px' }} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // VUE LISTE
  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)', maxWidth: '1100px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Ressources Humaines</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '3px' }}>Compétences, formations, entretiens, habilitations — Critères HAS 3.1.x</div>
        </div>
        <button onClick={() => router.push('/dashboard/onboarding')}
          style={{ padding: '9px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '9px', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="ti ti-edit" style={{ fontSize: '14px' }} />
          Gérer les collaborateurs
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Collaborateurs', value: personnes.length, icon: 'ti-users', color: '#1A56DB', bg: '#EBF2FF' },
          { label: 'Formations réalisées', value: formations.filter(f => f.statut === 'realisee').length, icon: 'ti-certificate', color: '#059669', bg: '#ECFDF5' },
          { label: 'Entretiens réalisés', value: entretiens.filter(e => e.statut === 'realise').length, icon: 'ti-clipboard-check', color: '#7C3AED', bg: '#F5F3FF' },
          { label: 'Alertes habilitations', value: habilsExpired.length + habilsExpiring.length, icon: 'ti-alert-triangle', color: habilsExpired.length > 0 ? '#DC2626' : '#D97706', bg: habilsExpired.length > 0 ? '#FEF2F2' : '#FFFBEB' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
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

      {/* Alertes globales */}
      {(habilsExpired.length > 0 || habilsExpiring.length > 0 || entretiensDus.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {habilsExpired.length > 0 && (
            <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', fontSize: '13px', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="ti ti-alert-circle" style={{ fontSize: '16px', flexShrink: 0 }} />
              <strong>{habilsExpired.length} habilitation{habilsExpired.length > 1 ? 's' : ''} expirée{habilsExpired.length > 1 ? 's' : ''}</strong> — Action requise
            </div>
          )}
          {habilsExpiring.length > 0 && (
            <div style={{ padding: '12px 16px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', fontSize: '13px', color: '#D97706', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: '16px', flexShrink: 0 }} />
              <strong>{habilsExpiring.length} habilitation{habilsExpiring.length > 1 ? 's' : ''}</strong> expire{habilsExpiring.length > 1 ? 'nt' : ''} dans moins de 30 jours
            </div>
          )}
          {entretiensDus.length > 0 && (
            <div style={{ padding: '12px 16px', background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: '10px', fontSize: '13px', color: '#7C3AED', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="ti ti-clipboard-list" style={{ fontSize: '16px', flexShrink: 0 }} />
              <strong>{entretiensDus.length} collaborateur{entretiensDus.length > 1 ? 's' : ''}</strong> sans entretien annuel cette année
            </div>
          )}
        </div>
      )}

      {/* Info sync */}
      <div style={{ background: '#EBF2FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '11px 16px', marginBottom: '20px', fontSize: '12px', color: '#1A56DB', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <i className="ti ti-refresh" style={{ fontSize: '14px', flexShrink: 0 }} />
        Collaborateurs synchronisés depuis votre profil. Cliquez sur un collaborateur pour gérer ses compétences, formations, entretiens et habilitations.
      </div>

      {/* Grille */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
        {personnes.map(pers => {
          const persFormations = getPersFormations(pers.id)
          const persCompetences = getPersCompetences(pers.id)
          const persEntretiens = getPersEntretiens(pers.id)
          const persHabilitations = getPersHabilitations(pers.id)
          const responsabilites = (pers as any).responsabilites_personnes || []
          const formationsRealisees = persFormations.filter(f => f.statut === 'realisee').length
          const dernierEntretien = persEntretiens.find(e => e.statut === 'realise')
          const habExpiredCount = persHabilitations.filter(h => h.date_expiration && new Date(h.date_expiration) < today).length
          const entretienDu = !dernierEntretien || new Date(dernierEntretien.date_entretien) < new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)

          return (
            <div key={pers.id} onClick={() => { setSelectedPersonne(pers); setView('detail') }}
              style={{ background: 'var(--surface)', border: `1px solid ${habExpiredCount > 0 ? '#FECACA' : 'var(--border)'}`, borderRadius: '12px', padding: '18px', cursor: 'pointer', transition: 'all 0.15s', position: 'relative', overflow: 'hidden' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 8px 24px rgba(0,0,0,0.09)'; if (!habExpiredCount) el.style.borderColor = '#1A56DB' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'none'; el.style.boxShadow = 'none'; el.style.borderColor = habExpiredCount > 0 ? '#FECACA' : 'var(--border)' }}>

              {habExpiredCount > 0 && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#EF4444' }} />}
              {entretienDu && !habExpiredCount && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#8B5CF6' }} />}

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'linear-gradient(135deg, #7C3AED, #1A56DB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '17px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
                  {pers.prenom?.[0]}{pers.nom?.[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pers.prenom} {pers.nom}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{pers.fonction_reelle || 'Fonction non renseignée'}</div>
                </div>
                {habExpiredCount > 0 && <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="ti ti-alert" style={{ fontSize: '11px', color: '#fff' }} /></div>}
              </div>

              {responsabilites.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
                  {responsabilites.slice(0, 2).map((r: any, i: number) => (
                    <span key={i} style={{ fontSize: '10px', color: '#7C3AED', background: '#F5F3FF', padding: '2px 7px', borderRadius: '20px', fontWeight: '500' }}>{RESP_LABELS[r.responsabilite] || r.responsabilite}</span>
                  ))}
                  {responsabilites.length > 2 && <span style={{ fontSize: '10px', color: '#9CA3AF', background: '#F3F4F6', padding: '2px 7px', borderRadius: '20px' }}>+{responsabilites.length - 2}</span>}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginTop: '6px' }}>
                <div style={{ padding: '8px', background: persCompetences.length > 0 ? '#F5F3FF' : '#F9FAFB', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: persCompetences.length > 0 ? '#7C3AED' : '#9CA3AF' }}>{persCompetences.length}</div>
                  <div style={{ fontSize: '10px', color: persCompetences.length > 0 ? '#7C3AED' : '#9CA3AF' }}>compétences</div>
                </div>
                <div style={{ padding: '8px', background: formationsRealisees > 0 ? '#ECFDF5' : '#F9FAFB', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: formationsRealisees > 0 ? '#059669' : '#9CA3AF' }}>{formationsRealisees}</div>
                  <div style={{ fontSize: '10px', color: formationsRealisees > 0 ? '#059669' : '#9CA3AF' }}>formations</div>
                </div>
                <div style={{ padding: '8px', background: entretienDu ? '#FFF7F0' : '#ECFDF5', borderRadius: '8px', textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: entretienDu ? '#D97706' : '#059669' }}>{persEntretiens.filter(e => e.statut === 'realise').length}</div>
                  <div style={{ fontSize: '10px', color: entretienDu ? '#D97706' : '#059669' }}>entretiens</div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}