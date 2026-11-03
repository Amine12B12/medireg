import { test, expect } from '@playwright/test'
import { donneesDeBase, installerFauxSupabase } from './faux-supabase'

// Mémo du 22 octobre (R2) : le critère 3.4.8 ouvrait le modèle SAV qui cite le 2.4.3.
// Il a désormais son modèle, et le contrôle entre deux usagers reste distinct de la désinfection.

test('le critère 3.4.8 ouvre son propre modèle, sans renvoi au 2.4.3', async ({ page }) => {
  const tables = donneesDeBase()
  tables.criteres_psdm.push({ id: 'k348', code: '3.4.8', chapitre: '3', titre: 'Contrôle entre deux usagers', champ_application: null })
  await installerFauxSupabase(page, tables, { id: 'u-client', email: 'client@test.fr' })
  await page.goto('/dashboard/certification?chapitre=3')
  await page.getByText('Contrôle entre deux usagers').click()
  await expect(page.getByText('Attestation de contrôle technique entre deux usagers')).toBeVisible()
  await expect(page.getByText('Procédure de nettoyage et désinfection')).toBeVisible()
  await page.getByRole('button', { name: 'Créer et signer' }).first().click()
  await expect(page.getByText('Nettoyage et désinfection (étape distincte)')).toBeVisible()
  await expect(page.getByText(/critère 3\.4\.8/).first()).toBeVisible()
  await expect(page.getByText(/2\.4\.3/)).toHaveCount(0)
})
