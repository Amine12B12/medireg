import { test, expect } from '@playwright/test'
import { critereApplicable } from '../src/lib/applicabilite'
import { donneesDeBase, installerFauxSupabase } from './faux-supabase'

// Lot 5 : applicabilité des critères selon toutes les activités, erreurs affichées dans la page

test.describe("règle d'applicabilité", () => {
  test('un critère sans champ ou « Tous » s’applique à tout le monde', () => {
    expect(critereApplicable(null, [])).toBe(true)
    expect(critereApplicable('Tous', [])).toBe(true)
    expect(critereApplicable('Toutes activités', ['Vente'])).toBe(true)
  })
  test('les accents et la casse ne changent rien', () => {
    expect(critereApplicable('Oxygène', ['Oxygene'])).toBe(true)
    expect(critereApplicable('OXYGENOTHERAPIE', ['Oxygene'])).toBe(true)
    expect(critereApplicable('Oxygène', ['Vente', 'Location'])).toBe(false)
  })
  test('les autres activités sont prises en compte (avant : seulement oxygène et VPH)', () => {
    expect(critereApplicable('Nutrition', ['Vente'])).toBe(false)
    expect(critereApplicable('Nutrition', ['Nutrition'])).toBe(true)
    expect(critereApplicable('Stomie / Continence', ['Continence'])).toBe(true)
    expect(critereApplicable('Diabète', ['Diabete'])).toBe(true)
    expect(critereApplicable('VPH', ['Handicap VPH'])).toBe(true)
    expect(critereApplicable('MAD', ['Handicap VPH'])).toBe(false)
  })
  test('un mot ne doit pas être reconnu au milieu d’un autre', () => {
    // « mad » ne doit pas être trouvé dans « nomade »
    expect(critereApplicable('Prestation nomade', [])).toBe(true)
  })
})

test('les critères hors activité sont masqués et le score en tient compte', async ({ page }) => {
  const tables = donneesDeBase()
  tables.criteres_psdm.push({ id: 'knut', code: '2.7.1', chapitre: '2', titre: 'Nutrition entérale', champ_application: 'Nutrition' })
  tables.criteres_psdm.push({ id: 'koxa', code: '2.6.2', chapitre: '2', titre: 'Oxygène accentué', champ_application: 'Oxygène' })
  await installerFauxSupabase(page, tables, { id: 'u-client', email: 'client@test.fr' })
  await page.goto('/dashboard/certification?chapitre=2')
  await expect(page.getByTestId('critere-2.3.2')).toBeVisible()
  await expect(page.getByTestId('critere-2.7.1')).toHaveCount(0)
  await expect(page.getByTestId('critere-2.6.2')).toHaveCount(0)
  await expect(page.getByText('2 / 6 prêts pour audit')).toBeVisible()
})

test('un envoi de preuve qui échoue affiche un message clair, sans alerte navigateur', async ({ page }) => {
  await installerFauxSupabase(page, donneesDeBase(), { id: 'u-client', email: 'client@test.fr' })
  await page.route(/supabase\.co\/storage\//, route => route.fulfill({ status: 400, json: { error: 'Payload too large', message: 'too large' } }))
  let alerte = false
  page.on('dialog', d => { alerte = true; d.dismiss() })

  await page.goto('/dashboard/certification?critere=1.2.1')
  await page.locator('input[type="file"]').first().setInputFiles({ name: 'procedure.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') })

  const msg = page.getByRole('alert').filter({ hasText: 'procedure.pdf' })
  await expect(msg).toContainText('« procedure.pdf » n\'a pas pu être envoyé')
  expect(alerte).toBe(false)

  await msg.getByRole('button', { name: 'Fermer le message' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'procedure.pdf' })).toHaveCount(0)
})
