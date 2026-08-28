'use client'

import { useState, useEffect, useRef } from 'react'
import DocumentEditor from './DocumentEditor'
import { createClient } from '@/lib/supabase'

// ─────────────────────────────────────────────────────────────
// CONFIG CRITÈRES — Ce que l'inspecteur cherche + preuves + questions
// ─────────────────────────────────────────────────────────────
const CRITERES_CONFIG: Record<string, {
  inspecteur: string
  contexte: string
  conseil?: string
  preuves: { code?: string; label: string; description: string; type: 'generer' | 'upload' | 'registre'; mention?: string }[]
  questions: { id: string; label: string; type: 'choix' | 'texte' | 'oui_non' | 'multiple'; options?: string[]; aide?: string; requis?: boolean }[]
  registre?: 'remises' | 'reclamations' | null
}> = {
  '1.2.1': {
    inspecteur: "L'inspecteur va vérifier que le patient a bien eu le choix de son prestataire et qu'il n'a pas été orienté de façon imposée. Il cherche une preuve écrite que le libre choix a été respecté et expliqué.",
    contexte: "Un patient doit pouvoir choisir librement son prestataire PSDM. L'inspecteur vérifie que vous ne captez pas les patients via des accords commerciaux cachés avec des hôpitaux ou médecins.",
    conseil: "Le point le plus souvent raté : la notice existe mais il n'y a pas de preuve que le patient l'a reçue. Un registre signé ou une case cochée sur le bon de livraison suffit.",
    preuves: [
      { code: 'USA-INFO-01', label: "Notice d'information sur le libre choix", description: "Document remis à chaque nouveau patient expliquant son droit à choisir librement son prestataire.", type: 'generer' },
      { code: 'USA-DOC-01', label: "Charte éthique", description: "Engage formellement votre entreprise sur le respect du libre choix.", type: 'generer' },
      { label: "Registre de remise de la notice", description: "Trace de chaque remise de la notice au patient — date, référence anonymisée, signataire.", type: 'registre' },
      { label: "Votre propre document", description: "Vous avez déjà un document traitant du libre choix.", type: 'upload' },
    ],
    questions: [
      { id: 'q1', label: "À quel moment remettez-vous la notice de libre choix au patient ?", type: 'choix', options: ["Dès la première prise de contact", "Lors de la livraison/installation", "Les deux"], requis: true, aide: "L'idéal est dès le premier contact pour prouver que le choix est fait avant toute prestation." },
      { id: 'q2', label: "Comment prouvez-vous que le patient a bien reçu la notice ?", type: 'choix', options: ["Signature manuscrite sur bon de livraison", "Signature sur document dédié", "Email de confirmation", "Pas de preuve formelle actuellement"], requis: true, aide: "Une signature du patient est la meilleure preuve pour l'inspecteur." },
      { id: 'q3', label: "Avez-vous des accords commerciaux avec des établissements de santé pour l'orientation des patients ?", type: 'oui_non', requis: true, aide: "Si oui, ces accords doivent être transparents et ne pas conditionner le choix du patient." },
    ],
    registre: 'remises'
  },
  '1.2.2': {
    inspecteur: "L'inspecteur va vérifier que le patient comprend ce qu'il reçoit — le matériel, son fonctionnement, son prix, ce qui est remboursé. Il peut interroger directement un patient pour tester sa compréhension.",
    contexte: "Un patient ne doit pas découvrir une facture surprise. Il doit être informé avant la livraison du coût, du ticket modérateur, et des alternatives disponibles.",
    conseil: "Conservez les devis signés dans votre logiciel métier. Si l'inspecteur demande à voir un dossier patient, vous devez retrouver le devis en 2 minutes.",
    preuves: [
      { code: 'USA-DOC-01', label: "Charte éthique et information usager", description: "Document présentant les produits, tarifs, remboursements et droits du patient.", type: 'generer' },
      { code: 'USA-INFO-01', label: "Notice d'information patient", description: "Notice complète sur les produits et prestations.", type: 'generer' },
      { label: "Devis signé par le patient", description: "Le devis remis et signé prouve que le patient a été informé du coût avant la prestation.", type: 'upload' },
    ],
    questions: [
      { id: 'q1', label: "Remettez-vous systématiquement un devis avant la livraison ?", type: 'oui_non', requis: true, aide: "Le devis signé est la preuve principale pour ce critère." },
      { id: 'q2', label: "Comment informez-vous le patient du reste à charge ?", type: 'choix', options: ["Sur le devis", "À l'oral lors de la livraison", "Par courrier/email", "Pas de procédure formelle"], requis: true },
      { id: 'q3', label: "Vos livreurs/techniciens sont-ils formés pour expliquer le fonctionnement du matériel ?", type: 'oui_non', requis: true, aide: "L'inspecteur peut interroger votre personnel sur ce point." },
    ],
    registre: null
  },
  '1.2.3': {
    inspecteur: "L'inspecteur va chercher à comprendre comment vous formez votre personnel à la bientraitance. Il peut demander à voir le programme de formation et s'entretenir avec des salariés.",
    contexte: "Vos techniciens interviennent au domicile de personnes vulnérables. L'inspecteur s'assure qu'ils respectent l'intimité, ne font pas de commentaires déplacés, et agissent avec bienveillance.",
    conseil: "Beaucoup de PSDM ont des pratiques correctes mais rien d'écrit. Il suffit d'une page dans votre classeur qualité pour satisfaire ce critère.",
    preuves: [
      { label: "Procédure bientraitance et dignité", description: "Charte interne définissant les comportements attendus au domicile des patients.", type: 'upload' },
      { label: "Attestations de formation bientraitance", description: "Preuve que le personnel a été formé — attestation de présence ou certificat.", type: 'upload' },
    ],
    questions: [
      { id: 'q1', label: "Avez-vous une procédure écrite sur la bientraitance ?", type: 'oui_non', requis: true, aide: "Une page suffit — l'essentiel est qu'elle existe et que le personnel la connaisse." },
      { id: 'q2', label: "Vos employés ont-ils reçu une formation sur la bientraitance ?", type: 'oui_non', requis: true, aide: "Une sensibilisation interne compte. Notez la date et les participants." },
      { id: 'q3', label: "Comment gérez-vous un signalement de maltraitance d'un patient ?", type: 'texte', aide: "Décrivez votre procédure de remontée d'information en interne." },
    ],
    registre: null
  },
  '1.2.4': {
    inspecteur: "L'inspecteur va vérifier que le patient signe ou valide explicitement chaque étape de la prestation — livraison, installation, modification du matériel. Un bon de livraison signé est la preuve minimale.",
    contexte: "Vous ne pouvez pas modifier le matériel d'un patient, faire une livraison supplémentaire ou changer une prestation sans son accord explicite.",
    conseil: "Le bon de livraison signé couvre souvent ce critère si vous l'avez déjà. L'essentiel est de le conserver et de pouvoir le retrouver.",
    preuves: [
      { code: 'PRESTA-DOC-01', label: "Attestation d'installation", description: "Inclut le recueil du consentement éclairé signé par le patient.", type: 'generer' },
      { label: "Bons de livraison signés", description: "Le bon de livraison signé par le patient prouve son consentement à la réception du matériel.", type: 'upload' },
      { label: "Procédure de recueil du consentement", description: "Document décrivant comment vous recueillez le consentement à chaque étape.", type: 'upload' },
    ],
    questions: [
      { id: 'q1', label: "Faites-vous signer vos bons de livraison par le patient ?", type: 'oui_non', requis: true, aide: "C'est la preuve de consentement la plus simple et la plus acceptée par les inspecteurs." },
      { id: 'q2', label: "Comment gérez-vous les cas où le patient ne peut pas signer ?", type: 'texte', aide: "Un représentant légal peut signer à sa place. Documentez cette procédure." },
      { id: 'q3', label: "Avez-vous une procédure pour les modifications ou avenants de prestation ?", type: 'oui_non', requis: true, aide: "Tout changement de matériel ou de prestation doit être consenti." },
    ],
    registre: 'remises'
  },
  '1.2.5': {
    inspecteur: "L'inspecteur va vérifier que vous avez un registre des traitements RGPD, que vos données patients sont protégées, et que votre personnel est sensibilisé à la confidentialité.",
    contexte: "Vous traitez des données médicales sensibles. Le RGPD impose un registre des traitements, une politique de confidentialité, et des mesures de sécurité.",
    conseil: "Le registre des traitements RGPD effraie beaucoup de PSDM mais c'est un tableau simple. MediReg vous en génère un prérempli avec vos activités.",
    preuves: [
      { code: 'USA-DOC-01', label: "Charte éthique (volet RGPD)", description: "Inclut l'engagement sur la confidentialité et le RGPD.", type: 'generer' },
      { label: "Politique de confidentialité et RGPD", description: "Document décrivant comment vous protégez les données des patients.", type: 'upload' },
      { label: "Registre des traitements de données", description: "Obligatoire RGPD — liste les données collectées, leur finalité et leur durée de conservation.", type: 'upload' },
      { label: "Attestation de sensibilisation RGPD du personnel", description: "Preuve que votre équipe a été informée de ses obligations de confidentialité.", type: 'upload' },
    ],
    questions: [
      { id: 'q1', label: "Avez-vous nommé un DPO ou référent RGPD ?", type: 'oui_non', aide: "Obligatoire si vous traitez des données de santé à grande échelle." },
      { id: 'q2', label: "Votre registre des traitements RGPD est-il à jour ?", type: 'oui_non', requis: true, aide: "Le registre des traitements est obligatoire pour toute entreprise traitant des données personnelles." },
      { id: 'q3', label: "Comment sont protégées les données patients dans votre logiciel métier ?", type: 'choix', options: ["Accès par mot de passe individuel", "Accès partagé par l'équipe", "Données sur papier uniquement", "Autre"], requis: true },
      { id: 'q4', label: "Vos données sont-elles sauvegardées régulièrement ?", type: 'oui_non', requis: true },
    ],
    registre: null
  },
  '1.3.1': {
    inspecteur: "L'inspecteur va demander à voir vos enquêtes de satisfaction — pas juste le formulaire vide, mais les résultats et ce que vous en avez fait. Il cherche une démarche d'amélioration continue.",
    contexte: "Ce critère oblige à écouter vraiment vos patients et à améliorer vos pratiques. L'inspecteur peut demander à voir les résultats des 12 derniers mois et les actions correctrices prises.",
    conseil: "Le piège classique : avoir le questionnaire mais pas les résultats compilés. Créez un tableau annuel avec les résultats et les actions prises — c'est ce que l'inspecteur demande.",
    preuves: [
      { code: 'QR-DOC-01', label: "Questionnaire de satisfaction usager", description: "Formulaire de satisfaction adapté à l'activité PSDM.", type: 'generer' },
      { label: "Résultats de l'enquête satisfaction (12 mois)", description: "Synthèse des résultats — taux de retour, notes, commentaires, et actions prises.", type: 'upload' },
      { label: "Plan d'amélioration issu de la satisfaction", description: "Document montrant les actions concrètes prises suite aux retours patients.", type: 'upload' },
    ],
    questions: [
      { id: 'q1', label: "À quelle fréquence réalisez-vous des enquêtes de satisfaction ?", type: 'choix', options: ["Après chaque prestation", "Trimestrielle", "Semestrielle", "Annuelle", "Pas encore en place"], requis: true, aide: "Une fois par an minimum est requis." },
      { id: 'q2', label: "Comment distribuez-vous le questionnaire de satisfaction ?", type: 'choix', options: ["Papier lors de la livraison", "Email", "SMS avec lien", "En ligne", "Téléphone"], requis: true },
      { id: 'q3', label: "Avez-vous pris des actions d'amélioration suite aux retours patients ?", type: 'oui_non', requis: true, aide: "Sans action corrective documentée, le critère ne sera pas validé." },
    ],
    registre: null
  },
  '1.3.2': {
    inspecteur: "L'inspecteur va demander à voir votre registre des réclamations. Il compte les réclamations, vérifie que chacune a eu une réponse dans un délai raisonnable, et que vous avez analysé les causes.",
    contexte: "Une réclamation non traitée est le signal d'alarme le plus fort pour un inspecteur. Si vous n'avez aucune réclamation depuis 2 ans, il sera suspicieux.",
    conseil: "Commencez à remplir le registre dès maintenant même avec zéro réclamation — notez la date de mise en place. Un registre vide avec une date récente est mieux qu'un registre inexistant.",
    preuves: [
      { label: "Registre des réclamations", description: "Journal de toutes les réclamations reçues avec date, nature, réponse apportée et délai.", type: 'registre' },
      { label: "Procédure de gestion des réclamations", description: "Document décrivant le processus de réception, traitement et réponse aux réclamations.", type: 'upload' },
      { label: "Analyse annuelle des réclamations", description: "Synthèse annuelle des types de réclamations et actions préventives mises en place.", type: 'upload' },
    ],
    questions: [
      { id: 'q1', label: "Comment les patients peuvent-ils vous adresser une réclamation ?", type: 'multiple', options: ["Par téléphone", "Par email", "Par courrier", "En magasin", "Via un formulaire en ligne"], requis: true, aide: "Plus les canaux sont accessibles, mieux c'est pour l'inspecteur." },
      { id: 'q2', label: "Dans quel délai répondez-vous aux réclamations ?", type: 'choix', options: ["Moins de 48h", "Dans la semaine", "Dans le mois", "Pas de délai défini"], requis: true, aide: "Un délai défini et respecté est essentiel. 10 jours ouvrés est une bonne pratique." },
      { id: 'q3', label: "Tenez-vous un registre des réclamations ?", type: 'oui_non', requis: true },
      { id: 'q4', label: "Faites-vous une analyse annuelle de vos réclamations ?", type: 'oui_non', requis: true },
    ],
    registre: 'reclamations'
  },
  '2.2.1': {
    inspecteur: "L'inspecteur va vérifier que vous étudiez chaque prescription avant de vous engager et que vous contactez le prescripteur si elle est incomplète. Il cherche des traces écrites de ces échanges.",
    contexte: "Vous ne pouvez pas livrer du matériel sur une prescription incomplète ou inadaptée. Si vous le faites, vous engagez votre responsabilité et celle du patient.",
    conseil: "Gardez une trace de chaque prescription reçue dans votre logiciel. Si vous contactez un médecin pour une précision, notez-le avec la date — c'est cette trace que l'inspecteur cherche.",
    preuves: [
      { code: 'PROC-PRESCRIPTION-01', label: "Procédure de réception et contrôle des prescriptions", description: "Générée automatiquement à partir de votre organisation.", type: 'generer' },
      { label: "Trace des échanges avec les prescripteurs", description: "Email, courrier ou note dans votre logiciel prouvant le contact en cas de prescription incomplète.", type: 'upload' },
      { label: "Preuve de disponibilité matériel", description: "Capture logiciel ou bon de stock montrant que vous vérifiez la disponibilité avant engagement.", type: 'upload' },
    ],
    questions: [
      { id: 'q1', label: "Comment vérifiez-vous qu'une prescription est complète à la réception ?", type: 'choix', options: ["Checklist papier", "Vérification dans le logiciel métier", "Vérification manuelle par le responsable", "Pas de vérification formelle"], requis: true },
      { id: 'q2', label: "Que faites-vous si une prescription est incomplète ou illisible ?", type: 'choix', options: ["On contacte le médecin et on note l'échange", "On contacte le médecin sans noter", "On demande au patient de contacter son médecin", "On livre quand même"], requis: true, aide: "Contacter le médecin ET noter la trace est la bonne pratique." },
      { id: 'q3', label: "Vérifiez-vous la disponibilité du matériel avant de confirmer la prise en charge ?", type: 'oui_non', requis: true },
    ],
    registre: null
  },
}

