import { test, chromium } from '@playwright/test'
import { donneesDeBase, installerFauxSupabase, type Tables } from '../e2e/faux-supabase'

// Bac à sable : ouvre MediReg avec un faux Supabase (aucune donnée réelle lue ni modifiée).
// Deux fenêtres partagent les mêmes données : le client et son consultant.
// Lancer : npm run bac-a-sable   — fermer les deux fenêtres pour arrêter.

const STATUTS = ['pret_audit', 'procedure_a_valider', 'action_corrective', 'preuve_manquante', 'information_manquante', 'non_analyse', 'non_analyse']

const TITRES: Record<string, string[]> = {
  '1': ['Respect des droits des usagers', "Libre choix de l'usager", 'Information claire sur les produits', 'Intimité, dignité et bientraitance', "Consentement de l'usager", 'Confidentialité des données', 'Évaluation de la satisfaction', 'Gestion des réclamations'],
  '2': ['Réception de la prescription', 'Traçabilité des prescriptions', 'Préparation de la livraison', 'Traçabilité des livraisons', "Installation et formation de l'usager", 'Suivi de la prestation', 'Maintenance préventive', 'Dépannage et continuité de service', 'Traçabilité des reprises', 'Désinfection du matériel repris'],
  '3': ['Gestion des compétences', 'Formation des salariés', 'Habilitations', 'Locaux et stockage', 'Véhicules de livraison', "Système d'information"],
  '4': ['Politique qualité', 'Cartographie des risques', 'Déclaration des événements indésirables', 'Matériovigilance', "Plans d'actions d'amélioration"],
}
const CODES: Record<string, string[]> = {
  '1': ['1.1.1', '1.2.1', '1.2.2', '1.2.3', '1.2.4', '1.2.5', '1.3.1', '1.3.2'],
  '2': ['2.1.1', '2.2.1', '2.3.1', '2.3.2', '2.3.3', '2.4.1', '2.4.2', '2.4.3', '2.5.1', '2.5.2'],
  '3': ['3.1.1', '3.1.2', '3.1.3', '3.2.1', '3.2.2', '3.3.1'],
  '4': ['4.1.1', '4.2.1', '4.2.2', '4.2.3', '4.3.1'],
}

function donneesBacASable(): Tables {
  const t = donneesDeBase()
  t.criteres_psdm = []
  t.reponses_criteres = []
  let n = 0
  for (const chap of ['1', '2', '3', '4']) {
    CODES[chap].forEach((code, i) => {
      const id = `k${code.replace(/\./g, '')}`
      t.criteres_psdm.push({ id, code, chapitre: chap, titre: TITRES[chap][i], champ_application: null })
      t.reponses_criteres.push({ id: `r${id}`, etablissement_id: 'e1', critere_id: id, statut: STATUTS[n++ % STATUTS.length] })
    })
  }
  t.criteres_psdm.push({ id: 'kox', code: '2.6.1', chapitre: '2', titre: 'Oxygénothérapie à domicile (masqué : pas d’activité oxygène)', champ_application: 'Oxygène' })
  t.messages_critere = [
    { id: 'm1', etablissement_id: 'e1', critere_id: 'k121', auteur_role: 'consultant', auteur_id: 'cons-A', contenu: 'Pouvez-vous ajouter votre attestation de libre choix ?', type: 'message', lu_client: false, lu_consultant: true, created_at: '2026-10-10T09:00:00Z' },
    { id: 'm2', etablissement_id: 'e1', critere_id: 'k241', auteur_role: 'client', auteur_id: 'u-client', contenu: 'Le planning de maintenance est en pièce jointe.', type: 'message', lu_client: true, lu_consultant: false, created_at: '2026-10-11T14:00:00Z' },
  ]
  return t
}

test('bac à sable MediReg', async () => {
  test.setTimeout(0)
  const tables = donneesBacASable()
  const navigateur = await chromium.launch({ headless: false, args: ['--window-size=1300,900'] })

  const fenetres = [
    { user: { id: 'u-client', email: 'client@test.fr' }, url: '/dashboard/certification', titre: 'client' },
    { user: { id: 'cons-A', email: 'a@test.fr' }, url: '/dashboard/certification?client_id=c1', titre: 'consultant' },
  ]
  const pages = []
  for (const f of fenetres) {
    const ctx = await navigateur.newContext({ baseURL: 'http://localhost:3001', viewport: null, locale: 'fr-FR' })
    const page = await ctx.newPage()
    await installerFauxSupabase(page, tables, f.user)
    await page.goto(f.url)
    pages.push(page)
  }

  // Reste ouvert tant qu'au moins une fenêtre est ouverte
  await Promise.all(pages.map(p => p.waitForEvent('close', { timeout: 0 })))
  await navigateur.close()
})
