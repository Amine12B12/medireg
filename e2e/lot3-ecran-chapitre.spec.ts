import { test, expect } from '@playwright/test'
import { donneesDeBase, installerFauxSupabase } from './faux-supabase'

// Lot 3 : écran d'un chapitre (bandeau, critères par thème en liste), navigation limitée au chapitre

const CLIENT = { id: 'u-client', email: 'client@test.fr' }

test('le chapitre a un bandeau de présentation et ses critères groupés par thème', async ({ page }) => {
  await installerFauxSupabase(page, donneesDeBase(), CLIENT)
  await page.goto('/dashboard/certification?chapitre=1')

  const bandeau = page.getByTestId('bandeau-chapitre')
  await expect(bandeau).toContainText('Chapitre 1')
  await expect(bandeau).toContainText('choisit librement son prestataire')
  await expect(bandeau).toContainText('2 critères · 1 prêt pour l’audit · 50%')

  await expect(page.getByTestId('theme-1.1').getByTestId('critere-1.1.1')).toContainText('Prêt pour audit')
  await expect(page.getByTestId('theme-1.2').getByTestId('critere-1.2.1')).toContainText('Non analysé')
  // rien des autres chapitres
  await expect(page.getByTestId('critere-2.3.2')).toHaveCount(0)
})

test('le bandeau se replie et reste replié au rechargement', async ({ page }) => {
  await installerFauxSupabase(page, donneesDeBase(), CLIENT)
  await page.goto('/dashboard/certification?chapitre=1')
  const bandeau = page.getByTestId('bandeau-chapitre')
  await expect(bandeau).toContainText('choisit librement son prestataire')

  await bandeau.getByRole('button', { name: 'Replier' }).click()
  await expect(bandeau).not.toContainText('choisit librement son prestataire')
  await page.reload()
  await expect(page.getByTestId('bandeau-chapitre')).not.toContainText('choisit librement son prestataire')

  await page.getByTestId('bandeau-chapitre').getByRole('button', { name: 'Présentation' }).click()
  await expect(page.getByTestId('bandeau-chapitre')).toContainText('choisit librement son prestataire')
})

test('les codes sont triés naturellement (1.2 avant 1.10)', async ({ page }) => {
  const tables = donneesDeBase()
  tables.criteres_psdm.push(
    { id: 'k1101', code: '1.10.1', chapitre: '1', titre: 'Critère de test 1.10.1', champ_application: null },
    { id: 'k122', code: '1.2.2', chapitre: '1', titre: 'Critère de test 1.2.2', champ_application: null },
  )
  await installerFauxSupabase(page, tables, CLIENT)
  await page.goto('/dashboard/certification?chapitre=1')

  await expect(page.getByTestId('theme-1.10')).toBeVisible()
  const themes = await page.locator('[data-testid^="theme-"]').evaluateAll(els => els.map(e => e.getAttribute('data-testid')))
  expect(themes).toEqual(['theme-1.1', 'theme-1.2', 'theme-1.10'])

  await page.getByTestId('critere-1.2.2').click()
  await expect(page.getByText('3 / 4')).toBeVisible()
  await page.getByRole('button', { name: /1\.10\.1/ }).click()
  await expect(page).toHaveURL(/critere=1\.10\.1/)
})

test('précédent / suivant restent dans le chapitre', async ({ page }) => {
  await installerFauxSupabase(page, donneesDeBase(), CLIENT)
  await page.goto('/dashboard/certification?critere=1.2.1')
  await expect(page.getByText('2 / 2')).toBeVisible()
  await expect(page.getByRole('button', { name: /Dernier/ })).toBeDisabled()

  await page.goto('/dashboard/certification?critere=2.3.2')
  await expect(page.getByText('1 / 2')).toBeVisible()
  await expect(page.getByRole('button', { name: /Premier/ })).toBeDisabled()
  await page.getByRole('button', { name: /2\.4\.1/ }).click()
  await expect(page).toHaveURL(/critere=2\.4\.1/)
})

test('le filtre de statut agit dans le chapitre sans casser la navigation', async ({ page }) => {
  await installerFauxSupabase(page, donneesDeBase(), CLIENT)
  await page.goto('/dashboard/certification?chapitre=1')

  await page.getByRole('button', { name: 'Prêt pour audit', exact: true }).click()
  await expect(page.getByTestId('critere-1.1.1')).toBeVisible()
  await expect(page.getByTestId('critere-1.2.1')).toHaveCount(0)

  await page.getByTestId('critere-1.1.1').click()
  await expect(page.getByText('1 / 2')).toBeVisible()
  await expect(page.getByRole('button', { name: /1\.2\.1/ })).toBeEnabled()
})

test('un filtre sans résultat affiche un message clair', async ({ page }) => {
  await installerFauxSupabase(page, donneesDeBase(), CLIENT)
  await page.goto('/dashboard/certification?chapitre=3')
  await page.getByRole('button', { name: 'Action corrective', exact: true }).click()
  await expect(page.getByText('Aucun critère de ce chapitre ne correspond au filtre choisi.')).toBeVisible()
})
