import { test, expect } from '@playwright/test'
import { donneesDeBase, installerFauxSupabase } from './faux-supabase'

// Lot 4 : textes des chapitres et des thèmes

const CLIENT = { id: 'u-client', email: 'client@test.fr' }

test('les noms de chapitres sont correctement accentués', async ({ page }) => {
  await installerFauxSupabase(page, donneesDeBase(), CLIENT)
  await page.goto('/dashboard/certification')
  await expect(page.getByTestId('chapitre-1')).toContainText('Éthique, droits et satisfaction')
  await expect(page.getByTestId('chapitre-2')).toContainText('Distribution et réalisation')
  await expect(page.getByTestId('chapitre-4')).toContainText('Qualité et risques')
})

test('le bandeau du chapitre dit ce que l’auditeur regarde', async ({ page }) => {
  await installerFauxSupabase(page, donneesDeBase(), CLIENT)
  await page.goto('/dashboard/certification?chapitre=2')
  const auditeur = page.getByTestId('auditeur-chapitre')
  await expect(auditeur).toContainText('Ce que l’auditeur regarde en priorité')
  await expect(auditeur.locator('li')).toHaveCount(3)
  await expect(auditeur).toContainText('traçabilité de chaque prescription')
})

test('les thèmes connus ont un nom, les autres gardent leur numéro', async ({ page }) => {
  await installerFauxSupabase(page, donneesDeBase(), CLIENT)
  await page.goto('/dashboard/certification?chapitre=1')
  await expect(page.getByTestId('theme-1.2').getByRole('heading')).toHaveText("1.2 · Droits de l'usager")
  await expect(page.getByTestId('theme-1.1').getByRole('heading')).toHaveText('Thème 1.1')

  await page.goto('/dashboard/certification?chapitre=2')
  await expect(page.getByTestId('theme-2.3').getByRole('heading')).toHaveText('2.3 · Livraison et installation')
  await expect(page.getByTestId('theme-2.4').getByRole('heading')).toHaveText('2.4 · Suivi et maintenance')
})
