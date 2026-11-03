import { test, expect } from '@playwright/test'
import { donneesDeBase, installerFauxSupabase } from './faux-supabase'
import { raisonNonApplicable } from '../src/lib/applicabilite'

// Mémo du 22 octobre (R1) : l'écart entre critères annoncés et affichés s'explique à l'écran,
// chaque critère non applicable avec sa justification.

test('règle : un critère écarté donne sa raison', () => {
  expect(raisonNonApplicable('Oxygene', ['VPH'])).toBe("Ne concerne que : oxygénothérapie. Activité non déclarée par l'établissement.")
  expect(raisonNonApplicable('Tous', ['VPH'])).toBeNull()
  expect(raisonNonApplicable('Oxygene', ['Oxygénothérapie'])).toBeNull()
})

test("la page de certification explique l'écart et liste les critères non applicables", async ({ page }) => {
  await installerFauxSupabase(page, donneesDeBase(), { id: 'u-client', email: 'client@test.fr' })
  await page.goto('/dashboard/certification')
  const bloc = page.locator('details[aria-label="Critères du référentiel"]')
  await expect(bloc).toContainText('7 critères au référentiel : 6 applicables à votre établissement, 1 non applicable')
  await bloc.locator('summary').click()
  await expect(bloc).toContainText('2.6.1')
  await expect(bloc).toContainText('Ne concerne que : oxygénothérapie')
  await expect(page.getByText('60 criteres')).toHaveCount(0)
})
