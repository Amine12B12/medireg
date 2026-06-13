import { useEffect, useState } from 'react'
import { createClient } from './supabase'

export type Formule = 'Essentiel' | 'Premium' | 'Privilège' | null

export function useFormule() {
  const [formule, setFormule] = useState<Formule>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data: prof } = await supabase.from('profiles').select('role, etablissement_id').eq('id', user.id).single()
      setRole(prof?.role || null)
      if (prof?.role === 'admin') { setFormule('Privilège'); setLoading(false); return }
      if (prof?.etablissement_id) {
        const { data: etab } = await supabase.from('etablissements').select('formule').eq('id', prof.etablissement_id).single()
        setFormule((etab?.formule as Formule) || 'Essentiel')
      }
      setLoading(false)
    }
    load()
  }, [])

  const can = (feature: string): boolean => {
    if (role === 'admin') return true
    if (!formule) return false
    const rules: Record<string, Formule[]> = {
      // Essentiel + Premium + Privilège
      'parc': ['Essentiel', 'Premium', 'Privilège'],
      'localisation': ['Essentiel', 'Premium', 'Privilège'],
      'categories': ['Essentiel', 'Premium', 'Privilège'],
      'historique': ['Essentiel', 'Premium', 'Privilège'],
      'documents': ['Essentiel', 'Premium', 'Privilège'],
      'intervention': ['Essentiel', 'Premium', 'Privilège'],
      // Premium + Privilège
      'alertes_maintenance': ['Premium', 'Privilège'],
      'assistant_ia': ['Premium', 'Privilège'],
      'conformite': ['Premium', 'Privilège'],
      'support_prioritaire': ['Premium', 'Privilège'],
      // Privilège uniquement
      'score_conformite': ['Privilège'],
      'reporting': ['Privilège'],
      'multi_sites': ['Privilège'],
    }
    return rules[feature]?.includes(formule) ?? false
  }

  return { formule, role, loading, can }
}