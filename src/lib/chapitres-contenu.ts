// Textes de présentation des chapitres et des thèmes du référentiel PSDM.
// Ce fichier ne contient que du texte : il peut être relu et corrigé sans toucher au reste du code.
// Un thème absent de THEMES s'affiche simplement « Thème 2.6 ».

export type ContenuChapitre = {
  label: string
  description: string
  auditeur: string[] // ce que l'auditeur regarde en priorité
}

export const CONTENU_CHAPITRES: Record<string, ContenuChapitre> = {
  '1': {
    label: 'Éthique, droits et satisfaction',
    description:
      "Ce chapitre vérifie que le patient reste au centre de la prestation : il choisit librement son prestataire, il est informé clairement, il donne son consentement, sa dignité et la confidentialité de ses données sont respectées. Il couvre aussi l'écoute du patient : mesure de sa satisfaction et traitement de ses réclamations.",
    auditeur: [
      'La preuve que le patient a choisi son prestataire librement',
      "L'information remise au patient et son consentement",
      'Le recueil de la satisfaction et le suivi des réclamations',
    ],
  },
  '2': {
    label: 'Distribution et réalisation',
    description:
      "C'est le cœur de la prestation. Ce chapitre suit le matériel de la prescription jusqu'à la fin de la prise en charge : réception de la prescription, livraison et installation au domicile, formation du patient et de ses aidants, suivi, maintenance, dépannage, puis reprise du matériel.",
    auditeur: [
      'La traçabilité de chaque prescription et de chaque livraison',
      'Les maintenances réalisées et la continuité du service en cas de panne',
      'Les reprises de matériel et leur désinfection',
    ],
  },
  '3': {
    label: 'Fonctions support',
    description:
      "Ce chapitre porte sur l'organisation qui rend la prestation possible : des salariés compétents, formés et habilités, des locaux et des véhicules adaptés, du matériel bien stocké et un système d'information fiable.",
    auditeur: [
      'Les compétences, formations et habilitations de chaque salarié',
      'Les conditions de stockage et de transport du matériel',
      "La sécurité des données et du système d'information",
    ],
  },
  '4': {
    label: 'Qualité et risques',
    description:
      "Ce chapitre vérifie que vous pilotez une démarche qualité réelle : les risques sont identifiés, les événements indésirables déclarés et analysés, la matériovigilance suivie, et les actions d'amélioration mises en œuvre et évaluées.",
    auditeur: [
      'Le registre des événements indésirables et leur analyse',
      'Le suivi de la matériovigilance',
      "Les plans d'actions et la preuve qu'ils sont suivis",
    ],
  },
}

// Noms des thèmes (deux premiers niveaux du code). Proposés à partir des critères connus : À FAIRE RELIRE.
export const THEMES: Record<string, string> = {
  '1.2': "Droits de l'usager",
  '1.3': 'Satisfaction et réclamations',
  '2.2': 'Prescription et prise en charge',
  '2.3': 'Livraison et installation',
  '2.4': 'Suivi et maintenance',
  '2.5': 'Fin de prestation et reprise',
}

export const nomTheme = (theme: string) => (THEMES[theme] ? `${theme} · ${THEMES[theme]}` : `Thème ${theme}`)
