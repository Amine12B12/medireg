import { test, expect } from '@playwright/test'
import { donneesDeBase, installerFauxSupabase } from './faux-supabase'

// Lot 2 : accueil Certification par chapitres, « Continuer », « Reprendre », position dans l'URL

const CLIENT = { id: 'u-client', email: 'client@test.fr' }

test("l'accueil présente les 4 chapitres au lieu de tous les critères", async ({ page }) => {
  await installerFauxSupabase(page, donneesDeBase(), CLIENT)
  await page.goto('/dashboard/certification')

  for (const n of ['1', '2', '3', '4']) await expect(page.getByTestId(`chapitre-${n}`)).toBeVisible()
  await expect(page.getByText("Libre choix de l'usager")).toHaveCount(0)

  const chap2 = page.getByTestId('chapitre-2')
  await expect(chap2).toContainText('Distribution')
  await expect(chap2).toContainText('Prêts pour l’audit : 1 / 2')
  await expect(chap2).toContainText('1 action corrective')
  // le score global reste affiché au-dessus
  await expect(page.getByText('2 / 6 prêts pour audit')).toBeVisible()
})

test('« Continuer » ouvre le critère qui bloque en premier', async ({ page }) => {
  await installerFauxSupabase(page, donneesDeBase(), CLIENT)
  await page.goto('/dashboard/certification')

  await page.getByTestId('chapitre-2').getByRole('button', { name: /Continuer/ }).click()
  await expect(page).toHaveURL(/critere=2\.4\.1/)
  await expect(page.getByText('Maintenance du matériel').first()).toBeVisible()
  await expect(page.getByText('Chapitre 2 —').first()).toBeVisible()
})

test('pour un consultant, « Continuer » propose d’abord les critères à valider', async ({ page }) => {
  const tables = donneesDeBase()
  tables.reponses_criteres.push({ id: 'r4', etablissement_id: 'e1', critere_id: 'k121', statut: 'procedure_a_valider' })
  await installerFauxSupabase(page, tables, { id: 'cons-A', email: 'a@test.fr' })
  await page.goto('/dashboard/certification?client_id=c1')

  const chap1 = page.getByTestId('chapitre-1')
  await expect(chap1).toContainText('1 à valider')
  await chap1.getByRole('button', { name: /Continuer · 1\.2\.1/ }).click()
  await expect(page).toHaveURL(/client_id=c1/)
  await expect(page).toHaveURL(/critere=1\.2\.1/)
})

test('la position est gardée au rechargement et le bouton retour fonctionne', async ({ page }) => {
  await installerFauxSupabase(page, donneesDeBase(), CLIENT)
  await page.goto('/dashboard/certification')

  await page.getByTestId('chapitre-1').getByRole('button', { name: /Voir l/ }).click()
  await expect(page).toHaveURL(/chapitre=1/)
  await expect(page.getByText("Libre choix de l'usager")).toBeVisible()
  await expect(page.getByText('Traçabilité des livraisons')).toHaveCount(0)

  await page.getByText("Libre choix de l'usager").click()
  await expect(page).toHaveURL(/critere=1\.2\.1/)
  await expect(page.getByRole('button', { name: 'Soumettre pour validation' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('button', { name: 'Soumettre pour validation' })).toBeVisible()

  await page.goBack()
  await expect(page).toHaveURL(/chapitre=1(?!.*critere)/)
  await expect(page.getByText("Libre choix de l'usager")).toBeVisible()

  await page.goBack()
  await expect(page.getByTestId('chapitre-1')).toBeVisible()
})

test('le fil d’Ariane ramène à l’accueil des chapitres', async ({ page }) => {
  await installerFauxSupabase(page, donneesDeBase(), CLIENT)
  await page.goto('/dashboard/certification?chapitre=3')
  await expect(page.getByText('Gestion des compétences')).toBeVisible()
  await page.getByRole('navigation', { name: 'Fil d’Ariane' }).getByRole('button', { name: 'Certification' }).click()
  await expect(page.getByTestId('chapitre-3')).toBeVisible()
})

test('« Reprendre » propose le dernier critère ouvert', async ({ page }) => {
  await installerFauxSupabase(page, donneesDeBase(), CLIENT)
  await page.goto('/dashboard/certification')
  await expect(page.getByTestId('reprendre')).toHaveCount(0)

  await page.getByTestId('chapitre-2').getByRole('button', { name: /Continuer/ }).click()
  await expect(page).toHaveURL(/critere=2\.4\.1/)
  await page.goto('/dashboard/certification')

  const reprendre = page.getByTestId('reprendre')
  await expect(reprendre).toContainText('2.4.1')
  await reprendre.click()
  await expect(page).toHaveURL(/critere=2\.4\.1/)
})
