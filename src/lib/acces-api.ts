// Contrôle d'accès des routes API. Toutes les routes qui utilisent la clé service_role
// (qui contourne les règles RLS de Supabase) DOIVENT d'abord passer par ces fonctions.

import { createServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export type Profil = { id: string; role: string; client_id: string | null }

export class RefusAcces extends Error {
  constructor(public statut: 401 | 403 | 404, message: string) { super(message) }
}

export const reponseRefus = (e: unknown) => {
  if (e instanceof RefusAcces) return NextResponse.json({ error: e.message }, { status: e.statut })
  throw e
}

export function adminMedireg(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

// Utilisateur connecté : session des cookies (appels du navigateur, liens <a href>)
// ou en-tête Authorization: Bearer <jeton>.
export async function utilisateurConnecte(req: Request): Promise<Profil> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  let userId: string | null = null

  const bearer = req.headers.get('authorization')
  if (bearer?.toLowerCase().startsWith('bearer ')) {
    // Le jeton doit être passé explicitement : sans session stockée, getUser() n'utilise pas l'en-tête global
    const { data } = await createClient(url, anon, { auth: { persistSession: false } }).auth.getUser(bearer.slice(7).trim())
    userId = data.user?.id ?? null
  }
  if (!userId) {
    const jar = await cookies()
    const sb = createServerClient(url, anon, { cookies: { getAll: () => jar.getAll(), setAll: () => {} } })
    const { data } = await sb.auth.getUser()
    userId = data.user?.id ?? null
  }
  if (!userId) throw new RefusAcces(401, 'Vous devez être connecté.')

  const { data: prof } = await adminMedireg().from('profiles').select('id, role, client_id').eq('id', userId).single()
  if (!prof) throw new RefusAcces(403, 'Profil introuvable.')
  return prof as Profil
}

export const estConsultant = (p: Profil) => p.role === 'consultant' || p.role === 'admin'

// Un client accède à son propre dossier ; un consultant aux clients qui lui sont attribués ; un admin à tout.
export async function verifierAccesClient(p: Profil, clientId: string | null | undefined) {
  if (!clientId) throw new RefusAcces(404, 'Client introuvable.')
  if (p.role === 'admin') return
  if (p.role === 'consultant') {
    const { data } = await adminMedireg().from('clients').select('id').eq('id', clientId).eq('consultant_id', p.id).maybeSingle()
    if (data) return
  } else if (p.client_id === clientId) {
    return
  }
  throw new RefusAcces(403, "Vous n'avez pas accès à ce client.")
}

export async function clientDeSociete(societeId: string | null | undefined): Promise<string | null> {
  if (!societeId) return null
  const { data } = await adminMedireg().from('societes').select('client_id').eq('id', societeId).maybeSingle()
  return data?.client_id ?? null
}

export async function clientDEtablissement(etabId: string | null | undefined): Promise<{ clientId: string | null; societeId: string | null }> {
  if (!etabId) return { clientId: null, societeId: null }
  const { data } = await adminMedireg().from('etablissements_psdm').select('societe_id').eq('id', etabId).maybeSingle()
  return { clientId: await clientDeSociete(data?.societe_id), societeId: data?.societe_id ?? null }
}

export async function verifierAccesEtablissement(p: Profil, etabId: string | null | undefined) {
  const { clientId, societeId } = await clientDEtablissement(etabId)
  await verifierAccesClient(p, clientId)
  return { clientId: clientId!, societeId: societeId! }
}
