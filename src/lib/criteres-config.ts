// CRITERES_CONFIG — Configuration complète du chapitre 1
// Chaque critère définit : ce que l'inspecteur cherche, les preuves requises,
// les questions à poser au client, et le registre associé

export type Question = {
  id: string
  label: string
  type: 'choix' | 'texte' | 'oui_non' | 'multiple'
  options?: string[]
  requis?: boolean
  aide?: string
}

export type Preuve = {
  code: string
  label: string
  type: 'genere' | 'upload' | 'registre'
  description?: string
}

export type CritereConfig = {
  code: string
  inspecteur: string        // Ce que l'inspecteur va vérifier — langage terrain
  contexte: string          // Pourquoi ce critère existe
  preuves: Preuve[]         // Documents et preuves attendus
  questions: Question[]     // Questions à poser au client
  registre?: 'remises' | 'reclamations' | null
  conseil_nora?: string     // Conseil terrain de Nora
}

export const CRITERES_CONFIG: Record<string, CritereConfig> = {

  // ─────────────────────────────────────────────
  // 1.2.1 — Libre choix de l'usager
  // ─────────────────────────────────────────────
  '1.2.1': {
    code: '1.2.1',
    inspecteur: "L'inspecteur va vérifier que le patient a bien eu le choix de son prestataire et qu'il n'a pas été orienté de façon imposée par un prescripteur, un établissement ou un proche. Il cherche une preuve écrite que le libre choix a été respecté et expliqué.",
    contexte: "Un patient sous oxygène ou avec un fauteuil roulant doit pouvoir choisir librement son prestataire. L'inspecteur vérifie que vous ne captez pas les patients via des accords commerciaux cachés avec des hôpitaux ou médecins.",
    preuves: [
      {
        code: 'USA-INFO-01',
        label: 'Notice d\'information sur le libre choix',
        type: 'genere',
        description: 'Document remis à chaque nouveau patient expliquant son droit à choisir librement son prestataire PSDM.'
      },
      {
        code: 'REGISTRE-REMISES-1.2.1',
        label: 'Registre de remise de la notice libre choix',
        type: 'registre',
        description: 'Trace de chaque remise de la notice au patient — date, référence anonymisée, signataire.'
      }
    ],
    questions: [
      {
        id: 'q1',
        label: 'À quel moment remettez-vous la notice de libre choix au patient ?',
        type: 'choix',
        options: ['Dès la première prise de contact', 'Lors de la livraison/installation', 'Les deux'],
        requis: true,
        aide: 'L\'idéal est dès le premier contact pour prouver que le choix est fait avant toute prestation.'
      },
      {
        id: 'q2',
        label: 'Comment prouvez-vous que le patient a bien reçu la notice ?',
        type: 'choix',
        options: ['Signature manuscrite sur bon de livraison', 'Signature sur document dédié', 'Email de confirmation', 'Pas de preuve formelle actuellement'],
        requis: true,
        aide: 'Une signature du patient est la meilleure preuve pour l\'inspecteur.'
      },
      {
        id: 'q3',
        label: 'Avez-vous des accords commerciaux avec des établissements de santé pour l\'orientation des patients ?',
        type: 'oui_non',
        requis: true,
        aide: 'Si oui, ces accords doivent être transparents et ne pas conditionner le choix du patient.'
      }
    ],
    registre: 'remises',
    conseil_nora: 'Le point le plus souvent raté : la notice existe mais il n\'y a pas de preuve que le patient l\'a reçue. Un registre signé ou une case cochée sur le bon de livraison suffit.'
  },

  // ─────────────────────────────────────────────
  // 1.2.2 — Information claire sur les produits
  // ─────────────────────────────────────────────
  '1.2.2': {
    code: '1.2.2',
    inspecteur: "L'inspecteur va vérifier que le patient comprend ce qu'il reçoit — le matériel, son fonctionnement, son prix, ce qui est remboursé et ce qui ne l'est pas. Il peut interroger directement un patient pour tester sa compréhension.",
    contexte: "Un patient ne doit pas découvrir une facture surprise. Il doit être informé avant la livraison du coût, du ticket modérateur, et des alternatives disponibles.",
    preuves: [
      {
        code: 'USA-DOC-01',
        label: 'Charte éthique et information usager',
        type: 'genere',
        description: 'Document présentant les produits, tarifs, remboursements et droits du patient.'
      },
      {
        code: 'DEVIS-SIGNE',
        label: 'Devis signé par le patient',
        type: 'upload',
        description: 'Le devis remis et signé prouve que le patient a été informé du coût avant la prestation.'
      }
    ],
    questions: [
      {
        id: 'q1',
        label: 'Remettez-vous systématiquement un devis avant la livraison ?',
        type: 'oui_non',
        requis: true,
        aide: 'Le devis signé est la preuve principale pour ce critère.'
      },
      {
        id: 'q2',
        label: 'Comment informez-vous le patient du reste à charge ?',
        type: 'choix',
        options: ['Sur le devis', 'À l\'oral lors de la livraison', 'Par courrier/email', 'Pas de procédure formelle'],
        requis: true
      },
      {
        id: 'q3',
        label: 'Vos livreurs/techniciens sont-ils formés pour expliquer le fonctionnement du matériel ?',
        type: 'oui_non',
        requis: true,
        aide: 'L\'inspecteur peut interroger votre personnel sur ce point.'
      }
    ],
    registre: 'remises',
    conseil_nora: 'Conservez les devis signés dans votre logiciel métier. Si l\'inspecteur demande à voir un dossier patient, vous devez retrouver le devis en 2 minutes.'
  },

  // ─────────────────────────────────────────────
  // 1.2.3 — Intimité, dignité et bientraitance
  // ─────────────────────────────────────────────
  '1.2.3': {
    code: '1.2.3',
    inspecteur: "L'inspecteur va chercher à comprendre comment vous formez votre personnel à la bientraitance. Il peut demander à voir le programme de formation et s'entretenir avec des salariés.",
    contexte: "Vos techniciens interviennent au domicile de personnes vulnérables. L'inspecteur s'assure qu'ils respectent l'intimité, ne font pas de commentaires déplacés, et agissent avec bienveillance.",
    preuves: [
      {
        code: 'PROC-BIENTRAITANCE',
        label: 'Procédure bientraitance et dignité',
        type: 'upload',
        description: 'Charte interne ou procédure définissant les comportements attendus au domicile des patients.'
      },
      {
        code: 'FORM-BIENTRAITANCE',
        label: 'Attestations de formation bientraitance',
        type: 'upload',
        description: 'Preuve que le personnel a été formé — attestation de présence ou certificat.'
      }
    ],
    questions: [
      {
        id: 'q1',
        label: 'Avez-vous une procédure écrite sur la bientraitance ?',
        type: 'oui_non',
        requis: true,
        aide: 'Une page suffit — l\'essentiel est qu\'elle existe et que le personnel la connaisse.'
      },
      {
        id: 'q2',
        label: 'Vos employés ont-ils reçu une formation sur la bientraitance ?',
        type: 'oui_non',
        requis: true,
        aide: 'Une sensibilisation interne compte. Notez la date et les participants.'
      },
      {
        id: 'q3',
        label: 'Comment gérez-vous un signalement de maltraitance d\'un patient ?',
        type: 'texte',
        requis: false,
        aide: 'Décrivez votre procédure de remontée d\'information en interne.'
      }
    ],
    registre: null,
    conseil_nora: 'Beaucoup de PSDM ont des pratiques correctes mais rien d\'écrit. Il suffit d\'une page dans votre classeur qualité pour satisfaire ce critère.'
  },

  // ─────────────────────────────────────────────
  // 1.2.4 — Consentement de l'usager
  // ─────────────────────────────────────────────
  '1.2.4': {
    code: '1.2.4',
    inspecteur: "L'inspecteur va vérifier que le patient signe ou valide explicitement chaque étape de la prestation — livraison, installation, modification du matériel. Un bon de livraison signé est la preuve minimale.",
    contexte: "Vous ne pouvez pas modifier le matériel d'un patient, faire une livraison supplémentaire ou changer une prestation sans son accord explicite. Ce critère protège le patient contre les actes non souhaités.",
    preuves: [
      {
        code: 'BON-LIVRAISON-SIGNE',
        label: 'Bons de livraison signés',
        type: 'upload',
        description: 'Le bon de livraison signé par le patient prouve son consentement à la réception du matériel.'
      },
      {
        code: 'PROC-CONSENTEMENT',
        label: 'Procédure de recueil du consentement',
        type: 'upload',
        description: 'Document décrivant comment vous recueillez le consentement à chaque étape.'
      }
    ],
    questions: [
      {
        id: 'q1',
        label: 'Faites-vous signer vos bons de livraison par le patient ?',
        type: 'oui_non',
        requis: true,
        aide: 'C\'est la preuve de consentement la plus simple et la plus acceptée par les inspecteurs.'
      },
      {
        id: 'q2',
        label: 'Comment gérez-vous les cas où le patient ne peut pas signer (handicap, hospitalisation) ?',
        type: 'texte',
        requis: false,
        aide: 'Un représentant légal peut signer à sa place. Documentez cette procédure.'
      },
      {
        id: 'q3',
        label: 'Avez-vous une procédure pour les modifications ou avenants de prestation ?',
        type: 'oui_non',
        requis: true,
        aide: 'Tout changement de matériel ou de prestation doit être consenti.'
      }
    ],
    registre: 'remises',
    conseil_nora: 'Le bon de livraison signé couvre souvent ce critère si vous l\'avez déjà. L\'essentiel est de le conserver et de pouvoir le retrouver.'
  },

  // ─────────────────────────────────────────────
  // 1.2.5 — Confidentialité des données
  // ─────────────────────────────────────────────
  '1.2.5': {
    code: '1.2.5',
    inspecteur: "L'inspecteur va vérifier que vous avez un registre des traitements de données (RGPD), que vos données patients sont protégées, et que votre personnel est sensibilisé à la confidentialité. Il peut demander à voir votre politique de confidentialité.",
    contexte: "Vous traitez des données médicales sensibles. Le RGPD impose un registre des traitements, une politique de confidentialité, et des mesures de sécurité (mot de passe, accès limités, pas de fichier patient sur un PC personnel).",
    preuves: [
      {
        code: 'POLITIQUE-CONFIDENTIALITE',
        label: 'Politique de confidentialité et RGPD',
        type: 'upload',
        description: 'Document décrivant comment vous protégez les données des patients.'
      },
      {
        code: 'REGISTRE-TRAITEMENTS',
        label: 'Registre des traitements de données',
        type: 'upload',
        description: 'Obligatoire RGPD — liste les données collectées, leur finalité et leur durée de conservation.'
      },
      {
        code: 'FORM-RGPD',
        label: 'Attestation de sensibilisation RGPD du personnel',
        type: 'upload',
        description: 'Preuve que votre équipe a été informée de ses obligations de confidentialité.'
      }
    ],
    questions: [
      {
        id: 'q1',
        label: 'Avez-vous nommé un DPO (Délégué à la Protection des Données) ?',
        type: 'oui_non',
        requis: false,
        aide: 'Obligatoire si vous traitez des données de santé à grande échelle. Pour une petite structure, un référent RGPD interne peut suffire.'
      },
      {
        id: 'q2',
        label: 'Votre registre des traitements RGPD est-il à jour ?',
        type: 'oui_non',
        requis: true,
        aide: 'Le registre des traitements est obligatoire pour toute entreprise traitant des données personnelles.'
      },
      {
        id: 'q3',
        label: 'Comment sont protégées les données patients dans votre logiciel métier ?',
        type: 'choix',
        options: ['Accès par mot de passe individuel', 'Accès partagé par l\'équipe', 'Données sur papier uniquement', 'Autre'],
        requis: true,
        aide: 'L\'accès individuel par identifiant est la meilleure pratique.'
      },
      {
        id: 'q4',
        label: 'Vos données sont-elles sauvegardées régulièrement ?',
        type: 'oui_non',
        requis: true
      }
    ],
    registre: null,
    conseil_nora: 'Le registre des traitements RGPD effraie beaucoup de PSDM mais c\'est un tableau simple. MediReg vous en génère un prérempli avec vos activités.'
  },

  // ─────────────────────────────────────────────
  // 1.3.1 — Évaluation de la satisfaction
  // ─────────────────────────────────────────────
  '1.3.1': {
    code: '1.3.1',
    inspecteur: "L'inspecteur va demander à voir vos enquêtes de satisfaction — pas juste le formulaire vide, mais les résultats et ce que vous en avez fait. Il cherche une démarche d'amélioration continue, pas un exercice de style.",
    contexte: "Ce critère oblige à écouter vraiment vos patients et à améliorer vos pratiques en conséquence. L'inspecteur peut demander à voir les résultats des 12 derniers mois et les actions correctrices prises.",
    preuves: [
      {
        code: 'QR-DOC-01',
        label: 'Questionnaire de satisfaction usager',
        type: 'genere',
        description: 'Formulaire de satisfaction adapté à l\'activité PSDM.'
      },
      {
        code: 'RESULTATS-SATISFACTION',
        label: 'Résultats de l\'enquête satisfaction (12 mois)',
        type: 'upload',
        description: 'Synthèse des résultats — taux de retour, notes, commentaires, et actions prises.'
      },
      {
        code: 'PLAN-AMELIORATION',
        label: 'Plan d\'amélioration issu de la satisfaction',
        type: 'upload',
        description: 'Document montrant les actions concrètes prises suite aux retours patients.'
      }
    ],
    questions: [
      {
        id: 'q1',
        label: 'À quelle fréquence réalisez-vous des enquêtes de satisfaction ?',
        type: 'choix',
        options: ['Après chaque prestation', 'Trimestrielle', 'Semestrielle', 'Annuelle', 'Pas encore en place'],
        requis: true,
        aide: 'Une fois par an minimum est requis. Après chaque installation est idéal.'
      },
      {
        id: 'q2',
        label: 'Comment distribuez-vous le questionnaire de satisfaction ?',
        type: 'choix',
        options: ['Papier lors de la livraison', 'Email', 'SMS avec lien', 'En ligne', 'Téléphone'],
        requis: true
      },
      {
        id: 'q3',
        label: 'Quel est votre taux de retour habituel ?',
        type: 'texte',
        requis: false,
        aide: 'Un taux de retour faible peut être un problème pour l\'inspecteur — montrez que vous relancez les patients.'
      },
      {
        id: 'q4',
        label: 'Avez-vous pris des actions d\'amélioration suite aux retours patients ?',
        type: 'oui_non',
        requis: true,
        aide: 'Sans action corrective documentée, le critère ne sera pas validé même si vous avez des enquêtes.'
      }
    ],
    registre: null,
    conseil_nora: 'Le piège classique : avoir le questionnaire mais pas les résultats compilés. Créez un tableau Excel annuel avec les résultats et les actions prises — c\'est ce que l\'inspecteur demande.'
  },

  // ─────────────────────────────────────────────
  // 1.3.2 — Gestion des réclamations
  // ─────────────────────────────────────────────
  '1.3.2': {
    code: '1.3.2',
    inspecteur: "L'inspecteur va demander à voir votre registre des réclamations. Il compte les réclamations, vérifie que chacune a eu une réponse dans un délai raisonnable, et que vous avez analysé les causes pour éviter les récidives.",
    contexte: "Une réclamation non traitée ou sans réponse est le signal d'alarme le plus fort pour un inspecteur. Il s'attend à trouver un registre avec des réclamations réelles — si vous n'en avez aucune depuis 2 ans, il sera suspicieux.",
    preuves: [
      {
        code: 'REGISTRE-RECLAMATIONS',
        label: 'Registre des réclamations',
        type: 'registre',
        description: 'Journal de toutes les réclamations reçues avec date, nature, réponse apportée et délai.'
      },
      {
        code: 'PROC-RECLAMATIONS',
        label: 'Procédure de gestion des réclamations',
        type: 'genere',
        description: 'Document décrivant le processus de réception, traitement et réponse aux réclamations.'
      },
      {
        code: 'ANALYSE-RECLAMATIONS',
        label: 'Analyse annuelle des réclamations',
        type: 'upload',
        description: 'Synthèse annuelle des types de réclamations et actions préventives mises en place.'
      }
    ],
    questions: [
      {
        id: 'q1',
        label: 'Comment les patients peuvent-ils vous adresser une réclamation ?',
        type: 'multiple',
        options: ['Par téléphone', 'Par email', 'Par courrier', 'En magasin', 'Via un formulaire en ligne'],
        requis: true,
        aide: 'Plus les canaux sont accessibles, mieux c\'est pour l\'inspecteur.'
      },
      {
        id: 'q2',
        label: 'Dans quel délai répondez-vous aux réclamations ?',
        type: 'choix',
        options: ['Moins de 48h', 'Dans la semaine', 'Dans le mois', 'Pas de délai défini'],
        requis: true,
        aide: 'Un délai défini et respecté est essentiel. 10 jours ouvrés est une bonne pratique.'
      },
      {
        id: 'q3',
        label: 'Tenez-vous un registre des réclamations ?',
        type: 'oui_non',
        requis: true,
        aide: 'Le registre dans MediReg peut servir de registre officiel pour l\'inspecteur.'
      },
      {
        id: 'q4',
        label: 'Faites-vous une analyse annuelle de vos réclamations ?',
        type: 'oui_non',
        requis: true,
        aide: 'Sans analyse, l\'inspecteur considère que vous ne cherchez pas à vous améliorer.'
      }
    ],
    registre: 'reclamations',
    conseil_nora: 'Commencez à remplir le registre dès maintenant même avec zéro réclamation — notez la date de mise en place. Un registre vide avec une date récente est mieux qu\'un registre inexistant.'
  }
}

export default CRITERES_CONFIG