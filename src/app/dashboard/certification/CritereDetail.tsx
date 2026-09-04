'use client'

import { useState, useEffect, useRef } from 'react'
import DocumentEditor from './DocumentEditor'
import MeditrackWidget from './MeditrackWidget'
import { createClient } from '@/lib/supabase'

// ─────────────────────────────────────────────────────────────
// CONFIG CRITÈRES — Ce que l'inspecteur cherche + preuves + questions
// ─────────────────────────────────────────────────────────────
const CRITERES_CONFIG: Record<string, {
  inspecteur: string
  contexte: string
  conseil?: string
  preuves: { code?: string; label: string; description: string; type: 'generer' | 'upload' | 'registre' | 'attester'; mention?: string }[]
  questions: { id: string; label: string; type: 'choix' | 'texte' | 'oui_non' | 'multiple'; options?: string[]; aide?: string; requis?: boolean }[]
  registre?: 'remises' | 'reclamations' | 'evenements_indesirables' | null
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
    conseil: "⭐ LA PREUVE CLÉ : le devis signé par le patient. Sans devis signé, ce critère ne peut pas être validé même si vous avez tous les autres documents. Conservez-les dans votre logiciel métier — l'inspecteur peut en demander un à la minute.",
    preuves: [
      { label: "⭐ Attestation de remise systématique des devis", description: "PREUVE PRINCIPALE — Confirmez que vous remettez systématiquement un devis signé avant chaque livraison. Les devis réels restent dans votre logiciel métier (confidentialité patient).", type: 'attester', mention: 'principal' },
      { code: 'USA-DOC-01', label: "Charte éthique et information usager", description: "Complément documentaire — présente les tarifs, remboursements et droits du patient.", type: 'generer' },
      { code: 'USA-INFO-01', label: "Notice d'information patient", description: "Complément documentaire — notice complète sur les produits et prestations.", type: 'generer' },
    ],
    questions: [
      { id: 'q1', label: "Remettez-vous systématiquement un devis avant la livraison ?", type: 'oui_non', requis: true, aide: "Le devis signé est la preuve principale pour ce critère." },
      { id: 'q2', label: "Comment informez-vous le patient du reste à charge ?", type: 'choix', options: ["Sur le devis", "À l'oral lors de la livraison", "Par courrier/email", "Pas de procédure formelle"], requis: true },
      { id: 'q3', label: "Vos livreurs/techniciens sont-ils formés pour expliquer le fonctionnement du matériel ?", type: 'oui_non', requis: true, aide: "L'inspecteur peut interroger votre personnel sur ce point." },
    ],
    registre: 'remises'
  },
  '1.2.3': {
    inspecteur: "L'inspecteur va chercher à comprendre comment vous formez votre personnel à la bientraitance. Il peut demander à voir le programme de formation et s'entretenir avec vos salariés directement.",
    contexte: "Vos techniciens interviennent au domicile de personnes vulnérables. L'inspecteur s'assure qu'ils respectent l'intimité, ne font pas de commentaires déplacés, et agissent avec bienveillance.",
    conseil: "Beaucoup de PSDM ont des pratiques correctes mais rien d'écrit. La procédure bientraitance et l'attestation de sensibilisation sont les deux documents clés pour valider ce critère.",
    preuves: [
      { code: 'PROC-BIENTRAITANCE', label: "⭐ Procédure bientraitance et dignité", description: "PREUVE PRINCIPALE — Procédure interne définissant les comportements attendus de vos collaborateurs au domicile des patients.", type: 'generer', mention: 'principal' },
      { code: 'FORM-BIENTRAITANCE', label: "Attestation de sensibilisation bientraitance", description: "Attestation que l'ensemble du personnel a été sensibilisé à la bientraitance.", type: 'generer' },
    ],
    questions: [
      { id: 'q1', label: "Avez-vous une procédure écrite sur la bientraitance ?", type: 'oui_non', requis: true, aide: "Une page suffit — l'essentiel est qu'elle existe et que le personnel la connaisse." },
      { id: 'q2', label: "Vos employés ont-ils reçu une formation ou sensibilisation à la bientraitance ?", type: 'oui_non', requis: true, aide: "Une sensibilisation interne compte. Notez la date et les participants." },
      { id: 'q3', label: "Comment gérez-vous un signalement de maltraitance d'un patient ?", type: 'texte', aide: "Décrivez votre procédure de remontée d'information en interne." },
    ],
    registre: null
  },
  '1.2.4': {
    inspecteur: "L'inspecteur va vérifier que le patient signe ou valide explicitement chaque étape de la prestation — livraison, installation, modification du matériel. Un bon de livraison signé est la preuve minimale.",
    contexte: "Vous ne pouvez pas modifier le matériel d'un patient, faire une livraison supplémentaire ou changer une prestation sans son accord explicite.",
    conseil: "Le bon de livraison signé couvre souvent ce critère. L'attestation d'installation que vous générez ici sert de modèle — le patient signe la version papier que vous conservez dans votre logiciel métier.",
    preuves: [
      { label: "⭐ Attestation de recueil systématique du consentement", description: "PREUVE PRINCIPALE — Confirmez que vous faites systématiquement signer vos bons de livraison. Les originaux restent dans votre logiciel métier (confidentialité patient).", type: 'attester', mention: 'principal' },
      { code: 'PRESTA-DOC-01', label: "Modèle d'attestation d'installation", description: "Modèle VIERGE à imprimer et faire signer par le patient lors de chaque installation. Le document signé avec le nom du patient reste dans votre logiciel métier — ne jamais l'uploader dans MediReg.", type: 'generer' },
    ],
    questions: [
      { id: 'q1', label: "Faites-vous signer vos bons de livraison par le patient ?", type: 'oui_non', requis: true, aide: "C'est la preuve de consentement la plus simple et la plus acceptée par les inspecteurs." },
      { id: 'q2', label: "Comment gérez-vous les cas où le patient ne peut pas signer ?", type: 'texte', aide: "Un représentant légal peut signer à sa place. Documentez cette procédure." },
      { id: 'q3', label: "Avez-vous une procédure pour les modifications ou avenants de prestation ?", type: 'oui_non', requis: true, aide: "Tout changement de matériel ou de prestation doit être consenti." },
    ],
    registre: 'remises'
  },
  '1.2.5': {
    inspecteur: "L'inspecteur va vérifier que vous avez un registre des traitements RGPD, une politique de confidentialité écrite, et que votre personnel a été sensibilisé. Il peut demander à voir ces documents et interroger vos collaborateurs.",
    contexte: "Vous traitez des données médicales sensibles. Le RGPD impose un registre des traitements, une politique de confidentialité, et des mesures de sécurité. L'inspecteur HAS vérifie que vous êtes conformes.",
    conseil: "Le registre des traitements RGPD effraie beaucoup de PSDM mais MediReg vous en génère un prérempli. L'attestation de sensibilisation est souvent oubliée — c'est pourtant ce que l'inspecteur demande en premier.",
    preuves: [
      { code: 'POLITIQUE-CONFIDENTIALITE', label: "⭐ Politique de confidentialité et RGPD", description: "PREUVE PRINCIPALE — Document officiel décrivant comment vous protégez les données de vos patients.", type: 'generer', mention: 'principal' },
      { code: 'REGISTRE-TRAITEMENTS', label: "Registre des activités de traitement", description: "Document obligatoire RGPD — liste tous vos traitements de données avec les bases légales et durées de conservation.", type: 'generer' },
      { code: 'ATTEST-RGPD', label: "Attestation de sensibilisation RGPD du personnel", description: "Attestation que votre équipe a été formée à la protection des données patients.", type: 'generer' },
    ],
    questions: [
      { id: 'q1', label: "Avez-vous nommé un DPO ou référent RGPD ?", type: 'oui_non', aide: "Obligatoire si vous traitez des données de santé à grande échelle. Pour une petite structure, un référent interne suffit." },
      { id: 'q2', label: "Votre registre des traitements RGPD est-il à jour ?", type: 'oui_non', requis: true, aide: "Le registre des traitements est obligatoire pour toute entreprise traitant des données personnelles." },
      { id: 'q3', label: "Comment sont protégées les données patients dans votre logiciel métier ?", type: 'choix', options: ["Accès par mot de passe individuel", "Accès partagé par l'équipe", "Données sur papier uniquement", "Autre"], requis: true },
      { id: 'q4', label: "Vos données sont-elles sauvegardées régulièrement ?", type: 'oui_non', requis: true },
    ],
    registre: null
  },
  '1.3.1': {
    inspecteur: "L'inspecteur va demander à voir vos enquêtes de satisfaction — pas juste le formulaire vide, mais les résultats et ce que vous en avez fait. Il cherche une démarche d'amélioration continue. Il peut demander les résultats des 12 derniers mois.",
    contexte: "Ce critère oblige à écouter vraiment vos patients et à améliorer vos pratiques. Sans résultats compilés et sans actions d'amélioration documentées, ce critère ne peut pas être validé.",
    conseil: "Le piège classique : avoir le questionnaire mais pas les résultats compilés. Le rapport annuel de satisfaction est ce que l'inspecteur demande — MediReg vous en génère un modèle à compléter.",
    preuves: [
      { code: 'QR-DOC-01', label: "⭐ Questionnaire de satisfaction usager", description: "PREUVE 1 — Formulaire de satisfaction adapté à l'activité PSDM. À remettre régulièrement à vos patients.", type: 'generer', mention: 'principal' },
      { code: 'RAPPORT-SATISFACTION', label: "⭐ Rapport annuel de satisfaction", description: "PREUVE 2 — Synthèse des résultats et actions d'amélioration. C'est ce que l'inspecteur demande à voir.", type: 'generer', mention: 'principal' },
    ],
    questions: [
      { id: 'q1', label: "À quelle fréquence réalisez-vous des enquêtes de satisfaction ?", type: 'choix', options: ["Après chaque prestation", "Trimestrielle", "Semestrielle", "Annuelle", "Pas encore en place"], requis: true, aide: "Une fois par an minimum est requis." },
      { id: 'q2', label: "Comment distribuez-vous le questionnaire de satisfaction ?", type: 'choix', options: ["Papier lors de la livraison", "Email", "SMS avec lien", "En ligne", "Téléphone"], requis: true },
      { id: 'q3', label: "Avez-vous pris des actions d'amélioration suite aux retours patients ?", type: 'oui_non', requis: true, aide: "Sans action corrective documentée, le critère ne sera pas validé." },
    ],
    registre: null
  },
  '1.3.2': {
    inspecteur: "L'inspecteur va demander à voir votre registre des réclamations. Il compte les réclamations, vérifie que chacune a eu une réponse dans un délai raisonnable, et que vous avez analysé les causes pour éviter les récidives.",
    contexte: "Une réclamation non traitée est le signal d'alarme le plus fort pour un inspecteur. Si vous n'avez aucune réclamation depuis 2 ans, il sera suspicieux — toute entreprise reçoit des réclamations.",
    conseil: "Commencez à remplir le registre dès maintenant. Un registre vide avec une date de mise en place récente vaut mieux qu'un registre inexistant.",
    preuves: [
      { code: 'PROC-RECLAMATIONS', label: "⭐ Procédure de gestion des réclamations", description: "PREUVE PRINCIPALE — Document officiel décrivant comment vous recevez, traitez et répondez aux réclamations.", type: 'generer', mention: 'principal' },
      { label: "Registre des réclamations MediReg", description: "Le registre ci-dessous trace chaque réclamation avec sa réponse et son statut. C'est la preuve vivante de votre processus.", type: 'registre' },
    ],
    questions: [
      { id: 'q1', label: "Comment les patients peuvent-ils vous adresser une réclamation ?", type: 'multiple', options: ["Par téléphone", "Par email", "Par courrier", "En agence", "Via un formulaire en ligne"], requis: true },
      { id: 'q2', label: "Dans quel délai répondez-vous aux réclamations ?", type: 'choix', options: ["Moins de 48h", "Dans la semaine", "Dans les 10 jours ouvrés", "Pas de délai défini"], requis: true, aide: "10 jours ouvrés est la bonne pratique HAS." },
      { id: 'q3', label: "Faites-vous une analyse annuelle de vos réclamations ?", type: 'oui_non', requis: true },
    ],
    registre: 'reclamations'
  },
  '2.1.1': {
    inspecteur: "L'inspecteur va verifier que vos patients peuvent facilement vous joindre — par telephone, email, en agence. Il peut tester lui-meme en appelant votre numero.",
    contexte: "Un patient qui ne peut pas vous joindre rapidement en cas de probleme est un risque. L'inspecteur verifie que vous avez des horaires clairs et des canaux accessibles.",
    conseil: "Affichez clairement vos horaires sur tous vos supports. Si vous avez un repondeur hors horaires, assurez-vous de rappeler dans les 24h.",
    preuves: [
      { code: 'PROC-ACCESSIBILITE', label: "Procedure d'accessibilite et d'accueil", description: "Document officiel decrivant vos horaires, canaux de contact et delais de reponse.", type: 'generer' as const, mention: 'principal' },
    ],
    questions: [
      { id: 'q1', label: "Quels sont vos horaires d'ouverture ?", type: 'texte' as const, requis: true, aide: "Precisez les horaires telephoniques et d'accueil en agence." },
      { id: 'q2', label: "Comment gerez-vous les appels en dehors des horaires ?", type: 'choix' as const, options: ["Repondeur avec rappel sous 24h", "Astreinte telephonique", "Redirection vers un autre numero", "Pas de prise en charge hors horaires"], requis: true },
      { id: 'q3', label: "Quel est votre delai moyen de reponse aux emails ?", type: 'choix' as const, options: ["Moins de 4h", "Sous 24h", "Sous 48h", "Pas de delai defini"], requis: true },
    ],
    registre: null
  },
  '2.1.2': {
    inspecteur: "L'inspecteur va verifier que le patient peut facilement s'informer sur vos activites — site web, plaquette, affichage en agence.",
    contexte: "Le patient doit pouvoir connaitre vos prestations, vos tarifs et vos zones d'intervention avant meme de vous contacter.",
    conseil: "Une simple plaquette ou une page web claire suffit. L'essentiel est que l'information soit accessible et a jour.",
    preuves: [
      { code: 'INFO-ACTIVITES', label: "Document d'information sur les activites", description: "Presentation de vos activites, prestations et zone d'intervention.", type: 'generer' as const, mention: 'principal' },
    ],
    questions: [
      { id: 'q1', label: "Comment informez-vous les patients sur vos activites ?", type: 'multiple' as const, options: ["Site internet", "Plaquette papier", "Affichage en agence", "Reseaux sociaux", "Bouche a oreille uniquement"], requis: true },
      { id: 'q2', label: "Votre information sur les tarifs et remboursements est-elle disponible ?", type: 'oui_non' as const, requis: true },
      { id: 'q3', label: "Votre zone d'intervention est-elle clairement definie et communiquee ?", type: 'oui_non' as const, requis: true },
    ],
    registre: null
  },
  '2.1.3': {
    inspecteur: "L'inspecteur va verifier que vous avez pense aux patients handicapes ou en situation de vulnerabilite — acces en fauteuil, livraison a domicile, interlocuteur dedie.",
    contexte: "Vos patients sont souvent des personnes agees ou handicapees. L'inspecteur verifie que vous ne creez pas de barriere a l'acces a vos services.",
    conseil: "Si vos locaux ne sont pas accessibles, ce n'est pas un probleme a condition d'avoir des alternatives comme le rendez-vous a domicile.",
    preuves: [
      { code: 'PROC-HANDICAP', label: "Procedure d'acces pour personnes handicapees", description: "Document decrivant vos dispositions pour faciliter l'acces aux personnes en situation de handicap.", type: 'generer' as const, mention: 'principal' },
    ],
    questions: [
      { id: 'q1', label: "Vos locaux sont-ils accessibles aux personnes en fauteuil roulant ?", type: 'oui_non' as const, requis: true },
      { id: 'q2', label: "Proposez-vous des rendez-vous a domicile pour les patients ne pouvant pas se deplacer ?", type: 'oui_non' as const, requis: true },
      { id: 'q3', label: "Avez-vous un interlocuteur dedie pour les situations particulieres ?", type: 'oui_non' as const, requis: true },
    ],
    registre: null
  },
  '2.3.2': {
    inspecteur: "L'inspecteur va vérifier que chaque installation est conforme à la prescription et que le patient a été formé. Il peut demander à voir vos bons de livraison ou votre registre d'installations.",
    contexte: "Vous devez prouver que chaque matériel installé correspond à une prescription valide et que le patient a été formé à son utilisation.",
    conseil: "MediTrack est votre registre d'installations — chaque livraison tracée prouve que l'installation a été réalisée. L'attestation de formation patient complète cette preuve.",
    preuves: [
      { code: 'ATTEST-LIVRAISONS', label: "⭐ Attestation de traçabilité des installations", description: "PREUVE PRINCIPALE — Atteste que vous utilisez MediTrack pour tracer chaque installation et que vous formez systématiquement le patient.", type: 'generer', mention: 'principal' },
      { code: 'PRESTA-DOC-01', label: "Modèle d'attestation d'installation", description: "Modèle vierge à faire signer par le patient — à conserver dans votre logiciel métier.", type: 'generer' },
    ],
    questions: [
      { id: 'q1', label: "Vérifiez-vous que le matériel installé est conforme à la prescription ?", type: 'oui_non', requis: true },
      { id: 'q2', label: "Formez-vous systématiquement le patient à l'utilisation du matériel lors de l'installation ?", type: 'oui_non', requis: true, aide: "L'inspecteur peut interroger vos techniciens sur ce point." },
      { id: 'q3', label: "Utilisez-vous MediTrack pour tracer vos installations ?", type: 'oui_non', requis: true, aide: "Si oui, votre registre MediTrack constitue la preuve principale." },
    ],
    registre: null
  },
  '2.3.3': {
    inspecteur: "L'inspecteur va vérifier que vos techniciens forment réellement le patient et son entourage lors de chaque installation.",
    contexte: "La formation patient est obligatoire — le patient doit savoir utiliser son matériel en toute sécurité.",
    conseil: "L'attestation de livraison signée par le patient peut inclure une case 'formation dispensée' — c'est la preuve la plus simple.",
    preuves: [
      { code: 'ATTEST-LIVRAISONS', label: "Attestation de formation patient systématique", description: "Confirme que vos techniciens forment chaque patient lors de l'installation.", type: 'generer' },
    ],
    questions: [
      { id: 'q1', label: "Vos techniciens sont-ils formés pour expliquer le fonctionnement du matériel ?", type: 'oui_non', requis: true },
      { id: 'q2', label: "La formation patient est-elle notée dans votre logiciel métier ou bon de livraison ?", type: 'oui_non', requis: true },
      { id: 'q3', label: "Formez-vous également les professionnels de santé libéraux si nécessaire ?", type: 'oui_non' },
    ],
    registre: null
  },
  '2.3.4': {
    inspecteur: "L'inspecteur vérifie que vous informez les autres professionnels de santé intervenant au domicile sur l'utilisation du matériel.",
    contexte: "Les infirmières, kinés et autres intervenants au domicile doivent savoir utiliser ou interagir avec le matériel que vous avez installé.",
    conseil: "Une simple note dans le dossier patient confirmant l'information aux intervenants suffit souvent.",
    preuves: [
      { code: 'ATTEST-LIVRAISONS', label: "Attestation de formation des professionnels de santé", description: "Confirme que vous informez les autres intervenants au domicile.", type: 'generer' },
    ],
    questions: [
      { id: 'q1', label: "Contactez-vous les autres professionnels de santé intervenant au domicile ?", type: 'oui_non', requis: true },
      { id: 'q2', label: "Comment transmettez-vous les informations sur le matériel aux autres intervenants ?", type: 'choix', options: ["Par téléphone", "Par courrier/email", "Via le dossier patient partagé", "En direct lors de l'installation", "Pas de procédure formelle"], requis: true },
    ],
    registre: null
  },
  '2.4.1': {
    inspecteur: "L'inspecteur va vérifier que vous réalisez des visites de suivi selon les modalités réglementaires pour votre activité.",
    contexte: "Certaines activités imposent des suivis réguliers — oxygène, nutrition, VNI par exemple. L'inspecteur vérifie que ces suivis sont réalisés et tracés.",
    conseil: "MediTrack trace vos maintenances et suivis — c'est votre registre de preuve.",
    preuves: [
      { code: 'ATTEST-MAINTENANCE', label: "Attestation de traçabilité des suivis", description: "Confirme que vos suivis sont tracés dans MediTrack conformément à la réglementation.", type: 'generer' },
    ],
    questions: [
      { id: 'q1', label: "Réalisez-vous des visites de suivi régulières pour vos patients ?", type: 'oui_non', requis: true },
      { id: 'q2', label: "Ces suivis sont-ils tracés dans votre logiciel métier ?", type: 'oui_non', requis: true },
      { id: 'q3', label: "Respectez-vous les délais de suivi imposés par la LPP pour vos activités ?", type: 'oui_non', requis: true },
    ],
    registre: null
  },
  '2.4.2': {
    inspecteur: "L'inspecteur va vérifier que vous avez une astreinte 24h/24 — 7j/7 si vos activités le nécessitent (oxygène, VNI, nutrition).",
    contexte: "Pour certaines activités à risque vital, l'astreinte est obligatoire. L'inspecteur peut appeler votre numéro d'astreinte pour tester.",
    conseil: "Si vous avez déclaré une astreinte dans votre profil, MediReg l'a automatiquement intégrée dans vos documents.",
    preuves: [
      { code: 'PROC-ACCESSIBILITE', label: "Procédure d'accessibilité avec numéro d'astreinte", description: "Inclut votre numéro d'astreinte et vos modalités de prise en charge urgente.", type: 'generer' },
    ],
    questions: [
      { id: 'q1', label: "Disposez-vous d'une astreinte téléphonique 24h/24 — 7j/7 ?", type: 'oui_non', requis: true },
      { id: 'q2', label: "Ce numéro est-il communiqué à vos patients dès la première installation ?", type: 'oui_non', requis: true },
      { id: 'q3', label: "Quel est le délai d'intervention en cas d'urgence ?", type: 'choix', options: ["Moins de 4h", "Moins de 8h", "Sous 24h", "Délai non défini"], requis: true },
    ],
    registre: null
  },
  '2.4.3': {
    inspecteur: "L'inspecteur va vérifier que vous assurez la réparation ou le remplacement du matériel en cas de panne dans les délais conformes à la LPP.",
    contexte: "Une panne de matériel médical peut mettre en danger le patient. L'inspecteur vérifie que vous avez une procédure SAV rapide et efficace.",
    conseil: "MediTrack est votre preuve SAV — chaque maintenance curative tracée prouve que vous gérez les pannes. L'attestation complète cette preuve.",
    preuves: [
      { code: 'ATTEST-MAINTENANCE', label: "⭐ Attestation de traçabilité des maintenances SAV", description: "PREUVE PRINCIPALE — Atteste que vous utilisez MediTrack pour tracer chaque maintenance et dépannage.", type: 'generer', mention: 'principal' },
    ],
    questions: [
      { id: 'q1', label: "Disposez-vous d'un stock de matériel de remplacement pour les pannes urgentes ?", type: 'oui_non', requis: true },
      { id: 'q2', label: "Dans quel délai remplacez-vous un matériel en panne ?", type: 'choix', options: ["Sous 4h", "Sous 24h", "Sous 48h", "Délai variable selon l'urgence"], requis: true },
      { id: 'q3', label: "Utilisez-vous MediTrack pour tracer vos interventions SAV ?", type: 'oui_non', requis: true },
    ],
    registre: null
  },
  '2.4.4': {
    inspecteur: "L'inspecteur vérifie que vous pouvez assurer la continuité du service si vous ne pouvez pas intervenir vous-même sur une zone.",
    contexte: "Si un patient déménage ou si vous ne couvrez pas une zone, vous devez pouvoir l'orienter vers un prestataire partenaire.",
    conseil: "Un accord de partenariat avec un autre PSDM sur votre territoire suffit pour valider ce critère.",
    preuves: [
      { label: "Accord de partenariat avec un prestataire partenaire", description: "Convention signée avec un autre PSDM pour assurer la continuité en cas de besoin.", type: 'upload' },
    ],
    questions: [
      { id: 'q1', label: "Avez-vous des accords avec d'autres prestataires pour la continuité territoriale ?", type: 'oui_non', requis: true },
      { id: 'q2', label: "Quelle est votre zone d'intervention principale ?", type: 'texte', requis: true },
    ],
    registre: null
  },
  '2.4.5': {
    inspecteur: "L'inspecteur vérifie que vous transmettez les informations pertinentes au prescripteur et aux autres professionnels de santé si nécessaire.",
    contexte: "La coordination entre le PSDM et les professionnels de santé est essentielle pour la qualité des soins.",
    conseil: "Un simple email au médecin pour signaler un problème avec le matériel ou un changement de situation suffit comme preuve.",
    preuves: [
      { label: "Exemples de retours d'information aux prescripteurs (anonymisés)", description: "Courriers, emails ou notes documentant vos échanges avec les prescripteurs.", type: 'upload' },
    ],
    questions: [
      { id: 'q1', label: "Contactez-vous le prescripteur en cas de problème avec le matériel ou le patient ?", type: 'oui_non', requis: true },
      { id: 'q2', label: "Tracez-vous ces échanges dans votre logiciel métier ?", type: 'oui_non', requis: true },
    ],
    registre: null
  },
  '2.4.6': {
    inspecteur: "L'inspecteur vérifie que vous participez à la coordination des soins — plan personnalisé de santé, réunions pluridisciplinaires si applicable.",
    contexte: "Pour les patients complexes, vous devez participer aux réunions de coordination avec les autres professionnels de santé.",
    conseil: "Ce critère ne s'applique pas à tous les PSDM — vérifiez si vos activités l'imposent.",
    preuves: [
      { label: "Attestation de participation aux coordinations de soins", description: "Compte-rendu de réunion ou courrier confirmant votre participation.", type: 'upload' },
    ],
    questions: [
      { id: 'q1', label: "Participez-vous à des réunions de coordination pluridisciplinaires ?", type: 'oui_non' },
      { id: 'q2', label: "Ce critère s'applique-t-il à vos activités ?", type: 'oui_non', requis: true },
    ],
    registre: null
  },
  '2.5.1': {
    inspecteur: "L'inspecteur va vérifier que vous reprenez le matériel en location en fin de prestation dans des conditions adaptées — délais, état du matériel, traçabilité.",
    contexte: "Une reprise de matériel non tracée peut créer des problèmes de facturation et de sécurité. L'inspecteur vérifie que vous avez une procédure claire.",
    conseil: "MediTrack trace chaque reprise — c'est votre registre de preuve. L'attestation formalise votre engagement.",
    preuves: [
      { code: 'ATTEST-REPRISES', label: "⭐ Attestation de traçabilité des reprises", description: "PREUVE PRINCIPALE — Atteste que vous utilisez MediTrack pour tracer chaque reprise de matériel.", type: 'generer', mention: 'principal' },
    ],
    questions: [
      { id: 'q1', label: "Tracez-vous chaque reprise de matériel dans votre logiciel ?", type: 'oui_non', requis: true },
      { id: 'q2', label: "Dans quel délai reprenez-vous le matériel après la fin de la prestation ?", type: 'choix', options: ["Sous 48h", "Dans la semaine", "Dans le mois", "Selon les cas"], requis: true },
      { id: 'q3', label: "Vérifiez-vous l'état du matériel lors de la reprise ?", type: 'oui_non', requis: true },
    ],
    registre: null
  },
  '2.5.2': {
    inspecteur: "L'inspecteur va vérifier que vous avez une procédure pour arrêter la facturation dès la fin de la prestation.",
    contexte: "Facturer après la fin d'une prestation est une fraude. L'inspecteur vérifie que vous avez une procédure pour éviter ça.",
    conseil: "La mise à jour du statut dans MediTrack (matériel 'retiré') déclenche l'arrêt de facturation dans votre logiciel métier.",
    preuves: [
      { code: 'ATTEST-REPRISES', label: "Attestation de traçabilité des fins de prestation", description: "La reprise tracée dans MediTrack déclenche l'arrêt de facturation.", type: 'generer' },
    ],
    questions: [
      { id: 'q1', label: "Avez-vous une procédure formelle pour arrêter la facturation en fin de prestation ?", type: 'oui_non', requis: true },
      { id: 'q2', label: "Comment déclenchez-vous l'arrêt de facturation ?", type: 'choix', options: ["Mise à jour logiciel métier à la reprise", "Notification manuelle à la facturation", "Automatiquement via le logiciel", "Pas de procédure formelle"], requis: true },
    ],
    registre: null
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
  '3.1.1': {
    inspecteur: "L'inspecteur va demander l'organigramme et les fiches de poste.",
    contexte: "Un PSDM sans organigramme clair est un signal d'alarme. Il cherche une organisation formalisee avec des responsabilites definies.",
    conseil: "Le module RH de MediReg vous permet de definir les postes et competences de chaque collaborateur.",
    preuves: [
      { label: "Organigramme de l'entreprise", description: "Schema montrant la hierarchie et les liens entre les postes.", type: 'upload' as const },
    ],
    questions: [
      { id: 'q1', label: "Avez-vous un organigramme a jour ?", type: 'oui_non' as const, requis: true },
      { id: 'q2', label: "Chaque collaborateur a-t-il une fiche de poste ?", type: 'oui_non' as const, requis: true },
    ],
    registre: null
  },
  '3.1.2': {
    inspecteur: "L'inspecteur va verifier que vos collaborateurs ont les competences requises pour leurs missions.",
    contexte: "Un technicien qui installe du materiel medical sans formation adaptee est un risque pour le patient.",
    conseil: "Renseignez les competences de chaque collaborateur dans le module RH.",
    preuves: [
      { label: "Copies des diplomes et certifications", description: "Diplomes et habilitations des collaborateurs.", type: 'upload' as const },
    ],
    questions: [
      { id: 'q1', label: "Verifiez-vous les competences de vos collaborateurs a l'embauche ?", type: 'oui_non' as const, requis: true },
      { id: 'q2', label: "Les competences sont-elles adaptees a vos activites ?", type: 'oui_non' as const, requis: true },
    ],
    registre: null
  },
  '3.1.3': {
    inspecteur: "L'inspecteur va demander votre plan de formation et les attestations des formations realisees.",
    contexte: "La formation continue est obligatoire pour les professionnels de sante.",
    conseil: "Le journal des formations dans le module RH est votre preuve principale.",
    preuves: [
      { label: "Attestations de formations realisees", description: "Certificats et attestations de participation.", type: 'upload' as const },
    ],
    questions: [
      { id: 'q1', label: "Avez-vous un plan de formation annuel ?", type: 'oui_non' as const, requis: true },
      { id: 'q2', label: "Vos professionnels de sante realisent-ils des DPC ?", type: 'oui_non' as const },
      { id: 'q3', label: "Gardez-vous les attestations des formations realisees ?", type: 'oui_non' as const, requis: true },
    ],
    registre: null
  },
  '3.1.4': {
    inspecteur: "L'inspecteur verifie que vous avez le personnel qualifie pour garantir le respect des bonnes pratiques.",
    contexte: "Vous devez avoir au moins une personne responsable du respect des regles professionnelles.",
    conseil: "Le Garant PSDM designe dans votre profil repond a cette exigence.",
    preuves: [
      { label: "Designation du Garant PSDM", description: "Document officialisant la designation du Garant PSDM.", type: 'upload' as const },
    ],
    questions: [
      { id: 'q1', label: "Avez-vous designe un Garant PSDM ?", type: 'oui_non' as const, requis: true },
      { id: 'q2', label: "Le Garant PSDM est-il qualifie pour vos activites ?", type: 'oui_non' as const, requis: true },
    ],
    registre: null
  },
  '3.1.5': {
    inspecteur: "L'inspecteur verifie que vous avez le personnel garant selon vos activites — pharmacien, infirmier, technicien.",
    contexte: "Certaines activites imposent la presence d'un professionnel de sante qualifie.",
    conseil: "Verifiez que votre pharmacien est bien renseigne dans votre profil et dans le module RH.",
    preuves: [
      { label: "Justificatifs du personnel garant", description: "Diplomes et inscriptions ordinales du personnel garant.", type: 'upload' as const },
    ],
    questions: [
      { id: 'q1', label: "Avez-vous les professionnels de sante requis pour vos activites ?", type: 'oui_non' as const, requis: true },
      { id: 'q2', label: "Ces professionnels sont-ils inscrits a leur ordre professionnel ?", type: 'oui_non' as const },
    ],
    registre: null
  },

  '3.2.1': {
    inspecteur: "L'inspecteur va visiter vos locaux et verifier la separation des circuits propre et sale.",
    contexte: "Un materiel propre qui cotoie un materiel sale est une faute grave.",
    conseil: "Documentez comment vous organisez la separation des flux dans votre espace de travail.",
    preuves: [
      { label: "Plan ou photos des locaux avec circuits identifies", description: "Schema ou photos montrant la separation propre/sale et les zones de stockage.", type: 'upload' as const },
    ],
    questions: [
      { id: 'q1', label: "Avez-vous une zone de stockage dediee au materiel propre ?", type: 'oui_non' as const, requis: true },
      { id: 'q2', label: "Le circuit propre et le circuit sale sont-ils clairement separes ?", type: 'oui_non' as const, requis: true },
      { id: 'q3', label: "Le materiel en attente de desinfection est-il identifie et isole ?", type: 'oui_non' as const, requis: true },
    ],
    registre: null
  },
  '3.2.2': {
    inspecteur: "L'inspecteur va verifier que vos locaux permettent d'accueillir les patients dans des conditions adaptees.",
    contexte: "Vos locaux doivent etre accessibles et offrir un espace d'accueil correct.",
    conseil: "Si vos locaux ne sont pas parfaitement accessibles, documentez les alternatives.",
    preuves: [
      { code: 'PROC-HANDICAP', label: "Procedure d'acces personnes handicapees", description: "Decrit les dispositions pour l'accueil des personnes en situation de handicap.", type: 'generer' as const },
    ],
    questions: [
      { id: 'q1', label: "Vos locaux sont-ils accessibles aux personnes en fauteuil roulant ?", type: 'oui_non' as const, requis: true },
      { id: 'q2', label: "Disposez-vous d'un espace d'accueil adapte ?", type: 'oui_non' as const, requis: true },
    ],
    registre: null
  },
  '3.2.3': {
    inspecteur: "L'inspecteur va verifier que vous avez un espace pour realiser des essais de materiel si necessaire.",
    contexte: "Pour certains materiels (fauteuils roulants, lits medicalises), des essais sont necessaires.",
    conseil: "Documentez comment vous gerez les essais chez le patient si c'est votre pratique.",
    preuves: [
      { label: "Description de l'espace d'essai ou procedure d'essai a domicile", description: "Document decrivant comment vous realisez les essais.", type: 'upload' as const },
    ],
    questions: [
      { id: 'q1', label: "Realisez-vous des essais de materiel ?", type: 'oui_non' as const, requis: true },
      { id: 'q2', label: "Les essais sont-ils realises en agence ou au domicile du patient ?", type: 'choix' as const, options: ["En agence", "Au domicile du patient", "Les deux selon les cas", "Pas d'essais necessaires"], requis: true },
    ],
    registre: null
  },
  '3.3.1': {
    inspecteur: "L'inspecteur va verifier l'hygiene generale de vos locaux.",
    contexte: "Des locaux sales ou desorganises sont un signal d'alarme immediat.",
    conseil: "Un planning de nettoyage affiche et renseigne suffit.",
    preuves: [
      { label: "Planning de nettoyage des locaux", description: "Tableau de bord du nettoyage avec frequences et responsables.", type: 'upload' as const },
    ],
    questions: [
      { id: 'q1', label: "Avez-vous un planning de nettoyage des locaux ?", type: 'oui_non' as const, requis: true },
      { id: 'q2', label: "Le nettoyage est-il trace ?", type: 'oui_non' as const, requis: true },
      { id: 'q3', label: "Qui est responsable de l'hygiene des locaux ?", type: 'texte' as const, requis: true },
    ],
    registre: null
  },
  '3.3.2': {
    inspecteur: "L'inspecteur va demander votre procedure de desinfection du materiel et le registre de tracabilite.",
    contexte: "La desinfection du materiel entre deux patients est une obligation absolue.",
    conseil: "Incluez la desinfection comme type de maintenance dans MediTrack pour une tracabilite automatique.",
    preuves: [
      { label: "Procedure de nettoyage et desinfection du materiel", description: "Document decrivant le processus de desinfection selon les types de materiels.", type: 'upload' as const },
      { label: "Registre de tracabilite des desinfections", description: "Registre des desinfections realisees.", type: 'upload' as const },
    ],
    questions: [
      { id: 'q1', label: "Avez-vous une procedure formalisee de desinfection du materiel ?", type: 'oui_non' as const, requis: true },
      { id: 'q2', label: "Tracez-vous chaque desinfection ?", type: 'oui_non' as const, requis: true },
      { id: 'q3', label: "Quel produit desinfectant utilisez-vous ?", type: 'texte' as const, requis: true },
    ],
    registre: null
  },
  '3.3.3': {
    inspecteur: "L'inspecteur va verifier que vous avez une procedure d'hygiene pour vos vehicules.",
    contexte: "Un vehicule qui transporte du materiel propre et du materiel sale est une source de contamination.",
    conseil: "Une simple procedure decrivant le nettoyage de vos vehicules suffit.",
    preuves: [
      { label: "Procedure de nettoyage des vehicules", description: "Document decrivant les mesures d'hygiene lors du transport.", type: 'upload' as const },
    ],
    questions: [
      { id: 'q1', label: "Avez-vous une procedure d'hygiene pour vos vehicules ?", type: 'oui_non' as const, requis: true },
      { id: 'q2', label: "Le materiel propre et le materiel sale sont-ils separes dans le vehicule ?", type: 'oui_non' as const, requis: true },
      { id: 'q3', label: "A quelle frequence nettoyez-vous vos vehicules ?", type: 'choix' as const, options: ["Quotidien", "Hebdomadaire", "Mensuel", "Apres chaque tournee"], requis: true },
    ],
    registre: null
  },
  '3.4.1': {
    inspecteur: "L'inspecteur va verifier que vous avez un systeme de gestion des dispositifs medicaux permettant de tracer leur circuit complet.",
    contexte: "Vous devez pouvoir retracer l'historique de chaque dispositif medical.",
    conseil: "MediTrack est votre systeme de gestion des dispositifs medicaux.",
    preuves: [
      { code: 'ATTEST-MAINTENANCE', label: "Attestation de tracabilite MediTrack", description: "MediTrack trace le circuit complet de chaque dispositif medical.", type: 'generer' as const },
    ],
    questions: [
      { id: 'q1', label: "Utilisez-vous un logiciel pour gerer votre parc de dispositifs medicaux ?", type: 'oui_non' as const, requis: true },
      { id: 'q2', label: "Chaque dispositif medical a-t-il un numero de serie enregistre ?", type: 'oui_non' as const, requis: true },
      { id: 'q3', label: "Tracez-vous l'historique complet de chaque dispositif ?", type: 'oui_non' as const, requis: true },
    ],
    registre: null
  },
  '3.4.2': {
    inspecteur: "L'inspecteur va verifier que vous respectez les exigences reglementaires — marquage CE, LPP.",
    contexte: "Vous ne pouvez pas distribuer un dispositif medical sans marquage CE conforme.",
    conseil: "Conservez les fiches techniques et declarations de conformite de chaque type de materiel.",
    preuves: [
      { label: "Liste des dispositifs medicaux avec marquage CE", description: "Inventaire de vos materiels avec reference CE et numero LPP.", type: 'upload' as const },
    ],
    questions: [
      { id: 'q1', label: "Verifiez-vous le marquage CE de vos dispositifs a la reception ?", type: 'oui_non' as const, requis: true },
      { id: 'q2', label: "Conservez-vous les declarations de conformite de vos fournisseurs ?", type: 'oui_non' as const, requis: true },
    ],
    registre: null
  },
  '3.4.3': {
    inspecteur: "L'inspecteur va verifier que vous avez une procedure d'achats organisee.",
    contexte: "Acheter n'importe quoi a n'importe qui est un risque qualite.",
    conseil: "Une liste de fournisseurs references avec les criteres de selection suffit.",
    preuves: [
      { label: "Liste des fournisseurs references", description: "Liste de vos fournisseurs avec criteres de selection.", type: 'upload' as const },
    ],
    questions: [
      { id: 'q1', label: "Avez-vous une liste de fournisseurs references ?", type: 'oui_non' as const, requis: true },
      { id: 'q2', label: "Evaluez-vous vos fournisseurs regulierement ?", type: 'oui_non' as const, requis: true },
      { id: 'q3', label: "Avez-vous des criteres formalises pour selectionner un nouveau fournisseur ?", type: 'oui_non' as const, requis: true },
    ],
    registre: null
  },
  '3.4.4': {
    inspecteur: "L'inspecteur va verifier que vous avez les informations techniques sur l'utilisation de chaque dispositif.",
    contexte: "Vous devez avoir les notices d'utilisation et les guides d'entretien de chaque materiel.",
    conseil: "Conservez les manuels d'utilisation de vos fabricants.",
    preuves: [
      { label: "Classeur ou base documentaire des notices techniques", description: "Organisation de vos notices d'utilisation par famille de materiel.", type: 'upload' as const },
    ],
    questions: [
      { id: 'q1', label: "Avez-vous les notices d'utilisation de tous vos materiels ?", type: 'oui_non' as const, requis: true },
      { id: 'q2', label: "Ces notices sont-elles accessibles a votre personnel ?", type: 'oui_non' as const, requis: true },
      { id: 'q3', label: "Les remettez-vous aux patients lors de l'installation ?", type: 'oui_non' as const, requis: true },
    ],
    registre: null
  },
  '3.4.5': {
    inspecteur: "L'inspecteur va verifier que vous gerez vos consommables correctement — stock, tracabilite, dates de peremption.",
    contexte: "Un consommable perime livre a un patient est une faute grave.",
    conseil: "Un systeme FIFO et un controle des dates de peremption a la reception suffisent.",
    preuves: [
      { label: "Procedure de gestion des consommables", description: "Document decrivant la reception, le stockage et la gestion des dates de peremption.", type: 'upload' as const },
    ],
    questions: [
      { id: 'q1', label: "Verifiez-vous les dates de peremption a la reception ?", type: 'oui_non' as const, requis: true },
      { id: 'q2', label: "Appliquez-vous la methode FIFO pour la gestion de vos stocks ?", type: 'oui_non' as const, requis: true },
      { id: 'q3', label: "Vos consommables sont-ils stockes dans des conditions adaptees ?", type: 'oui_non' as const, requis: true },
    ],
    registre: null
  },
  '3.4.6': {
    inspecteur: "L'inspecteur va verifier que vos maintenances preventives et curatives sont assurees et tracees.",
    contexte: "La maintenance est obligatoire pour garantir la securite des patients.",
    conseil: "MediTrack trace toutes vos maintenances — c'est votre preuve principale.",
    preuves: [
      { code: 'ATTEST-MAINTENANCE', label: "Attestation de tracabilite des maintenances", description: "MediTrack trace chaque maintenance preventive et curative.", type: 'generer' as const },
    ],
    questions: [
      { id: 'q1', label: "Avez-vous un calendrier de maintenances preventives ?", type: 'oui_non' as const, requis: true },
      { id: 'q2', label: "Toutes vos maintenances sont-elles tracees dans MediTrack ?", type: 'oui_non' as const, requis: true },
      { id: 'q3', label: "Faites-vous appel a des prestataires de maintenance externalises ?", type: 'oui_non' as const },
    ],
    registre: null
  },
  '3.4.7': {
    inspecteur: "L'inspecteur va verifier que vos equipements de mesure sont verifies periodiquement.",
    contexte: "Les equipements de mesure doivent etre etalon regulierement.",
    conseil: "Si vous n'avez pas d'equipements de mesure, indiquez-le clairement.",
    preuves: [
      { label: "Certificats d'etalonnage ou de verification", description: "Documents attestant la verification periodique de vos equipements.", type: 'upload' as const },
    ],
    questions: [
      { id: 'q1', label: "Avez-vous des equipements de mesure et de controle ?", type: 'oui_non' as const, requis: true },
      { id: 'q2', label: "Ces equipements sont-ils verifies ou etalons periodiquement ?", type: 'oui_non' as const },
      { id: 'q3', label: "Conservez-vous les certificats de verification ?", type: 'oui_non' as const },
    ],
    registre: null
  },
  '3.4.8': {
    inspecteur: "L'inspecteur va verifier que vous controlez techniquement le materiel en location entre deux patients.",
    contexte: "Un materiel en location doit etre verifie et desinfecte entre chaque patient.",
    conseil: "MediTrack trace la reprise et la remise en service.",
    preuves: [
      { code: 'ATTEST-MAINTENANCE', label: "Attestation de verification entre patients", description: "Atteste que chaque materiel en location est verifie avant reattribution.", type: 'generer' as const },
    ],
    questions: [
      { id: 'q1', label: "Realisez-vous une verification technique du materiel apres chaque reprise ?", type: 'oui_non' as const, requis: true },
      { id: 'q2', label: "Cette verification est-elle tracee ?", type: 'oui_non' as const, requis: true },
      { id: 'q3', label: "Le materiel est-il desinfecte avant reattribution ?", type: 'oui_non' as const, requis: true },
    ],
    registre: null
  },
  '3.4.9': {
    inspecteur: "L'inspecteur va verifier que vous communiquez avec les fabricants en cas de probleme (materiovigilance).",
    contexte: "Vous avez une obligation de signalement en cas d'incident avec un dispositif medical.",
    conseil: "Designez un correspondant materiovigilance et documentez vos echanges.",
    preuves: [
      { label: "Procedure de materiovigilance", description: "Document decrivant comment vous signalez les incidents.", type: 'upload' as const },
    ],
    questions: [
      { id: 'q1', label: "Avez-vous designe un correspondant materiovigilance ?", type: 'oui_non' as const, requis: true },
      { id: 'q2', label: "Avez-vous une procedure pour gerer les alertes fabricants ?", type: 'oui_non' as const, requis: true },
    ],
    registre: null
  },
  '3.5.1': {
    inspecteur: "L'inspecteur va verifier que vous gerez vos dechets de maniere adaptee — DASRI, DEEE.",
    contexte: "Certains dechets issus de vos activites sont dangereux et necessitent une filiere specifique.",
    conseil: "Identifiez les types de dechets produits et documentez vos filieres d'elimination.",
    preuves: [
      { label: "Procedure de gestion des dechets", description: "Document identifiant les types de dechets et les filieres d'elimination.", type: 'upload' as const },
      { label: "Bordereaux d'enlevement des dechets", description: "Preuves de collecte par des prestataires agrees.", type: 'upload' as const },
    ],
    questions: [
      { id: 'q1', label: "Produisez-vous des DASRI ?", type: 'oui_non' as const, requis: true },
      { id: 'q2', label: "Avez-vous une filiere de collecte pour vos DEEE ?", type: 'oui_non' as const, requis: true },
      { id: 'q3', label: "Vos filieres d'elimination sont-elles tracees ?", type: 'oui_non' as const, requis: true },
    ],
    registre: null
  },
  '3.6.1': {
    inspecteur: "L'inspecteur va verifier que vos dossiers patients sont complets, a jour et accessibles.",
    contexte: "Un dossier patient incomplet est une non-conformite majeure.",
    conseil: "Documentez votre logiciel metier et montrez qu'il permet une gestion fiable.",
    preuves: [
      { label: "Description du systeme de gestion des dossiers", description: "Document decrivant votre logiciel metier et la gestion des dossiers patients.", type: 'upload' as const },
    ],
    questions: [
      { id: 'q1', label: "Quel logiciel utilisez-vous pour gerer les dossiers de vos patients ?", type: 'texte' as const, requis: true },
      { id: 'q2', label: "Chaque dossier contient-il la prescription, le bon de livraison et les suivis ?", type: 'oui_non' as const, requis: true },
      { id: 'q3', label: "Les dossiers sont-ils accessibles rapidement en cas de besoin urgent ?", type: 'oui_non' as const, requis: true },
    ],
    registre: null
  },
  '3.6.2': {
    inspecteur: "L'inspecteur va verifier que vous protegez les donnees personnelles de vos patients (RGPD).",
    contexte: "Ce critere rejoint le 1.2.5 — il s'applique ici aux donnees operationnelles.",
    conseil: "Votre politique de confidentialite et registre des traitements generes pour le 1.2.5 couvrent ce critere.",
    preuves: [
      { code: 'POLITIQUE-CONFIDENTIALITE', label: "Politique de confidentialite RGPD", description: "Deja generee pour le critere 1.2.5 — couvre egalement ce critere.", type: 'generer' as const },
      { code: 'REGISTRE-TRAITEMENTS', label: "Registre des activites de traitement", description: "Deja genere pour le critere 1.2.5.", type: 'generer' as const },
    ],
    questions: [
      { id: 'q1', label: "Avez-vous une politique de confidentialite a jour ?", type: 'oui_non' as const, requis: true },
      { id: 'q2', label: "L'acces a votre logiciel metier est-il securise par identifiant individuel ?", type: 'oui_non' as const, requis: true },
    ],
    registre: null
  },
  '3.7.1': {
    inspecteur: "L'inspecteur va verifier que vous avez des contrats de sous-traitance et que vous controlez la qualite.",
    contexte: "Si vous sous-traitez des prestations, vous restez responsable de la qualite.",
    conseil: "Pour chaque sous-traitant, ayez un contrat mentionnant les exigences qualite.",
    preuves: [
      { label: "Contrats de sous-traitance", description: "Contrats avec vos sous-traitants incluant les exigences qualite.", type: 'upload' as const },
      { label: "Evaluations des sous-traitants", description: "Bilan annuel de la qualite des prestations.", type: 'upload' as const },
    ],
    questions: [
      { id: 'q1', label: "Avez-vous recours a des sous-traitants ?", type: 'oui_non' as const, requis: true },
      { id: 'q2', label: "Avez-vous des contrats formalises avec vos sous-traitants ?", type: 'oui_non' as const },
      { id: 'q3', label: "Evaluez-vous regulierement la qualite de vos sous-traitants ?", type: 'oui_non' as const },
    ],
    registre: null
  },  '4.1.1': {
    inspecteur: "L'inspecteur va verifier que vous faites une veille active sur la reglementation — LPP, HAS, ANSM.",
    contexte: "La reglementation PSDM evolue frequemment. Ne pas etre a jour peut invalider vos pratiques.",
    conseil: "Abonnez-vous aux newsletters de l'ANSM, de la HAS et de votre syndicat professionnel. Notez les mises a jour dans un registre de veille.",
    preuves: [
      { label: "Registre de veille reglementaire", description: "Journal des evolutions reglementaires suivies avec date et source.", type: 'upload' as const },
      { label: "Abonnements aux sources officielles", description: "Preuves d'abonnement aux newsletters ANSM, HAS, syndicats.", type: 'upload' as const },
    ],
    questions: [
      { id: 'q1', label: "Qui est responsable de la veille reglementaire dans votre structure ?", type: 'texte' as const, requis: true },
      { id: 'q2', label: "Etes-vous abonne aux newsletters de l'ANSM et de la HAS ?", type: 'oui_non' as const, requis: true },
      { id: 'q3', label: "Avez-vous un registre ou document de suivi des evolutions reglementaires ?", type: 'oui_non' as const, requis: true },
    ],
    registre: null
  },
  '4.1.2': {
    inspecteur: "L'inspecteur va verifier que vos pratiques sont conformes aux exigences LPP actuelles et aux recommandations des fabricants.",
    contexte: "La LPP evolue regulierement — des materiels remboursables peuvent changer de conditions ou de tarifs.",
    conseil: "Documentez que vous verifiez la conformite LPP de chaque materiel avant de le proposer et que vous appliquez les recommandations fabricants.",
    preuves: [
      { label: "Procedure de conformite LPP", description: "Document decrivant comment vous verifiez la conformite LPP de vos materiels.", type: 'upload' as const },
    ],
    questions: [
      { id: 'q1', label: "Verifiez-vous regulierement la conformite LPP de vos materiels ?", type: 'oui_non' as const, requis: true },
      { id: 'q2', label: "Appliquez-vous les recommandations des fabricants pour l'utilisation de vos materiels ?", type: 'oui_non' as const, requis: true },
      { id: 'q3', label: "Vos tarifs sont-ils conformes aux tarifs LPP en vigueur ?", type: 'oui_non' as const, requis: true },
    ],
    registre: null
  },
  '4.2.1': {
    inspecteur: "L'inspecteur va verifier que vous avez l'autorisation prefectorale pour exercer l'activite oxygene.",
    contexte: "La distribution d'oxygene medicinal est reglementee et necessite une autorisation specifique.",
    conseil: "Ce critere ne s'applique qu'aux PSDM qui distribuent de l'oxygene. Si ce n'est pas votre cas, indiquez 'Non applicable'.",
    preuves: [
      { label: "Autorisation prefectorale d'exercer l'activite oxygene", description: "Document officiel autorisant votre structure a distribuer de l'oxygene medicinal.", type: 'upload' as const },
    ],
    questions: [
      { id: 'q1', label: "Distribuez-vous de l'oxygene medicinal ?", type: 'oui_non' as const, requis: true },
      { id: 'q2', label: "Disposez-vous de l'autorisation prefectorale requise ?", type: 'oui_non' as const },
      { id: 'q3', label: "Cette autorisation est-elle a jour ?", type: 'oui_non' as const },
    ],
    registre: null
  },
  '4.3.1': {
    inspecteur: "L'inspecteur va verifier que votre systeme de materiovigilance est operationnel — correspondant designe, procedure, signalements.",
    contexte: "La materiovigilance est obligatoire. Tout incident grave avec un dispositif medical doit etre signale a l'ANSM.",
    conseil: "MediTrack trace vos pannes et incidents — utilisez ces donnees comme base de votre materiovigilance.",
    preuves: [
      { label: "Procedure de materiovigilance", description: "Document decrivant le circuit de signalement des incidents avec dispositifs medicaux.", type: 'upload' as const },
      { label: "Designation du correspondant materiovigilance", description: "Document officialisant la designation de votre correspondant materiovigilance.", type: 'upload' as const },
    ],
    questions: [
      { id: 'q1', label: "Avez-vous designe un correspondant en materiovigilance ?", type: 'oui_non' as const, requis: true },
      { id: 'q2', label: "Avez-vous une procedure de signalement des incidents a l'ANSM ?", type: 'oui_non' as const, requis: true },
      { id: 'q3', label: "Avez-vous deja realise un signalement de materiovigilance ?", type: 'oui_non' as const },
    ],
    registre: null
  },
  '4.3.2': {
    inspecteur: "L'inspecteur va verifier que votre systeme de pharmacovigilance est operationnel.",
    contexte: "La pharmacovigilance concerne les medicaments — applicable si vous distribuez des medicaments ou des dispositifs contenant des substances medicamenteuses.",
    conseil: "Ce critere s'applique principalement aux PSDM distribuant de l'oxygene ou des medicaments. Verifiez si votre activite est concernee.",
    preuves: [
      { label: "Procedure de pharmacovigilance", description: "Document decrivant le circuit de signalement des effets indesirables.", type: 'upload' as const },
    ],
    questions: [
      { id: 'q1', label: "Ce critere s'applique-t-il a votre activite ?", type: 'oui_non' as const, requis: true },
      { id: 'q2', label: "Avez-vous une procedure de pharmacovigilance ?", type: 'oui_non' as const },
      { id: 'q3', label: "Avez-vous un correspondant pharmacovigilance designe ?", type: 'oui_non' as const },
    ],
    registre: null
  },
  '4.4.1': {
    inspecteur: "L'inspecteur va verifier que vous avez identifie vos processus a risque et mis en place des actions de prevention.",
    contexte: "Une cartographie des risques montre a l'inspecteur que vous avez une demarche qualite proactive.",
    conseil: "Listez vos 5 risques principaux (livraison, maintenance, hygiene, donnees patients, ressources humaines) et documentez vos actions preventives.",
    preuves: [
      { label: "Cartographie des risques", description: "Document identifiant vos principaux risques avec niveau de gravite et actions preventives.", type: 'upload' as const },
      { label: "Plan de prevention des risques", description: "Actions preventives mises en place pour chaque risque identifie.", type: 'upload' as const },
    ],
    questions: [
      { id: 'q1', label: "Avez-vous realise une analyse des risques de votre activite ?", type: 'oui_non' as const, requis: true },
      { id: 'q2', label: "Avez-vous mis en place des actions preventives pour vos risques principaux ?", type: 'oui_non' as const, requis: true },
      { id: 'q3', label: "Cette analyse est-elle revue periodiquement ?", type: 'oui_non' as const, requis: true },
    ],
    registre: null
  },
  '4.4.2': {
    inspecteur: "L'inspecteur va verifier que vous avez un plan de continuite d'activite en cas de crise.",
    contexte: "Un sinistre, une pandemie ou une defaillance informatique peut paralyser votre activite et mettre vos patients en danger.",
    conseil: "Un plan simple decrivant comment vous continuez a servir vos patients en cas de probleme majeur suffit.",
    preuves: [
      { label: "Plan de continuite d'activite (PCA)", description: "Document decrivant les mesures pour maintenir l'activite en cas de crise.", type: 'upload' as const },
    ],
    questions: [
      { id: 'q1', label: "Avez-vous un plan de continuite d'activite documente ?", type: 'oui_non' as const, requis: true },
      { id: 'q2', label: "Ce plan a-t-il ete teste ou simule ?", type: 'oui_non' as const },
      { id: 'q3', label: "Vos patients seraient-ils pris en charge en cas d'indisponibilite de votre structure ?", type: 'oui_non' as const, requis: true },
    ],
    registre: null
  },
  '4.4.3': {
    inspecteur: "L'inspecteur va demander a voir votre registre des evenements indesirables et verifier que vous analysez vos incidents.",
    contexte: "Tout PSDM qui dit n'avoir aucun evenement indesirable est suspect. L'inspecteur cherche une culture de signalement et d'amelioration.",
    conseil: "Le registre des evenements indesirables dans MediReg vous permet de tracer chaque incident et les actions correctives — c'est votre preuve principale.",
    preuves: [
      { label: "Registre des evenements indesirables MediReg", description: "Le registre ci-dessous trace chaque incident avec son analyse et les actions correctives.", type: 'registre' as const },
    ],
    questions: [
      { id: 'q1', label: "Avez-vous un systeme de recueil des evenements indesirables ?", type: 'oui_non' as const, requis: true },
      { id: 'q2', label: "Chaque evenement fait-il l'objet d'une analyse ?", type: 'oui_non' as const, requis: true },
      { id: 'q3', label: "Mettez-vous en place des actions correctives suite aux incidents ?", type: 'oui_non' as const, requis: true },
    ],
    registre: 'evenements_indesirables'
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
  meditrackEtabId?: string | null
  onSaveMeditrackId?: (id: string) => Promise<void>
}


// Mapping critère → template attestation
const ATTESTATION_TEMPLATES: Record<string, string> = {
  '1.2.2': 'ATTESTATION-DEVIS',
  '1.2.4': 'ATTESTATION-CONSENTEMENT',
}

// ─── Composant Attestation ────────────────────────────────────
function AttestationButton({ critereCode, critereId, etabId, societe, onOpenEditor }: {
  critereCode: string
  critereId: string
  etabId: string
  societe: any
  onOpenEditor: (code: string) => void
}) {
  const [atteste, setAtteste] = useState(false)
  const [docInfo, setDocInfo] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    async function check() {
      const templateCode = ATTESTATION_TEMPLATES[critereCode]
      if (!templateCode) return
      const { data } = await supabase
        .from('documents_editables')
        .select('id, signe_par, signe_le')
        .eq('etablissement_id', etabId)
        .eq('template_code', templateCode)
        .eq('statut', 'signe')
        .limit(1)
      if (data && data.length > 0) {
        setAtteste(true)
        setDocInfo(data[0])
      } else {
        setAtteste(false)
        setDocInfo(null)
      }
    }
    check()
  }, [critereCode, etabId])

  const templateCode = ATTESTATION_TEMPLATES[critereCode]
  if (!templateCode) return null

  return atteste ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px' }}>
        <i className="ti ti-circle-check-filled" style={{ fontSize: '14px', color: '#10B981' }} />
        <div>
          <div style={{ fontSize: '12px', color: '#059669', fontWeight: '700' }}>Attestation signée</div>
          {docInfo?.signe_par && <div style={{ fontSize: '10px', color: '#059669' }}>par {docInfo.signe_par}</div>}
        </div>
      </div>
      {docInfo?.id && (
        <a href={`/api/download-editable?id=${docInfo.id}`} target="_blank"
          style={{ height: '32px', padding: '0 12px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', color: '#059669', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none' }}>
          <i className="ti ti-download" style={{ fontSize: '13px' }} />
          Télécharger
        </a>
      )}
      <button onClick={() => onOpenEditor(templateCode)}
        style={{ height: '32px', padding: '0 12px', background: '#F3F4F6', border: '1px solid #E5E7EB', borderRadius: '8px', color: '#6B7280', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '5px' }}>
        <i className="ti ti-edit" style={{ fontSize: '13px' }} />
        Modifier
      </button>
    </div>
  ) : (
    <button onClick={() => onOpenEditor(templateCode)}
      style={{ height: '32px', padding: '0 14px', background: '#059669', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '5px' }}>
      <i className="ti ti-file-certificate" style={{ fontSize: '13px' }} />
      Créer l&apos;attestation
    </button>
  )
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
  const [showForm, setShowForm] = useState(entries.length === 0)
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#4338CA', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="ti ti-clipboard-list" style={{ fontSize: '14px' }} />
          Registre de remise documents ({entries.length} entrées)
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ padding: '5px 12px', background: '#4338CA', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '11px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)' }}>
          + Ajouter une entrée
        </button>
      </div>
      <div style={{ fontSize: '11px', color: '#6366F1', background: '#EEF2FF', padding: '8px 12px', borderRadius: '6px', marginBottom: '10px', display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
        <i className="ti ti-lock" style={{ fontSize: '12px', flexShrink: 0, marginTop: '1px' }} />
        <span><strong>Confidentialité :</strong> N&apos;inscrivez jamais le nom ou prénom d&apos;un patient. Utilisez uniquement des références anonymisées ex: &quot;Patient A — Août 2026&quot; ou &quot;Dossier 001&quot;.</span>
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
                placeholder="ex: Patient A — Août 2026 ou Dossier 001"
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
  onUpdateStatut, onGenererDoc, onUploadPreuve, onReloadDocs, generatingDoc, userRole = 'client',
  meditrackEtabId, onSaveMeditrackId
}: Props) {
  const supabase = createClient()
  const config = CRITERES_CONFIG[critere.code]
  const MEDITRACK_CRITERES = ['2.2.1', '2.3.2', '2.4.3', '2.5.1']


  const [editorCode, setEditorCode] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

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
              <button onClick={() => onUpdateStatut('procedure_a_valider')}
                style={{ padding: '8px 16px', background: '#1A56DB', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="ti ti-send" style={{ fontSize: '13px' }} />
                Soumettre pour validation
              </button>
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
              const isAttester = preuve.type === 'attester'
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
                        {preuve.mention === 'principal' && (
                          <span style={{ fontSize: '10px', color: '#DC2626', background: '#FEF2F2', padding: '2px 8px', borderRadius: '20px', fontWeight: '700', border: '1px solid #FECACA' }}>⭐ Preuve principale</span>
                        )}
                        {isGeneree && (
                          <span style={{ fontSize: '10px', color: '#1A56DB', background: '#EBF2FF', padding: '2px 8px', borderRadius: '20px', fontWeight: '600' }}>Généré par MediReg</span>
                        )}
                        {isAttester && (
                          <span style={{ fontSize: '10px', color: '#059669', background: '#ECFDF5', padding: '2px 8px', borderRadius: '20px', fontWeight: '600' }}>Attestation</span>
                        )}
                        {!isGeneree && !isRegistre && !isAttester && (
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
                        {isAttester && (
                          <AttestationButton
                            key={reloadKey}
                            critereCode={critere.code}
                            critereId={critere.id}
                            etabId={selectedEtabId}
                            societe={societe}
                            onOpenEditor={(code) => setEditorCode(code)}
                          />
                        )}
                        {hasDoc && preuve.code && docsGeneres[preuve.code]?.[0] && (() => {
                          const doc = docsGeneres[preuve.code][0]
                          const isEditable = doc.type_doc === 'editable'
                          return (
                            <>
                              {isEditable ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 12px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px' }}>
                                    <i className="ti ti-signature" style={{ fontSize: '13px', color: '#059669' }} />
                                    <span style={{ fontSize: '12px', color: '#059669', fontWeight: '600' }}>Signé par {doc.signe_par}</span>
                                  </div>
                                  <a href={`/api/download-editable?id=${doc.id}`} target="_blank"
                                    style={{ height: '32px', padding: '0 14px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', color: '#059669', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none' }}>
                                    <i className="ti ti-download" style={{ fontSize: '13px' }} />Télécharger
                                  </a>
                                </div>
                              ) : doc.url ? (
                                <a href={`/api/generate-doc?path=${encodeURIComponent(doc.url)}`} download
                                  style={{ height: '32px', padding: '0 14px', background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '8px', color: '#059669', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none' }}>
                                  <i className="ti ti-download" style={{ fontSize: '13px' }} />Télécharger
                                </a>
                              ) : null}
                            </>
                          )
                        })()}
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
              <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                <i className="ti ti-upload" style={{ fontSize: '13px', marginRight: '6px' }} />
                Uploader vos propres documents de procédure
              </div>
              <div style={{ fontSize: '11px', color: '#DC2626', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '6px', padding: '8px 10px', marginBottom: '10px', display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                <i className="ti ti-alert-triangle" style={{ fontSize: '12px', flexShrink: 0, marginTop: '1px' }} />
                <span><strong>Important :</strong> N&apos;uploadez jamais de document contenant le nom, prénom ou toute donnée identifiante d&apos;un patient. Le certificateur ne doit voir aucune donnée personnelle patient. Utilisez uniquement des procédures internes ou documents anonymisés.</span>
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
      {config?.registre === 'evenements_indesirables' && <RegistreEI etabId={selectedEtabId} />}

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

      {/* Widget MediTrack pour les critères opérationnels */}
      {MEDITRACK_CRITERES.includes(critere.code) && !isConsultant && (
        <MeditrackWidget
          meditrackEtabId={meditrackEtabId ?? null}
          critereCode={critere.code}
          onLink={async (etabId: string) => {
            if (onSaveMeditrackId) await onSaveMeditrackId(etabId)
          }}
        />
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
          onSaved={() => { setEditorCode(null); onReloadDocs(); setReloadKey(k => k + 1) }}
        />
      )}
    </div>
  )
}

// ─── Composant Registre Événements Indésirables ──────────────
function RegistreEI({ etabId }: { etabId: string }) {
  const supabase = createClient()
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    date_evenement: new Date().toISOString().split('T')[0],
    type: 'Incident materiel',
    description: '',
    gravite: 'mineur',
    actions_correctives: '',
    statut: 'ouvert'
  })

  useEffect(() => { load() }, [etabId])

  async function load() {
    const { data } = await supabase.from('evenements_indesirables').select('*').eq('etablissement_id', etabId).order('date_evenement', { ascending: false })
    setEntries(data || [])
    setLoading(false)
  }

  async function save() {
    if (!form.description) return
    setSaving(true)
    await supabase.from('evenements_indesirables').insert([{ ...form, etablissement_id: etabId }])
    setForm({ date_evenement: new Date().toISOString().split('T')[0], type: 'Incident materiel', description: '', gravite: 'mineur', actions_correctives: '', statut: 'ouvert' })
    setShowForm(false)
    await load()
    setSaving(false)
  }

  async function updateStatut(id: string, statut: string) {
    await supabase.from('evenements_indesirables').update({ statut }).eq('id', id)
    await load()
  }

  const inp = { width: '100%', padding: '9px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '12px', fontFamily: 'var(--font)', outline: 'none', background: '#fff', boxSizing: 'border-box' as const }
  const lbl = { display: 'block' as const, fontSize: '10px', fontWeight: '600' as const, color: '#6B7280', marginBottom: '4px', textTransform: 'uppercase' as const, letterSpacing: '0.4px' }

  const GRAVITE_COLORS: Record<string, { color: string; bg: string }> = {
    mineur: { color: '#059669', bg: '#ECFDF5' },
    modere: { color: '#D97706', bg: '#FFFBEB' },
    grave: { color: '#DC2626', bg: '#FEF2F2' },
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid #FDE68A', borderRadius: '12px', padding: '16px 18px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#B45309', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: '16px' }} />
          Registre des événements indésirables ({entries.length})
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ padding: '6px 14px', background: '#B45309', border: 'none', borderRadius: '7px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <i className="ti ti-plus" style={{ fontSize: '13px' }} />
          Déclarer un incident
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '10px', padding: '14px', marginBottom: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div><label style={lbl}>Date *</label><input type="date" value={form.date_evenement} onChange={e => setForm(p => ({ ...p, date_evenement: e.target.value }))} style={inp} /></div>
            <div><label style={lbl}>Type</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={inp}>
                {['Incident matériel', 'Erreur de livraison', 'Chute patient', 'Problème hygiène', 'Incident informatique', 'Réclamation grave', 'Autre'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Gravité</label>
              <select value={form.gravite} onChange={e => setForm(p => ({ ...p, gravite: e.target.value }))} style={inp}>
                <option value="mineur">Mineur</option>
                <option value="modere">Modéré</option>
                <option value="grave">Grave</option>
              </select>
            </div>
            <div><label style={lbl}>Statut</label>
              <select value={form.statut} onChange={e => setForm(p => ({ ...p, statut: e.target.value }))} style={inp}>
                <option value="ouvert">Ouvert</option>
                <option value="en_cours">En cours d'analyse</option>
                <option value="clos">Clôturé</option>
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Description de l'incident *</label><textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Décrivez l'incident survenu..." rows={2} style={{ ...inp, resize: 'vertical' }} /></div>
            <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Actions correctives mises en place</label><textarea value={form.actions_correctives} onChange={e => setForm(p => ({ ...p, actions_correctives: e.target.value }))} placeholder="Décrivez les actions prises pour éviter la récurrence..." rows={2} style={{ ...inp, resize: 'vertical' }} /></div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowForm(false)} style={{ padding: '7px 14px', background: '#F3F4F6', border: 'none', borderRadius: '7px', color: '#6B7280', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font)' }}>Annuler</button>
            <button onClick={save} disabled={!form.description || saving} style={{ padding: '7px 14px', background: '#B45309', border: 'none', borderRadius: '7px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)' }}>{saving ? 'Enregistrement...' : 'Déclarer'}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#9CA3AF', fontSize: '12px' }}>Chargement...</div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px', color: '#9CA3AF', fontSize: '12px', background: '#FFFBEB', borderRadius: '8px', border: '1px dashed #FDE68A' }}>
          Aucun événement déclaré — commencez à tracer vos incidents pour prouver votre démarche qualité
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {entries.map((e: any) => {
            const g = GRAVITE_COLORS[e.gravite] || GRAVITE_COLORS.mineur
            return (
              <div key={e.id} style={{ padding: '12px 16px', background: '#fff', borderRadius: '9px', border: `1px solid ${g.bg}`, display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: g.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="ti ti-alert-triangle" style={{ fontSize: '16px', color: g.color }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#111827' }}>{e.type}</span>
                    <span style={{ fontSize: '10px', fontWeight: '600', color: g.color, background: g.bg, padding: '2px 8px', borderRadius: '20px' }}>{e.gravite}</span>
                    <span style={{ fontSize: '10px', color: e.statut === 'clos' ? '#059669' : e.statut === 'en_cours' ? '#D97706' : '#DC2626', background: e.statut === 'clos' ? '#ECFDF5' : e.statut === 'en_cours' ? '#FFFBEB' : '#FEF2F2', padding: '2px 8px', borderRadius: '20px', fontWeight: '600' }}>
                      {e.statut === 'clos' ? '✓ Clôturé' : e.statut === 'en_cours' ? 'En cours' : 'Ouvert'}
                    </span>
                    <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{new Date(e.date_evenement).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#374151', marginBottom: e.actions_correctives ? '6px' : '0' }}>{e.description}</div>
                  {e.actions_correctives && <div style={{ fontSize: '11px', color: '#059669', background: '#F0FDF4', padding: '6px 10px', borderRadius: '6px' }}>Actions : {e.actions_correctives}</div>}
                </div>
                {e.statut !== 'clos' && (
                  <button onClick={() => updateStatut(e.id, e.statut === 'ouvert' ? 'en_cours' : 'clos')}
                    style={{ padding: '5px 10px', background: '#F3F4F6', border: 'none', borderRadius: '6px', color: '#6B7280', fontSize: '11px', cursor: 'pointer', fontFamily: 'var(--font)', flexShrink: 0 }}>
                    {e.statut === 'ouvert' ? 'Analyser →' : 'Clôturer ✓'}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}