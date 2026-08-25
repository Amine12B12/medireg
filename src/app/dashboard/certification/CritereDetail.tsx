'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase'

const CRITERES_CONFIG: Record<string, {
  exigence: string
  preuves: {
    label: string
    description: string
    code_doc?: string
    type: 'generer' | 'upload' | 'texte'
    mention?: string
  }[]
}> = {
  '1.2.1': {
    exigence: "Vos patients doivent être informés de leur droit à choisir librement leur prestataire. Vous devez pouvoir le prouver avec au moins un document.",
    preuves: [
      { label: 'Charte éthique', description: 'Engage formellement votre entreprise sur le respect du libre choix', type: 'generer', code_doc: 'USA-DOC-01' },
      { label: "Document d'information patient", description: 'À remettre à chaque nouveau patient', type: 'generer', code_doc: 'USA-INFO-01' },
      { label: "Attestation d'installation", description: 'Document remis au patient lors de chaque livraison', type: 'generer', code_doc: 'PRESTA-DOC-01' },
      { label: 'Mention libre choix sur vos devis', description: 'Texte à intégrer sur vos bons de commande ou CGV', type: 'texte', mention: "Conformément à l'article L.1110-8 du Code de la Santé Publique, vous disposez du libre choix de votre prestataire de santé à domicile." },
      { label: 'Votre propre document', description: 'Vous avez déjà un document traitant du libre choix', type: 'upload' },
    ]
  },
  '1.2.2': {
    exigence: "Chaque patient doit recevoir une information claire sur les produits et prestations qui lui sont délivrés, avant et lors de la mise en place.",
    preuves: [
      { label: "Document d'information patient", description: 'Explique les matériels, conditions de prise en charge et coûts', type: 'generer', code_doc: 'USA-INFO-01' },
      { label: "Votre document d'information existant", description: 'Notice, fiche produit ou tout document remis au patient', type: 'upload' },
    ]
  },
  '1.2.3': {
    exigence: "Votre personnel doit traiter chaque patient avec respect et dignité. La bientraitance doit être encadrée et prouvée.",
    preuves: [
      { label: 'Attestation de formation bientraitance', description: "Preuve que votre équipe a été formée ou sensibilisée", type: 'upload' },
      { label: 'Procédure de bientraitance', description: 'Document interne définissant les règles de comportement', type: 'upload' },
    ]
  },
  '1.2.4': {
    exigence: "Le consentement du patient doit être recueilli par écrit avant chaque nouvelle prestation et conservé dans son dossier.",
    preuves: [
      { label: "Attestation d'installation", description: 'Inclut le recueil du consentement éclairé signé par le patient', type: 'generer', code_doc: 'PRESTA-DOC-01' },
      { label: 'Votre document de consentement', description: 'Bon de livraison ou formulaire incluant la mention de consentement', type: 'upload' },
    ]
  },
  '1.2.5': {
    exigence: "Les données personnelles et médicales de vos patients doivent être strictement confidentielles et protégées.",
    preuves: [
      { label: 'Charte éthique', description: 'Inclut l engagement sur la confidentialité et le RGPD', type: 'generer', code_doc: 'USA-DOC-01' },
      { label: 'Désignation du responsable RGPD', description: 'Document identifiant votre DPO ou référent RGPD', type: 'upload' },
      { label: 'Engagements de confidentialité du personnel', description: "Signés par chaque membre de l'équipe", type: 'upload' },
    ]
  },
  '1.3.1': {
    exigence: "La satisfaction de vos patients doit être évaluée régulièrement. Les résultats doivent être analysés et des actions mises en place.",
    preuves: [
      { label: 'Questionnaire de satisfaction', description: 'À remettre régulièrement à vos patients', type: 'generer', code_doc: 'QR-DOC-01' },
      { label: 'Votre questionnaire existant', description: 'Uploadez le questionnaire que vous utilisez déjà', type: 'upload' },
      { label: 'Bilan de satisfaction annuel', description: "Analyse des résultats et plan d'actions", type: 'upload' },
    ]
  },
  '1.3.2': {
    exigence: "Chaque réclamation doit être enregistrée, traitée dans un délai défini et analysée pour améliorer vos prestations.",
    preuves: [
      { label: 'Procédure de gestion des réclamations', description: 'Document décrivant le processus de traitement et délais', type: 'upload' },
      { label: 'Registre des réclamations', description: 'Suivi daté de chaque réclamation avec réponse apportée', type: 'upload' },
    ]
  },
  '2.2.1': {
    exigence: "Le prestataire doit étudier la faisabilité de chaque prescription avant de s'engager. Si la prescription est incomplète ou non exploitable, il doit contacter le prescripteur et en garder la trace.",
    preuves: [
      { label: 'Procédure de réception et contrôle des prescriptions', description: 'Générée automatiquement à partir de votre organisation', type: 'generer', code_doc: 'PROC-PRESCRIPTION-01' },
      { label: 'Trace des échanges avec les prescripteurs', description: 'Email, courrier ou note dans votre logiciel prouvant le contact en cas de prescription incomplète', type: 'upload' },
      { label: 'Preuve de disponibilité matériel', description: 'Capture logiciel, bon de stock ou tout document montrant que vous vérifiez la disponibilité du matériel avant engagement', type: 'upload' },
      { label: 'Preuve de compétences du personnel', description: 'Attestations de formation PSDM ou habilitations prouvant que le personnel est compétent pour les DM livrés', type: 'upload' },
    ]
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
  societe: any
  selectedEtabId: string
  reponse: any
  docsGeneres: Record<string, any[]>
  onUpdateStatut: (statut: string) => void
  onGenererDoc: (code: string) => void
  onUploadPreuve: (file: File, label: string) => void
  onReloadDocs: () => Promise<void>
  generatingDoc: string | null
  saving: boolean
  userRole?: string
}

function Critere221({ societe, organisation }: { societe: any; organisation: any }) {
  const [prescriptionMode, setPrescriptionMode] = useState('')
  const [traceCanal, setTraceCanal] = useState('')
  const [copied, setCopied] = useState(false)

  const docsExistants: string[] = organisation.documents_existants || []
  const hasDevis = docsExistants.includes('devis')
  const hasBC = docsExistants.includes('bon_commande')
  const hasBL = docsExistants.includes('bon_livraison')
  const hasFI = docsExistants.includes('fiche_intervention')
  const dossierUsager: string = organisation.dossier_usager_detail || organisation.dossier_usager || 'votre logiciel'
  const familles: string[] = organisation.familles_materiels || []
  const depannageRecoit: string = organisation.depannage_qui_recoit || 'le personnel d\'accueil'
  const depannageIntervient: string = organisation.depannage_qui_intervient || 'le technicien SAV'

  const docsListStr = [
    hasDevis && 'Devis',
    hasBC && 'Bon de commande',
    hasBL && 'Bon de livraison',
    hasFI && "Fiche d'intervention",
  ].filter(Boolean).join(', ') || 'Aucun sélectionné'

  function buildProcedure(): string {
    const lines: string[] = [
      'PROCEDURE DE RECEPTION ET CONTROLE DES PRESCRIPTIONS',
      societe.raison_sociale || '',
      '',
      '1. RECEPTION DE LA PRESCRIPTION',
      '   La prescription est recue par : ' + depannageRecoit,
      '   Elle est enregistree dans : ' + dossierUsager,
      '',
      '2. CONTROLE DE LA PRESCRIPTION',
      '   A reception, verifier :',
      '   - Identite complete du patient (nom, prenom, date de naissance, adresse)',
      '   - Coordonnees du prescripteur et numero RPPS',
      '   - Designation precise du materiel ou de la prestation',
      '   - Duree de la prescription et renouvellement',
      '   - Signature et date du prescripteur',
      '',
      '3. PRESCRIPTION INCOMPLETE OU NON EXPLOITABLE',
      '   Si la prescription est incomplète, incohérente ou ne permet pas la mise en oeuvre :',
    ]

    if (prescriptionMode === 'contact_prescripteur') {
      lines.push('   - Contacter le prescripteur par telephone ou email pour demander les informations manquantes.')
    } else if (prescriptionMode === 'retour_patient') {
      lines.push('   - Informer le patient et lui demander de retourner chez son prescripteur.')
    } else if (prescriptionMode === 'les_deux') {
      lines.push('   - Contacter le prescripteur ET informer le patient de la situation.')
    }

    lines.push('   Trace de l\'echange : ' + (traceCanal || '[a preciser]'))
    lines.push('   Enregistrement dans : ' + dossierUsager)
    lines.push('')
    lines.push('4. VERIFICATION DE LA DISPONIBILITE DU MATERIEL')
    lines.push('   Avant tout engagement, verifier la disponibilite du materiel en stock.')
    lines.push('   Si le materiel n\'est pas disponible : informer le patient de son droit au libre choix')
    lines.push('   et lui permettre de contacter un autre prestataire sans contrainte.')
    if (familles.length > 0) {
      lines.push('   Familles de materiels gerees : ' + familles.join(', '))
    }
    lines.push('')
    lines.push('5. VERIFICATION DES COMPETENCES')
    lines.push('   S\'assurer que le personnel assigne dispose des formations et habilitations')
    lines.push('   necessaires pour les DM concernes.')
    lines.push('')
    lines.push('6. VALIDATION ET MISE EN OEUVRE')
    lines.push('   Une fois la prescription validee et le materiel disponible, la prestation est mise')
    lines.push('   en place par : ' + depannageIntervient)
    lines.push('   Le bon de livraison / bon de commande reference le numero de prescription.')
    lines.push('')
    lines.push('Document genere par MediReg — ' + new Date().toLocaleDateString('fr-FR'))
    lines.push('A valider et adapter par ' + (societe.raison_sociale || ''))

    return lines.join('\n')
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(buildProcedure())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ marginBottom: '20px' }}>

      {/* Ce que MediReg sait deja */}
      <div style={{ background: '#F0FDF4', border: '1px solid #A7F3D0', borderRadius: '12px', padding: '16px 20px', marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="ti ti-sparkles" style={{ fontSize: '14px' }} />
          Ce que MediReg a déjà identifié dans votre organisation
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { icon: 'ti-user-check', text: 'Prescriptions reçues par : ' + depannageRecoit },
            { icon: 'ti-database', text: 'Dossier usager tenu dans : ' + dossierUsager },
            { icon: 'ti-files', text: 'Documents existants pouvant servir de preuve : ' + docsListStr },
            { icon: 'ti-box', text: 'Familles de matériels : ' + (familles.length > 0 ? familles.join(', ') : 'non précisé') },
            { icon: 'ti-tool', text: 'Mise en œuvre par : ' + depannageIntervient },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', color: '#065F46' }}>
              <i className={'ti ' + item.icon} style={{ fontSize: '14px', color: '#10B981', flexShrink: 0, marginTop: '1px' }} />
              {item.text}
            </div>
          ))}
        </div>
      </div>

      {/* 2 questions */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="ti ti-help-circle" style={{ fontSize: '15px', color: '#6366F1' }} />
          2 questions pour compléter votre procédure
        </div>

        {/* Q1 */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '10px' }}>
            Si une prescription est incomplète ou non exploitable, comment procédez-vous ?
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {[
              { key: 'contact_prescripteur', label: 'Nous contactons directement le prescripteur', desc: 'Par téléphone ou email pour demander les informations manquantes' },
              { key: 'retour_patient', label: 'Nous informons le patient', desc: 'Nous lui demandons de retourner chez son prescripteur' },
              { key: 'les_deux', label: 'Les deux selon la situation', desc: 'Contact prescripteur ET information du patient' },
            ].map(opt => (
              <button key={opt.key} onClick={() => setPrescriptionMode(opt.key)}
                style={{ padding: '12px 16px', border: '2px solid ' + (prescriptionMode === opt.key ? '#6366F1' : '#F3F4F6'), borderRadius: '10px', background: prescriptionMode === opt.key ? '#EEF2FF' : '#FAFAFA', cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left', transition: 'all 0.1s' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: prescriptionMode === opt.key ? '#4F46E5' : '#374151', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {prescriptionMode === opt.key && <i className="ti ti-check" style={{ fontSize: '13px' }} />}
                  {opt.label}
                </div>
                <div style={{ fontSize: '11px', color: '#9CA3AF' }}>{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Q2 */}
        <div style={{ marginBottom: '18px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Où conservez-vous la trace de cet échange avec le prescripteur ?
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { key: 'dans ' + dossierUsager, label: 'Dans ' + dossierUsager },
              { key: 'par email conserve', label: 'Par email conservé' },
              { key: 'note papier dans le dossier', label: 'Note papier dans le dossier' },
              { key: 'autre', label: 'Autre' },
            ].map(opt => (
              <button key={opt.key} onClick={() => setTraceCanal(opt.key)}
                style={{ padding: '7px 14px', border: '1px solid ' + (traceCanal === opt.key ? '#6366F1' : '#E5E7EB'), borderRadius: '20px', background: traceCanal === opt.key ? '#EEF2FF' : '#fff', color: traceCanal === opt.key ? '#4F46E5' : '#6B7280', fontSize: '12px', fontWeight: traceCanal === opt.key ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Q3 libre choix stock */}
        <div style={{ padding: '12px 16px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', fontSize: '12px', color: '#92400E', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <i className="ti ti-info-circle" style={{ fontSize: '14px', flexShrink: 0, marginTop: '1px' }} />
          <span>Conformément au principe du libre choix, si le matériel n'est pas en stock, vous devez informer le patient qu'il peut contacter un autre prestataire. Cette mention est intégrée automatiquement dans votre procédure.</span>
        </div>
      </div>

      {/* Procedure generee */}
      {prescriptionMode && traceCanal && (
        <div style={{ background: 'var(--surface)', border: '1px solid #BFDBFE', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
          <div style={{ padding: '14px 20px', background: '#EBF2FF', borderBottom: '1px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#1A56DB', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="ti ti-file-check" style={{ fontSize: '15px' }} />
              Procédure générée — à valider
            </div>
            <button onClick={handleCopy}
              style={{ padding: '6px 14px', background: copied ? '#ECFDF5' : '#fff', border: '1px solid ' + (copied ? '#A7F3D0' : '#BFDBFE'), borderRadius: '8px', color: copied ? '#059669' : '#1A56DB', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <i className={'ti ' + (copied ? 'ti-check' : 'ti-copy')} style={{ fontSize: '12px' }} />
              {copied ? 'Copié !' : 'Copier'}
            </button>
          </div>
          <div style={{ padding: '16px 20px', background: '#F8FAFF' }}>
            <pre style={{ fontSize: '12px', color: '#374151', lineHeight: '1.7', whiteSpace: 'pre-wrap', fontFamily: 'system-ui, sans-serif', margin: 0 }}>
              {buildProcedure()}
            </pre>
          </div>
        </div>
      )}

      {prescriptionMode && traceCanal && (
        <div style={{ padding: '12px 16px', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', fontSize: '12px', color: '#92400E', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <i className="ti ti-info-circle" style={{ fontSize: '14px', flexShrink: 0, marginTop: '1px' }} />
          Copiez cette procédure, adaptez-la si nécessaire et conservez-la dans votre Manuel Qualité. Elle constitue la preuve principale pour ce critère.
        </div>
      )}
    </div>
  )
}


function ChatCritere({ critereId, etabId, userRole, onValidation }: {
  critereId: string
  etabId: string
  userRole: string
  onValidation?: () => void
}) {
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const supabase = createClient()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadMessages() }, [critereId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadMessages() {
    const { data } = await supabase
      .from('messages_critere')
      .select('*, profiles(nom, prenom, role)')
      .eq('critere_id', critereId)
      .eq('etablissement_id', etabId)
      .order('created_at', { ascending: true })
    setMessages(data || [])

    // Marquer comme lus
    if (userRole === 'client') {
      await supabase.from('messages_critere')
        .update({ lu_client: true })
        .eq('critere_id', critereId)
        .eq('etablissement_id', etabId)
        .eq('lu_client', false)
    } else {
      await supabase.from('messages_critere')
        .update({ lu_consultant: true })
        .eq('critere_id', critereId)
        .eq('etablissement_id', etabId)
        .eq('lu_consultant', false)
    }
  }

  async function sendMessage() {
    if (!input.trim() || sending) return
    setSending(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('messages_critere').insert([{
      etablissement_id: etabId,
      critere_id: critereId,
      auteur_id: user.id,
      auteur_role: userRole,
      contenu: input.trim(),
      type: 'message',
      lu_client: userRole === 'client',
      lu_consultant: userRole === 'consultant',
    }])
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
        {messages.filter(m => isConsultant ? !m.lu_consultant : !m.lu_client).length > 0 && (
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444' }} />
        )}
      </div>

      {/* Messages */}
      <div style={{ maxHeight: '280px', overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#9CA3AF', fontSize: '12px' }}>
            Aucun message — démarrez la discussion
          </div>
        ) : messages.map((msg: any) => {
          const isMine = (isConsultant && msg.auteur_role === 'consultant') || (!isConsultant && msg.auteur_role === 'client')
          const isAuto = msg.type !== 'message'
          const auteurNom = msg.profiles?.prenom ? msg.profiles.prenom + ' ' + msg.profiles.nom : msg.auteur_role === 'consultant' ? 'Consultant' : 'Client'

          if (isAuto) return (
            <div key={msg.id} style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '11px', color: msg.type === 'validation' ? '#059669' : '#DC2626', background: msg.type === 'validation' ? '#ECFDF5' : '#FEF2F2', padding: '4px 12px', borderRadius: '20px', fontWeight: '600' }}>
                {msg.type === 'validation' ? '✓ ' : '✗ '}{msg.contenu}
              </span>
            </div>
          )

          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: isMine ? 'row-reverse' : 'row', gap: '8px', alignItems: 'flex-end' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: isMine ? '#EBF2FF' : '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`ti ${msg.auteur_role === 'consultant' ? 'ti-user-star' : 'ti-user'}`} style={{ fontSize: '12px', color: msg.auteur_role === 'consultant' ? '#7C3AED' : '#1A56DB' }} />
              </div>
              <div style={{ maxWidth: '75%' }}>
                {!isMine && <div style={{ fontSize: '10px', color: '#9CA3AF', marginBottom: '3px', paddingLeft: '4px' }}>{auteurNom}</div>}
                <div style={{ padding: '9px 13px', borderRadius: isMine ? '14px 4px 14px 14px' : '4px 14px 14px 14px', background: isMine ? '#1A56DB' : '#F3F4F6', color: isMine ? '#fff' : 'var(--text-primary)', fontSize: '13px', lineHeight: '1.5' }}>
                  {msg.contenu}
                </div>
                <div style={{ fontSize: '10px', color: '#9CA3AF', marginTop: '3px', textAlign: isMine ? 'right' : 'left', paddingLeft: isMine ? '0' : '4px' }}>
                  {new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
          placeholder={isConsultant ? 'Envoyer un retour au client...' : 'Poser une question à votre consultant...'}
          rows={1}
          style={{ flex: 1, padding: '9px 12px', border: '1px solid var(--border)', borderRadius: '9px', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface-hover)', resize: 'none', lineHeight: '1.5', maxHeight: '80px', overflowY: 'auto', boxSizing: 'border-box' as const }}
          onInput={e => { const el = e.target as HTMLTextAreaElement; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 80) + 'px' }}
          onFocus={e => e.target.style.borderColor = '#7C3AED'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <button onClick={sendMessage} disabled={sending || !input.trim()}
          style={{ width: '36px', height: '36px', background: sending || !input.trim() ? 'rgba(124,58,237,0.2)' : '#7C3AED', border: 'none', borderRadius: '9px', cursor: sending || !input.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className="ti ti-send" style={{ fontSize: '15px', color: '#fff' }} />
        </button>
      </div>
    </div>
  )
}

export default function CritereDetail({
  critere, reponse, docsGeneres, societe, selectedEtabId,
  onUpdateStatut, onGenererDoc, onUploadPreuve, onReloadDocs, generatingDoc, userRole = 'client'
}: Props) {
  const isConsultant = userRole === 'consultant'
  const [apercuDoc, setApercuDoc] = useState<string | null>(null)
  const [mentionCopied, setMentionCopied] = useState(false)
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)

  const config = CRITERES_CONFIG[critere.code]
  const statut = reponse?.statut || 'non_analyse'
  const st = STATUTS.find(s => s.key === statut) || STATUTS[0]
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  const codePreuve = 'PREUVE_' + critere.code
  const preuvesUploadees = docsGeneres[codePreuve] || []

  const nbProuves = (config?.preuves || []).filter(p =>
    p.code_doc ? (docsGeneres[p.code_doc] || []).length > 0 : false
  ).length + preuvesUploadees.length

  async function handleCopier(mention: string) {
    await navigator.clipboard.writeText(mention)
    setMentionCopied(true)
    setTimeout(() => setMentionCopied(false), 2000)
  }

  async function handleUpload(file: File, label: string, idx: number) {
    setUploadingIdx(idx)
    await onUploadPreuve(file, label)
    await onReloadDocs()
    setUploadingIdx(null)
  }

  const organisation = societe?.organisation || {}

  return (
    <div style={{ fontFamily: 'var(--font)' }}>

      {/* Modal apercu */}
      {apercuDoc && (
        <div onClick={() => setApercuDoc(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backdropFilter: 'blur(8px)' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', maxWidth: '720px', width: '100%', boxShadow: '0 40px 100px rgba(0,0,0,0.2)' }}>
            <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '32px', height: '32px', background: '#EBF2FF', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className="ti ti-file-word" style={{ fontSize: '16px', color: '#1A56DB' }} />
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>{apercuDoc}</div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF' }}>Vos informations remplaceront les variables à la génération</div>
                </div>
              </div>
              <button onClick={() => setApercuDoc(null)}
                style={{ width: '28px', height: '28px', border: 'none', borderRadius: '6px', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
                <i className="ti ti-x" style={{ fontSize: '14px' }} />
              </button>
            </div>
            <div style={{ background: '#F9FAFB', padding: '20px', display: 'flex', justifyContent: 'center', maxHeight: '72vh', overflow: 'auto' }}>
              <img
                src={supabaseUrl + '/storage/v1/object/public/modeles/preview_' + apercuDoc + '.jpg'}
                alt={apercuDoc}
                style={{ maxWidth: '100%', borderRadius: '8px', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}
                onError={e => {
                  const div = document.createElement('div')
                  div.innerHTML = '<div style="padding:48px 32px;text-align:center;color:#9CA3AF;font-size:13px;font-family:system-ui">Aperçu non disponible</div>'
                  ;(e.target as HTMLImageElement).replaceWith(div)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Exigence */}
      {config?.exigence && (
        <div style={{ padding: '14px 18px', background: '#F8FAFF', border: '1px solid #E0E7FF', borderRadius: '10px', marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#6366F1', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '5px' }}>Ce que cette règle exige</div>
          <div style={{ fontSize: '14px', color: '#1E293B', lineHeight: '1.65' }}>{config.exigence}</div>
        </div>
      )}

      {/* Statut */}
      <div style={{ padding: '14px 16px', background: '#FAFAFA', border: '1px solid #F3F4F6', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {isConsultant ? (
          <>
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {STATUTS.map(s => (
                <button key={s.key} onClick={() => onUpdateStatut(s.key)}
                  style={{ height: '30px', padding: '0 12px', border: '1px solid ' + (statut === s.key ? s.dot : '#E5E7EB'), borderRadius: '20px', background: statut === s.key ? s.bg : '#fff', color: statut === s.key ? s.color : '#9CA3AF', fontSize: '12px', fontWeight: statut === s.key ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '5px', transition: 'all 0.1s' }}>
                  {statut === s.key && <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: s.dot }} />}
                  {s.label}
                </button>
              ))}
            </div>
            {nbProuves >= 1 && statut !== 'pret_audit' && (
              <button onClick={() => onUpdateStatut('pret_audit')}
                style={{ height: '36px', padding: '0 18px', background: '#10B981', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '7px', boxShadow: '0 1px 4px rgba(16,185,129,0.35)', flexShrink: 0 }}>
                <i className="ti ti-check" style={{ fontSize: '14px' }} />
                Prêt pour audit
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: STATUTS.find(s => s.key === statut)?.bg || '#F9FAFB', borderRadius: '8px', border: '1px solid ' + (STATUTS.find(s => s.key === statut)?.dot || '#D1D5DB') }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: STATUTS.find(s => s.key === statut)?.dot || '#D1D5DB' }} />
              <span style={{ fontSize: '13px', fontWeight: '600', color: STATUTS.find(s => s.key === statut)?.color || '#6B7280' }}>
                {STATUTS.find(s => s.key === statut)?.label || 'Non analysé'}
              </span>
            </div>
            {statut === 'non_analyse' || statut === 'preuve_manquante' || statut === 'information_manquante' ? (
              <span style={{ fontSize: '12px', color: '#9CA3AF' }}>En attente de validation par votre consultant</span>
            ) : statut === 'procedure_a_valider' ? (
              <span style={{ fontSize: '12px', color: '#2563EB', fontWeight: '500' }}>⏳ Votre consultant va valider ce critère</span>
            ) : statut === 'action_corrective' ? (
              <span style={{ fontSize: '12px', color: '#DC2626', fontWeight: '500' }}>⚠️ Action corrective demandée par votre consultant</span>
            ) : statut === 'pret_audit' ? (
              <span style={{ fontSize: '12px', color: '#059669', fontWeight: '500' }}>✓ Validé par votre consultant — prêt pour l'audit</span>
            ) : null}
          </div>
        )}
      </div>

      {/* Composant special 2.2.1 */}
      {critere.code === '2.2.1' && societe && (
        <Critere221 societe={societe} organisation={organisation} />
      )}

      {/* Preuves */}
      {config && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>
            {critere.code === '2.2.1' ? 'Documents à fournir en complément' : 'Preuves à fournir — choisissez au moins une option'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {config.preuves.map((preuve, idx) => {
              const docGenere = preuve.code_doc ? (docsGeneres[preuve.code_doc] || [])[0] : null
              const isDone = !!docGenere
              const isUploading = uploadingIdx === idx

              return (
                <div key={idx} style={{ border: '1.5px solid ' + (isDone ? '#A7F3D0' : '#F3F4F6'), borderRadius: '10px', background: isDone ? '#F0FDF4' : '#FFFFFF', overflow: 'hidden', transition: 'border-color 0.15s' }}>
                  <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: isDone ? '#D1FAE5' : preuve.type === 'generer' ? '#EEF2FF' : preuve.type === 'texte' ? '#FEF9C3' : '#FAF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={'ti ' + (isDone ? 'ti-check' : preuve.type === 'generer' ? 'ti-file-word' : preuve.type === 'texte' ? 'ti-text-size' : 'ti-upload')}
                        style={{ fontSize: '16px', color: isDone ? '#10B981' : preuve.type === 'generer' ? '#6366F1' : preuve.type === 'texte' ? '#CA8A04' : '#9333EA' }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '13px', fontWeight: '600', color: isDone ? '#065F46' : '#111827' }}>{preuve.label}</span>
                        {isDone && <span style={{ fontSize: '10px', fontWeight: '700', color: '#10B981', background: '#D1FAE5', padding: '1px 7px', borderRadius: '20px' }}>Fourni</span>}
                        {preuve.code_doc && !isDone && <span style={{ fontSize: '10px', color: '#818CF8', background: '#EEF2FF', padding: '1px 7px', borderRadius: '20px', fontWeight: '500' }}>{preuve.code_doc}</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: '#9CA3AF', lineHeight: '1.4' }}>{preuve.description}</div>
                      {isDone && (
                        <div style={{ fontSize: '11px', color: '#10B981', marginTop: '3px', fontWeight: '500' }}>
                          Généré le {new Date(docGenere.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                      {preuve.type === 'generer' && preuve.code_doc && (
                        <>
                          <button onClick={() => setApercuDoc(preuve.code_doc!)}
                            style={{ height: '32px', padding: '0 12px', background: 'transparent', border: '1px solid #E5E7EB', borderRadius: '7px', color: '#6B7280', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                            <i className="ti ti-eye" style={{ fontSize: '12px' }} />Aperçu
                          </button>
                          {isDone && (
                            <a href={'/api/generate-doc?path=' + encodeURIComponent(docGenere.url)} download={preuve.code_doc + '.docx'}
                              style={{ height: '32px', padding: '0 12px', background: '#fff', border: '1px solid #A7F3D0', borderRadius: '7px', color: '#10B981', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
                              <i className="ti ti-download" style={{ fontSize: '12px' }} />Télécharger
                            </a>
                          )}
                          <button onClick={() => onGenererDoc(preuve.code_doc!)} disabled={generatingDoc === preuve.code_doc}
                            style={{ height: '32px', padding: '0 14px', background: generatingDoc === preuve.code_doc ? '#E0E7FF' : isDone ? '#F3F4F6' : '#6366F1', border: 'none', borderRadius: '7px', color: generatingDoc === preuve.code_doc ? '#818CF8' : isDone ? '#6B7280' : '#fff', fontSize: '12px', fontWeight: '600', cursor: generatingDoc === preuve.code_doc ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <i className={'ti ' + (generatingDoc === preuve.code_doc ? 'ti-loader-2' : isDone ? 'ti-refresh' : 'ti-sparkles')} style={{ fontSize: '13px' }} />
                            {generatingDoc === preuve.code_doc ? 'Génération...' : isDone ? 'Regénérer' : 'Générer'}
                          </button>
                        </>
                      )}

                      {preuve.type === 'upload' && (
                        <label style={{ height: '32px', padding: '0 14px', background: '#FAF5FF', border: '1px solid #E9D5FF', borderRadius: '7px', color: '#9333EA', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <i className={'ti ' + (isUploading ? 'ti-loader-2' : 'ti-upload')} style={{ fontSize: '12px' }} />
                          {isUploading ? 'Upload...' : 'Uploader'}
                          <input type='file' style={{ display: 'none' }} accept='.pdf,.doc,.docx,.jpg,.png'
                            onChange={async e => { if (e.target.files) await handleUpload(e.target.files[0], preuve.label, idx) }} />
                        </label>
                      )}

                      {preuve.type === 'texte' && preuve.mention && (
                        <button onClick={() => handleCopier(preuve.mention!)}
                          style={{ height: '32px', padding: '0 14px', background: mentionCopied ? '#ECFDF5' : '#FEFCE8', border: '1px solid ' + (mentionCopied ? '#A7F3D0' : '#FDE68A'), borderRadius: '7px', color: mentionCopied ? '#10B981' : '#CA8A04', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <i className={'ti ' + (mentionCopied ? 'ti-check' : 'ti-copy')} style={{ fontSize: '12px' }} />
                          {mentionCopied ? 'Copié !' : 'Copier la mention'}
                        </button>
                      )}
                    </div>
                  </div>

                  {preuve.type === 'texte' && preuve.mention && (
                    <div style={{ margin: '0 14px 12px', padding: '10px 14px', background: '#FEFCE8', borderRadius: '7px', border: '1px solid #FDE68A' }}>
                      <div style={{ fontSize: '12px', color: '#92400E', fontStyle: 'italic', lineHeight: '1.6' }}>
                        {preuve.mention}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!config && critere.code !== '2.2.1' && (
        <div style={{ padding: '32px', background: '#F9FAFB', borderRadius: '10px', textAlign: 'center', marginBottom: '20px', border: '1px solid #F3F4F6' }}>
          <i className="ti ti-clock" style={{ fontSize: '24px', color: '#D1D5DB', display: 'block', marginBottom: '8px' }} />
          <div style={{ fontSize: '13px', fontWeight: '500', color: '#9CA3AF' }}>Guide interactif bientôt disponible pour ce critère</div>
          <div style={{ fontSize: '12px', color: '#D1D5DB', marginTop: '4px' }}>Utilisez le statut ci-dessous pour indiquer votre avancement</div>
        </div>
      )}

      {/* Chat consultant/client */}
      <ChatCritere
        critereId={critere.id}
        etabId={selectedEtabId || ''}
        userRole={userRole || 'client'}
      />

      {/* Docs uploadés */}
      {preuvesUploadees.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>
            Vos documents ({preuvesUploadees.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {preuvesUploadees.map((doc: any, i: number) => {
              const filename = doc.url.split('/').pop() || ''
              const ext = filename.split('.').pop()?.toUpperCase() || 'DOC'
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#F0FDF4', borderRadius: '8px', border: '1px solid #A7F3D0' }}>
                  <div style={{ width: '28px', height: '28px', background: '#D1FAE5', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '9px', fontWeight: '700', color: '#059669' }}>{ext}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', fontWeight: '600', color: '#065F46', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nom}</div>
                    <div style={{ fontSize: '11px', color: '#6EE7B7', marginTop: '1px' }}>
                      Ajouté le {new Date(doc.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                  <i className="ti ti-check" style={{ fontSize: '14px', color: '#10B981', flexShrink: 0 }} />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}