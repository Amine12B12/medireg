// Mémo du 22 octobre (R3) : distinguer la réponse saisie, l'analyse (consultant) et la validation (prêt pour audit).
// Un « Non » ou « Partiel » appelle un plan d'action : action, responsable, échéance.
// Pas de nouvelle colonne : le plan est rangé dans reponses_questions, sous la clé PLAN.

export const PLAN = '__plan_actions'
export type ActionCorrective = { action: string; responsable: string; echeance: string }
type Reponse = { statut?: string | null; reponses_questions?: Record<string, unknown> | null } | null | undefined

const estNegative = (v: unknown) =>
  v === false || (typeof v === 'string' && ['non', 'partiel', 'partielle', 'partiellement'].includes(v.trim().toLowerCase()))

/** Questions auxquelles l'établissement a répondu « Non » ou « Partiel ». */
export function questionsNegatives(rq: Record<string, unknown> | null | undefined): string[] {
  return Object.entries(rq ?? {}).filter(([k, v]) => k !== PLAN && estNegative(v)).map(([k]) => k)
}

export function aDesReponses(rq: Record<string, unknown> | null | undefined): boolean {
  return Object.entries(rq ?? {}).some(([k, v]) => k !== PLAN && v !== null && v !== undefined && v !== '')
}

/** Statut affiché : « réponse saisie, à analyser » plutôt que « non analysé » dès qu'une réponse existe. */
export function statutAffiche(r: Reponse): string {
  const statut = r?.statut || 'non_analyse'
  return statut === 'non_analyse' && aDesReponses(r?.reponses_questions) ? 'reponse_saisie' : statut
}

export function etapesCritere(r: Reponse): { reponse: boolean; analyse: boolean; validation: boolean } {
  const statut = r?.statut || 'non_analyse'
  return { reponse: aDesReponses(r?.reponses_questions), analyse: statut !== 'non_analyse', validation: statut === 'pret_audit' }
}

export function planActions(rq: Record<string, unknown> | null | undefined): Record<string, ActionCorrective> {
  const p = (rq ?? {})[PLAN]
  return p && typeof p === 'object' ? (p as Record<string, ActionCorrective>) : {}
}

/** Réponses négatives sans plan complet (action, responsable et échéance). */
export function plansManquants(rq: Record<string, unknown> | null | undefined): string[] {
  const plans = planActions(rq)
  return questionsNegatives(rq).filter(q => !plans[q]?.action?.trim() || !plans[q]?.responsable?.trim() || !plans[q]?.echeance)
}
