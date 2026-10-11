import { test, expect } from '@playwright/test'
import { donneesDeBase, installerFauxSupabase } from './faux-supabase'

// Lot 1 : notifications ciblées, compteurs non lus consultant, score indépendant des filtres, pas de NaN

test('un client qui soumet un critère ne notifie que son propre consultant', async ({ page }) => {
  const tables = donneesDeBase()
  const { ecritures } = await installerFauxSupabase(page, tables, { id: 'u-client', email: 'client@test.fr' })

  await page.goto('/dashboard/certification?chapitre=1')
  await page.getByText("Libre choix de l'usager").click()
  await page.getByRole('button', { name: 'Soumettre pour validation' }).click()
  await expect(page.getByText('Votre consultant va valider ce critère')).toBeVisible()

  await expect.poll(() => ecritures.filter((e) => e.table === 'notifications').length).toBe(1)
  const notifs = ecritures.filter((e) => e.table === 'notifications').flatMap((e) => e.corps)
  expect(notifs).toHaveLength(1)
  expect(notifs[0]).toMatchObject({ consultant_id: 'cons-A', client_id: 'c1', type: 'critere_a_valider', critere_code: '1.2.1' })
  expect(notifs.some((n: any) => n.consultant_id === 'cons-B')).toBe(false)
})

test("un client sans consultant attribué ne notifie personne", async ({ page }) => {
  const tables = donneesDeBase()
  tables.clients[0].consultant_id = null
  const { ecritures } = await installerFauxSupabase(page, tables, { id: 'u-client', email: 'client@test.fr' })

  await page.goto('/dashboard/certification?chapitre=1')
  await page.getByText("Libre choix de l'usager").click()
  await page.getByRole('button', { name: 'Soumettre pour validation' }).click()
  await expect(page.getByText('Votre consultant va valider ce critère')).toBeVisible()
  await page.waitForTimeout(500)
  expect(ecritures.filter((e) => e.table === 'notifications')).toHaveLength(0)
})

test('le consultant voit ses messages non lus dès le premier chargement', async ({ page }) => {
  const tables = donneesDeBase()
  tables.messages_critere = [
    { id: 'm1', etablissement_id: 'e1', critere_id: 'k121', auteur_role: 'client', contenu: 'Bonjour', lu_consultant: false, lu_client: true },
  ]
  await installerFauxSupabase(page, tables, { id: 'cons-A', email: 'a@test.fr' })

  await page.goto('/dashboard/certification?client_id=c1&chapitre=1')
  const carte = page.locator('div', { hasText: "Libre choix de l'usager" }).filter({ hasText: '1.2.1' }).last()
  await expect(carte.getByText('1 message')).toBeVisible()
})

test('le score global ne change pas quand on filtre', async ({ page }) => {
  const tables = donneesDeBase()
  await installerFauxSupabase(page, tables, { id: 'u-client', email: 'client@test.fr' })

  await page.goto('/dashboard/certification')
  // 6 critères applicables (le critère oxygène est exclu, pas d'activité oxygène), 2 prêts → 33 %
  await expect(page.getByText('2 / 6 prêts pour audit')).toBeVisible()
  await expect(page.getByText('33%', { exact: true })).toBeVisible()

  await page.getByTestId('chapitre-2').getByRole('button', { name: /Voir l/ }).click()
  await page.getByRole('button', { name: 'Prêt pour audit' }).click()
  await expect(page.getByText('Traçabilité des livraisons')).toBeVisible()
  await expect(page.getByText('Maintenance du matériel')).toHaveCount(0)

  await expect(page.getByText('2 / 6 prêts pour audit')).toBeVisible()
  await expect(page.getByText('33%', { exact: true })).toBeVisible()
})

test("aucun NaN quand aucun critère n'est applicable", async ({ page }) => {
  const tables = donneesDeBase()
  tables.criteres_psdm = tables.criteres_psdm.map((c) => ({ ...c, champ_application: 'Oxygene' }))
  tables.activites_etablissement = []
  await installerFauxSupabase(page, tables, { id: 'u-client', email: 'client@test.fr' })

  await page.goto('/dashboard/certification')
  await expect(page.getByText('0 / 0 prêts pour audit')).toBeVisible()
  expect(await page.content()).not.toContain('NaN')
})