const STATUTS = [
  { key: 'non_analyse', label: 'Non analysé', color: '#6B7280', bg: '#F9FAFB', dot: '#D1D5DB' },
  { key: 'non_applicable', label: 'Non applicable', color: '#9CA3AF', bg: '#F3F4F6', dot: '#D1D5DB' },
  { key: 'information_manquante', label: 'Info manquante', color: '#7C3AED', bg: '#F5F3FF', dot: '#8B5CF6' },
  { key: 'preuve_manquante', label: 'Preuve manquante', color: '#D97706', bg: '#FFFBEB', dot: '#F59E0B' },
  { key: 'procedure_a_valider', label: 'À valider', color: '#2563EB', bg: '#EFF6FF', dot: '#3B82F6' },
  { key: 'action_corrective', label: 'Action corrective', color: '#DC2626', bg: '#FEF2F2', dot: '#EF4444' },
  { key: 'pret_audit', label: 'Prêt pour audit', color: '#059669', bg: '#ECFDF5', dot: '#10B981' },
]

interface Props {
  critere: any
  reponse: any
  docsGeneres: Record<string, any[]>
  societe: any
  selectedEtabId: string
  onUpdateStatut: (statut: string) => void
  onGenererDoc: (code: string) => void
  onUploadPreuve: (file: File, label: string) => void
  onReloadDocs: () => Promise<void>
  generatingDoc: string | null
  saving: boolean
  userRole?: string
}

