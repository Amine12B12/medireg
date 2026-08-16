'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface)', boxSizing: 'border-box' as const }
const labelStyle = { display: 'block', fontSize: '11px', fontWeight: '600' as const, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.4px' }

const FORMES_JURIDIQUES = ['SARL', 'SAS', 'SASU', 'EURL', 'SA', 'SNC', 'EI', 'SELARL', 'Autre']
const ACTIVITES_LIST = ['Vente', 'Location', 'Livraison', 'Installation', 'Maintenance SAV', 'Reprise materiel', 'Nettoyage Desinfection', 'Oxygene', 'MAD', 'Handicap VPH', 'Nutrition', 'Stomie', 'Continence', 'Diabete']
const RESPONSABILITES_LIST = [
  { key: 'direction', label: 'Direction / Representant legal' },
  { key: 'garant_psdm', label: 'Garant PSDM' },
  { key: 'materiovigilance', label: 'Correspondant materiovigilance' },
  { key: 'pharmacien', label: 'Pharmacien responsable' },
  { key: 'responsable_etablissement', label: 'Responsable etablissement' },
  { key: 'desinfection', label: 'Desinfection / Hygiene' },
  { key: 'sav_maintenance', label: 'SAV / Maintenance' },
  { key: 'reclamations', label: 'Reclamations' },
  { key: 'pilote_certification', label: 'Pilote certification MediReg' },
  { key: 'dpo', label: 'DPO / Interlocuteur RGPD' },
]

const STEPS = [
  { id: 1, label: 'Societe', icon: 'ti-building' },
  { id: 2, label: 'Etablissements', icon: 'ti-building-hospital' },
  { id: 3, label: 'Personnes', icon: 'ti-users' },
  { id: 4, label: 'Responsabilites', icon: 'ti-shield-check' },
  { id: 5, label: 'Activites', icon: 'ti-list-check' },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [clientId, setClientId] = useState<string | null>(null)
  const [societeId, setSocieteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Step 1 - Societe
  const [societe, setSociete] = useState({
    raison_sociale: '', nom_commercial: '', forme_juridique: 'SARL',
    siren: '', code_ape: '', adresse_siege: '', code_postal: '', ville: '',
    telephone: '', email: '', logo_url: ''
  })

  // Step 2 - Etablissements
  const [etablissements, setEtablissements] = useState([{
    nom: '', siret: '', adresse: '', code_postal: '', ville: '',
    telephone: '', email: '', est_siege: true
  }])

  // Step 3 - Personnes
  const [personnes, setPersonnes] = useState([{
    nom: '', prenom: '', fonction_reelle: '', telephone: '', email: ''
  }])

  // Step 4 - Responsabilites
  const [responsabilites, setResponsabilites] = useState<Record<string, { personne_idx: number; etablissement_idx: number }[]>>({})

  // Step 5 - Activites
  const [activites, setActivites] = useState<Record<number, Record<string, string>>>({})

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('client_id').eq('id', user.id).single()
      if (!prof?.client_id) { router.push('/dashboard'); return }
      setClientId(prof.client_id)

      // Verifier si societe existe deja
      const { data: existing } = await supabase.from('societes').select('id').eq('client_id', prof.client_id).single()
      if (existing) { router.push('/dashboard/certification'); return }

      // Pre-remplir avec les infos du client
      const { data: client } = await supabase.from('clients').select('*').eq('id', prof.client_id).single()
      if (client) {
        setSociete(prev => ({
          ...prev,
          raison_sociale: client.nom || '',
          ville: client.ville || '',
          email: client.contact_email || '',
          telephone: client.contact_tel || '',
        }))
        setEtablissements([{
          nom: client.nom || '',
          siret: '', adresse: '', code_postal: '',
          ville: client.ville || '',
          telephone: client.contact_tel || '',
          email: client.contact_email || '',
          est_siege: true
        }])
      }
    }
    init()
  }, [])

  async function handleUploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || !clientId) return
    const file = e.target.files[0]
    setUploadingLogo(true)
    const path = `logos/${clientId}_${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('documents').upload(path, file)
    if (!error) {
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
      setSociete(prev => ({ ...prev, logo_url: urlData.publicUrl }))
    }
    setUploadingLogo(false)
    e.target.value = ''
  }

  async function saveSociete() {
    if (!clientId || !societe.raison_sociale) return
    setSaving(true)
    const { data } = await supabase.from('societes').insert([{ ...societe, client_id: clientId }]).select().single()
    if (data) setSocieteId(data.id)
    setSaving(false)
    setStep(2)
  }

  async function saveEtablissements() {
    if (!societeId) return
    setSaving(true)
    for (const etab of etablissements) {
      if (!etab.nom) continue
      await supabase.from('etablissements_psdm').insert([{ ...etab, societe_id: societeId }])
    }
    setSaving(false)
    setStep(3)
  }

  async function savePersonnes() {
    if (!societeId) return
    setSaving(true)
    for (const pers of personnes) {
      if (!pers.nom || !pers.prenom) continue
      await supabase.from('personnes').insert([{ ...pers, societe_id: societeId }])
    }
    setSaving(false)
    setStep(4)
  }

  async function saveResponsabilites() {
    if (!societeId) return
    setSaving(true)

    // Charger les personnes et etablissements crees
    const { data: persData } = await supabase.from('personnes').select('id').eq('societe_id', societeId).order('created_at')
    const { data: etabData } = await supabase.from('etablissements_psdm').select('id').eq('societe_id', societeId).order('created_at')

    for (const [resp, assignments] of Object.entries(responsabilites)) {
      for (const assignment of assignments) {
        const personne = persData?.[assignment.personne_idx]
        const etab = etabData?.[assignment.etablissement_idx]
        if (personne && etab) {
          await supabase.from('responsabilites_personnes').insert([{
            personne_id: personne.id,
            etablissement_id: etab.id,
            responsabilite: resp
          }])
        }
      }
    }
    setSaving(false)
    setStep(5)
  }

  async function saveActivites() {
    if (!societeId) return
    setSaving(true)
    const { data: etabData } = await supabase.from('etablissements_psdm').select('id').eq('societe_id', societeId).order('created_at')

    for (const [etabIdx, acts] of Object.entries(activites)) {
      const etab = etabData?.[parseInt(etabIdx)]
      if (!etab) continue
      for (const [activite, mode] of Object.entries(acts)) {
        await supabase.from('activites_etablissement').insert([{
          etablissement_id: etab.id,
          activite,
          mode
        }])
      }
    }
    setSaving(false)
    router.push('/dashboard/certification')
  }

  const addEtablissement = () => setEtablissements(prev => [...prev, { nom: '', siret: '', adresse: '', code_postal: '', ville: '', telephone: '', email: '', est_siege: false }])
  const addPersonne = () => setPersonnes(prev => [...prev, { nom: '', prenom: '', fonction_reelle: '', telephone: '', email: '' }])

  const toggleResponsabilite = (resp: string, personneIdx: number, etabIdx: number) => {
    setResponsabilites(prev => {
      const current = prev[resp] || []
      const exists = current.find(a => a.personne_idx === personneIdx && a.etablissement_idx === etabIdx)
      if (exists) {
        return { ...prev, [resp]: current.filter(a => !(a.personne_idx === personneIdx && a.etablissement_idx === etabIdx)) }
      } else {
        return { ...prev, [resp]: [...current, { personne_idx: personneIdx, etablissement_idx: etabIdx }] }
      }
    })
  }

  const toggleActivite = (etabIdx: number, activite: string, mode: string) => {
    setActivites(prev => {
      const etabActs = prev[etabIdx] || {}
      if (etabActs[activite] === mode) {
        const { [activite]: _, ...rest } = etabActs
        return { ...prev, [etabIdx]: rest }
      }
      return { ...prev, [etabIdx]: { ...etabActs, [activite]: mode } }
    })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #7C3AED 0%, #1A56DB 100%)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="ti ti-shield-check" style={{ fontSize: '16px', color: '#fff' }} />
        </div>
        <div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>MediReg</div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Configuration de votre profil</div>
        </div>
      </div>

      {/* Steps */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '16px 24px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', maxWidth: '700px', margin: '0 auto' }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: step > s.id ? 'var(--success)' : step === s.id ? 'var(--accent)' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {step > s.id
                    ? <i className="ti ti-check" style={{ fontSize: '14px', color: '#fff' }} />
                    : <i className={`ti ${s.icon}`} style={{ fontSize: '14px', color: step === s.id ? '#fff' : 'var(--text-tertiary)' }} />
                  }
                </div>
                <span style={{ fontSize: '11px', fontWeight: step === s.id ? '600' : '400', color: step === s.id ? 'var(--accent)' : step > s.id ? 'var(--success)' : 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div style={{ flex: 1, height: '1px', background: step > s.id ? 'var(--success)' : 'var(--border)', marginLeft: '8px' }} />}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '32px 24px', maxWidth: '700px', margin: '0 auto', width: '100%' }}>

        {/* STEP 1 - SOCIETE */}
        {step === 1 && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>Votre societe</div>
              <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Ces informations seront utilisees automatiquement dans tous vos documents de certification.</div>
            </div>

            {/* Logo */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '14px' }}>Logo</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '100px', height: '70px', border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-hover)', overflow: 'hidden', flexShrink: 0 }}>
                  {societe.logo_url
                    ? <img src={societe.logo_url} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                    : <div style={{ textAlign: 'center' }}><i className="ti ti-photo" style={{ fontSize: '24px', color: 'var(--text-tertiary)', display: 'block' }} /><div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Logo</div></div>
                  }
                </div>
                <div>
                  <label style={{ padding: '8px 16px', background: 'var(--accent-light)', border: '1px solid rgba(26,86,219,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--accent)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <i className="ti ti-upload" style={{ fontSize: '14px' }} />
                    {uploadingLogo ? 'Upload...' : 'Uploader votre logo'}
                    <input type='file' accept='image/*' style={{ display: 'none' }} onChange={handleUploadLogo} />
                  </label>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '6px' }}>PNG ou JPG — Apparaitra en haut de tous vos documents</div>
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '14px' }}>Identite</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Raison sociale *</label>
                  <input value={societe.raison_sociale} onChange={e => setSociete(prev => ({ ...prev, raison_sociale: e.target.value }))} placeholder="SARL Global Medical" style={inputStyle} autoFocus />
                </div>
                <div>
                  <label style={labelStyle}>Nom commercial</label>
                  <input value={societe.nom_commercial} onChange={e => setSociete(prev => ({ ...prev, nom_commercial: e.target.value }))} placeholder="Si different de la raison sociale" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Forme juridique</label>
                  <select value={societe.forme_juridique} onChange={e => setSociete(prev => ({ ...prev, forme_juridique: e.target.value }))} style={inputStyle}>
                    {FORMES_JURIDIQUES.map(f => <option key={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>SIREN</label>
                  <input value={societe.siren} onChange={e => setSociete(prev => ({ ...prev, siren: e.target.value }))} placeholder="123 456 789" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Code APE / NAF</label>
                  <input value={societe.code_ape} onChange={e => setSociete(prev => ({ ...prev, code_ape: e.target.value }))} placeholder="4774Z" style={inputStyle} />
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '14px' }}>Coordonnees du siege</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Adresse</label>
                  <input value={societe.adresse_siege} onChange={e => setSociete(prev => ({ ...prev, adresse_siege: e.target.value }))} placeholder="12 rue de la Paix" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Code postal</label>
                  <input value={societe.code_postal} onChange={e => setSociete(prev => ({ ...prev, code_postal: e.target.value }))} placeholder="75001" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Ville</label>
                  <input value={societe.ville} onChange={e => setSociete(prev => ({ ...prev, ville: e.target.value }))} placeholder="Paris" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Telephone</label>
                  <input value={societe.telephone} onChange={e => setSociete(prev => ({ ...prev, telephone: e.target.value }))} placeholder="01 23 45 67 89" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type='email' value={societe.email} onChange={e => setSociete(prev => ({ ...prev, email: e.target.value }))} placeholder="contact@entreprise.fr" style={inputStyle} />
                </div>
              </div>
            </div>

            <button onClick={saveSociete} disabled={saving || !societe.raison_sociale}
              style={{ width: '100%', padding: '13px', background: saving || !societe.raison_sociale ? 'rgba(26,86,219,0.4)' : 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: saving || !societe.raison_sociale ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {saving ? 'Enregistrement...' : 'Continuer →'}
            </button>
          </div>
        )}

        {/* STEP 2 - ETABLISSEMENTS */}
        {step === 2 && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>Vos etablissements</div>
              <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Chaque etablissement a son propre SIRET. Ajoutez tous vos sites.</div>
            </div>

            {etablissements.map((etab, i) => (
              <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#fff', fontWeight: '700' }}>{i + 1}</div>
                    {etab.est_siege ? 'Siege social' : `Etablissement ${i + 1}`}
                    {etab.est_siege && <span style={{ fontSize: '10px', background: '#F5F3FF', color: '#7C3AED', padding: '2px 8px', borderRadius: '20px', fontWeight: '500' }}>Siege</span>}
                  </div>
                  {!etab.est_siege && (
                    <button onClick={() => setEtablissements(prev => prev.filter((_, idx) => idx !== i))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '13px', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <i className="ti ti-trash" style={{ fontSize: '14px' }} />Supprimer
                    </button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Nom de l etablissement *</label>
                    <input value={etab.nom} onChange={e => setEtablissements(prev => prev.map((et, idx) => idx === i ? { ...et, nom: e.target.value } : et))} placeholder="Global Medical - Paris" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>SIRET</label>
                    <input value={etab.siret} onChange={e => setEtablissements(prev => prev.map((et, idx) => idx === i ? { ...et, siret: e.target.value } : et))} placeholder="123 456 789 00012" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Adresse</label>
                    <input value={etab.adresse} onChange={e => setEtablissements(prev => prev.map((et, idx) => idx === i ? { ...et, adresse: e.target.value } : et))} placeholder="12 rue de la Paix" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Code postal</label>
                    <input value={etab.code_postal} onChange={e => setEtablissements(prev => prev.map((et, idx) => idx === i ? { ...et, code_postal: e.target.value } : et))} placeholder="75001" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Ville</label>
                    <input value={etab.ville} onChange={e => setEtablissements(prev => prev.map((et, idx) => idx === i ? { ...et, ville: e.target.value } : et))} placeholder="Paris" style={inputStyle} />
                  </div>
                </div>
              </div>
            ))}

            <button onClick={addEtablissement}
              style={{ width: '100%', padding: '12px', background: 'transparent', border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
              <i className="ti ti-plus" style={{ fontSize: '16px' }} />
              Ajouter un etablissement
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setStep(1)}
                style={{ flex: 1, padding: '12px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                ← Retour
              </button>
              <button onClick={saveEtablissements} disabled={saving || !etablissements.some(e => e.nom)}
                style={{ flex: 2, padding: '12px', background: saving ? 'rgba(26,86,219,0.4)' : 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>
                {saving ? 'Enregistrement...' : 'Continuer →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 - PERSONNES */}
        {step === 3 && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>Vos collaborateurs</div>
              <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Chaque personne est creee une seule fois. Vous leur attribuerez des responsabilites a l etape suivante.</div>
            </div>

            {personnes.map((pers, i) => (
              <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#fff', fontWeight: '700' }}>{i + 1}</div>
                    Personne {i + 1}
                  </div>
                  {i > 0 && (
                    <button onClick={() => setPersonnes(prev => prev.filter((_, idx) => idx !== i))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: '13px', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <i className="ti ti-trash" style={{ fontSize: '14px' }} />Supprimer
                    </button>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Nom *</label>
                    <input value={pers.nom} onChange={e => setPersonnes(prev => prev.map((p, idx) => idx === i ? { ...p, nom: e.target.value } : p))} placeholder="Dupont" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Prenom *</label>
                    <input value={pers.prenom} onChange={e => setPersonnes(prev => prev.map((p, idx) => idx === i ? { ...p, prenom: e.target.value } : p))} placeholder="Marie" style={inputStyle} />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={labelStyle}>Fonction reelle dans l entreprise</label>
                    <input value={pers.fonction_reelle} onChange={e => setPersonnes(prev => prev.map((p, idx) => idx === i ? { ...p, fonction_reelle: e.target.value } : p))} placeholder="Gerante, Technicien, Responsable qualite..." style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Telephone</label>
                    <input value={pers.telephone} onChange={e => setPersonnes(prev => prev.map((p, idx) => idx === i ? { ...p, telephone: e.target.value } : p))} placeholder="06 12 34 56 78" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input value={pers.email} onChange={e => setPersonnes(prev => prev.map((p, idx) => idx === i ? { ...p, email: e.target.value } : p))} placeholder="marie.dupont@entreprise.fr" style={inputStyle} />
                  </div>
                </div>
              </div>
            ))}

            <button onClick={addPersonne}
              style={{ width: '100%', padding: '12px', background: 'transparent', border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
              <i className="ti ti-plus" style={{ fontSize: '16px' }} />
              Ajouter une personne
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setStep(2)}
                style={{ flex: 1, padding: '12px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                ← Retour
              </button>
              <button onClick={savePersonnes} disabled={saving || !personnes.some(p => p.nom && p.prenom)}
                style={{ flex: 2, padding: '12px', background: saving ? 'rgba(26,86,219,0.4)' : 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>
                {saving ? 'Enregistrement...' : 'Continuer →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4 - RESPONSABILITES */}
        {step === 4 && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>Responsabilites</div>
              <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Une meme personne peut cumuler plusieurs responsabilites. Cochez pour chaque responsabilite qui s en occupe.</div>
            </div>

            {RESPONSABILITES_LIST.map(resp => (
              <div key={resp.key} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="ti ti-shield" style={{ fontSize: '15px', color: '#7C3AED' }} />
                  {resp.label}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {personnes.map((pers, pIdx) => (
                    etablissements.map((etab, eIdx) => {
                      const isSelected = (responsabilites[resp.key] || []).some(a => a.personne_idx === pIdx && a.etablissement_idx === eIdx)
                      return (
                        <button key={`${pIdx}-${eIdx}`} onClick={() => toggleResponsabilite(resp.key, pIdx, eIdx)}
                          style={{ padding: '7px 14px', border: `1px solid ${isSelected ? '#7C3AED' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', background: isSelected ? '#F5F3FF' : 'transparent', color: isSelected ? '#7C3AED' : 'var(--text-secondary)', fontSize: '12px', fontWeight: isSelected ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          {isSelected && <i className="ti ti-check" style={{ fontSize: '12px' }} />}
                          {pers.prenom || 'Personne'} {pers.nom}
                          {etablissements.length > 1 && <span style={{ opacity: 0.7, fontSize: '11px' }}>· {etab.nom || `Etab ${eIdx + 1}`}</span>}
                        </button>
                      )
                    })
                  ))}
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setStep(3)}
                style={{ flex: 1, padding: '12px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                ← Retour
              </button>
              <button onClick={saveResponsabilites} disabled={saving}
                style={{ flex: 2, padding: '12px', background: saving ? 'rgba(26,86,219,0.4)' : 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>
                {saving ? 'Enregistrement...' : 'Continuer →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5 - ACTIVITES */}
        {step === 5 && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>Activites exercees</div>
              <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Ces informations determinent quels criteres HAS s appliquent a votre etablissement.</div>
            </div>

            {etablissements.map((etab, eIdx) => (
              <div key={eIdx} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="ti ti-building" style={{ fontSize: '15px', color: 'var(--accent)' }} />
                  {etab.nom || `Etablissement ${eIdx + 1}`}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {ACTIVITES_LIST.map(act => {
                    const currentMode = activites[eIdx]?.[act]
                    return (
                      <div key={act} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: currentMode ? 'var(--accent-light)' : 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', border: `1px solid ${currentMode ? 'rgba(26,86,219,0.2)' : 'var(--border)'}` }}>
                        <div style={{ flex: 1, fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{act}</div>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {['interne', 'sous_traite', 'mixte', 'non_concerne'].map(mode => (
                            <button key={mode} onClick={() => toggleActivite(eIdx, act, mode)}
                              style={{ padding: '4px 10px', border: `1px solid ${currentMode === mode ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', background: currentMode === mode ? 'var(--accent)' : 'transparent', color: currentMode === mode ? '#fff' : 'var(--text-tertiary)', fontSize: '10px', fontWeight: currentMode === mode ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>
                              {mode === 'interne' ? 'Interne' : mode === 'sous_traite' ? 'Sous-traite' : mode === 'mixte' ? 'Mixte' : 'Non concerne'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setStep(4)}
                style={{ flex: 1, padding: '12px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                ← Retour
              </button>
              <button onClick={saveActivites} disabled={saving}
                style={{ flex: 2, padding: '13px', background: saving ? 'rgba(26,86,219,0.4)' : 'linear-gradient(135deg, #7C3AED 0%, #1A56DB 100%)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <i className="ti ti-rocket" style={{ fontSize: '16px' }} />
                {saving ? 'Finalisation...' : 'Lancer la certification !'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}