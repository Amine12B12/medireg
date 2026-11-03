import { test, expect } from '@playwright/test'
import { donneesDeBase, installerFauxSupabase } from './faux-supabase'
import { plansManquants, statutAffiche } from '../src/lib/etat-critere'

// Mémo du 22 octobre (R3) : réponse saisie, analyse et validation distinctes ;
// un « Non » ou « Partiel » appelle une action, un responsable et une échéance.

test('règles : une réponse enregistrée n’est plus « non analysé » ; plan complet exigé', () => {
  expect(statutAffiche({ statut: 'non_analyse', reponses_questions: { q1: 'Non' } })).toBe('reponse_saisie')
  expect(statutAffiche({ statut: 'non_analyse', reponses_questions: {} })).toBe('non_analyse')
  expect(statutAffiche({ statut: 'pret_audit', reponses_questions: { q1: 'Oui' } })).toBe('pret_audit')
  expect(plansManquants({ q1: 'Non', q2: 'Oui' })).toEqual(['q1'])
  expect(plansManquants({ q1: 'Partiel', __plan_actions: { q1: { action: 'Former', responsable: 'Mme X', echeance: '2026-12-01' } } })).toEqual([])
})

test('un « Non » ouvre le plan d’action, enregistré avec la réponse ; la liste affiche « à analyser »', async ({ page }) => {
  const tables = donneesDeBase()
  tables.criteres_psdm.push({ id: 'k348', code: '3.4.8', chapitre: '3', titre: 'Contrôle entre deux usagers', champ_application: null })
  const { ecritures } = await installerFauxSupabase(page, tables, { id: 'u-client', email: 'client@test.fr' })
  await page.goto('/dashboard/certification?chapitre=3')
  await page.getByText('Contrôle entre deux usagers').click()
  await page.getByRole('button', { name: '✗ Non' }).first().click()
  const plan = page.getByRole('region', { name: "Plan d'action" })
  await expect(plan.getByRole('status')).toContainText('1 plan(s) incomplet(s)')
  await plan.getByPlaceholder('Action corrective').fill('Mettre en place une fiche de contrôle')
  await plan.getByPlaceholder('Responsable').fill('Responsable technique')
  await plan.locator('input[type="date"]').fill('2026-12-15')
  await expect(plan.getByRole('status')).toHaveCount(0)
  await page.getByRole('button', { name: 'Enregistrer mes réponses' }).click()
  await expect.poll(() => ecritures.filter(e => e.table === 'reponses_criteres').length).toBeGreaterThan(0)
  const corps = JSON.stringify(ecritures.filter(e => e.table === 'reponses_criteres').map(e => e.corps))
  expect(corps).toContain('Mettre en place une fiche de contrôle')
  expect(corps).toContain('2026-12-15')
  await expect(page.getByRole('list', { name: 'Étapes du critère' })).toContainText('✓ Réponse saisie')
})
