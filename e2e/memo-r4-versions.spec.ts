import { test, expect } from '@playwright/test'
import { donneesDeBase, installerFauxSupabase } from './faux-supabase'

// Mémo du 22 octobre (R4) : conserver les versions des protocoles. Un document signé n'est jamais écrasé.
test('modifier un protocole signé crée une nouvelle version, la version signée reste intacte', async ({ page }) => {
  const tables = donneesDeBase()
  tables.criteres_psdm.push({ id: 'k348', code: '3.4.8', chapitre: '3', titre: 'Contrôle entre deux usagers', champ_application: null })
  tables.documents_editables = [{
    id: 'v1', etablissement_id: 'e1', template_code: 'ATTEST-ENTRE-USAGERS', titre: 'Attestation', statut: 'signe',
    signe_par: 'Mme Responsable', signe_le: '2026-10-01T10:00:00Z', updated_at: '2026-10-01T10:00:00Z',
    contenu: [{ id: 's1', titre: 'Identité du signataire', contenu: 'Version signée', modifiable: true }],
  }]
  const { ecritures } = await installerFauxSupabase(page, tables, { id: 'u-client', email: 'client@test.fr' })
  await page.goto('/dashboard/certification?chapitre=3')
  await page.getByText('Contrôle entre deux usagers').click()
  await page.getByRole('button', { name: /Modifier|Créer et signer/ }).first().click()
  await expect(page.getByLabel('Versions signées')).toContainText('Version 1 — signée le 01/10/2026 par Mme Responsable')
  await page.getByRole('button', { name: 'Sauvegarder' }).click()
  await expect.poll(() => ecritures.filter(e => e.table === 'documents_editables').length).toBeGreaterThan(0)
  const ecr = ecritures.filter(e => e.table === 'documents_editables')
  expect(ecr.every(e => e.methode === 'POST')).toBe(true) // insertion d'une nouvelle version, jamais de mise à jour
  expect(tables.documents_editables.find((d: any) => d.id === 'v1')?.statut).toBe('signe')
})
