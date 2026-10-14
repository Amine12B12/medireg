'use client'

import { Suspense, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'
import CritereDetail from './CritereDetail'
import AccueilChapitres, { type ChapitreInfo, type StatsChapitre } from './AccueilChapitres'
import ListeChapitre from './ListeChapitre'
import { CONTENU_CHAPITRES } from '@/lib/chapitres-contenu'
import { critereApplicable } from '@/lib/applicabilite'

// Couleurs et icônes ; les textes viennent de src/lib/chapitres-contenu.ts
const STYLES_CHAPITRES: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  '1': { color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', icon: 'ti-heart' },
  '2': { color: '#1A56DB', bg: '#EBF2FF', border: '#BFDBFE', icon: 'ti-truck-delivery' },
  '3': { color: '#0A7C4E', bg: '#E8F5EE', border: '#A7F3D0', icon: 'ti-settings' },
  '4': { color: '#B45309', bg: '#FEF3C7', border: '#FDE68A', icon: 'ti-shield-check' },
}
const CHAPITRES: Record<string, ChapitreInfo> = Object.fromEntries(
  Object.entries(STYLES_CHAPITRES).map(([k, st]) => [k, { ...st, ...CONTENU_CHAPITRES[k] }])
)

const STATUTS = [
  { key: 'non_analyse', label: 'Non analysé', color: '#6B7280', bg: '#F9FAFB', dot: '#D1D5DB' },
  { key: 'non_applicable', label: 'Non applicable', color: '#9CA3AF', bg: '#F3F4F6', dot: '#D1D5DB' },
  { key: 'information_manquante', label: 'Info manquante', color: '#7C3AED', bg: '#F5F3FF', dot: '#8B5CF6' },
  { key: 'preuve_manquante', label: 'Preuve manquante', color: '#D97706', bg: '#FFFBEB', dot: '#F59E0B' },
  { key: 'procedure_a_valider', label: 'À valider', color: '#2563EB', bg: '#EFF6FF', dot: '#3B82F6' },
  { key: 'action_corrective', label: 'Action corrective', color: '#DC2626', bg: '#FEF2F2', dot: '#EF4444' },
  { key: 'pret_audit', label: 'Prêt pour audit', color: '#059669', bg: '#ECFDF5', dot: '#10B981' },
]

const DOCS_PAR_CRITERE: Record<string, { code: string; nom: string }[]> = {
  '1.2.1': [
    { code: 'USA-INFO-01', nom: 'Definitions libre choix et consentement' },
    { code: 'USA-DOC-01', nom: 'Charte ethique' },
    { code: 'PRESTA-DOC-01', nom: 'Attestation d\'installation' },
    { code: 'QR-DOC-01', nom: 'Enquete satisfaction — preuve libre choix' },
  ],
  '1.2.2': [{ code: 'USA-INFO-01', nom: 'Definitions libre choix et consentement' }],
  '1.2.5': [{ code: 'USA-DOC-01', nom: 'Charte ethique — engagement RGPD' }],
  '1.3.1': [{ code: 'QR-DOC-01', nom: 'Enquete de satisfaction usager' }],
  '1.3.2': [{ code: 'QR-DOC-01', nom: 'Enquete satisfaction — analyse reclamations' }],
}

// Ordre de traitement proposé par « Continuer » : ce qui bloque d'abord, puis ce qui n'est pas commencé
const PRIORITE_CLIENT = ['action_corrective', 'information_manquante', 'preuve_manquante', 'non_analyse']
const PRIORITE_CONSULTANT = ['procedure_a_valider', 'action_corrective', 'information_manquante', 'preuve_manquante', 'non_analyse']

// Tri naturel des codes : 1.2.1 < 1.10.1 (le tri texte de la base mettait 1.10 avant 1.2)
function comparerCodes(a: string, b: string) {
  const x = a.split('.').map(Number), y = b.split('.').map(Number)
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? -1) - (y[i] ?? -1)
    if (d !== 0) return d
  }
  return 0
}

const cleDernierCritere = (etabId: string) => `medireg:dernier-critere:${etabId}`

export default function CertificationPage() {
  return (
    <Suspense fallback={null}>
      <Certification />
    </Suspense>
  )
}

