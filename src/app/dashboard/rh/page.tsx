'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const supabase = createClient()

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
  width: '100%', padding: '10px 13px', border: '1px solid #E5E7EB',
  borderRadius: '9px', fontSize: '13px', fontFamily: 'var(--font)',
  outline: 'none', background: '#fff', boxSizing: 'border-box' as const,
}

const labelStyle = {
  display: 'block' as const, fontSize: '11px', fontWeight: '600' as const,
  color: '#6B7280', marginBottom: '5px', textTransform: 'uppercase' as const, letterSpacing: '0.4px',
}

interface Personne {
  id: string
  nom: string
  prenom: string
  fonction_reelle: string
  telephone: string
  email: string
  responsabilites?: { responsabilite: string }[]
  responsabilites_personnes?: { responsabilite: string }[]
}

interface Formation {
  id: string
  personne_id: string
  titre: string
  type: string
  date: string
  duree: string
  organisme: string
  statut: 'planifiee' | 'realisee'
}

interface Competence {
  id: string
  personne_id: string
  competence: string
}

const RESP_LABELS: Record<string, string> = {
  direction: 'Direction', garant_psdm: 'Garant PSDM', materiovigilance: 'Matériovigilance',
  pharmacien: 'Pharmacien', responsable_etablissement: 'Resp. établissement',
  desinfection: 'Désinfection', sav_maintenance: 'SAV / Maintenance',
  reclamations: 'Réclamations', pilote_certification: 'Pilote certification', dpo: 'DPO',
}

