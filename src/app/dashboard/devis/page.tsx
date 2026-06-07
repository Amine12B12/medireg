'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Devis = {
  id: string; description: string; statut: string; created_at: string
  etablissements: { nom: string }
}

export default function DevisPage() {
  const [devis, setDevis] = useState<Devis[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
    setProfile(prof)
    const { data } = await supabase
      .from('devis_demandes')
      .select('*, etablissements(nom)')
      .order('created_at', { ascending: false })
    setDevis((data || []) as any)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSend() {
    if (!description || !profile?.etablissement_id) return
    setSaving(true)
    await supabase.from('devis_demandes').insert([{ description, etablissement_id: profile.etablissement_id }])
    setShowModal(false)
    setDescription('')
    setSaving(false)
    load()
  }

  const statutStyle = (s: string) => {
    if (s === 'en_attente') return { bg: '#FFF7E6', color: '#B45309', label: 'En attente' }
    if (s === 'en_cours') return { bg: '#EEF2FF', color: '#3730A3', label: 'En cours' }
    return { bg: '#E8F5EF', color: '#00875A', label: 'Traité' }
  }

  if (loading) return <div style={{ padding: '32px', color: '#6B7A99', fontSize: '14px' }}>Chargement...</div>

  return (
    <div style={{ padding: '32px', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '600', color: '#0A1628', letterSpacing: '-0.3px' }}>Demandes de devis</div>
          <div style={{ fontSize: '14px', color: '#6B7A99', marginTop: '4px' }}>{devis.length} demande{devis.length > 1 ? 's' : ''}</div>
        </div>
        {profile?.role === 'client' && (
          <button onClick={() => setShowModal(true)} style={{ padding: '10px 18px', background: '#1A56DB', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>
            + Nouvelle demande
          </button>
        )}
      </div>

      {devis.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '16px', border: '0.5px solid #DDE5F0', padding: '48px', textAlign: 'center', color: '#6B7A99', fontSize: '14px' }}>
          Aucune demande de devis
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {devis.map(d => {
            const st = statutStyle(d.statut)
            return (
              <div key={d.id} style={{ background: '#fff', borderRadius: '14px', border: '0.5px solid #DDE5F0', padding: '18px 22px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: '#0A1628', marginBottom: '4px' }}>{d.description}</div>
                  <div style={{ fontSize: '12px', color: '#6B7A99' }}>
                    {d.etablissements?.nom} · {new Date(d.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>
                <span style={{ background: st.bg, color: st.color, padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '500', whiteSpace: 'nowrap' }}>{st.label}</span>
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(10,22,40,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '460px', boxShadow: '0 20px 60px rgba(10,22,40,0.15)' }}>
            <div style={{ padding: '22px 28px', borderBottom: '0.5px solid #F0F4FA', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#0A1628' }}>Nouvelle demande de devis</div>
              <button onClick={() => setShowModal(false)} style={{ background: '#F0F4FA', border: 'none', color: '#6B7A99', width: '30px', height: '30px', borderRadius: '8px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: '24px 28px' }}>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6B7A99', marginBottom: '6px' }}>Description de votre besoin *</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={5}
                  placeholder="Décrivez le matériel souhaité, la quantité, le contexte d'utilisation..."
                  style={{ width: '100%', padding: '12px', border: '0.5px solid #DDE5F0', borderRadius: '8px', fontSize: '13px', color: '#0A1628', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '11px', background: '#F0F4FA', border: '0.5px solid #DDE5F0', borderRadius: '10px', color: '#6B7A99', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
                <button onClick={handleSend} disabled={saving || !description}
                  style={{ flex: 1, padding: '11px', background: saving || !description ? '#93AEED' : '#1A56DB', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {saving ? 'Envoi...' : 'Envoyer la demande'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}