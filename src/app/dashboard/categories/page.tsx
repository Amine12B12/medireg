'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newCat, setNewCat] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const supabase = createClient()

  async function load() {
    const { data } = await supabase.from('categories_materiel').select('*').order('nom')
    setCategories(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleAdd() {
    if (!newCat.trim()) return
    setSaving(true)
    await supabase.from('categories_materiel').insert([{ nom: newCat.trim() }])
    setNewCat('')
    setSaving(false)
    load()
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    await supabase.from('categories_materiel').delete().eq('id', id)
    setDeleting(null)
    load()
  }

  if (loading) return <div style={{ padding: '24px', color: '#6B7280', fontSize: '13px' }}>Chargement...</div>

  return (
    <div style={{ padding: '24px', fontFamily: 'Inter, -apple-system, sans-serif' }}>

      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', color: '#6B7280' }}>{categories.length} catégorie{categories.length > 1 ? 's' : ''}</div>
      </div>

      {/* Ajouter */}
      <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: '500', color: '#374151', marginBottom: '10px' }}>Ajouter une catégorie</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            value={newCat}
            onChange={e => setNewCat(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Ex: Concentrateur, Pompe à perfusion..."
            style={{ flex: 1, padding: '8px 12px', border: '0.5px solid #E5E7EB', borderRadius: '6px', fontSize: '13px', color: '#111827', fontFamily: 'inherit', outline: 'none' }}
          />
          <button onClick={handleAdd} disabled={saving || !newCat.trim()}
            style={{ padding: '8px 16px', background: saving || !newCat.trim() ? '#93AEED' : '#1A56DB', border: 'none', borderRadius: '6px', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
            {saving ? '...' : '+ Ajouter'}
          </button>
        </div>
      </div>

      {/* Liste */}
      <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
        {categories.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>Aucune catégorie</div>
        ) : categories.map((cat, i) => (
          <div key={cat.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < categories.length - 1 ? '0.5px solid #F3F4F6' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#1A56DB', opacity: 0.4 }} />
              <span style={{ fontSize: '13px', color: '#111827', fontWeight: '500' }}>{cat.nom}</span>
            </div>
            <button onClick={() => handleDelete(cat.id)} disabled={deleting === cat.id}
              style={{ padding: '5px 10px', background: '#FEF2F2', border: '0.5px solid #FECACA', borderRadius: '6px', fontSize: '11px', fontWeight: '500', color: '#DC2626', cursor: 'pointer', fontFamily: 'inherit' }}>
              {deleting === cat.id ? '...' : 'Supprimer'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}