// Un critère dont le champ d'application cite une activité spécifique (oxygène, VPH, nutrition…)
// ne s'applique qu'aux établissements qui exercent au moins une des activités citées.
// Un champ qui ne cite aucune de ces activités (ex. « Tous ») s'applique à tout le monde.

const sansAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

// Mots-clés reconnus, alignés sur les activités proposées à l'onboarding
const ACTIVITES_SPECIFIQUES: { cle: string; mots: string[] }[] = [
  { cle: 'oxygene', mots: ['oxygene', 'oxygenotherapie', 'vni'] },
  { cle: 'vph', mots: ['vph', 'fauteuil'] },
  { cle: 'nutrition', mots: ['nutrition'] },
  { cle: 'stomie', mots: ['stomie'] },
  { cle: 'continence', mots: ['continence'] },
  { cle: 'diabete', mots: ['diabete'] },
  { cle: 'mad', mots: ['mad', 'maintien a domicile'] },
]

const contientMot = (texte: string, mot: string) => new RegExp(`(^|[^a-z])${mot}([^a-z]|$)`).test(texte)

const activitesCitees = (texte: string) =>
  ACTIVITES_SPECIFIQUES.filter(a => a.mots.some(m => contientMot(texte, m))).map(a => a.cle)

export function critereApplicable(champApplication: string | null | undefined, activites: string[]): boolean {
  if (!champApplication) return true
  const citees = activitesCitees(sansAccents(champApplication))
  if (citees.length === 0) return true
  const exercees = new Set(activites.flatMap(a => activitesCitees(sansAccents(a))))
  return citees.some(c => exercees.has(c))
}
