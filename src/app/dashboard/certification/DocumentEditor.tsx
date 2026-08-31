'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

// Templates des documents avec leurs sections
const TEMPLATES: Record<string, {
  titre: string
  description: string
  sections: { id: string; titre: string; contenu: string; modifiable: boolean; aide?: string }[]
}> = {
  'USA-DOC-01': {
    titre: 'Charte éthique',
    description: 'Document officiel présentant les engagements éthiques de votre entreprise envers vos patients.',
    sections: [
      {
        id: 's1', titre: 'Engagement envers le libre choix', modifiable: true,
        contenu: `{{raison_sociale}} s'engage à respecter le principe fondamental du libre choix de l'usager. Aucun accord commercial avec un établissement de santé, un médecin ou tout autre professionnel de santé ne peut conditionner ou influencer le choix du patient.

Tout usager a le droit de choisir librement son prestataire de services et distributeurs de matériel, conformément à l'article L.1110-8 du Code de la Santé Publique.`,
        aide: "Personnalisez ce texte pour refléter vos pratiques réelles."
      },
      {
        id: 's2', titre: 'Engagement envers la dignité et la bientraitance', modifiable: true,
        contenu: `Tous les membres de l'équipe de {{raison_sociale}} s'engagent à traiter chaque patient avec respect, dignité et bienveillance. Nos interventions au domicile sont réalisées dans le respect de l'intimité et de la vie privée de l'usager.

En cas de manquement à ces principes, tout usager peut contacter {{responsable_reclamations}} au {{telephone}}.`,
        aide: "Vérifiez que le nom du responsable des réclamations est correct."
      },
      {
        id: 's3', titre: 'Engagement envers la confidentialité', modifiable: true,
        contenu: `{{raison_sociale}} s'engage à protéger la confidentialité des données personnelles, médicales et sociales de ses usagers, conformément au Règlement Général sur la Protection des Données (RGPD).

Le responsable de la protection des données est {{dpo}}. Pour toute question relative à vos données personnelles, vous pouvez le contacter par email ou par courrier à l'adresse de notre siège social.`,
        aide: "Vérifiez que le DPO est bien désigné dans votre profil."
      },
      {
        id: 's4', titre: 'Engagement envers la qualité', modifiable: true,
        contenu: `{{raison_sociale}} s'engage à délivrer des prestations de qualité, conformes aux exigences du référentiel de bonnes pratiques professionnelles des Prestataires de Services et Distributeurs de Matériel (PSDM) publié par la Haute Autorité de Santé en juin 2024.

Nous évaluons régulièrement la satisfaction de nos usagers et mettons en place des actions d'amélioration continue.`,
        aide: "Ce paragraphe est standard — vous pouvez le laisser tel quel."
      },
      {
        id: 's5', titre: 'Signature et entrée en vigueur', modifiable: true,
        contenu: `La présente charte éthique est adoptée par {{raison_sociale}}, représentée par {{dirigeant}}, {{forme_juridique}} au capital social déclaré, dont le siège social est situé {{adresse_siege}}, {{code_postal}} {{ville}}.

Elle entre en vigueur à compter de sa date de signature électronique et est révisée annuellement.`,
        aide: ""
      },
    ]
  },
  'USA-INFO-01': {
    titre: "Notice d'information usager — Libre choix",
    description: "Document remis à chaque nouveau patient expliquant ses droits, notamment le libre choix de son prestataire.",
    sections: [
      {
        id: 's1', titre: 'Vos droits en tant que patient', modifiable: false,
        contenu: `Conformément à l'article L.1110-8 du Code de la Santé Publique, vous disposez du droit au libre choix de votre prestataire de services et distributeurs de matériel médical à domicile.

Cela signifie qu'aucun médecin, établissement de santé ou tiers ne peut vous imposer le choix de votre prestataire PSDM. Vous êtes libre de choisir {{raison_sociale}} ou tout autre prestataire agréé.`,
        aide: ""
      },
      {
        id: 's2', titre: 'Nos engagements envers vous', modifiable: true,
        contenu: `En choisissant {{raison_sociale}}, vous bénéficiez des engagements suivants :

• Une information claire et transparente sur les produits et prestations qui vous sont délivrés
• Le respect de votre intimité et de votre dignité lors de chaque intervention à votre domicile  
• La confidentialité absolue de vos données personnelles et médicales
• Une réponse rapide à toute question ou réclamation de votre part

Notre équipe est joignable au {{telephone}} du lundi au vendredi de 9h à 18h.`,
        aide: "Adaptez les horaires et les engagements à votre fonctionnement réel."
      },
      {
        id: 's3', titre: 'Comment nous contacter', modifiable: true,
        contenu: `Pour toute question, réclamation ou information :

📞 Téléphone : {{telephone}}
📧 Email : {{email}}
📍 Adresse : {{adresse_siege}}, {{code_postal}} {{ville}}

Responsable des réclamations : {{responsable_reclamations}}
Garant PSDM : {{garant_psdm}}`,
        aide: "Ces informations sont remplies automatiquement depuis votre profil."
      },
    ]
  },
  'PRESTA-DOC-01': {
    titre: "Attestation d'installation — Modèle exemple",
    description: "Modèle d'attestation d'installation avec données fictives pour illustrer votre processus auprès de l'inspecteur. Les vraies attestations signées restent dans votre logiciel métier.",
    sections: [
      {
        id: 's1', titre: 'Informations de la prestation', modifiable: true,
        contenu: `Cette attestation est établie par {{raison_sociale}} — {{adresse_siege}}, {{code_postal}} {{ville}}.

Date de l'intervention : [EXEMPLE : 15/09/2026]
Nom du technicien intervenant : [EXEMPLE : Thomas Moreau]
Référence du dossier : [EXEMPLE : Dossier 001]

⚠️ Ce document est un modèle exemple — les données patient réelles sont dans votre logiciel métier.`,
        aide: "Remplacez les exemples par des données fictives représentatives de vos interventions."
      },
      {
        id: 's2', titre: 'Matériel livré / installé', modifiable: true,
        contenu: `Désignation du matériel : [EXEMPLE : Lit médicalisé électrique 2 plans]
Référence / N° de série : [EXEMPLE : REF-2024-001]
Quantité : [EXEMPLE : 1]

Le matériel livré est conforme à la prescription médicale et aux attentes de l'usager.
Le technicien a expliqué le fonctionnement du matériel et répondu aux questions du patient.`,
        aide: "Adaptez les exemples à vos types de matériels habituels."
      },
      {
        id: 's3', titre: 'Déclaration du patient', modifiable: false,
        contenu: `Je soussigné(e), [Référence anonymisée — ex: Patient A],

• Confirme avoir reçu le matériel et/ou la prestation décrits ci-dessus
• Confirme avoir reçu les informations et explications nécessaires à l'utilisation du matériel
• Confirme avoir été informé(e) de mon droit au libre choix de prestataire
• Donne mon consentement éclairé à la réalisation de cette prestation

Signature du patient ou de son représentant légal :

_______________                    Date : _______________`,
        aide: ""
      },
    ]
  },
  'QR-DOC-01': {
    titre: 'Questionnaire de satisfaction usager',
    description: "Formulaire d'évaluation de la satisfaction remis régulièrement aux patients.",
    sections: [
      {
        id: 's1', titre: 'Introduction', modifiable: true,
        contenu: `Cher(e) patient(e),

Votre satisfaction est notre priorité. Afin d'améliorer continuellement la qualité de nos prestations, nous vous remercions de bien vouloir prendre quelques minutes pour répondre à ce questionnaire.

Vos réponses sont anonymes et confidentielles.

{{raison_sociale}} — {{telephone}}`,
        aide: "Personnalisez le message d'introduction."
      },
      {
        id: 's2', titre: 'Questions de satisfaction', modifiable: true,
        contenu: `1. Comment évaluez-vous la qualité du matériel fourni ?
   ☐ Très satisfait(e)   ☐ Satisfait(e)   ☐ Peu satisfait(e)   ☐ Insatisfait(e)

2. Comment évaluez-vous la ponctualité de nos interventions ?
   ☐ Très satisfait(e)   ☐ Satisfait(e)   ☐ Peu satisfait(e)   ☐ Insatisfait(e)

3. Comment évaluez-vous l'amabilité et le professionnalisme de notre équipe ?
   ☐ Très satisfait(e)   ☐ Satisfait(e)   ☐ Peu satisfait(e)   ☐ Insatisfait(e)

4. Les informations sur votre matériel vous ont-elles été clairement expliquées ?
   ☐ Oui, complètement   ☐ Partiellement   ☐ Non

5. Recommanderiez-vous {{raison_sociale}} à un proche ?
   ☐ Certainement   ☐ Probablement   ☐ Probablement pas   ☐ Non`,
        aide: "Ajoutez ou supprimez des questions selon vos besoins."
      },
      {
        id: 's3', titre: 'Commentaires libres', modifiable: true,
        contenu: `6. Avez-vous des suggestions d'amélioration ou des commentaires ?

_______________________________________________
_______________________________________________
_______________________________________________

Merci pour votre participation.
Retournez ce questionnaire dans l'enveloppe jointe ou envoyez-le par email à : {{email}}`,
        aide: "Adaptez les modalités de retour du questionnaire."
      },
    ]
  },
  'ATTESTATION-DEVIS': {
    titre: "Attestation de remise systématique des devis",
    description: "Attestation officielle confirmant la remise de devis signés avant chaque livraison.",
    sections: [
      {
        id: 's1', titre: "Identité du signataire", modifiable: true,
        contenu: `Je soussigné(e), {{responsable_etablissement}}, agissant en qualité de responsable au sein de {{raison_sociale}} ({{forme_juridique}}), dont le siège social est situé {{adresse_siege}}, {{code_postal}} {{ville}},`,
        aide: "Vérifiez que la personne responsable des livraisons est correctement indiquée."
      },
      {
        id: 's2', titre: "Objet de l'attestation", modifiable: true,
        contenu: `atteste sur l'honneur que notre entreprise remet systématiquement un devis signé par le patient ou son représentant légal avant chaque livraison de matériel médical à domicile.

Cette pratique s'applique à l'ensemble de nos patients et est conforme aux exigences du critère 1.2.2 du référentiel de certification HAS PSDM (juin 2024).`,
        aide: "Vous pouvez préciser la date de mise en place de cette pratique."
      },
      {
        id: 's3', titre: "Conservation des documents", modifiable: true,
        contenu: `Les devis originaux signés par les patients sont conservés dans notre logiciel métier ({{dossier_usager}}) pendant une durée minimale de 5 ans, conformément à la réglementation en vigueur.

Ces documents sont disponibles sur demande de l'inspecteur HAS, dans le respect des règles de confidentialité des données patients (RGPD).`,
        aide: "Précisez le nom de votre logiciel métier si nécessaire."
      },
      {
        id: 's4', titre: "Engagement et signature", modifiable: true,
        contenu: `La présente attestation est établie pour valoir ce que de droit dans le cadre de la certification HAS PSDM de {{raison_sociale}}.

La présente attestation fait foi dans le cadre de la certification HAS PSDM.`,
        aide: ""
      },
    ]
  },
  'ATTESTATION-CONSENTEMENT': {
    titre: "Attestation de recueil systématique du consentement",
    description: "Attestation officielle confirmant le recueil du consentement du patient à chaque étape de la prestation.",
    sections: [
      {
        id: 's1', titre: "Identité du signataire", modifiable: true,
        contenu: `Je soussigné(e), {{responsable_etablissement}}, agissant en qualité de responsable au sein de {{raison_sociale}} ({{forme_juridique}}), dont le siège social est situé {{adresse_siege}}, {{code_postal}} {{ville}},`,
        aide: "Vérifiez que la personne responsable est correctement indiquée."
      },
      {
        id: 's2', titre: "Objet de l'attestation", modifiable: true,
        contenu: `atteste sur l'honneur que notre entreprise recueille systématiquement le consentement éclairé du patient ou de son représentant légal avant chaque intervention, livraison ou modification de prestation.

Ce consentement est matérialisé par la signature du patient sur le bon de livraison ou l'attestation d'installation remis lors de chaque intervention. Cette pratique est conforme au critère 1.2.4 du référentiel HAS PSDM (juin 2024).`,
        aide: "Précisez les modalités de recueil du consentement si nécessaire."
      },
      {
        id: 's3', titre: "Cas particuliers", modifiable: true,
        contenu: `Dans les cas où le patient ne peut pas signer (handicap, hospitalisation, tutelle), le consentement est recueilli auprès du représentant légal ou de la personne de confiance désignée, conformément à nos procédures internes.

Les documents signés sont conservés dans {{dossier_usager}} pendant une durée minimale de 5 ans.`,
        aide: "Adaptez ce paragraphe à vos procédures réelles."
      },
      {
        id: 's4', titre: "Engagement et signature", modifiable: true,
        contenu: `La présente attestation est établie pour valoir ce que de droit dans le cadre de la certification HAS PSDM de {{raison_sociale}}.

La présente attestation fait foi dans le cadre de la certification HAS PSDM.`,
        aide: ""
      },
    ]
  },
  'PROC-BIENTRAITANCE': {
    titre: "Procédure bientraitance et dignité des usagers",
    description: "Procédure interne définissant les engagements et comportements attendus de vos collaborateurs au domicile des patients.",
    sections: [
      {
        id: 's1', titre: "Objet et champ d'application", modifiable: true,
        contenu: `La présente procédure définit les engagements de {{raison_sociale}} en matière de bientraitance et de respect de la dignité des usagers lors de toute intervention à domicile.

Elle s'applique à l'ensemble du personnel en contact avec les patients : techniciens, livreurs, personnel administratif et {{responsable_etablissement}}.

Responsable de cette procédure : {{garant_psdm}}`,
        aide: "Vérifiez que les responsables sont bien désignés dans votre profil."
      },
      {
        id: 's2', titre: "Principes fondamentaux", modifiable: true,
        contenu: `Chaque collaborateur de {{raison_sociale}} s'engage à respecter les principes suivants lors de toute intervention au domicile d'un patient :

✓ Respect de l'intimité et de la vie privée — frapper avant d'entrer, ne pas commenter l'environnement du patient
✓ Respect de la dignité — s'adresser au patient avec courtoisie, utiliser le vouvoiement sauf demande contraire
✓ Bienveillance — adapter son comportement à l'état de santé et à la vulnérabilité du patient
✓ Discrétion — ne pas divulguer d'informations sur les patients à des tiers
✓ Non-jugement — respecter les choix de vie et les convictions de chaque patient
✓ Ponctualité — respecter les créneaux horaires convenus avec le patient`,
        aide: "Adaptez cette liste à vos pratiques réelles. Soyez précis et concret."
      },
      {
        id: 's3', titre: "Formation du personnel", modifiable: true,
        contenu: `Tout nouveau collaborateur reçoit une sensibilisation à la bientraitance lors de son intégration, animée par {{responsable_etablissement}}.

Une formation ou sensibilisation est organisée au minimum une fois par an pour l'ensemble du personnel.

Les attestations de présence à ces formations sont conservées dans le dossier du personnel et disponibles sur demande de l'inspecteur HAS.`,
        aide: "Précisez la fréquence et le format de vos formations (interne, externe, e-learning...)."
      },
      {
        id: 's4', titre: "Procédure de signalement", modifiable: true,
        contenu: `Tout collaborateur témoin ou informé d'une situation de maltraitance ou de manquement à la bientraitance doit :

1. Informer immédiatement {{responsable_etablissement}} ou {{garant_psdm}}
2. Consigner les faits par écrit avec la date, l'heure et la description de la situation
3. Ne pas divulguer l'information à des tiers non concernés

Le responsable déclenche une enquête interne et prend les mesures correctives nécessaires dans les 48 heures.

En cas de danger immédiat pour le patient, contacter le 15 (SAMU) ou le 3977 (numéro national de lutte contre la maltraitance).`,
        aide: "Adaptez les délais et les procédures à votre organisation."
      },
      {
        id: 's5', titre: "Entrée en vigueur", modifiable: true,
        contenu: `La présente procédure est adoptée par {{raison_sociale}} et entre en vigueur à compter de sa date de signature électronique.

Elle est révisée annuellement et lors de tout changement organisationnel significatif.

Elle fait partie intégrante du système qualité de {{raison_sociale}} dans le cadre de la certification HAS PSDM (référentiel juin 2024, critère 1.2.3).`,
        aide: "Ce paragraphe peut être laissé tel quel."
      },
    ]
  },
  'FORM-BIENTRAITANCE': {
    titre: "Attestation de sensibilisation bientraitance",
    description: "Document attestant que vos collaborateurs ont été sensibilisés à la bientraitance.",
    sections: [
      {
        id: 's1', titre: "Identité de l'entreprise", modifiable: false,
        contenu: `{{raison_sociale}} — {{adresse_siege}}, {{code_postal}} {{ville}}
Garant PSDM : {{garant_psdm}}`,
        aide: ""
      },
      {
        id: 's2', titre: "Objet de l'attestation", modifiable: true,
        contenu: `Je soussigné(e), {{responsable_etablissement}}, atteste que l'ensemble des collaborateurs de {{raison_sociale}} en contact avec les patients a reçu une sensibilisation à la bientraitance et au respect de la dignité des usagers.

Cette sensibilisation a été réalisée en interne et porte sur :
• Les principes fondamentaux de la bientraitance au domicile
• Le respect de l'intimité et de la vie privée des patients  
• La procédure de signalement en cas de manquement
• Les obligations légales et réglementaires`,
        aide: "Précisez le contenu de votre sensibilisation."
      },
      {
        id: 's3', titre: "Personnel concerné", modifiable: true,
        contenu: `La sensibilisation concerne l'ensemble du personnel en contact avec les patients, soit :
• Les techniciens et livreurs intervenant au domicile
• Le personnel administratif en contact téléphonique avec les patients
• Tout nouveau collaborateur lors de son intégration

La liste des participants et les dates de sensibilisation sont conservées dans notre système de gestion interne.`,
        aide: "Adaptez la liste à votre organisation."
      },
      {
        id: 's4', titre: "Engagement", modifiable: true,
        contenu: `Cette sensibilisation est renouvelée au minimum une fois par an.

La présente attestation est établie pour valoir ce que de droit dans le cadre de la certification HAS PSDM de {{raison_sociale}} (critère 1.2.3).`,
        aide: "Précisez la fréquence si elle est différente."
      },
    ]
  },
  'PROC-PRESCRIPTION-01': {
    titre: 'Procédure de gestion des prescriptions',
    description: "Procédure interne décrivant le processus de réception, vérification et traitement des prescriptions médicales.",
    sections: [
      {
        id: 's1', titre: "Objet et champ d'application", modifiable: true,
        contenu: `La présente procédure définit les modalités de réception, de vérification et de traitement des prescriptions médicales au sein de {{raison_sociale}}.

Elle s'applique à l'ensemble du personnel en contact avec les prescriptions : {{responsable_etablissement}}, techniciens, livreurs et personnel administratif.

Garant de cette procédure : {{garant_psdm}}`,
        aide: "Vérifiez que les responsables sont bien désignés."
      },
      {
        id: 's2', titre: 'Réception et vérification de la prescription', modifiable: true,
        contenu: `À réception de chaque prescription, le personnel vérifie :

✓ L'identité du prescripteur (nom, signature, cachet)
✓ L'identité du patient (nom, prénom, date de naissance)
✓ La date de la prescription (validité)
✓ La désignation précise du matériel ou de la prestation
✓ La durée de prescription
✓ La conformité avec la Liste des Produits et Prestations (LPP)

En cas de prescription incomplète ou illisible : contacter immédiatement le prescripteur et noter la date et l'objet de l'échange dans le dossier patient.`,
        aide: "Adaptez cette liste à vos types de prescriptions habituels."
      },
      {
        id: 's3', titre: 'Vérification de la faisabilité', modifiable: true,
        contenu: `Avant toute confirmation de prise en charge, vérifier :

✓ La disponibilité du matériel en stock
✓ Les compétences du personnel pour la prestation demandée
✓ La zone géographique d'intervention
✓ Les délais de mise en place adaptés à la situation du patient

Si la faisabilité ne peut être assurée : informer le prescripteur et le patient dans les meilleurs délais et proposer une solution alternative.`,
        aide: "Ajoutez vos critères de faisabilité spécifiques à votre activité."
      },
      {
        id: 's4', titre: 'Traçabilité et archivage', modifiable: true,
        contenu: `Chaque prescription reçue est enregistrée dans {{dossier_usager}} avec :
- La date de réception
- Le nom du patient (référence anonymisée dans MediReg)
- Le matériel ou la prestation demandée
- Le statut de traitement

Les prescriptions originales sont conservées pendant une durée minimale de 5 ans conformément à la réglementation.`,
        aide: "Précisez votre logiciel métier ou système d'archivage."
      },
    ]
  },
}