// ─── Composant Chat ───────────────────────────────────────────
function ChatCritere({ critereId, etabId, userRole }: { critereId: string; etabId: string; userRole: string }) {
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const supabase = createClient()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadMessages() }, [critereId])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function loadMessages() {
    const { data } = await supabase.from('messages_critere').select('*, profiles(nom, prenom, role)').eq('critere_id', critereId).eq('etablissement_id', etabId).order('created_at', { ascending: true })
    setMessages(data || [])
    const champLu = userRole === 'client' ? 'lu_client' : 'lu_consultant'
    await supabase.from('messages_critere').update({ [champLu]: true }).eq('critere_id', critereId).eq('etablissement_id', etabId).eq(champLu, false)
  }

  async function sendMessage() {
    if (!input.trim() || sending) return
    setSending(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('messages_critere').insert([{ etablissement_id: etabId, critere_id: critereId, auteur_id: user.id, auteur_role: userRole, contenu: input.trim(), type: 'message', lu_client: userRole === 'client', lu_consultant: userRole === 'consultant' }])
    setInput('')
    await loadMessages()
    setSending(false)
  }

  const isConsultant = userRole === 'consultant'

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', marginTop: '20px' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px', background: '#FAFAFA' }}>
        <i className="ti ti-message-circle" style={{ fontSize: '15px', color: '#7C3AED' }} />
        <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
          {isConsultant ? 'Discussion avec le client' : 'Discussion avec votre consultant'}
        </span>
      </div>
      <div style={{ maxHeight: '240px', overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#9CA3AF', fontSize: '12px' }}>Aucun message — démarrez la discussion</div>
        ) : messages.map((msg: any) => {
          const isMine = (isConsultant && msg.auteur_role === 'consultant') || (!isConsultant && msg.auteur_role === 'client')
          const isAuto = msg.type !== 'message'
          if (isAuto) return (
            <div key={msg.id} style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: msg.type === 'validation' ? '#059669' : '#DC2626', background: msg.type === 'validation' ? '#ECFDF5' : '#FEF2F2', padding: '4px 12px', borderRadius: '20px', fontWeight: '600' }}>
                {msg.type === 'validation' ? '✓ ' : '✗ '}{msg.contenu}
              </span>
            </div>
          )
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: isMine ? 'row-reverse' : 'row', gap: '6px', alignItems: 'flex-end' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: isMine ? '#EBF2FF' : '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`ti ${msg.auteur_role === 'consultant' ? 'ti-user-star' : 'ti-user'}`} style={{ fontSize: '11px', color: isMine ? '#1A56DB' : '#7C3AED' }} />
              </div>
              <div style={{ maxWidth: '80%' }}>
                <div style={{ padding: '8px 12px', borderRadius: isMine ? '12px 3px 12px 12px' : '3px 12px 12px 12px', background: isMine ? '#1A56DB' : '#F3F4F6', color: isMine ? '#fff' : 'var(--text-primary)', fontSize: '13px', lineHeight: '1.5' }}>{msg.contenu}</div>
                <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '2px', textAlign: isMine ? 'right' : 'left' }}>{new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
          placeholder={isConsultant ? 'Envoyer un retour au client...' : 'Poser une question à votre consultant...'}
          rows={1} style={{ flex: 1, padding: '9px 12px', border: '1px solid var(--border)', borderRadius: '9px', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface-hover)', resize: 'none', lineHeight: '1.5', maxHeight: '80px', overflowY: 'auto', boxSizing: 'border-box' as const }}
          onInput={e => { const el = e.target as HTMLTextAreaElement; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 80) + 'px' }}
          onFocus={e => e.target.style.borderColor = '#7C3AED'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        <button onClick={sendMessage} disabled={sending || !input.trim()}
          style={{ width: '36px', height: '36px', background: sending || !input.trim() ? 'rgba(124,58,237,0.2)' : '#7C3AED', border: 'none', borderRadius: '9px', cursor: sending || !input.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className="ti ti-send" style={{ fontSize: '15px', color: '#fff' }} />
        </button>
      </div>
    </div>
  )
}

// ─── Composant Registre Remises ───────────────────────────────
function RegistreRemises({ etabId }: { etabId: string }) {
  const [entries, setEntries] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ date_remise: new Date().toISOString().split('T')[0], type_document: 'libre_choix', reference_patient: '', remis_par: '' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('registre_remises').select('*').eq('etablissement_id', etabId).order('date_remise', { ascending: false }).limit(10)
    setEntries(data || [])
  }

  async function save() {
    if (!form.reference_patient || !form.remis_par) return
    setSaving(true)
    await supabase.from('registre_remises').insert([{ ...form, etablissement_id: etabId }])
    setForm({ date_remise: new Date().toISOString().split('T')[0], type_document: 'libre_choix', reference_patient: '', remis_par: '' })
    setShowForm(false)
    await load()
    setSaving(false)
  }

  return (
    <div style={{ background: '#F8FAFF', border: '1px solid #E0E7FF', borderRadius: '10px', padding: '16px', marginTop: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#4338CA', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="ti ti-clipboard-list" style={{ fontSize: '14px' }} />
          Registre de remise documents ({entries.length} entrées)
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ padding: '5px 12px', background: '#4338CA', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)' }}>
          + Ajouter
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#fff', border: '1px solid #C7D2FE', borderRadius: '8px', padding: '14px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Date de remise</label>
              <input type="date" value={form.date_remise} onChange={e => setForm(p => ({ ...p, date_remise: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: '7px', fontSize: '12px', fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' as const }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Document remis</label>
              <select value={form.type_document} onChange={e => setForm(p => ({ ...p, type_document: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: '7px', fontSize: '12px', fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' as const }}>
                <option value="libre_choix">Notice libre choix</option>
                <option value="charte_ethique">Charte éthique</option>
                <option value="bon_livraison">Bon de livraison signé</option>
                <option value="consentement">Formulaire de consentement</option>
                <option value="info_patient">Notice information patient</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Référence patient (anonymisée)</label>
              <input value={form.reference_patient} onChange={e => setForm(p => ({ ...p, reference_patient: e.target.value }))}
                placeholder="ex: Patient A — Jan 2026"
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: '7px', fontSize: '12px', fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' as const }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Remis par</label>
              <input value={form.remis_par} onChange={e => setForm(p => ({ ...p, remis_par: e.target.value }))}
                placeholder="Nom du collaborateur"
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: '7px', fontSize: '12px', fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' as const }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)} style={{ padding: '7px 14px', background: '#F3F4F6', border: 'none', borderRadius: '7px', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font)' }}>Annuler</button>
            <button onClick={save} disabled={saving || !form.reference_patient || !form.remis_par}
              style={{ padding: '7px 14px', background: '#4338CA', border: 'none', borderRadius: '7px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)' }}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {entries.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {entries.map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: '#fff', borderRadius: '7px', border: '1px solid #E0E7FF', fontSize: '12px' }}>
              <span style={{ color: '#9CA3AF', flexShrink: 0 }}>{new Date(e.date_remise).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              <span style={{ flex: 1, color: '#374151', fontWeight: '500' }}>{e.type_document?.replace('_', ' ')}</span>
              <span style={{ color: '#6B7280' }}>{e.reference_patient}</span>
              <span style={{ color: '#9CA3AF', fontSize: '11px' }}>par {e.remis_par}</span>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '16px', color: '#9CA3AF', fontSize: '12px' }}>
          Aucune entrée — ajoutez la première remise de document
        </div>
      )}
    </div>
  )
}

// ─── Composant Registre Réclamations ─────────────────────────
function RegistreReclamations({ etabId }: { etabId: string }) {
  const [entries, setEntries] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ date_reclamation: new Date().toISOString().split('T')[0], nature: '', description: '', reponse_apportee: '', date_reponse: '', statut: 'ouverte' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('registre_reclamations').select('*').eq('etablissement_id', etabId).order('date_reclamation', { ascending: false }).limit(10)
    setEntries(data || [])
  }

  async function save() {
    if (!form.nature) return
    setSaving(true)
    await supabase.from('registre_reclamations').insert([{ ...form, etablissement_id: etabId }])
    setForm({ date_reclamation: new Date().toISOString().split('T')[0], nature: '', description: '', reponse_apportee: '', date_reponse: '', statut: 'ouverte' })
    setShowForm(false)
    await load()
    setSaving(false)
  }

  const statutColors: Record<string, { color: string; bg: string }> = {
    ouverte: { color: '#D97706', bg: '#FFFBEB' },
    en_cours: { color: '#2563EB', bg: '#EFF6FF' },
    resolue: { color: '#059669', bg: '#ECFDF5' },
  }

  return (
    <div style={{ background: '#FFF7F7', border: '1px solid #FECACA', borderRadius: '10px', padding: '16px', marginTop: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#DC2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: '14px' }} />
          Registre des réclamations ({entries.length} entrées)
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ padding: '5px 12px', background: '#DC2626', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)' }}>
          + Ajouter
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#fff', border: '1px solid #FECACA', borderRadius: '8px', padding: '14px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Date de réclamation</label>
              <input type="date" value={form.date_reclamation} onChange={e => setForm(p => ({ ...p, date_reclamation: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: '7px', fontSize: '12px', fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' as const }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Statut</label>
              <select value={form.statut} onChange={e => setForm(p => ({ ...p, statut: e.target.value }))}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: '7px', fontSize: '12px', fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' as const }}>
                <option value="ouverte">Ouverte</option>
                <option value="en_cours">En cours</option>
                <option value="resolue">Résolue</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Nature de la réclamation *</label>
              <input value={form.nature} onChange={e => setForm(p => ({ ...p, nature: e.target.value }))}
                placeholder="ex: Retard de livraison, matériel défectueux..."
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: '7px', fontSize: '12px', fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' as const }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Description</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Détails de la réclamation..." rows={2}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: '7px', fontSize: '12px', fontFamily: 'var(--font)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' as const }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Réponse apportée</label>
              <textarea value={form.reponse_apportee} onChange={e => setForm(p => ({ ...p, reponse_apportee: e.target.value }))}
                placeholder="Décrivez la réponse donnée au patient..." rows={2}
                style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E7EB', borderRadius: '7px', fontSize: '12px', fontFamily: 'var(--font)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' as const }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => setShowForm(false)} style={{ padding: '7px 14px', background: '#F3F4F6', border: 'none', borderRadius: '7px', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font)' }}>Annuler</button>
            <button onClick={save} disabled={saving || !form.nature}
              style={{ padding: '7px 14px', background: '#DC2626', border: 'none', borderRadius: '7px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)' }}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {entries.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {entries.map(e => {
            const sc = statutColors[e.statut] || statutColors.ouverte
            return (
              <div key={e.id} style={{ padding: '10px 14px', background: '#fff', borderRadius: '8px', border: '1px solid #FECACA' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: e.description ? '6px' : '0' }}>
                  <span style={{ fontSize: '11px', color: '#9CA3AF', flexShrink: 0 }}>{new Date(e.date_reclamation).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</span>
                  <span style={{ flex: 1, fontSize: '12px', fontWeight: '600', color: '#374151' }}>{e.nature}</span>
                  <span style={{ fontSize: '10px', fontWeight: '600', color: sc.color, background: sc.bg, padding: '2px 8px', borderRadius: '20px' }}>{e.statut}</span>
                </div>
                {e.description && <div style={{ fontSize: '11px', color: '#6B7280', paddingLeft: '0' }}>{e.description}</div>}
                {e.reponse_apportee && <div style={{ fontSize: '11px', color: '#059669', marginTop: '4px' }}>→ {e.reponse_apportee}</div>}
              </div>
            )
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '16px', color: '#9CA3AF', fontSize: '12px' }}>
          Aucune réclamation enregistrée
        </div>
      )}
    </div>
  )
}

// ─── Composant principal CritereDetail ───────────────────────
export default function CritereDetail({
  critere, reponse, docsGeneres, societe, selectedEtabId,
  onUpdateStatut, onGenererDoc, onUploadPreuve, onReloadDocs, generatingDoc, userRole = 'client'
}: Props) {
  const supabase = createClient()
  const config = CRITERES_CONFIG[critere.code]
  const [editorCode, setEditorCode] = useState<string | null>(null)
  const statut = reponse?.statut || 'non_analyse'
  const st = STATUTS.find(s => s.key === statut) || STATUTS[0]
  const isConsultant = userRole === 'consultant'

  // Réponses aux questions
  const [reponseQuestions, setReponseQuestions] = useState<Record<string, any>>({})
  const [savedQuestions, setSavedQuestions] = useState(false)
  const [savingQuestions, setSavingQuestions] = useState(false)

  useEffect(() => {
    if (reponse?.reponses_questions) setReponseQuestions(reponse.reponses_questions)
  }, [reponse])

  async function saveQuestions() {
    if (!selectedEtabId) return
    setSavingQuestions(true)
    const existing = reponse
    if (existing) {
      await supabase.from('reponses_criteres').update({ reponses_questions: reponseQuestions, updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await supabase.from('reponses_criteres').insert([{ etablissement_id: selectedEtabId, critere_id: critere.id, statut: 'non_analyse', reponses_questions: reponseQuestions }])
    }
    setSavedQuestions(true)
    setTimeout(() => setSavedQuestions(false), 2000)
    setSavingQuestions(false)
  }

  const preuvesUploadees = Object.entries(docsGeneres)
    .filter(([code]) => code.startsWith('PREUVE_' + critere.code))
    .flatMap(([, docs]) => docs)

  return (
    <div style={{ fontFamily: 'var(--font)' }}>

      {/* Ce que l'inspecteur cherche */}
      {config && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', padding: '16px 18px', marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="ti ti-eye" style={{ fontSize: '13px' }} />
            Ce que l'inspecteur va vérifier
          </div>
          <div style={{ fontSize: '13px', color: '#78350F', lineHeight: '1.6' }}>{config.inspecteur}</div>
          {config.contexte && (
            <div style={{ fontSize: '12px', color: '#92400E', marginTop: '8px', padding: '8px 12px', background: 'rgba(251,191,36,0.1)', borderRadius: '6px', lineHeight: '1.5' }}>
              <strong>Contexte :</strong> {config.contexte}
            </div>
          )}
        </div>
      )}

      {/* Statut */}
      <div style={{ padding: '14px 16px', background: '#FAFAFA', border: '1px solid #F3F4F6', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {isConsultant ? (
          <>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {STATUTS.map(s => (
                <button key={s.key} onClick={() => onUpdateStatut(s.key)}
                  style={{ height: '30px', padding: '0 12px', border: '1px solid ' + (statut === s.key ? s.dot : '#E5E7EB'), borderRadius: '20px', background: statut === s.key ? s.bg : '#fff', color: statut === s.key ? s.color : '#9CA3AF', fontSize: '12px', fontWeight: statut === s.key ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  {statut === s.key && <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: s.dot }} />}
                  {s.label}
                </button>
              ))}
            </div>
            {preuvesUploadees.length >= 1 && statut !== 'pret_audit' && (
              <button onClick={() => onUpdateStatut('pret_audit')}
                style={{ height: '36px', padding: '0 18px', background: '#10B981', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '7px' }}>
                <i className="ti ti-check" style={{ fontSize: '14px' }} />Prêt pour audit
              </button>
            )}
            {statut === 'pret_audit' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '7px 14px', background: '#ECFDF5', borderRadius: '8px', border: '1px solid #A7F3D0' }}>
                <i className="ti ti-circle-check-filled" style={{ fontSize: '16px', color: '#10B981' }} />
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#059669' }}>Prêt pour audit</span>
              </div>
            )}
          </>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: st.bg, borderRadius: '8px', border: '1px solid ' + st.dot }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: st.dot }} />
              <span style={{ fontSize: '13px', fontWeight: '600', color: st.color }}>{st.label}</span>
            </div>
            {statut === 'non_analyse' || statut === 'preuve_manquante' || statut === 'information_manquante' ? (
              <span style={{ fontSize: '12px', color: '#9CA3AF' }}>En attente de validation par votre consultant</span>
            ) : statut === 'procedure_a_valider' ? (
              <span style={{ fontSize: '12px', color: '#2563EB', fontWeight: '500' }}>⏳ Votre consultant va valider ce critère</span>
            ) : statut === 'action_corrective' ? (
              <span style={{ fontSize: '12px', color: '#DC2626', fontWeight: '500' }}>⚠️ Action corrective demandée — voir le chat ci-dessous</span>
            ) : statut === 'pret_audit' ? (
              <span style={{ fontSize: '12px', color: '#059669', fontWeight: '500' }}>✓ Validé par votre consultant — prêt pour l'audit</span>
            ) : null}
          </div>
        )}
      </div>

      {/* Questions */}
      {config?.questions && config.questions.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="ti ti-question-mark" style={{ fontSize: '15px', color: '#7C3AED' }} />
            Questions de mise en conformité
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {config.questions.map(q => (
              <div key={q.id}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>
                  {q.label}
                  {q.requis && <span style={{ color: '#DC2626', marginLeft: '4px' }}>*</span>}
                </div>
                {q.aide && (
                  <div style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '8px', display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                    <i className="ti ti-info-circle" style={{ fontSize: '12px', flexShrink: 0, marginTop: '1px' }} />
                    {q.aide}
                  </div>
                )}
                {q.type === 'oui_non' && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {['Oui', 'Non'].map(opt => (
                      <button key={opt} onClick={() => setReponseQuestions(p => ({ ...p, [q.id]: opt }))}
                        style={{ padding: '8px 20px', border: `1px solid ${reponseQuestions[q.id] === opt ? (opt === 'Oui' ? '#10B981' : '#EF4444') : '#E5E7EB'}`, borderRadius: '8px', background: reponseQuestions[q.id] === opt ? (opt === 'Oui' ? '#ECFDF5' : '#FEF2F2') : '#fff', color: reponseQuestions[q.id] === opt ? (opt === 'Oui' ? '#059669' : '#DC2626') : '#6B7280', fontSize: '13px', fontWeight: reponseQuestions[q.id] === opt ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                        {opt === 'Oui' ? '✓ Oui' : '✗ Non'}
                      </button>
                    ))}
                  </div>
                )}
                {q.type === 'choix' && q.options && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {q.options.map(opt => (
                      <button key={opt} onClick={() => setReponseQuestions(p => ({ ...p, [q.id]: opt }))}
                        style={{ padding: '7px 14px', border: `1px solid ${reponseQuestions[q.id] === opt ? '#7C3AED' : '#E5E7EB'}`, borderRadius: '20px', background: reponseQuestions[q.id] === opt ? '#F5F3FF' : '#fff', color: reponseQuestions[q.id] === opt ? '#7C3AED' : '#6B7280', fontSize: '12px', fontWeight: reponseQuestions[q.id] === opt ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
                {q.type === 'multiple' && q.options && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {q.options.map(opt => {
                      const selected = (reponseQuestions[q.id] || []).includes(opt)
                      return (
                        <button key={opt} onClick={() => {
                          const current = reponseQuestions[q.id] || []
                          setReponseQuestions(p => ({ ...p, [q.id]: selected ? current.filter((x: string) => x !== opt) : [...current, opt] }))
                        }}
                          style={{ padding: '7px 14px', border: `1px solid ${selected ? '#1A56DB' : '#E5E7EB'}`, borderRadius: '20px', background: selected ? '#EBF2FF' : '#fff', color: selected ? '#1A56DB' : '#6B7280', fontSize: '12px', fontWeight: selected ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {selected && <i className="ti ti-check" style={{ fontSize: '11px' }} />}
                          {opt}
                        </button>
                      )
                    })}
                  </div>
                )}
                {q.type === 'texte' && (
                  <textarea value={reponseQuestions[q.id] || ''} onChange={e => setReponseQuestions(p => ({ ...p, [q.id]: e.target.value }))}
                    placeholder="Votre réponse..." rows={2}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', fontFamily: 'var(--font)', outline: 'none', resize: 'vertical', boxSizing: 'border-box' as const }}
                    onFocus={e => e.target.style.borderColor = '#7C3AED'} onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                )}
              </div>
            ))}
          </div>
          <button onClick={saveQuestions} disabled={savingQuestions}
            style={{ marginTop: '16px', padding: '9px 20px', background: savedQuestions ? '#10B981' : '#7C3AED', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className={`ti ${savedQuestions ? 'ti-check' : 'ti-device-floppy'}`} style={{ fontSize: '14px' }} />
            {savingQuestions ? 'Enregistrement...' : savedQuestions ? 'Enregistré !' : 'Enregistrer mes réponses'}
          </button>
        </div>
      )}

      {/* Preuves et documents */}
      {config?.preuves && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '18px', marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="ti ti-files" style={{ fontSize: '15px', color: '#1A56DB' }} />
            Preuves à fournir
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {config.preuves.map((preuve, i) => {
              const hasDoc = preuve.code && docsGeneres[preuve.code]?.length > 0
              const isGeneree = preuve.type === 'generer'
              const isRegistre = preuve.type === 'registre'
              return (
                <div key={i} style={{ padding: '14px 16px', background: hasDoc ? '#ECFDF5' : '#F9FAFB', border: `1px solid ${hasDoc ? '#A7F3D0' : 'var(--border)'}`, borderRadius: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: isGeneree ? '#EBF2FF' : isRegistre ? '#F5F3FF' : '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`ti ${isGeneree ? 'ti-sparkles' : isRegistre ? 'ti-clipboard-list' : 'ti-upload'}`} style={{ fontSize: '15px', color: isGeneree ? '#1A56DB' : isRegistre ? '#7C3AED' : '#6B7280' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '3px' }}>{preuve.label}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: '1.4' }}>{preuve.description}</div>

                      {/* Tag type */}
                      <div style={{ marginTop: '8px', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {isGeneree && (
                          <span style={{ fontSize: '10px', color: '#1A56DB', background: '#EBF2FF', padding: '2px 8px', borderRadius: '20px', fontWeight: '600' }}>Généré par MediReg</span>
                        )}
                        {!isGeneree && !isRegistre && (
                          <span style={{ fontSize: '10px', color: '#6B7280', background: '#F3F4F6', padding: '2px 8px', borderRadius: '20px', fontWeight: '600' }}>À uploader</span>
                        )}
                        {isRegistre && (
                          <span style={{ fontSize: '10px', color: '#7C3AED', background: '#F5F3FF', padding: '2px 8px', borderRadius: '20px', fontWeight: '600' }}>Registre MediReg</span>
                        )}
                        {hasDoc && <span style={{ fontSize: '10px', color: '#059669', background: '#D1FAE5', padding: '2px 8px', borderRadius: '20px', fontWeight: '600' }}>✓ Disponible</span>}
                      </div>

                      {/* Actions */}
                      <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {isGeneree && preuve.code && (
                          <button onClick={() => setEditorCode(preuve.code!)}
                            style={{ height: '32px', padding: '0 14px', background: hasDoc ? '#EBF2FF' : '#1A56DB', border: hasDoc ? '1px solid #BFDBFE' : 'none', borderRadius: '8px', color: hasDoc ? '#1A56DB' : '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <i className={`ti ${hasDoc ? 'ti-edit' : 'ti-sparkles'}`} style={{ fontSize: '13px' }} />
                            {hasDoc ? 'Modifier' : 'Créer et signer'}
                          </button>
                        )}
                        {hasDoc && preuve.code && docsGeneres[preuve.code]?.[0] && (
                          <a href={`/api/generate-doc?path=${encodeURIComponent(docsGeneres[preuve.code][0].url)}`} download
                            style={{ height: '32px', padding: '0 14px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', color: '#059669', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none' }}>
                            <i className="ti ti-download" style={{ fontSize: '13px' }} />Télécharger
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Upload preuve */}
          {!isConsultant && (
            <div style={{ marginTop: '16px', padding: '14px', background: '#F9FAFB', borderRadius: '10px', border: '2px dashed var(--border)' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                <i className="ti ti-upload" style={{ fontSize: '13px', marginRight: '6px' }} />
                Uploader vos propres documents (devis signés, attestations, bons de livraison...)
              </div>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#7C3AED', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                <i className="ti ti-paperclip" style={{ fontSize: '13px' }} />
                Choisir un fichier
                <input type="file" accept=".pdf,.doc,.docx,.jpg,.png" style={{ display: 'none' }}
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) { onUploadPreuve(file, file.name); e.target.value = '' }
                  }} />
              </label>
            </div>
          )}
        </div>
      )}

      {/* Registres */}
      {config?.registre === 'remises' && <RegistreRemises etabId={selectedEtabId} />}
      {config?.registre === 'reclamations' && <RegistreReclamations etabId={selectedEtabId} />}

      {/* Preuves uploadées */}
      {preuvesUploadees.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid #DDD6FE', borderRadius: '12px', padding: '16px 18px', marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#7C3AED', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="ti ti-paperclip" style={{ fontSize: '14px' }} />
            Documents uploadés ({preuvesUploadees.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {preuvesUploadees.map((doc: any) => (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#F5F3FF', borderRadius: '8px', border: '1px solid #DDD6FE' }}>
                <i className="ti ti-file" style={{ fontSize: '16px', color: '#7C3AED', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nom}</div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{new Date(doc.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                </div>
                <a href={`/api/generate-doc?path=${encodeURIComponent(doc.url)}`} download
                  style={{ height: '30px', padding: '0 12px', background: '#EDE9FE', border: '1px solid #DDD6FE', borderRadius: '7px', color: '#7C3AED', fontSize: '11px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                  <i className="ti ti-download" style={{ fontSize: '12px' }} />Télécharger
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conseil de Nora */}
      {config?.conseil && (
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '14px 16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#166534', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="ti ti-bulb" style={{ fontSize: '13px' }} />
            Conseil terrain
          </div>
          <div style={{ fontSize: '12px', color: '#166534', lineHeight: '1.5' }}>{config.conseil}</div>
        </div>
      )}

      {/* Chat */}
      <ChatCritere critereId={critere.id} etabId={selectedEtabId || ''} userRole={userRole || 'client'} />

      {/* Editeur de document */}
      {editorCode && (
        <DocumentEditor
          templateCode={editorCode}
          societe={societe}
          etabId={selectedEtabId}
          onClose={() => setEditorCode(null)}
          onSaved={() => { setEditorCode(null); onReloadDocs() }}
        />
      )}
    </div>
  )
}