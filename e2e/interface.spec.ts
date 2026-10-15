import { test, expect, type Page } from '@playwright/test'
import { mkdirSync } from 'fs'
import { donneesDeBase, installerFauxSupabase } from './faux-supabase'

// Interface MediReg : chaque page du tableau de bord s'affiche, sur ordinateur et sur mobile, sans débordement horizontal.
// Captures dans e2e/.captures pour la revue visuelle (Supabase entièrement simulé).

const CLIENT = { id: 'u-client', email: 'client@test.fr' }
const PAGES = ['', 'certification', 'conformite', 'documents', 'taches', 'audits', 'referentiel', 'rh', 'notifications', 'pilotage', 'reseau', 'bibliotheque', 'profil', 'assistant', 'clients', 'onboarding']

async function parcourir(page: Page, appareil: string, largeur: number) {
  const d: string[] = []
  for (const p of PAGES) {
    await page.goto(`/dashboard${p ? `/${p}` : ''}`)
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: `e2e/.captures/${appareil}-${p || 'accueil'}.png`, fullPage: true })
    const l = await page.evaluate(() => document.documentElement.scrollWidth)
    if (l > largeur + 1) {
      const fautif = await page.evaluate((w) => {
        const e = [...document.querySelectorAll('body *')].find((x) => x.getBoundingClientRect().right > w + 1 && x.children.length === 0)
        return e ? `${e.tagName.toLowerCase()} « ${(e.textContent ?? '').trim().slice(0, 30)} »` : '?'
      }, largeur)
      d.push(`${p || 'accueil'} (${l}px : ${fautif})`)
    }
  }
  return d
}

test.beforeAll(() => { mkdirSync('e2e/.captures', { recursive: true }) })

test('bureau : toutes les pages du tableau de bord s’affichent sans débordement', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 1440, height: 900 })
  await installerFauxSupabase(page, donneesDeBase(), CLIENT)
  const d = await parcourir(page, 'bureau', 1440)
  expect(d).toEqual([])
})

test('mobile : aucune page ne déborde', async ({ page }) => {
  test.setTimeout(240_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await installerFauxSupabase(page, donneesDeBase(), CLIENT)
  const d = await parcourir(page, 'mobile', 390)
  console.log('Débordements mobile MediReg :', d.join(', ') || 'aucun')
  expect(d).toEqual([])
})
