'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface)', boxSizing: 'border-box' as const }
const labelStyle = { display: 'block', fontSize: '11px', fontWeight: '600' as const, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.4px' }

const FORMES_JURIDIQUES = ['SARL', 'SAS', 'SASU', 'EURL', 'SA', 'SNC', 'EI', 'SELARL', 'Autre']

const ACTIVITES_LIST = [
  'Vente', 'Location', 'Livraison', 'Installation', 'Maintenance SAV',
  'Reprise materiel', 'Nettoyage Desinfection', 'Oxygene', 'MAD',
  'Handicap VPH', 'Nutrition', 'Stomie', 'Continence', 'Diabete'
]

const FAMILLES_MATERIELS = [
  'Oxygénothérapie / VNI', 'Fauteuil roulant manuel', 'Fauteuil roulant électrique',
  'Lit médicalisé', 'Matelas anti-escarres', 'Lève-personne',
  'Déambulateur / canne', 'Aérosolthérapie', 'Aspiration trachéale',
  'Nutrition entérale', 'Nutrition parentérale', 'Pompe à perfusion',
  'Matériel de stomie', 'Matériel continence', 'Matériel diabète',
  'Orthèses / prothèses', 'Autre'
]

const DOCUMENTS_EXISTANTS = [
  { key: 'devis', label: 'Devis' },
  { key: 'bon_commande', label: 'Bon de commande' },
  { key: 'contrat_location', label: 'Contrat de location' },
  { key: 'bon_livraison', label: 'Bon de livraison' },
  { key: 'fiche_intervention', label: "Fiche d'intervention" },
  { key: 'cr_essai', label: "Compte rendu d'essai" },
  { key: 'fiche_suivi', label: 'Fiche de suivi patient' },
  { key: 'fiche_depannage', label: 'Fiche de dépannage' },
  { key: 'bon_reprise', label: 'Bon de reprise / retour' },
  { key: 'registre_reclamations', label: 'Registre des réclamations' },
]

const RESPONSABILITES_LIST = [
  { key: 'direction', label: 'Direction / Représentant légal' },
  { key: 'garant_psdm', label: 'Garant PSDM' },
  { key: 'materiovigilance', label: 'Correspondant matériovigilance' },
  { key: 'pharmacien', label: 'Pharmacien responsable' },
  { key: 'responsable_etablissement', label: 'Responsable établissement' },
  { key: 'desinfection', label: 'Désinfection / Hygiène' },
  { key: 'sav_maintenance', label: 'SAV / Maintenance' },
  { key: 'reclamations', label: 'Réclamations' },
  { key: 'pilote_certification', label: 'Pilote certification MediReg' },
  { key: 'dpo', label: 'DPO / Interlocuteur RGPD' },
]

const STEPS = [
  { id: 1, label: 'Société', icon: 'ti-building' },
  { id: 2, label: 'Établissements', icon: 'ti-building-hospital' },
  { id: 3, label: 'Personnes', icon: 'ti-users' },
  { id: 4, label: 'Responsabilités', icon: 'ti-shield-check' },
  { id: 5, label: 'Activités', icon: 'ti-list-check' },
  { id: 6, label: 'Organisation', icon: 'ti-settings' },
]

// IDs réels depuis la base pour faire les updates sans supprimer
type EtabRecord = { id: string; nom: string; siret: string; adresse: string; code_postal: string; ville: string; telephone: string; email: string; est_siege: boolean }
type PersRecord = { id: string; nom: string; prenom: string; fonction_reelle: string; telephone: string; email: string }

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [clientId, setClientId] = useState<string | null>(null)
  const [societeId, setSocieteId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [savedStep, setSavedStep] = useState<number | null>(null)

  // IDs réels pour les updates
  const [etabIds, setEtabIds] = useState<string[]>([])
  const [persIds, setPersIds] = useState<string[]>([])

  const router = useRouter()
  const supabase = createClient()

  const [societe, setSociete] = useState({
    raison_sociale: '', nom_commercial: '', forme_juridique: 'SARL',
    siren: '', code_ape: '', adresse_siege: '', code_postal: '', ville: '',
    telephone: '', email: '', logo_url: ''
  })
  const [etablissements, setEtablissements] = useState([{
    nom: '', siret: '', adresse: '', code_postal: '', ville: '', telephone: '', email: '', est_siege: true
  }])
  const [personnes, setPersonnes] = useState([{
    nom: '', prenom: '', fonction_reelle: '', telephone: '', email: ''
  }])
  const [responsabilites, setResponsabilites] = useState<Record<string, { personne_idx: number; etablissement_idx: number }[]>>({})
  const [activites, setActivites] = useState<Record<number, Record<string, string>>>({})
  const [organisation, setOrganisation] = useState({
    dossier_usager: '',
    dossier_usager_detail: '',
    astreinte: false,
    astreinte_tel: '',
    depannage_qui_recoit: '',
    depannage_qui_intervient: '',
    familles_materiels: [] as string[],
    documents_existants: [] as string[],
  })

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('client_id, role').eq('id', user.id).single()
      if (!prof?.client_id) { router.push('/dashboard'); return }
      setClientId(prof.client_id)

      const { data: existingSoc } = await supabase.from('societes').select('*').eq('client_id', prof.client_id).single()

      if (existingSoc) {
        setSocieteId(existingSoc.id)
        setIsEditing(true)
        setSociete({
          raison_sociale: existingSoc.raison_sociale || '',
          nom_commercial: existingSoc.nom_commercial || '',
          forme_juridique: existingSoc.forme_juridique || 'SARL',
          siren: existingSoc.siren || '',
          code_ape: existingSoc.code_ape || '',
          adresse_siege: existingSoc.adresse_siege || '',
          code_postal: existingSoc.code_postal || '',
          ville: existingSoc.ville || '',
          telephone: existingSoc.telephone || '',
          email: existingSoc.email || '',
          logo_url: existingSoc.logo_url || '',
        })
        if (existingSoc.organisation) setOrganisation(existingSoc.organisation)

        // Charger établissements
        const { data: etabs } = await supabase.from('etablissements_psdm').select('*').eq('societe_id', existingSoc.id).order('created_at')
        if (etabs && etabs.length > 0) {
          setEtabIds(etabs.map(e => e.id))
          setEtablissements(etabs.map(e => ({
            nom: e.nom || '', siret: e.siret || '', adresse: e.adresse || '',
            code_postal: e.code_postal || '', ville: e.ville || '',
            telephone: e.telephone || '', email: e.email || '', est_siege: e.est_siege || false
          })))

          // Charger activités
          const { data: acts } = await supabase.from('activites_etablissement').select('*').in('etablissement_id', etabs.map(e => e.id))
          if (acts && acts.length > 0) {
            const actsMap: Record<number, Record<string, string>> = {}
            for (const act of acts) {
              const eIdx = etabs.findIndex(e => e.id === act.etablissement_id)
              if (eIdx === -1) continue
              if (!actsMap[eIdx]) actsMap[eIdx] = {}
              // Ne garder que le dernier mode pour chaque activité (éviter doublons)
              actsMap[eIdx][act.activite] = act.mode
            }
            setActivites(actsMap)
          }
        }

        // Charger personnes
        const { data: pers } = await supabase.from('personnes').select('*').eq('societe_id', existingSoc.id).order('created_at')
        if (pers && pers.length > 0) {
          setPersIds(pers.map(p => p.id))
          setPersonnes(pers.map(p => ({
            nom: p.nom || '', prenom: p.prenom || '',
            fonction_reelle: p.fonction_reelle || '',
            telephone: p.telephone || '', email: p.email || ''
          })))

          // Charger responsabilités
          const { data: resps } = await supabase.from('responsabilites_personnes').select('*').in('personne_id', pers.map(p => p.id))
          if (resps && resps.length > 0) {
            const { data: etabsForResp } = await supabase.from('etablissements_psdm').select('id').eq('societe_id', existingSoc.id).order('created_at')
            const respMap: Record<string, { personne_idx: number; etablissement_idx: number }[]> = {}
            const seen = new Set<string>()
            for (const r of resps) {
              const pIdx = pers.findIndex(p => p.id === r.personne_id)
              const eIdx = (etabsForResp || []).findIndex(e => e.id === r.etablissement_id)
              if (pIdx === -1 || eIdx === -1) continue
              const key = `${r.responsabilite}_${pIdx}_${eIdx}`
              if (seen.has(key)) continue
              seen.add(key)
              if (!respMap[r.responsabilite]) respMap[r.responsabilite] = []
              respMap[r.responsabilite].push({ personne_idx: pIdx, etablissement_idx: eIdx })
            }
            setResponsabilites(respMap)
          }
        }
      } else {
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
            nom: client.nom || '', siret: '', adresse: '', code_postal: '',
            ville: client.ville || '', telephone: client.contact_tel || '',
            email: client.contact_email || '', est_siege: true
          }])
        }
      }
      setInitialized(true)
    }
    init()
  }, [])

  async function handleUploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || !clientId) return
    const file = e.target.files[0]
    setUploadingLogo(true)
    const path = `logos/${clientId}_${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage.from('documents').upload(path, file)
    if (!uploadError) {
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
      setSociete(prev => ({ ...prev, logo_url: urlData.publicUrl }))
    }
    setUploadingLogo(false)
    e.target.value = ''
  }

  async function saveSociete() {
    if (!clientId || !societe.raison_sociale) return
    setSaving(true); setError(null)
    try {
      let sid = societeId
      if (sid) {
        await supabase.from('societes').update({ ...societe, updated_at: new Date().toISOString() }).eq('id', sid)
      } else {
        const { data, error: err } = await supabase.from('societes').insert([{ ...societe, client_id: clientId }]).select('id').single()
        if (err) throw new Error(err.message)
        sid = data!.id
        setSocieteId(sid)
      }
      if (!isEditing) setStep(2)
      else { setSavedStep(step); setTimeout(() => setSavedStep(null), 2000) }
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

  async function saveEtablissements() {
    const sid = societeId
    if (!sid) { setError('Erreur: société non trouvée'); return }
    setSaving(true); setError(null)
    try {
      if (isEditing && etabIds.length > 0) {
        // Update chaque établissement existant par ID — preserve les liaisons
        for (let i = 0; i < etabIds.length; i++) {
          const etab = etablissements[i]
          if (!etab || !etab.nom) continue
          await supabase.from('etablissements_psdm').update({
            nom: etab.nom, siret: etab.siret, adresse: etab.adresse,
            code_postal: etab.code_postal, ville: etab.ville,
            telephone: etab.telephone, email: etab.email, est_siege: etab.est_siege
          }).eq('id', etabIds[i])
        }
      } else {
        await supabase.from('etablissements_psdm').delete().eq('societe_id', sid)
        const newIds: string[] = []
        for (const etab of etablissements) {
          if (!etab.nom) continue
          const { data, error: err } = await supabase.from('etablissements_psdm').insert([{ ...etab, societe_id: sid }]).select('id').single()
          if (err) throw new Error(err.message)
          if (data) newIds.push(data.id)
        }
        setEtabIds(newIds)
      }
      if (!isEditing) setStep(3)
      else { setSavedStep(step); setTimeout(() => setSavedStep(null), 2000) }
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

  async function savePersonnes() {
    const sid = societeId
    if (!sid) { setError('Erreur: société non trouvée'); return }
    setSaving(true); setError(null)
    try {
      if (isEditing && persIds.length > 0) {
        // Update chaque personne par ID — preserve les liaisons
        for (let i = 0; i < persIds.length; i++) {
          const pers = personnes[i]
          if (!pers || !pers.nom || !pers.prenom) continue
          await supabase.from('personnes').update({
            nom: pers.nom, prenom: pers.prenom,
            fonction_reelle: pers.fonction_reelle,
            telephone: pers.telephone, email: pers.email
          }).eq('id', persIds[i])
        }
      } else {
        await supabase.from('personnes').delete().eq('societe_id', sid)
        const newIds: string[] = []
        for (const pers of personnes) {
          if (!pers.nom || !pers.prenom) continue
          const { data, error: err } = await supabase.from('personnes').insert([{ ...pers, societe_id: sid }]).select('id').single()
          if (err) throw new Error(err.message)
          if (data) newIds.push(data.id)
        }
        setPersIds(newIds)
      }
      if (!isEditing) setStep(4)
      else { setSavedStep(step); setTimeout(() => setSavedStep(null), 2000) }
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

  async function saveResponsabilites() {
    const sid = societeId
    if (!sid) { setError('Erreur: société non trouvée'); return }
    setSaving(true); setError(null)
    console.log('saveResponsabilites — responsabilites state:', JSON.stringify(responsabilites))
    try {
      const { data: freshPers } = await supabase.from('personnes').select('id').eq('societe_id', sid).order('created_at')
      const { data: freshEtabs } = await supabase.from('etablissements_psdm').select('id').eq('societe_id', sid).order('created_at')
      console.log('freshPers:', freshPers?.length, 'freshEtabs:', freshEtabs?.length)
      if (!freshPers || !freshEtabs) throw new Error('Données non trouvées')

      if (freshPers.length > 0) {
        const { error: delErr } = await supabase.from('responsabilites_personnes').delete().in('personne_id', freshPers.map(p => p.id))
        console.log('delete:', delErr?.message || 'OK')
      }

      const entries = Object.entries(responsabilites)
      console.log('entries à insérer:', entries.length)
      for (const [resp, assignments] of entries) {
        for (const assignment of (assignments as any[])) {
          const persId = freshPers[assignment.personne_idx]?.id
          const etabId = freshEtabs[assignment.etablissement_idx]?.id
          console.log('insert:', resp, persId, etabId)
          if (persId && etabId) {
            const { error: insErr } = await supabase.from('responsabilites_personnes').insert([{
              personne_id: persId, etablissement_id: etabId, responsabilite: resp
            }])
            if (insErr) console.log('insert error:', insErr.message)
          }
        }
      }

      if (!isEditing) setStep(5)
      if (isEditing) { setSavedStep(step); setTimeout(() => setSavedStep(null), 2000) }
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

  async function saveActivites() {
    const sid = societeId
    if (!sid) { setError('Erreur: société non trouvée'); return }
    setSaving(true); setError(null)
    try {
      // Recharger les IDs depuis la base
      const { data: freshEtabs } = await supabase.from('etablissements_psdm').select('id').eq('societe_id', sid).order('created_at')
      if (!freshEtabs) throw new Error('Établissements non trouvés')

      // Supprimer toutes les activites existantes
      if (freshEtabs.length > 0) {
        await supabase.from('activites_etablissement').delete().in('etablissement_id', freshEtabs.map(e => e.id))
      }

      // Recréer uniquement celles sélectionnées
      for (const [etabIdx, acts] of Object.entries(activites)) {
        const etabId = freshEtabs[parseInt(etabIdx)]?.id
        if (!etabId) continue
        for (const [activite, mode] of Object.entries(acts as Record<string, string>)) {
          await supabase.from('activites_etablissement').insert([{ etablissement_id: etabId, activite, mode }])
        }
      }

      if (!isEditing) setStep(6)
      else { setSavedStep(step); setTimeout(() => setSavedStep(null), 2000) }
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

  async function saveOrganisation() {
    const sid = societeId
    if (!sid) { setError('Erreur: société non trouvée'); return }
    setSaving(true); setError(null)
    try {
      await supabase.from('societes').update({ organisation, updated_at: new Date().toISOString() }).eq('id', sid)
      router.push(isEditing ? '/dashboard/profil' : '/dashboard/certification')
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

  // Recharger depuis la base à chaque fois qu'on arrive sur étape 4 ou 5
  useEffect(() => {
    if (step === 4 && societeId) loadResponsabilites()
  }, [step, societeId])

  useEffect(() => {
    if (step === 5 && societeId) loadActivites()
  }, [step, societeId])

  async function loadResponsabilites() {
    const { data: pers } = await supabase.from('personnes').select('id').eq('societe_id', societeId!).order('created_at')
    const { data: etabs } = await supabase.from('etablissements_psdm').select('id').eq('societe_id', societeId!).order('created_at')
    if (!pers || !etabs) return
    setPersIds(pers.map(p => p.id))
    setEtabIds(etabs.map(e => e.id))
    const { data: resps } = await supabase.from('responsabilites_personnes').select('*').in('personne_id', pers.map(p => p.id))
    if (!resps) return
    const respMap: Record<string, { personne_idx: number; etablissement_idx: number }[]> = {}
    const seen = new Set<string>()
    for (const r of resps) {
      const pIdx = pers.findIndex(p => p.id === r.personne_id)
      const eIdx = etabs.findIndex(e => e.id === r.etablissement_id)
      if (pIdx === -1 || eIdx === -1) continue
      const key = `${r.responsabilite}_${pIdx}_${eIdx}`
      if (seen.has(key)) continue
      seen.add(key)
      if (!respMap[r.responsabilite]) respMap[r.responsabilite] = []
      respMap[r.responsabilite].push({ personne_idx: pIdx, etablissement_idx: eIdx })
    }
    setResponsabilites(respMap)
  }

  async function loadActivites() {
    const { data: etabs } = await supabase.from('etablissements_psdm').select('id').eq('societe_id', societeId!).order('created_at')
    if (!etabs) return
    setEtabIds(etabs.map(e => e.id))
    const { data: acts } = await supabase.from('activites_etablissement').select('*').in('etablissement_id', etabs.map(e => e.id))
    if (!acts) return
    const actsMap: Record<number, Record<string, string>> = {}
    const seen = new Set<string>()
    for (const act of acts) {
      const eIdx = etabs.findIndex(e => e.id === act.etablissement_id)
      if (eIdx === -1) continue
      const key = `${act.etablissement_id}_${act.activite}`
      if (seen.has(key)) continue
      seen.add(key)
      if (!actsMap[eIdx]) actsMap[eIdx] = {}
      actsMap[eIdx][act.activite] = act.mode
    }
    setActivites(actsMap)
  }

  const toggleFamillesMat = (fam: string) => setOrganisation(prev => ({
    ...prev,
    familles_materiels: prev.familles_materiels.includes(fam)
      ? prev.familles_materiels.filter(f => f !== fam)
      : [...prev.familles_materiels, fam]
  }))

  const toggleDocExistant = (doc: string) => setOrganisation(prev => ({
    ...prev,
    documents_existants: prev.documents_existants.includes(doc)
      ? prev.documents_existants.filter(d => d !== doc)
      : [...prev.documents_existants, doc]
  }))

  const addEtablissement = () => setEtablissements(prev => [...prev, { nom: '', siret: '', adresse: '', code_postal: '', ville: '', telephone: '', email: '', est_siege: false }])
  const addPersonne = () => setPersonnes(prev => [...prev, { nom: '', prenom: '', fonction_reelle: '', telephone: '', email: '' }])

  const toggleResponsabilite = (resp: string, personneIdx: number, etabIdx: number) => {
    setResponsabilites(prev => {
      const current = prev[resp] || []
      const exists = current.find(a => a.personne_idx === personneIdx && a.etablissement_idx === etabIdx)
      if (exists) return { ...prev, [resp]: current.filter(a => !(a.personne_idx === personneIdx && a.etablissement_idx === etabIdx)) }
      return { ...prev, [resp]: [...current, { personne_idx: personneIdx, etablissement_idx: etabIdx }] }
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

  if (!initialized) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font)', color: 'var(--text-tertiary)', fontSize: '13px', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #7C3AED 0%, #1A56DB 100%)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="ti ti-shield-check" style={{ fontSize: '16px', color: '#fff' }} />
        </div>
        Chargement...
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #7C3AED 0%, #1A56DB 100%)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-shield-check" style={{ fontSize: '16px', color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>MediReg</div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{isEditing ? 'Modifier votre profil' : 'Configuration de votre profil'}</div>
          </div>
        </div>
        {societeId && (
          <button onClick={() => router.push('/dashboard')}
            style={{ fontSize: '12px', color: 'var(--text-tertiary)', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '6px 12px', cursor: 'pointer', fontFamily: 'var(--font)' }}>
            Continuer plus tard
          </button>
        )}
      </div>

      {/* Steps */}
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '16px 24px' }}>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center', maxWidth: '700px', margin: '0 auto' }}>
          {STEPS.map((s, i) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: (isEditing || step > s.id) ? 'pointer' : 'default' }}
                onClick={() => (isEditing || step > s.id) && setStep(s.id)}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: step > s.id ? '#10B981' : step === s.id ? '#1A56DB' : isEditing ? '#E5E7EB' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {step > s.id
                    ? <i className="ti ti-check" style={{ fontSize: '13px', color: '#fff' }} />
                    : <i className={`ti ${s.icon}`} style={{ fontSize: '13px', color: step === s.id ? '#fff' : 'var(--text-tertiary)' }} />
                  }
                </div>
              </div>
              {i < STEPS.length - 1 && <div style={{ flex: 1, height: '1px', background: step > s.id ? '#10B981' : 'var(--border)', margin: '0 4px' }} />}
            </div>
          ))}
          <div style={{ marginLeft: '12px', fontSize: '12px', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
            {isEditing ? 'Modification — ' : ''}{step}/{STEPS.length} — {STEPS[step - 1].label}
          </div>
        </div>
      </div>

      {isEditing && (
        <div style={{ maxWidth: '700px', margin: '12px auto 0', width: '100%', padding: '0 24px', boxSizing: 'border-box' as const }}>
          {savedStep ? (
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '9px', padding: '10px 16px', fontSize: '12px', color: '#059669', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="ti ti-circle-check" style={{ fontSize: '14px' }} />
              Modifications enregistrées avec succès
            </div>
          ) : (
            <div style={{ background: '#EBF2FF', border: '1px solid #BFDBFE', borderRadius: '9px', padding: '10px 16px', fontSize: '12px', color: '#1A56DB', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="ti ti-edit" style={{ fontSize: '14px' }} />
              Mode modification — cliquez sur n'importe quelle étape pour la modifier directement
            </div>
          )}
        </div>
      )}

      {error && (
        <div style={{ maxWidth: '700px', margin: '16px auto 0', width: '100%', padding: '0 24px', boxSizing: 'border-box' as const }}>
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', padding: '12px 16px', fontSize: '12px', color: '#DC2626' }}>
            <i className="ti ti-alert-circle" style={{ fontSize: '14px', marginRight: '6px' }} />{error}
          </div>
        </div>
      )}

      <div style={{ flex: 1, padding: '32px 24px', maxWidth: '700px', margin: '0 auto', width: '100%', boxSizing: 'border-box' as const }}>

        {/* STEP 1 */}
        {step === 1 && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>Votre société</div>
              <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Ces informations seront utilisées automatiquement dans tous vos documents de certification.</div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#1A56DB', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '14px' }}>Logo</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '100px', height: '70px', border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-hover)', overflow: 'hidden', flexShrink: 0 }}>
                  {societe.logo_url ? <img src={societe.logo_url} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} /> : <div style={{ textAlign: 'center' }}><i className="ti ti-photo" style={{ fontSize: '24px', color: 'var(--text-tertiary)', display: 'block' }} /><div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Logo</div></div>}
                </div>
                <div>
                  <label style={{ padding: '8px 16px', background: '#EBF2FF', border: '1px solid rgba(26,86,219,0.2)', borderRadius: 'var(--radius-sm)', color: '#1A56DB', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <i className="ti ti-upload" style={{ fontSize: '14px' }} />{uploadingLogo ? 'Upload...' : 'Uploader votre logo'}
                    <input type='file' accept='image/*' style={{ display: 'none' }} onChange={handleUploadLogo} />
                  </label>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '6px' }}>PNG ou JPG — Apparaîtra en haut de tous vos documents</div>
                </div>
              </div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#1A56DB', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '14px' }}>Identité</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>Raison sociale *</label>
                  <input value={societe.raison_sociale} onChange={e => setSociete(p => ({ ...p, raison_sociale: e.target.value }))} placeholder="SARL Oxygène Services Loire" style={inputStyle} autoFocus />
                </div>
                <div><label style={labelStyle}>Nom commercial</label><input value={societe.nom_commercial} onChange={e => setSociete(p => ({ ...p, nom_commercial: e.target.value }))} placeholder="Si différent" style={inputStyle} /></div>
                <div><label style={labelStyle}>Forme juridique</label><select value={societe.forme_juridique} onChange={e => setSociete(p => ({ ...p, forme_juridique: e.target.value }))} style={inputStyle}>{FORMES_JURIDIQUES.map(f => <option key={f}>{f}</option>)}</select></div>
                <div><label style={labelStyle}>SIREN</label><input value={societe.siren} onChange={e => setSociete(p => ({ ...p, siren: e.target.value }))} placeholder="123 456 789" style={inputStyle} /></div>
                <div><label style={labelStyle}>Code APE / NAF</label><input value={societe.code_ape} onChange={e => setSociete(p => ({ ...p, code_ape: e.target.value }))} placeholder="4774Z" style={inputStyle} /></div>
              </div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#1A56DB', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '14px' }}>Coordonnées du siège</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Adresse</label><input value={societe.adresse_siege} onChange={e => setSociete(p => ({ ...p, adresse_siege: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Code postal</label><input value={societe.code_postal} onChange={e => setSociete(p => ({ ...p, code_postal: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Ville</label><input value={societe.ville} onChange={e => setSociete(p => ({ ...p, ville: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Téléphone</label><input value={societe.telephone} onChange={e => setSociete(p => ({ ...p, telephone: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Email</label><input type='email' value={societe.email} onChange={e => setSociete(p => ({ ...p, email: e.target.value }))} style={inputStyle} /></div>
              </div>
            </div>
            <button onClick={saveSociete} disabled={saving || !societe.raison_sociale}
              style={{ width: '100%', padding: '13px', background: saving || !societe.raison_sociale ? 'rgba(26,86,219,0.4)' : '#1A56DB', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: saving || !societe.raison_sociale ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>
              {saving ? 'Enregistrement...' : isEditing ? 'Enregistrer cette étape' : 'Continuer →'}
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>Vos établissements</div>
              <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Chaque établissement a son propre SIRET. Ajoutez tous vos sites.</div>
            </div>
            {etablissements.map((etab, i) => (
              <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#1A56DB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#fff', fontWeight: '700' }}>{i + 1}</div>
                    {etab.est_siege ? 'Siège social' : `Établissement ${i + 1}`}
                    {etab.est_siege && <span style={{ fontSize: '10px', background: '#F5F3FF', color: '#7C3AED', padding: '2px 8px', borderRadius: '20px' }}>Siège</span>}
                  </div>
                  {!etab.est_siege && <button onClick={() => setEtablissements(prev => prev.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontSize: '13px', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '4px' }}><i className="ti ti-trash" style={{ fontSize: '14px' }} />Supprimer</button>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Nom *</label><input value={etab.nom} onChange={e => setEtablissements(prev => prev.map((et, idx) => idx === i ? { ...et, nom: e.target.value } : et))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>SIRET</label><input value={etab.siret} onChange={e => setEtablissements(prev => prev.map((et, idx) => idx === i ? { ...et, siret: e.target.value } : et))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Adresse</label><input value={etab.adresse} onChange={e => setEtablissements(prev => prev.map((et, idx) => idx === i ? { ...et, adresse: e.target.value } : et))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Code postal</label><input value={etab.code_postal} onChange={e => setEtablissements(prev => prev.map((et, idx) => idx === i ? { ...et, code_postal: e.target.value } : et))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Ville</label><input value={etab.ville} onChange={e => setEtablissements(prev => prev.map((et, idx) => idx === i ? { ...et, ville: e.target.value } : et))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Téléphone</label><input value={etab.telephone} onChange={e => setEtablissements(prev => prev.map((et, idx) => idx === i ? { ...et, telephone: e.target.value } : et))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Email</label><input value={etab.email} onChange={e => setEtablissements(prev => prev.map((et, idx) => idx === i ? { ...et, email: e.target.value } : et))} style={inputStyle} /></div>
                </div>
              </div>
            ))}
            <button onClick={addEtablissement} style={{ width: '100%', padding: '12px', background: 'transparent', border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
              <i className="ti ti-plus" style={{ fontSize: '16px' }} />Ajouter un établissement
            </button>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, padding: '12px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font)' }}>← Retour</button>
              <button onClick={saveEtablissements} disabled={saving || !etablissements.some(e => e.nom)} style={{ flex: 2, padding: '12px', background: saving ? 'rgba(26,86,219,0.4)' : '#1A56DB', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>
                {saving ? 'Enregistrement...' : isEditing ? 'Enregistrer cette étape' : 'Continuer →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>Vos collaborateurs</div>
              <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Chaque personne est créée une seule fois.</div>
            </div>
            {personnes.map((pers, i) => (
              <div key={i} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#fff', fontWeight: '700' }}>{i + 1}</div>
                    Personne {i + 1}
                  </div>
                  {i > 0 && <button onClick={() => setPersonnes(prev => prev.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontSize: '13px', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '4px' }}><i className="ti ti-trash" style={{ fontSize: '14px' }} />Supprimer</button>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div><label style={labelStyle}>Nom *</label><input value={pers.nom} onChange={e => setPersonnes(prev => prev.map((p, idx) => idx === i ? { ...p, nom: e.target.value } : p))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Prénom *</label><input value={pers.prenom} onChange={e => setPersonnes(prev => prev.map((p, idx) => idx === i ? { ...p, prenom: e.target.value } : p))} style={inputStyle} /></div>
                  <div style={{ gridColumn: '1 / -1' }}><label style={labelStyle}>Fonction</label><input value={pers.fonction_reelle} onChange={e => setPersonnes(prev => prev.map((p, idx) => idx === i ? { ...p, fonction_reelle: e.target.value } : p))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Téléphone</label><input value={pers.telephone} onChange={e => setPersonnes(prev => prev.map((p, idx) => idx === i ? { ...p, telephone: e.target.value } : p))} style={inputStyle} /></div>
                  <div><label style={labelStyle}>Email</label><input value={pers.email} onChange={e => setPersonnes(prev => prev.map((p, idx) => idx === i ? { ...p, email: e.target.value } : p))} style={inputStyle} /></div>
                </div>
              </div>
            ))}
            <button onClick={addPersonne} style={{ width: '100%', padding: '12px', background: 'transparent', border: '2px dashed var(--border)', borderRadius: 'var(--radius-lg)', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
              <i className="ti ti-plus" style={{ fontSize: '16px' }} />Ajouter une personne
            </button>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setStep(2)} style={{ flex: 1, padding: '12px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font)' }}>← Retour</button>
              <button onClick={savePersonnes} disabled={saving || !personnes.some(p => p.nom && p.prenom)} style={{ flex: 2, padding: '12px', background: saving ? 'rgba(26,86,219,0.4)' : '#1A56DB', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>
                {saving ? 'Enregistrement...' : isEditing ? 'Enregistrer cette étape' : 'Continuer →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>Responsabilités</div>
              <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Une même personne peut cumuler plusieurs responsabilités.</div>
            </div>
            {RESPONSABILITES_LIST.map(resp => (
              <div key={resp.key} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="ti ti-shield" style={{ fontSize: '15px', color: '#7C3AED' }} />{resp.label}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {personnes.map((pers, pIdx) =>
                    etablissements.map((etab, eIdx) => {
                      if (!pers.nom && !pers.prenom) return null
                      const isSelected = (responsabilites[resp.key] || []).some(a => a.personne_idx === pIdx && a.etablissement_idx === eIdx)
                      return (
                        <button key={`${pIdx}-${eIdx}`} onClick={() => toggleResponsabilite(resp.key, pIdx, eIdx)}
                          style={{ padding: '7px 14px', border: `1px solid ${isSelected ? '#7C3AED' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', background: isSelected ? '#F5F3FF' : 'transparent', color: isSelected ? '#7C3AED' : 'var(--text-secondary)', fontSize: '12px', fontWeight: isSelected ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          {isSelected && <i className="ti ti-check" style={{ fontSize: '12px' }} />}
                          {pers.prenom} {pers.nom}
                          {etablissements.length > 1 && <span style={{ opacity: 0.7, fontSize: '11px' }}>· {etab.nom || `Etab ${eIdx + 1}`}</span>}
                        </button>
                      )
                    })
                  )}
                </div>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setStep(3)} style={{ flex: 1, padding: '12px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font)' }}>← Retour</button>
              <button onClick={saveResponsabilites} disabled={saving} style={{ flex: 2, padding: '12px', background: saving ? 'rgba(26,86,219,0.4)' : '#1A56DB', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>
                {saving ? 'Enregistrement...' : isEditing ? 'Enregistrer cette étape' : 'Continuer →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 5 */}
        {step === 5 && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>Activités exercées</div>
              <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Ces informations déterminent quels critères HAS s'appliquent à votre établissement.</div>
            </div>
            {etablissements.map((etab, eIdx) => (
              <div key={eIdx} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="ti ti-building" style={{ fontSize: '15px', color: '#1A56DB' }} />
                  {etab.nom || `Établissement ${eIdx + 1}`}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {ACTIVITES_LIST.map(act => {
                    const currentMode = activites[eIdx]?.[act]
                    return (
                      <div key={act} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: currentMode && currentMode !== 'non_concerne' ? '#EBF2FF' : 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', border: `1px solid ${currentMode && currentMode !== 'non_concerne' ? 'rgba(26,86,219,0.2)' : 'var(--border)'}` }}>
                        <div style={{ flex: 1, fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{act}</div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {['interne', 'sous_traite', 'mixte', 'non_concerne'].map(mode => (
                            <button key={mode} onClick={() => toggleActivite(eIdx, act, mode)}
                              style={{ padding: '4px 8px', border: `1px solid ${currentMode === mode ? '#1A56DB' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', background: currentMode === mode ? '#1A56DB' : 'transparent', color: currentMode === mode ? '#fff' : 'var(--text-tertiary)', fontSize: '10px', fontWeight: currentMode === mode ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>
                              {mode === 'interne' ? 'Interne' : mode === 'sous_traite' ? 'Sous-traité' : mode === 'mixte' ? 'Mixte' : 'Non concerné'}
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
              <button onClick={() => setStep(4)} style={{ flex: 1, padding: '12px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font)' }}>← Retour</button>
              <button onClick={saveActivites} disabled={saving} style={{ flex: 2, padding: '12px', background: saving ? 'rgba(26,86,219,0.4)' : '#1A56DB', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>
                {saving ? 'Enregistrement...' : isEditing ? 'Enregistrer cette étape' : 'Continuer →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 6 */}
        {step === 6 && (
          <div>
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>Organisation interne</div>
              <div style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>Ces informations permettent à MediReg de préremplir automatiquement les preuves du chapitre 2.</div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>Où tenez-vous le dossier de vos usagers ?</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                {[{ key: 'logiciel_metier', label: 'Logiciel métier', icon: 'ti-device-laptop' }, { key: 'papier', label: 'Papier', icon: 'ti-file' }, { key: 'mixte', label: 'Mixte', icon: 'ti-files' }, { key: 'autre', label: 'Autre', icon: 'ti-dots' }].map(opt => (
                  <button key={opt.key} onClick={() => setOrganisation(p => ({ ...p, dossier_usager: opt.key }))}
                    style={{ padding: '10px 16px', border: `2px solid ${organisation.dossier_usager === opt.key ? '#1A56DB' : 'var(--border)'}`, borderRadius: '10px', background: organisation.dossier_usager === opt.key ? '#EBF2FF' : '#fff', color: organisation.dossier_usager === opt.key ? '#1A56DB' : 'var(--text-secondary)', fontSize: '13px', fontWeight: organisation.dossier_usager === opt.key ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className={`ti ${opt.icon}`} style={{ fontSize: '15px' }} />{opt.label}
                  </button>
                ))}
              </div>
              {(organisation.dossier_usager === 'logiciel_metier' || organisation.dossier_usager === 'autre') && (
                <input value={organisation.dossier_usager_detail} onChange={e => setOrganisation(p => ({ ...p, dossier_usager_detail: e.target.value }))} placeholder={organisation.dossier_usager === 'logiciel_metier' ? 'Nom du logiciel...' : 'Précisez...'} style={inputStyle} />
              )}
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px' }}>Quels documents utilisez-vous déjà ?</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {DOCUMENTS_EXISTANTS.map(doc => {
                  const selected = organisation.documents_existants.includes(doc.key)
                  return <button key={doc.key} onClick={() => toggleDocExistant(doc.key)} style={{ padding: '7px 14px', border: `1px solid ${selected ? '#059669' : 'var(--border)'}`, borderRadius: '20px', background: selected ? '#ECFDF5' : '#fff', color: selected ? '#059669' : 'var(--text-secondary)', fontSize: '12px', fontWeight: selected ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '5px' }}>{selected && <i className="ti ti-check" style={{ fontSize: '11px' }} />}{doc.label}</button>
                })}
              </div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px' }}>Familles de matériels</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {FAMILLES_MATERIELS.map(fam => {
                  const selected = organisation.familles_materiels.includes(fam)
                  return <button key={fam} onClick={() => toggleFamillesMat(fam)} style={{ padding: '7px 14px', border: `1px solid ${selected ? '#7C3AED' : 'var(--border)'}`, borderRadius: '20px', background: selected ? '#F5F3FF' : '#fff', color: selected ? '#7C3AED' : 'var(--text-secondary)', fontSize: '12px', fontWeight: selected ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '5px' }}>{selected && <i className="ti ti-check" style={{ fontSize: '11px' }} />}{fam}</button>
                })}
              </div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '24px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '14px' }}>Organisation des dépannages</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div><label style={labelStyle}>Qui reçoit les appels ?</label><input value={organisation.depannage_qui_recoit} onChange={e => setOrganisation(p => ({ ...p, depannage_qui_recoit: e.target.value }))} style={inputStyle} /></div>
                <div><label style={labelStyle}>Qui intervient ?</label><input value={organisation.depannage_qui_intervient} onChange={e => setOrganisation(p => ({ ...p, depannage_qui_intervient: e.target.value }))} style={inputStyle} /></div>
              </div>
              <div style={{ padding: '14px 16px', background: organisation.astreinte ? '#EBF2FF' : 'var(--surface-hover)', borderRadius: '10px', border: `1px solid ${organisation.astreinte ? '#BFDBFE' : 'var(--border)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: organisation.astreinte ? '12px' : '0' }}>
                  <div><div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Astreinte 24h/24 — 7j/7</div><div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Obligatoire si vous gérez l'oxygène ou les VPH</div></div>
                  <button onClick={() => setOrganisation(p => ({ ...p, astreinte: !p.astreinte }))} style={{ width: '44px', height: '24px', borderRadius: '12px', background: organisation.astreinte ? '#1A56DB' : '#D1D5DB', border: 'none', cursor: 'pointer', position: 'relative', transition: 'all 0.2s' }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '3px', left: organisation.astreinte ? '23px' : '3px', transition: 'all 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </button>
                </div>
                {organisation.astreinte && <div><label style={labelStyle}>Numéro d'astreinte</label><input value={organisation.astreinte_tel} onChange={e => setOrganisation(p => ({ ...p, astreinte_tel: e.target.value }))} style={inputStyle} /></div>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setStep(5)} style={{ flex: 1, padding: '12px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font)' }}>← Retour</button>
              <button onClick={saveOrganisation} disabled={saving} style={{ flex: 2, padding: '13px', background: saving ? 'rgba(26,86,219,0.4)' : 'linear-gradient(135deg, #7C3AED 0%, #1A56DB 100%)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <i className="ti ti-rocket" style={{ fontSize: '16px' }} />
                {saving ? 'Enregistrement...' : isEditing ? 'Enregistrer les modifications' : 'Lancer la certification !'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}