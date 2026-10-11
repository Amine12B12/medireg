import type { Page, Route } from '@playwright/test'

// Faux backend Supabase pour les tests : intercepte TOUTES les requêtes vers *.supabase.co.
// Les lectures sont servies depuis des tables en mémoire, les écritures y sont enregistrées
// pour que les tests puissent les vérifier. Rien n'atteint la vraie base.

export type Ligne = Record<string, any>
export type Tables = Record<string, Ligne[]>

export type Ecriture = { table: string; methode: string; corps: any; filtres: Record<string, string> }

const REF = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bhqsaajduogwebaovxsd.supabase.co').hostname.split('.')[0]

function correspond(ligne: Ligne, filtres: Record<string, string>): boolean {
  return Object.entries(filtres).every(([col, expr]) => {
    const i = expr.indexOf('.')
    const op = expr.slice(0, i)
    const val = expr.slice(i + 1)
    const v = ligne[col]
    if (op === 'eq') return String(v) === val
    if (op === 'neq') return String(v) !== val
    if (op === 'in') return val.replace(/^\(|\)$/g, '').split(',').map((x) => x.replace(/"/g, '')).includes(String(v))
    if (op === 'is') return val === 'null' ? v == null : String(v) === val
    return true
  })
}

const PARAMS_IGNORES = new Set(['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'])

export async function installerFauxSupabase(page: Page, tables: Tables, user: { id: string; email: string }) {
  const ecritures: Ecriture[] = []

  // Session dans le cookie attendu par @supabase/ssr (sinon getUser() ne fait aucune requête)
  const session = {
    access_token: 'faux-jeton',
    refresh_token: 'faux-refresh',
    token_type: 'bearer',
    expires_in: 3600 * 24,
    expires_at: Math.floor(Date.now() / 1000) + 3600 * 24,
    user: { id: user.id, email: user.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} },
  }
  const valeur = 'base64-' + Buffer.from(JSON.stringify(session)).toString('base64url')
  await page.context().addCookies([{ name: `sb-${REF}-auth-token`, value: valeur, domain: 'localhost', path: '/' }])

  await page.route(/supabase\.co\//, async (route: Route) => {
    const req = route.request()
    const url = new URL(req.url())

    if (url.pathname.startsWith('/auth/v1/user')) {
      return route.fulfill({ json: session.user })
    }
    if (url.pathname.startsWith('/auth/v1/')) {
      return route.fulfill({ json: {} })
    }
    if (!url.pathname.startsWith('/rest/v1/')) {
      // Storage, realtime, fonctions… : jamais vers la vraie base
      return route.fulfill({ status: 200, json: {} })
    }

    const table = url.pathname.replace('/rest/v1/', '')
    const filtres: Record<string, string> = {}
    url.searchParams.forEach((v, k) => { if (!PARAMS_IGNORES.has(k)) filtres[k] = v })
    const methode = req.method()
    const objetUnique = (req.headers()['accept'] || '').includes('vnd.pgrst.object')

    if (methode === 'GET' || methode === 'HEAD') {
      const lignes = (tables[table] || []).filter((l) => correspond(l, filtres))
      if (objetUnique) {
        if (lignes.length !== 1) return route.fulfill({ status: 406, json: { code: 'PGRST116', message: 'no rows' } })
        return route.fulfill({ json: lignes[0] })
      }
      return route.fulfill({ json: lignes })
    }

    const corps = req.postDataJSON?.() ?? null
    ecritures.push({ table, methode, corps, filtres })
    if (methode === 'POST') {
      const nouvelles = (Array.isArray(corps) ? corps : [corps]).map((l: Ligne, i: number) => ({ id: `${table}-${Date.now()}-${i}`, ...l }))
      tables[table] = [...(tables[table] || []), ...nouvelles]
      return route.fulfill({ status: 201, json: objetUnique ? nouvelles[0] : nouvelles })
    }
    if (methode === 'PATCH') {
      for (const l of tables[table] || []) if (correspond(l, filtres)) Object.assign(l, corps)
      return route.fulfill({ status: 200, json: [] })
    }
    return route.fulfill({ status: 204, body: '' })
  })

  return { ecritures }
}

// Jeu de données de base : un client "c1" suivi par le consultant "cons-A",
// un second consultant "cons-B" qui ne doit jamais rien recevoir pour c1.
export function donneesDeBase(): Tables {
  const criteres = [
    { id: 'k111', code: '1.1.1', chapitre: '1', titre: 'Respect des droits des usagers', champ_application: null },
    { id: 'k121', code: '1.2.1', chapitre: '1', titre: "Libre choix de l'usager", champ_application: null },
    { id: 'k232', code: '2.3.2', chapitre: '2', titre: 'Traçabilité des livraisons', champ_application: null },
    { id: 'k241', code: '2.4.1', chapitre: '2', titre: 'Maintenance du matériel', champ_application: null },
    { id: 'k311', code: '3.1.1', chapitre: '3', titre: 'Gestion des compétences', champ_application: null },
    { id: 'k411', code: '4.1.1', chapitre: '4', titre: 'Gestion des risques', champ_application: null },
    { id: 'kox', code: '2.6.1', chapitre: '2', titre: 'Oxygénothérapie à domicile', champ_application: 'Oxygene' },
  ]
  return {
    profiles: [
      { id: 'u-client', role: 'client', client_id: 'c1', nom: 'Client', prenom: 'Test', email: 'client@test.fr' },
      { id: 'cons-A', role: 'consultant', client_id: null, nom: 'Consultant', prenom: 'A', email: 'a@test.fr' },
      { id: 'cons-B', role: 'consultant', client_id: null, nom: 'Consultant', prenom: 'B', email: 'b@test.fr' },
    ],
    clients: [{ id: 'c1', nom: 'Société Test', consultant_id: 'cons-A', meditrack_etablissement_id: null, forfait: 'starter', statut: 'actif' }],
    societes: [{ id: 's1', client_id: 'c1', raison_sociale: 'Société Test', logo_url: null, personnes: [] }],
    etablissements_psdm: [{ id: 'e1', societe_id: 's1', nom: 'Site principal', created_at: '2026-01-01' }],
    criteres_psdm: criteres,
    reponses_criteres: [
      { id: 'r1', etablissement_id: 'e1', critere_id: 'k111', statut: 'pret_audit' },
      { id: 'r2', etablissement_id: 'e1', critere_id: 'k232', statut: 'pret_audit' },
      { id: 'r3', etablissement_id: 'e1', critere_id: 'k241', statut: 'action_corrective' },
    ],
    activites_etablissement: [{ etablissement_id: 'e1', activite: 'VPH', mode: 'direct' }],
    documents_qualite: [],
    documents_editables: [],
    messages_critere: [],
    notifications: [],
  }
}
