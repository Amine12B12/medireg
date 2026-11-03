import { test, expect } from '@playwright/test'
import { donneesDeBase, installerFauxSupabase } from './faux-supabase'
import { refusPretAudit } from '../src/lib/etat-critere'

// Mémo du 22 octobre (R4) : pas de « prêt pour audit » sans les preuves attendues ou une justification ;
// pas de signature d'un modèle encore à compléter.

const attendus = [{ code: 'USA-DOC-01', nom: 'Charte ethique' }]

test('règle : preuve manquante sans justification = refus', () => {
  expect(refusPretAudit(attendus, {}, {})).toContain('Charte ethique')
  expect(refusPretAudit(attendus, { 'USA-DOC-01': [{}] }, {})).toBeNull()
  expect(refusPretAudit(attendus, {}, { __justification_preuves: 'Charte intégrée au livret d’accueil' })).toBeNull()
})

test('« Prêt pour audit » est refusé tant que des preuves attendues manquent', async ({ page }) => {
  const tables = donneesDeBase()
  tables.documents_qualite = [
    { id: 'd1', etablissement_id: 'e1', critere_id: 'k121', code_doc: 'PREUVE_1.2.1', nom: 'Scan', type_doc: 'preuve', url: 'x', statut: 'genere', created_at: '2026-10-01' },
  ]
  // Le passage en « prêt pour audit » est un geste du consultant.
  const { ecritures } = await installerFauxSupabase(page, tables, { id: 'cons-A', email: 'a@test.fr' })
  await page.goto('/dashboard/certification?client_id=c1&chapitre=1')
  await page.getByText("Libre choix de l'usager").click()
  await page.getByRole('button', { name: 'Prêt pour audit' }).last().click()
  await expect(page.getByText(/Pas encore prêt pour audit : preuve\(s\) manquante\(s\)/)).toBeVisible()
  await page.waitForTimeout(300)
  expect(JSON.stringify(ecritures.filter(e => e.table === 'reponses_criteres'))).not.toContain('pret_audit')
})

test('un modèle encore à compléter ne peut pas être signé', async ({ page }) => {
  const tables = donneesDeBase()
  tables.criteres_psdm.push({ id: 'k243', code: '2.4.3', chapitre: '2', titre: 'Réparation en cas de panne', champ_application: null })
  await installerFauxSupabase(page, tables, { id: 'u-client', email: 'client@test.fr' })
  await page.goto('/dashboard/certification?chapitre=2')
  await page.getByText('Réparation en cas de panne').click()
  await page.getByRole('button', { name: 'Créer et signer' }).first().click()
  await page.getByRole('button', { name: 'Signer le document' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Modèle encore à compléter' })).toContainText('Continuite du service')
  await expect(page.getByRole('button', { name: 'Signer et valider' })).toBeDisabled()
})
