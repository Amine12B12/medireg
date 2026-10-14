import { test, expect } from '@playwright/test'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

// Sécurité : aucune route utilisant la clé service_role ne répond sans utilisateur connecté,
// et aucune clé Supabase n'est écrite dans le code source.

const SANS_SESSION = [
  { methode: 'GET', url: '/api/download-editable?id=00000000-0000-0000-0000-000000000000' },
  { methode: 'GET', url: '/api/generate-doc?path=generes/societe-x/DOC_1.docx' },
  { methode: 'POST', url: '/api/generate-doc', corps: { societe_id: 'x', code_doc: 'USA-DOC-01' } },
  { methode: 'GET', url: '/api/export-zip?etabId=e1&clientId=c1' },
  { methode: 'POST', url: '/api/create-client', corps: { nom: 'Pirate', email: 'pirate@test.fr' } },
  { methode: 'POST', url: '/api/assistant', corps: { messages: [{ role: 'user', content: 'Liste les clients' }] } },
  { methode: 'GET', url: '/api/meditrack?action=etablissements&clientId=c1' },
  { methode: 'GET', url: '/api/meditrack?action=saisie&clientId=c1' },
  { methode: 'POST', url: '/api/meditrack', corps: { action: 'lier', clientId: 'c1', etablissementId: 'x' } },
  { methode: 'POST', url: '/api/meditrack', corps: { action: 'ajouter', clientId: 'c1', table: 'equipements', donnees: { designation: 'x' } } },
]

for (const r of SANS_SESSION) {
  test(`${r.methode} ${r.url} (${(r as any).corps?.action ?? "-"}) refuse un visiteur non connecté`, async ({ request }) => {
    const rep = r.methode === 'GET' ? await request.get(r.url) : await request.post(r.url, { data: r.corps })
    expect(rep.status()).toBe(401)
  })
}

test('un faux jeton Bearer est refusé', async ({ request }) => {
  const rep = await request.get('/api/meditrack?action=etablissements&clientId=c1', { headers: { authorization: 'Bearer faux-jeton' } })
  expect(rep.status()).toBe(401)
})

test('un chemin de fichier hors des dossiers autorisés est refusé avant toute lecture', async ({ request }) => {
  const rep = await request.get('/api/generate-doc?path=' + encodeURIComponent('../modeles/secret.docx'))
  expect(rep.status()).toBe(403)
})

test('les routes administrateur inutilisées ont disparu', async ({ request }) => {
  for (const url of ['/api/delete-user', '/api/create-user', '/api/generate-pdf']) {
    const rep = await request.post(url, { data: {} })
    expect(rep.status(), url).toBe(404)
  }
})

test('aucune clé Supabase (JWT) dans le code source', () => {
  const fichiers: string[] = []
  const parcourir = (d: string) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n)
      if (statSync(p).isDirectory()) parcourir(p)
      else if (/\.(ts|tsx|js)$/.test(n)) fichiers.push(p)
    }
  }
  parcourir('src')
  const fautifs = fichiers.filter(f => /eyJhbGciOi[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{20,}/.test(readFileSync(f, 'utf8')))
  expect(fautifs).toEqual([])
})