function Certification() {
  const [societe, setSociete] = useState<any>(null)
  const [etablissements, setEtablissements] = useState<any[]>([])
  const [selectedEtabId, setSelectedEtabId] = useState<string>('')
  const [activites, setActivites] = useState<string[]>([])
  const [criteres, setCriteres] = useState<any[]>([])
  const [reponses, setReponses] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [filterStatut, setFilterStatut] = useState<string>('tous')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [generatingDoc, setGeneratingDoc] = useState<string | null>(null)
  const [docsGeneres, setDocsGeneres] = useState<Record<string, any[]>>({})
  const [messagesNonLus, setMessagesNonLus] = useState<Record<string, number>>({})
  const [userRole, setUserRole] = useState<string>('client')
  const [meditrackEtabId, setMeditrackEtabId] = useState<string | null>(null)
  const [consultantId, setConsultantId] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  // La position (chapitre, critère) vit dans l'URL : bouton retour et rechargement la conservent
  const critereParam = searchParams.get('critere')
  const chapitreParam = searchParams.get('chapitre')
  const selectedCritere = critereParam ? criteres.find(c => c.code === critereParam) ?? null : null
  const filterChap: string = selectedCritere?.chapitre ?? (chapitreParam && CHAPITRES[chapitreParam] ? chapitreParam : 'tous')

  function naviguer(chapitre: string | null, critere: string | null) {
    setErreur(null)
    const q = new URLSearchParams(searchParams.toString())
    if (chapitre) q.set('chapitre', chapitre); else q.delete('chapitre')
    if (critere) q.set('critere', critere); else q.delete('critere')
    const qs = q.toString()
    router.push(`/dashboard/certification${qs ? `?${qs}` : ''}`)
    window.scrollTo(0, 0)
  }
  const setSelectedCritere = (c: any) => {
    if (!c) return naviguer(filterChap !== 'tous' ? filterChap : null, null)
    try { if (selectedEtabId) localStorage.setItem(cleDernierCritere(selectedEtabId), c.code) } catch {}
    naviguer(c.chapitre, c.code)
  }
  const setFilterChap = (ch: string) => naviguer(ch === 'tous' ? null : ch, null)


  // Notifie uniquement le consultant rattaché à ce client (jamais les consultants des autres clients)
  async function notifierConsultant(notif: { type: string; message: string; critere_code?: string }) {
    if (!consultantId || !societe?.client_id) return
    await supabase.from('notifications').insert([{ ...notif, consultant_id: consultantId, client_id: societe.client_id, lu: false }])
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('role, client_id').eq('id', user.id).single()
      const role = prof?.role || 'client'
      setUserRole(role)
      let cId = prof?.client_id
      if (prof?.role === 'consultant') {
        const params = new URLSearchParams(window.location.search)
        cId = params.get('client_id') || null
        if (!cId) { router.push('/dashboard/clients'); return }
      }
      const { data: soc } = await supabase.from('societes').select('*, personnes(*, responsabilites_personnes(*))').eq('client_id', cId).single()
      if (!soc) { router.push('/dashboard/onboarding'); return }
      setSociete(soc)

      // Charger meditrack_etablissement_id depuis clients
      const { data: clientData } = await supabase.from('clients').select('meditrack_etablissement_id, consultant_id').eq('id', cId).single()
      if (clientData?.meditrack_etablissement_id) setMeditrackEtabId(clientData.meditrack_etablissement_id)
      setConsultantId(clientData?.consultant_id ?? null)

      const { data: etabs } = await supabase.from('etablissements_psdm').select('*').eq('societe_id', soc.id).order('created_at')
      setEtablissements(etabs || [])
      if (etabs && etabs.length > 0) {
        setSelectedEtabId(etabs[0].id)
        await loadEtabData(etabs[0].id, role)
      }
      const { data: crits } = await supabase.from('criteres_psdm').select('*').order('code')
      setCriteres([...(crits || [])].sort((a, b) => comparerCodes(a.code, b.code)))
      setLoading(false)
    }
    load()
  }, [])

  // role est passé explicitement : au premier chargement, l'état userRole n'est pas encore à jour
  async function loadEtabData(etabId: string, role: string = userRole) {
    const { data: docs } = await supabase.from('documents_qualite').select('*').eq('etablissement_id', etabId).order('created_at', { ascending: false })
    const docsMap: Record<string, any[]> = {}
    for (const d of docs || []) {
      if (!docsMap[d.code_doc]) docsMap[d.code_doc] = []
      docsMap[d.code_doc].push(d)
    }
    const { data: docsEditables } = await supabase.from('documents_editables').select('*').eq('etablissement_id', etabId).eq('statut', 'signe')
    for (const d of docsEditables || []) {
      if (!docsMap[d.template_code]) docsMap[d.template_code] = []
      if (!docsMap[d.template_code].find((x: any) => x.id === d.id)) {
        docsMap[d.template_code].push({ ...d, code_doc: d.template_code, nom: d.titre, url: null, type_doc: 'editable' })
      }
    }
    setDocsGeneres(docsMap)
    const { data: acts } = await supabase.from('activites_etablissement').select('activite').eq('etablissement_id', etabId).neq('mode', 'non_concerne')
    setActivites((acts || []).map((a: any) => a.activite))
    const { data: reps } = await supabase.from('reponses_criteres').select('*').eq('etablissement_id', etabId)
    const repMap: Record<string, any> = {}
    for (const r of reps || []) repMap[r.critere_id] = r
    setReponses(repMap)
    const champLu = role === 'consultant' ? 'lu_consultant' : 'lu_client'
    const { data: msgs } = await supabase.from('messages_critere').select('critere_id').eq('etablissement_id', etabId).eq(champLu, false)
    const nonLusMap: Record<string, number> = {}
    for (const m of msgs || []) nonLusMap[m.critere_id] = (nonLusMap[m.critere_id] || 0) + 1
    setMessagesNonLus(nonLusMap)
  }

  async function handleEtabChange(etabId: string) {
    setSelectedEtabId(etabId)
    setLoading(true)
    await loadEtabData(etabId)
    setLoading(false)
  }

  async function updateStatut(critereId: string, statut: string) {
    if (!selectedEtabId) return
    setSavingId(critereId)
    const existing = reponses[critereId]
    if (existing) {
      await supabase.from('reponses_criteres').update({ statut, updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await supabase.from('reponses_criteres').insert([{ etablissement_id: selectedEtabId, critere_id: critereId, statut }])
    }
    setReponses(prev => ({ ...prev, [critereId]: { ...prev[critereId], statut } }))

    // Notifier le consultant quand le client valide un critère
    if (userRole === 'client' && statut === 'procedure_a_valider') {
      const critere = criteres.find(c => c.id === critereId)
      await notifierConsultant({
        type: 'critere_a_valider',
        message: `Critère ${critere?.code} — ${critere?.titre?.substring(0, 50)} — En attente de validation`,
        critere_code: critere?.code,
      })
    }

    if (userRole === 'consultant') {
      const critere = criteres.find(c => c.id === critereId)
      const { data: { user } } = await supabase.auth.getUser()
      if (statut === 'pret_audit' && user) {
        await supabase.from('messages_critere').insert([{
          etablissement_id: selectedEtabId, critere_id: critereId, auteur_id: user.id,
          auteur_role: 'consultant', contenu: `Critere ${critere?.code || ""} valide - pret pour audit sur ce point`,
          type: 'validation', lu_client: false, lu_consultant: true,
        }])
      } else if (statut === 'action_corrective' && user) {
        await supabase.from('messages_critere').insert([{
          etablissement_id: selectedEtabId, critere_id: critereId, auteur_id: user.id,
          auteur_role: 'consultant', contenu: `Action corrective necessaire sur le critere ${critere?.code || ""}. Consultez les commentaires.`,
          type: 'rejet', lu_client: false, lu_consultant: true,
        }])
      }
    }
    setSavingId(null)
  }

  async function reloadDocs() {
    const { data: docs } = await supabase.from('documents_qualite').select('*').eq('etablissement_id', selectedEtabId).order('created_at', { ascending: false })
    const docsMap: Record<string, any[]> = {}
    for (const d of docs || []) {
      if (!docsMap[d.code_doc]) docsMap[d.code_doc] = []
      docsMap[d.code_doc].push(d)
    }
    const { data: docsEditables } = await supabase.from('documents_editables').select('*').eq('etablissement_id', selectedEtabId).eq('statut', 'signe')
    for (const d of docsEditables || []) {
      if (!docsMap[d.template_code]) docsMap[d.template_code] = []
      if (!docsMap[d.template_code].find((x: any) => x.id === d.id)) {
        docsMap[d.template_code].push({ ...d, code_doc: d.template_code, nom: d.titre, url: null, type_doc: 'editable' })
      }
    }
    setDocsGeneres(docsMap)
  }

  async function genererDoc(codeDoc: string) {
    if (!societe?.id || !selectedEtabId) return
    setGeneratingDoc(codeDoc)
    try {
      const res = await fetch('/api/generate-doc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ societe_id: societe.id, etablissement_id: selectedEtabId, code_doc: codeDoc })
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${codeDoc}.docx`
        a.click()
        URL.revokeObjectURL(url)
        await reloadDocs()
      } else {
        const err = await res.json().catch(() => ({}))
        setErreur(`Le document ${codeDoc} n'a pas pu être généré${err.error ? ` : ${err.error}` : '.'} Réessayez, ou contactez votre consultant si le problème continue.`)
      }
    } catch {
      setErreur(`Le document ${codeDoc} n'a pas pu être généré : la connexion a échoué. Vérifiez votre réseau et réessayez.`)
    }
    setGeneratingDoc(null)
  }

  async function uploadPreuve(file: File, label: string) {
    if (!societe?.id || !selectedEtabId || !selectedCritere) return
    const path = `preuves/${societe.id}/${selectedCritere.code}_${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('modeles').upload(path, file, { upsert: true })
    if (error) {
      setErreur(`Le fichier « ${file.name} » n'a pas pu être envoyé. Vérifiez sa taille et votre connexion, puis réessayez.`)
      return
    }
    {
      await supabase.from('documents_qualite').insert([{
        etablissement_id: selectedEtabId, critere_id: selectedCritere.id,
        code_doc: `PREUVE_${selectedCritere.code}`, nom: label,
        type_doc: 'preuve', url: path, statut: 'genere'
      }])
      await reloadDocs()
      if (userRole === 'client') {
        await notifierConsultant({
          type: 'document_uploade',
          message: 'Document ajouté sur le critère ' + selectedCritere.code + ' — ' + label,
          critere_code: selectedCritere.code,
        })
      }
    }
  }

  // Critères qui s'appliquent à l'établissement (selon ses activités), indépendamment des filtres d'affichage
  const criteresApplicables = criteres.filter(c => critereApplicable(c.champ_application, activites))

  const criteresFiltres = criteresApplicables.filter(c => {
    if (filterChap !== 'tous' && c.chapitre !== filterChap) return false
    if (filterStatut !== 'tous') {
      const statut = reponses[c.id]?.statut || 'non_analyse'
      if (statut !== filterStatut) return false
    }
    return true
  })

  // La progression vers l'audit porte toujours sur tous les critères applicables, pas sur le filtre en cours
  const total = criteresApplicables.length
  const prets = criteresApplicables.filter(c => reponses[c.id]?.statut === 'pret_audit').length
  const aValider = criteresApplicables.filter(c => reponses[c.id]?.statut === 'procedure_a_valider').length
  const actionsCorrectifs = criteresApplicables.filter(c => reponses[c.id]?.statut === 'action_corrective').length
  const nonAnalyses = criteresApplicables.filter(c => !reponses[c.id] || reponses[c.id]?.statut === 'non_analyse').length
  const score = total > 0 ? Math.round((prets / total) * 100) : 0
  const part = (n: number) => (total > 0 ? (n / total) * 100 : 0)

  const priorite = userRole === 'consultant' ? PRIORITE_CONSULTANT : PRIORITE_CLIENT
  const statsChapitres: StatsChapitre[] = Object.keys(CHAPITRES).map(code => {
    const crits = criteresApplicables.filter(c => c.chapitre === code)
    const statutDe = (c: any) => reponses[c.id]?.statut || 'non_analyse'
    let prochain: any = null
    for (const p of priorite) {
      prochain = crits.find(c => statutDe(c) === p)
      if (prochain) break
    }
    return {
      code,
      total: crits.length,
      prets: crits.filter(c => statutDe(c) === 'pret_audit').length,
      aValider: crits.filter(c => statutDe(c) === 'procedure_a_valider').length,
      actionsCorrectives: crits.filter(c => statutDe(c) === 'action_corrective').length,
      messagesNonLus: crits.reduce((n, c) => n + (messagesNonLus[c.id] || 0), 0),
      prochain: prochain ? { code: prochain.code, titre: prochain.titre } : null,
    }
  })
  let dernierCode: string | null = null
  try { if (selectedEtabId) dernierCode = localStorage.getItem(cleDernierCritere(selectedEtabId)) } catch {}
  const dernier = dernierCode ? criteresApplicables.find(c => c.code === dernierCode) : null

  const getStatut = (critereId: string) => reponses[critereId]?.statut || 'non_analyse'
  const getStatutStyle = (statut: string) => STATUTS.find(s => s.key === statut) || STATUTS[0]

  // Précédent / suivant : dans le chapitre du critère, sans tenir compte du filtre de statut
  const criteresDuChapitre = criteresApplicables.filter(c => c.chapitre === filterChap)
  const navCriteres = criteresDuChapitre
  const currentIdx = selectedCritere ? navCriteres.findIndex(c => c.id === selectedCritere.id) : -1
  const prevCritere = currentIdx > 0 ? navCriteres[currentIdx - 1] : null
  const nextCritere = currentIdx >= 0 && currentIdx < navCriteres.length - 1 ? navCriteres[currentIdx + 1] : null

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: 'var(--font)', color: 'var(--text-tertiary)', fontSize: '13px' }}>
      <div style={{ textAlign: 'center' }}>
        <i className="ti ti-shield-check" style={{ fontSize: '32px', display: 'block', marginBottom: '12px', opacity: 0.3 }} />
        Chargement...
      </div>
    </div>
  )

  if (selectedCritere) {
    const ch = CHAPITRES[selectedCritere.chapitre]
    return (
      <div style={{ fontFamily: 'var(--font)', minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '14px 28px', display: 'flex', alignItems: 'center', gap: '12px', position: 'sticky', top: 0, zIndex: 10, boxShadow: 'var(--shadow-sm)' }}>
          <button onClick={() => setSelectedCritere(null)}
            style={{ width: '36px', height: '36px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--surface-hover)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0 }}>
            <i className="ti ti-arrow-left" style={{ fontSize: '16px' }} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: '700', color: ch.color, background: ch.bg, padding: '3px 10px', borderRadius: '4px', flexShrink: 0, border: `1px solid ${ch.border}` }}>{selectedCritere.code}</span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedCritere.titre}</span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '3px' }}>
              <i className={`ti ${ch.icon}`} style={{ fontSize: '11px', marginRight: '4px' }} />
              Chapitre {selectedCritere.chapitre} — {ch.label}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
            <button onClick={() => prevCritere && setSelectedCritere(prevCritere)} disabled={!prevCritere}
              style={{ width: '30px', height: '30px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-hover)', cursor: prevCritere ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', opacity: prevCritere ? 1 : 0.3 }}>
              <i className="ti ti-chevron-left" style={{ fontSize: '14px' }} />
            </button>
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', padding: '0 4px' }}>{currentIdx + 1} / {navCriteres.length}</span>
            <button onClick={() => nextCritere && setSelectedCritere(nextCritere)} disabled={!nextCritere}
              style={{ width: '30px', height: '30px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-hover)', cursor: nextCritere ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', opacity: nextCritere ? 1 : 0.3 }}>
              <i className="ti ti-chevron-right" style={{ fontSize: '14px' }} />
            </button>
          </div>
        </div>
        <div style={{ padding: '28px', maxWidth: '800px', margin: '0 auto' }}>
          {erreur && (
            <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', marginBottom: '16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', color: '#B91C1C', fontSize: '13px', lineHeight: '1.5' }}>
              <i className="ti ti-alert-circle" style={{ fontSize: '16px', marginTop: '1px' }} />
              <span style={{ flex: 1 }}>{erreur}</span>
              <button onClick={() => setErreur(null)} aria-label="Fermer le message"
                style={{ background: 'none', border: 'none', color: '#B91C1C', cursor: 'pointer', padding: 0 }}>
                <i className="ti ti-x" style={{ fontSize: '15px' }} />
              </button>
            </div>
          )}
          <CritereDetail
            critere={selectedCritere}
            societe={societe}
            selectedEtabId={selectedEtabId}
            reponse={reponses[selectedCritere.id]}
            docsGeneres={docsGeneres}
            onUpdateStatut={(statut) => updateStatut(selectedCritere.id, statut)}
            onGenererDoc={genererDoc}
            onUploadPreuve={uploadPreuve}
            onReloadDocs={async () => {
              await reloadDocs()
              // Notifier le consultant quand un document est signé
              if (userRole === 'client') {
                await notifierConsultant({
                  type: 'document_signe',
                  message: `Document signé sur le critère ${selectedCritere?.code || ''} — en attente de validation`,
                  critere_code: selectedCritere?.code,
                })
              }
            }}
            generatingDoc={generatingDoc}
            saving={savingId === selectedCritere.id}
            userRole={userRole}
            meditrackEtabId={meditrackEtabId}
            onSaveMeditrackId={async (id: string) => {
              // déjà enregistré côté serveur par /api/meditrack (action « lier »)
              setMeditrackEtabId(id)
            }}
          />
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between', marginTop: '24px' }}>
            <button onClick={() => prevCritere && setSelectedCritere(prevCritere)} disabled={!prevCritere}
              style={{ padding: '10px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', cursor: prevCritere ? 'pointer' : 'not-allowed', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px', opacity: prevCritere ? 1 : 0.4 }}>
              <i className="ti ti-arrow-left" style={{ fontSize: '14px' }} />
              {prevCritere ? prevCritere.code : 'Premier'}
            </button>
            <button onClick={() => setSelectedCritere(null)}
              style={{ padding: '10px 18px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="ti ti-layout-grid" style={{ fontSize: '14px' }} />
              Retour au chapitre {selectedCritere.chapitre}
            </button>
            <button onClick={() => nextCritere && setSelectedCritere(nextCritere)} disabled={!nextCritere}
              style={{ padding: '10px 18px', background: nextCritere ? 'var(--accent)' : 'var(--surface)', border: nextCritere ? 'none' : '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: nextCritere ? '#fff' : 'var(--text-secondary)', fontSize: '13px', fontWeight: nextCritere ? '600' : '400', cursor: nextCritere ? 'pointer' : 'not-allowed', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px', opacity: nextCritere ? 1 : 0.4, boxShadow: nextCritere ? '0 1px 4px rgba(26,86,219,0.3)' : 'none' }}>
              {nextCritere ? nextCritere.code : 'Dernier'}
              <i className="ti ti-arrow-right" style={{ fontSize: '14px' }} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {societe?.logo_url && <img src={societe.logo_url} alt="Logo" style={{ height: '40px', objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '4px', background: '#fff' }} />}
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>{societe?.raison_sociale}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Certification HAS — Référentiel PSDM 2024</div>
          </div>
        </div>
        {etablissements.length > 1 && (
          <select value={selectedEtabId} onChange={e => handleEtabChange(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface)', cursor: 'pointer' }}>
            {etablissements.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
          </select>
        )}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: '20px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '72px', height: '72px', flexShrink: 0 }}>
            <svg width="72" height="72" viewBox="0 0 72 72">
              <circle cx="36" cy="36" r="28" fill="none" stroke="var(--border)" strokeWidth="7" />
              <circle cx="36" cy="36" r="28" fill="none"
                stroke={score >= 75 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444'}
                strokeWidth="7"
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - score / 100)}`}
                strokeLinecap="round" transform="rotate(-90 36 36)" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '16px', fontWeight: '700', color: score >= 75 ? '#10B981' : score >= 50 ? '#F59E0B' : '#EF4444' }}>{score}%</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '10px' }}>Progression vers l'audit</div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { label: 'Prêts pour audit', value: prets, color: '#10B981', bg: '#D1FAE5' },
                { label: 'À valider', value: aValider, color: '#2563EB', bg: '#EFF6FF' },
                { label: 'Action corrective', value: actionsCorrectifs, color: '#DC2626', bg: '#FEF2F2' },
                { label: 'Non analysés', value: nonAnalyses, color: '#9CA3AF', bg: '#F3F4F6' },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', background: s.bg, borderRadius: '20px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: s.color }} />
                  <span style={{ fontSize: '12px', fontWeight: '500', color: s.color }}>{s.value} {s.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ width: '180px', flexShrink: 0 }}>
            <div style={{ display: 'flex', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{ width: `${part(prets)}%`, background: '#10B981' }} />
              <div style={{ width: `${part(aValider)}%`, background: '#3B82F6' }} />
              <div style={{ width: `${part(actionsCorrectifs)}%`, background: '#EF4444' }} />
              <div style={{ flex: 1, background: '#E5E7EB' }} />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '6px', textAlign: 'center' }}>{prets} / {total} prêts pour audit</div>
          </div>
        </div>
      </div>

      {filterChap === 'tous' ? (
        <AccueilChapitres
          chapitres={CHAPITRES}
          stats={statsChapitres}
          dernierCritere={dernier ? { code: dernier.code, titre: dernier.titre, chapitre: dernier.chapitre } : null}
          onOuvrirChapitre={ch => setFilterChap(ch)}
          onOuvrirCritere={code => { const c = criteres.find(x => x.code === code); if (c) setSelectedCritere(c) }}
        />
      ) : (<>
      <nav aria-label="Fil d’Ariane" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', marginBottom: '14px' }}>
        <button onClick={() => setFilterChap('tous')} style={{ background: 'none', border: 'none', padding: 0, color: 'var(--accent)', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '13px' }}>Certification</button>
        <i className="ti ti-chevron-right" style={{ fontSize: '12px', color: 'var(--text-tertiary)' }} />
        <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>Chapitre {filterChap} — {CHAPITRES[filterChap].label}</span>
      </nav>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Chapitre</span>
        {(['tous', '1', '2', '3', '4'] as const).map(ch => (
          <button key={ch} onClick={() => setFilterChap(ch)}
            style={{ padding: '6px 14px', borderRadius: '20px', border: `1px solid ${filterChap === ch ? (ch === 'tous' ? 'var(--accent)' : CHAPITRES[ch]?.color) : 'var(--border)'}`, background: filterChap === ch ? (ch === 'tous' ? 'var(--accent-light)' : CHAPITRES[ch]?.bg) : 'var(--surface)', color: filterChap === ch ? (ch === 'tous' ? 'var(--accent)' : CHAPITRES[ch]?.color) : 'var(--text-secondary)', fontSize: '12px', fontWeight: filterChap === ch ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)' }}>
            {ch === 'tous' ? 'Vue d\'ensemble' : `Chap. ${ch}`}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Statut</span>
        {STATUTS.map(s => (
          <button key={s.key} onClick={() => setFilterStatut(filterStatut === s.key ? 'tous' : s.key)}
            style={{ padding: '6px 12px', borderRadius: '20px', border: `1px solid ${filterStatut === s.key ? s.dot : 'var(--border)'}`, background: filterStatut === s.key ? s.bg : 'var(--surface)', color: filterStatut === s.key ? s.color : 'var(--text-secondary)', fontSize: '11px', fontWeight: filterStatut === s.key ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: filterStatut === s.key ? s.dot : 'var(--border)' }} />
            {s.label}
          </button>
        ))}
      </div>

      <ListeChapitre
        key={filterChap}
        code={filterChap}
        chapitre={CHAPITRES[filterChap]}
        criteresDuChapitre={criteresDuChapitre}
        criteresAffiches={criteresFiltres}
        statuts={STATUTS}
        getStatut={getStatut}
        messagesNonLus={messagesNonLus}
        docsAttendus={code => {
          const attendus = DOCS_PAR_CRITERE[code] || []
          return { total: attendus.length, generes: attendus.filter(d => docsGeneres[d.code]?.length > 0).length }
        }}
        onOuvrir={c => setSelectedCritere(c)}
      />
      </>)}
    </div>
  )
}