interface Props {
  templateCode: string
  societe: any
  etabId: string
  onClose: () => void
  onSaved: () => void
}

export default function DocumentEditor({ templateCode, societe, etabId, onClose, onSaved }: Props) {
  const template = TEMPLATES[templateCode]
  const [sections, setSections] = useState<{ id: string; titre: string; contenu: string; modifiable: boolean; aide?: string }[]>([])
  const [signePar, setSignePar] = useState('')
  const [showSignature, setShowSignature] = useState(false)
  const [saving, setSaving] = useState(false)
  const [signing, setSigning] = useState(false)
  const [saved, setSaved] = useState(false)
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [docId, setDocId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (template) {
      // Remplacer les variables par les données de la société
      const replacedSections = template.sections.map(s => ({
        ...s,
        contenu: replaceVars(s.contenu)
      }))
      setSections(replacedSections)
      loadExisting(replacedSections)
    }
  }, [templateCode, societe])

  function replaceVars(text: string): string {
    if (!societe) return text
    const org = societe.organisation || {}
    return text
      .replace(/{{raison_sociale}}/g, societe.raison_sociale || '')
      .replace(/{{nom_commercial}}/g, societe.nom_commercial || societe.raison_sociale || '')
      .replace(/{{forme_juridique}}/g, societe.forme_juridique || '')
      .replace(/{{siren}}/g, societe.siren || '')
      .replace(/{{adresse_siege}}/g, societe.adresse_siege || '')
      .replace(/{{code_postal}}/g, societe.code_postal || '')
      .replace(/{{ville}}/g, societe.ville || '')
      .replace(/{{telephone}}/g, societe.telephone || '')
      .replace(/{{email}}/g, societe.email || '')
      .replace(/{{dossier_usager}}/g, org.dossier_usager_detail || org.dossier_usager || 'notre logiciel métier')
      .replace(/{{dirigeant}}/g, 'le représentant légal')
      .replace(/{{garant_psdm}}/g, 'le Garant PSDM désigné')
      .replace(/{{dpo}}/g, 'le DPO désigné')
      .replace(/{{responsable_reclamations}}/g, 'le responsable des réclamations')
      .replace(/{{responsable_etablissement}}/g, 'le responsable d\'établissement')
  }

  async function loadExisting(defaultSections: any[]) {
    const { data } = await supabase.from('documents_editables')
      .select('*')
      .eq('etablissement_id', etabId)
      .eq('template_code', templateCode)
      .limit(1)
    if (data && data.length > 0) {
      setDocId(data[0].id)
      setSections(data[0].contenu || defaultSections)
      setSignePar(data[0].signe_par || '')
    }
  }

  async function saveDoc(statut = 'brouillon') {
    setSaving(true)
    console.log('saveDoc — statut:', statut, 'etabId:', etabId, 'docId:', docId, 'signePar:', signePar)
    console.log('saveDoc appelé — statut:', statut, 'docId:', docId, 'etabId:', etabId, 'signePar:', signePar)
    const payload = {
      etablissement_id: etabId,
      template_code: templateCode,
      titre: template.titre,
      contenu: sections,
      statut,
      signe_par: signePar || null,
      signe_le: statut === 'signe' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }
    if (docId) {
      const { error: upErr } = await supabase.from('documents_editables').update(payload).eq('id', docId)
      console.log('update result — error:', upErr?.message || 'OK')
    } else {
      const { data, error: insErr } = await supabase.from('documents_editables').insert([payload]).select('id').single()
      console.log('insert result — data:', data, 'error:', insErr?.message || 'OK')
      if (data) setDocId(data.id)
    }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    setSaving(false)
    if (statut === 'signe') { setShowSignature(false); onSaved() }
  }

  if (!template) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)', overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '800px', boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden', marginTop: '20px', marginBottom: '20px' }}>

        {/* Header */}
        <div style={{ background: 'linear-gradient(135deg, #1E1B4B, #1e3a5f)', padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <div style={{ width: '32px', height: '32px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-file-text" style={{ fontSize: '16px', color: '#fff' }} />
              </div>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#fff' }}>{template.titre}</div>
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{template.description}</div>
          </div>
          <button onClick={onClose} style={{ width: '36px', height: '36px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            <i className="ti ti-x" style={{ fontSize: '16px' }} />
          </button>
        </div>

        {/* Barre d'outils */}
        <div style={{ padding: '12px 28px', background: '#F8FAFF', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981' }} />
            <span style={{ fontSize: '12px', color: '#6B7280' }}>Variables remplies automatiquement depuis votre profil</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => saveDoc('brouillon')} disabled={saving}
              style={{ padding: '8px 16px', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: '8px', color: '#374151', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <i className={`ti ${saved ? 'ti-check' : 'ti-device-floppy'}`} style={{ fontSize: '13px', color: saved ? '#10B981' : undefined }} />
              {saved ? 'Enregistré !' : 'Sauvegarder'}
            </button>
            <button onClick={() => setShowSignature(true)}
              style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #7C3AED, #1A56DB)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <i className="ti ti-signature" style={{ fontSize: '13px' }} />
              Signer le document
            </button>
          </div>
        </div>

        {/* Contenu du document */}
        <div style={{ padding: '28px', maxHeight: '60vh', overflowY: 'auto' }}>

          {/* En-tête du document */}
          <div style={{ textAlign: 'center', marginBottom: '32px', paddingBottom: '24px', borderBottom: '2px solid #E5E7EB' }}>
            {societe?.logo_url && (
              <img src={societe.logo_url} alt="Logo" style={{ height: '50px', objectFit: 'contain', marginBottom: '12px' }} />
            )}
            <div style={{ fontSize: '22px', fontWeight: '800', color: '#111827', letterSpacing: '-0.5px' }}>{template.titre}</div>
            <div style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '6px' }}>{societe?.raison_sociale}</div>
          </div>

          {/* Sections */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {sections.map((section, i) => (
              <div key={section.id}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: '#111827', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#EBF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '800', color: '#1A56DB', flexShrink: 0 }}>{i + 1}</div>
                  {section.titre}
                  {section.modifiable && (
                    <span style={{ fontSize: '10px', color: '#7C3AED', background: '#F5F3FF', padding: '1px 7px', borderRadius: '20px', fontWeight: '600' }}>Modifiable</span>
                  )}
                </div>

                {section.aide && (
                  <div style={{ fontSize: '11px', color: '#6366F1', background: '#EEF2FF', padding: '6px 10px', borderRadius: '6px', marginBottom: '8px', display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                    <i className="ti ti-info-circle" style={{ fontSize: '12px', flexShrink: 0, marginTop: '1px' }} />
                    {section.aide}
                  </div>
                )}

                {section.modifiable ? (
                  <textarea
                    value={section.contenu}
                    onChange={e => setSections(prev => prev.map(s => s.id === section.id ? { ...s, contenu: e.target.value } : s))}
                    onFocus={() => setActiveSection(section.id)}
                    onBlur={() => setActiveSection(null)}
                    style={{
                      width: '100%', padding: '14px 16px', border: `2px solid ${activeSection === section.id ? '#7C3AED' : '#E5E7EB'}`,
                      borderRadius: '10px', fontSize: '13px', color: '#374151', fontFamily: 'var(--font)', outline: 'none',
                      resize: 'vertical', lineHeight: '1.7', boxSizing: 'border-box' as const,
                      minHeight: `${Math.max(120, section.contenu.split('\n').length * 24 + 40)}px`,
                      background: activeSection === section.id ? '#FDFAFF' : '#FAFAFA',
                      transition: 'border-color 0.15s, background 0.15s'
                    }}
                  />
                ) : (
                  <div style={{ padding: '14px 16px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '10px', fontSize: '13px', color: '#374151', lineHeight: '1.7', whiteSpace: 'pre-wrap' }}>
                    {section.contenu}
                    <div style={{ fontSize: '10px', color: '#D1D5DB', marginTop: '8px', fontStyle: 'italic' }}>Section non modifiable — générée automatiquement</div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Zone signature si signé */}
          {signePar && (
            <div style={{ marginTop: '32px', padding: '20px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <i className="ti ti-circle-check-filled" style={{ fontSize: '24px', color: '#10B981', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#065F46' }}>Document signé</div>
                <div style={{ fontSize: '12px', color: '#059669', marginTop: '2px' }}>Signé par {signePar}</div>
              </div>
            </div>
          )}
        </div>

        {/* Modal signature */}
        {showSignature && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, borderRadius: '16px' }}>
            <div style={{ background: '#fff', borderRadius: '14px', padding: '28px', width: '400px', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827', marginBottom: '6px' }}>Signer le document</div>
              <div style={{ fontSize: '13px', color: '#9CA3AF', marginBottom: '20px' }}>
                En signant, vous confirmez que ce document reflète les pratiques réelles de votre entreprise.
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Votre nom complet
                </label>
                <input value={signePar} onChange={e => setSignePar(e.target.value)}
                  placeholder="Prénom Nom"
                  style={{ width: '100%', padding: '11px 14px', border: '1px solid #E5E7EB', borderRadius: '9px', fontSize: '13px', fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' as const }}
                  onFocus={e => e.target.style.borderColor = '#7C3AED'}
                  onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
              </div>
              <div style={{ padding: '12px', background: '#F9FAFB', borderRadius: '8px', marginBottom: '16px', fontSize: '12px', color: '#6B7280', lineHeight: '1.5' }}>
                <i className="ti ti-info-circle" style={{ fontSize: '13px', marginRight: '5px', color: '#9CA3AF' }} />
                En signant électroniquement ce document, vous attestez sur l'honneur de l'exactitude des informations qu'il contient. Date : {new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}.
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowSignature(false)}
                  style={{ flex: 1, padding: '11px', background: '#F3F4F6', border: 'none', borderRadius: '9px', color: '#6B7280', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  Annuler
                </button>
                <button onClick={() => saveDoc('signe')} disabled={!signePar.trim() || signing}
                  style={{ flex: 2, padding: '11px', background: !signePar.trim() ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg, #7C3AED, #1A56DB)', border: 'none', borderRadius: '9px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: !signePar.trim() ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <i className="ti ti-signature" style={{ fontSize: '14px' }} />
                  Signer et valider
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}