export default function RHPage() {
  const [personnes, setPersonnes] = useState<Personne[]>([])
  const [formations, setFormations] = useState<Formation[]>([])
  const [competences, setCompetences] = useState<Competence[]>([])
  const [societeId, setSocieteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPersonne, setSelectedPersonne] = useState<Personne | null>(null)
  const [showFormationForm, setShowFormationForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const [formationForm, setFormationForm] = useState({
    titre: '', type: 'Formation interne',
    date: new Date().toISOString().split('T')[0],
    duree: '', organisme: '', statut: 'planifiee' as 'planifiee' | 'realisee'
  })

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: prof } = await supabase.from('profiles').select('client_id').eq('id', user.id).single()
    if (!prof?.client_id) return
    const { data: soc } = await supabase.from('societes').select('id').eq('client_id', prof.client_id).single()
    if (!soc) { router.push('/dashboard/onboarding'); return }
    setSocieteId(soc.id)

    // Charger personnes depuis l'onboarding
    const { data: pers } = await supabase
      .from('personnes')
      .select('*, responsabilites_personnes(responsabilite)')
      .eq('societe_id', soc.id)
      .order('created_at')
    setPersonnes(pers || [])

    // Charger formations et compétences
    if (pers && pers.length > 0) {
      const persIds = pers.map((p: any) => p.id)
      const { data: forms } = await supabase.from('rh_formations').select('*').in('personne_id', persIds).order('date', { ascending: false })
      setFormations(forms || [])
      const { data: comps } = await supabase.from('rh_competences').select('*').in('personne_id', persIds)
      setCompetences(comps || [])
    }

    setLoading(false)
  }

  async function saveFormation() {
    if (!selectedPersonne || !formationForm.titre) return
    setSaving(true)
    await supabase.from('rh_formations').insert([{ ...formationForm, personne_id: selectedPersonne.id }])
    setShowFormationForm(false)
    setFormationForm({ titre: '', type: 'Formation interne', date: new Date().toISOString().split('T')[0], duree: '', organisme: '', statut: 'planifiee' })
    await load()
    // Recharger la personne sélectionnée
    const updated = personnes.find(p => p.id === selectedPersonne.id)
    if (updated) setSelectedPersonne(updated)
    setSaving(false)
  }

  async function deleteFormation(id: string) {
    await supabase.from('rh_formations').delete().eq('id', id)
    await load()
  }

  async function toggleCompetence(personneId: string, comp: string) {
    const existing = competences.find(c => c.personne_id === personneId && c.competence === comp)
    if (existing) {
      await supabase.from('rh_competences').delete().eq('id', existing.id)
    } else {
      await supabase.from('rh_competences').insert([{ personne_id: personneId, competence: comp }])
    }
    await load()
  }

  const getPersonneFormations = (personneId: string) => formations.filter(f => f.personne_id === personneId)
  const getPersonneCompetences = (personneId: string) => competences.filter(c => c.personne_id === personneId).map(c => c.competence)

  const totalFormationsRealisees = formations.filter(f => f.statut === 'realisee').length
  const totalFormationsPlanifiees = formations.filter(f => f.statut === 'planifiee').length

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: 'var(--font)', color: 'var(--text-tertiary)', fontSize: '13px' }}>
      Chargement...
    </div>
  )

  if (personnes.length === 0) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: 'var(--font)' }}>
      <div style={{ textAlign: 'center' }}>
        <i className="ti ti-users" style={{ fontSize: '32px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '12px', opacity: 0.3 }} />
        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>Aucun collaborateur trouvé</div>
        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>Commencez par renseigner vos collaborateurs dans votre profil</div>
        <button onClick={() => router.push('/dashboard/onboarding')}
          style={{ padding: '9px 20px', background: '#1A56DB', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)' }}>
          Configurer mon profil
        </button>
      </div>
    </div>
  )

  // VUE DETAIL PERSONNE
  if (selectedPersonne) {
    const persFormations = getPersonneFormations(selectedPersonne.id)
    const persCompetences = getPersonneCompetences(selectedPersonne.id)
    const responsabilites = (selectedPersonne.responsabilites_personnes || selectedPersonne.responsabilites || []) as any[]

    return (
      <div style={{ padding: '28px', fontFamily: 'var(--font)', maxWidth: '900px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button onClick={() => setSelectedPersonne(null)}
            style={{ width: '36px', height: '36px', border: '1px solid var(--border)', borderRadius: '9px', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
            <i className="ti ti-arrow-left" style={{ fontSize: '16px' }} />
          </button>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, #7C3AED, #1A56DB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
            {selectedPersonne.prenom?.[0]}{selectedPersonne.nom?.[0]}
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{selectedPersonne.prenom} {selectedPersonne.nom}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{selectedPersonne.fonction_reelle || 'Fonction non renseignée'}</div>
          </div>
        </div>

        {/* Responsabilités depuis l'onboarding */}
        {responsabilites.length > 0 && (
          <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: '700', color: '#7C3AED', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="ti ti-shield" style={{ fontSize: '14px' }} />
              Responsabilités HAS (depuis votre profil)
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {responsabilites.map((r: any, i: number) => (
                <span key={i} style={{ padding: '4px 12px', background: '#fff', border: '1px solid #DDD6FE', borderRadius: '20px', fontSize: '12px', color: '#7C3AED', fontWeight: '500' }}>
                  {RESP_LABELS[r.responsabilite] || r.responsabilite}
                </span>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          {/* Compétences */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="ti ti-star" style={{ fontSize: '15px', color: '#7C3AED' }} />
              Compétences
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {COMPETENCES_LIST.map(comp => {
                const selected = persCompetences.includes(comp)
                return (
                  <button key={comp} onClick={() => toggleCompetence(selectedPersonne.id, comp)}
                    style={{ padding: '5px 10px', border: `1px solid ${selected ? '#7C3AED' : '#E5E7EB'}`, borderRadius: '20px', background: selected ? '#F5F3FF' : '#fff', color: selected ? '#7C3AED' : '#9CA3AF', fontSize: '11px', fontWeight: selected ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {selected && <i className="ti ti-check" style={{ fontSize: '10px' }} />}
                    {comp}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Stats formations */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="ti ti-school" style={{ fontSize: '15px', color: '#1A56DB' }} />
              Formations ({persFormations.length})
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { label: 'Réalisées', value: persFormations.filter(f => f.statut === 'realisee').length, color: '#059669', bg: '#ECFDF5' },
                { label: 'Planifiées', value: persFormations.filter(f => f.statut === 'planifiee').length, color: '#1A56DB', bg: '#EBF2FF' },
              ].map(s => (
                <div key={s.label} style={{ padding: '14px', background: s.bg, borderRadius: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '28px', fontWeight: '800', color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: '11px', color: s.color, marginTop: '4px' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Journal formations */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="ti ti-notebook" style={{ fontSize: '15px', color: '#1A56DB' }} />
              Journal des formations
            </div>
            <button onClick={() => setShowFormationForm(true)}
              style={{ padding: '7px 14px', background: '#1A56DB', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <i className="ti ti-plus" style={{ fontSize: '13px' }} />
              Ajouter
            </button>
          </div>

          {showFormationForm && (
            <div style={{ background: '#F8FAFF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Intitulé *</label>
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
                  <input value={formationForm.organisme} onChange={e => setFormationForm(p => ({ ...p, organisme: e.target.value }))} placeholder="ex: ANFH, OPCO Santé..." style={inp} onFocus={e => e.target.style.borderColor = '#1A56DB'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
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

          {persFormations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: '#9CA3AF', fontSize: '13px', background: '#F9FAFB', borderRadius: '10px', border: '1px dashed #E5E7EB' }}>
              Aucune formation — cliquez sur "Ajouter" pour commencer
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {persFormations.map(f => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: f.statut === 'realisee' ? '#F0FDF4' : '#EBF2FF', borderRadius: '10px', border: `1px solid ${f.statut === 'realisee' ? '#A7F3D0' : '#BFDBFE'}` }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: f.statut === 'realisee' ? '#ECFDF5' : '#DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
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

  // VUE LISTE
  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)', maxWidth: '1000px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Ressources Humaines</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '3px' }}>Compétences et formations — Critères HAS 3.1.x</div>
        </div>
        <button onClick={() => router.push('/dashboard/onboarding')}
          style={{ padding: '9px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '9px', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="ti ti-edit" style={{ fontSize: '14px' }} />
          Modifier les collaborateurs
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Collaborateurs', value: personnes.length, icon: 'ti-users', color: '#1A56DB', bg: '#EBF2FF' },
          { label: 'Formations réalisées', value: totalFormationsRealisees, icon: 'ti-certificate', color: '#059669', bg: '#ECFDF5' },
          { label: 'Formations planifiées', value: totalFormationsPlanifiees, icon: 'ti-calendar', color: '#7C3AED', bg: '#F5F3FF' },
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

      {/* Info */}
      <div style={{ background: '#EBF2FF', border: '1px solid #BFDBFE', borderRadius: '10px', padding: '12px 16px', marginBottom: '20px', fontSize: '12px', color: '#1A56DB', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <i className="ti ti-info-circle" style={{ fontSize: '14px', flexShrink: 0 }} />
        Les collaborateurs sont synchronisés depuis votre profil. Cliquez sur un collaborateur pour gérer ses compétences et formations.
      </div>

      {/* Grille collaborateurs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
        {personnes.map(pers => {
          const persFormations = getPersonneFormations(pers.id)
          const persCompetences = getPersonneCompetences(pers.id)
          const responsabilites = (pers as any).responsabilites_personnes || []
          const formationsRealisees = persFormations.filter(f => f.statut === 'realisee').length
          const formationsPlanifiees = persFormations.filter(f => f.statut === 'planifiee').length

          return (
            <div key={pers.id} onClick={() => setSelectedPersonne(pers)}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'translateY(-2px)'; el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.08)'; el.style.borderColor = '#1A56DB' }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.transform = 'none'; el.style.boxShadow = 'none'; el.style.borderColor = 'var(--border)' }}>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div style={{ width: '44px', height: '44px', borderRadius: '11px', background: 'linear-gradient(135deg, #7C3AED, #1A56DB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
                  {pers.prenom?.[0]}{pers.nom?.[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pers.prenom} {pers.nom}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{pers.fonction_reelle || 'Fonction non renseignée'}</div>
                </div>
              </div>

              {/* Responsabilités */}
              {responsabilites.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
                  {responsabilites.slice(0, 3).map((r: any, i: number) => (
                    <span key={i} style={{ fontSize: '10px', color: '#7C3AED', background: '#F5F3FF', padding: '2px 7px', borderRadius: '20px', fontWeight: '500' }}>
                      {RESP_LABELS[r.responsabilite] || r.responsabilite}
                    </span>
                  ))}
                  {responsabilites.length > 3 && <span style={{ fontSize: '10px', color: '#9CA3AF', background: '#F3F4F6', padding: '2px 7px', borderRadius: '20px' }}>+{responsabilites.length - 3}</span>}
                </div>
              )}

              {/* Compétences */}
              {persCompetences.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '10px' }}>
                  {persCompetences.slice(0, 2).map(comp => (
                    <span key={comp} style={{ fontSize: '10px', color: '#059669', background: '#ECFDF5', padding: '2px 7px', borderRadius: '20px', fontWeight: '500' }}>{comp}</span>
                  ))}
                  {persCompetences.length > 2 && <span style={{ fontSize: '10px', color: '#9CA3AF', background: '#F3F4F6', padding: '2px 7px', borderRadius: '20px' }}>+{persCompetences.length - 2}</span>}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                {formationsRealisees > 0 && (
                  <div style={{ flex: 1, padding: '8px', background: '#ECFDF5', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#059669' }}>{formationsRealisees}</div>
                    <div style={{ fontSize: '10px', color: '#059669' }}>formation{formationsRealisees > 1 ? 's' : ''}</div>
                  </div>
                )}
                {formationsPlanifiees > 0 && (
                  <div style={{ flex: 1, padding: '8px', background: '#EBF2FF', borderRadius: '8px', textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#1A56DB' }}>{formationsPlanifiees}</div>
                    <div style={{ fontSize: '10px', color: '#1A56DB' }}>planifiée{formationsPlanifiees > 1 ? 's' : ''}</div>
                  </div>
                )}
                {formationsRealisees === 0 && formationsPlanifiees === 0 && (
                  <div style={{ flex: 1, padding: '8px', background: '#F9FAFB', borderRadius: '8px', textAlign: 'center', fontSize: '11px', color: '#9CA3AF' }}>
                    Aucune formation
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}