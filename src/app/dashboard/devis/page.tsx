'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import SearchableSelect from '@/components/SearchableSelect'

type Devis = {
  id: string; description: string; statut: string; created_at: string
  etablissements: { nom: string }
}

export default function DevisPage() {
  const [devis, setDevis] = useState<Devis[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [etablissements, setEtablissements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [description, setDescription] = useState('')
  const [selectedEtab, setSelectedEtab] = useState('')
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
    if (prof?.role === 'admin') {
      const { data: etabs } = await supabase.from('etablissements').select('id, nom').order('nom')
      setEtablissements(etabs || [])
      if (etabs && etabs.length > 0) setSelectedEtab(etabs[0].id)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSend() {
    if (!description) return
    const etabId = profile?.role === 'admin' ? selectedEtab : profile?.etablissement_id
    if (!etabId) return
    setSaving(true)
    await supabase.from('devis_demandes').insert([{ description, etablissement_id: etabId, statut: 'en_attente' }])
    setShowModal(false)
    setDescription('')
    setSaving(false)
    load()
  }

  async function updateStatut(id: string, statut: string) {
    await supabase.from('devis_demandes').update({ statut }).eq('id', id)
    load()
  }

  const statutStyle = (s: string) => {
    if (s === 'en_attente') return { bg: '#FFFBEB', color: '#B45309', border: '#FDE68A', label: 'En attente' }
    if (s === 'en_cours') return { bg: '#EFF6FF', color: '#1A56DB', border: '#BFDBFE', label: 'En cours' }
    return { bg: '#F0FDF4', color: '#059669', border: '#BBF7D0', label: 'Traité' }
  }

  if (loading) return <div style={{ padding: '24px', color: '#6B7280', fontSize: '13px' }}>Chargement...</div>

  return (
    <div style={{ padding: '24px', fontFamily: 'Inter, -apple-system, sans-serif' }}>

      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '13px', color: '#6B7280' }}>{devis.length} demande{devis.length > 1 ? 's' : ''}</div>
        <button onClick={() => setShowModal(true)}
          style={{ padding: '8px 14px', background: '#1A56DB', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="ti ti-plus" style={{ fontSize: '14px' }} aria-hidden="true" />
          Nouvelle demande
        </button>
      </div>

      {devis.length === 0 ? (
        <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: '8px', padding: '48px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
          Aucune demande de devis
        </div>
      ) : (
        <div style={{ background: '#fff', border: '0.5px solid #E5E7EB', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F9FAFB' }}>
                {['Établissement', 'Description', 'Date', 'Statut', profile?.role === 'admin' ? 'Action' : ''].filter(Boolean).map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: '#9CA3AF', letterSpacing: '0.3px', textTransform: 'uppercase', borderBottom: '0.5px solid #E5E7EB' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {devis.map((d, i) => {
                const st = statutStyle(d.statut)
                return (
                  <tr key={d.id} style={{ borderBottom: i < devis.length - 1 ? '0.5px solid #F3F4F6' : 'none' }}>
                    <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: '500', color: '#111827' }}>
                      {(d.etablissements as any)?.nom || '—'}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '12px', color: '#6B7280', maxWidth: '300px' }}>
                      {d.description}
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: '12px', color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                      {new Date(d.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ background: st.bg, color: st.color, border: `0.5px solid ${st.border}`, padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '500' }}>
                        {st.label}
                      </span>
                    </td>
                    {profile?.role === 'admin' && (
                      <td style={{ padding: '12px 14px' }}>
                        <select value={d.statut} onChange={e => updateStatut(d.id, e.target.value)}
                          style={{ padding: '5px 8px', border: '0.5px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#111827', fontFamily: 'inherit', outline: 'none', cursor: 'pointer' }}>
                          <option value='en_attente'>En attente</option>
                          <option value='en_cours'>En cours</option>
                          <option value='traite'>Traité</option>
                        </select>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '18px 22px', borderBottom: '0.5px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>Nouvelle demande de devis</div>
              <button onClick={() => setShowModal(false)} style={{ background: '#F9FAFB', border: '0.5px solid #E5E7EB', color: '#6B7280', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>✕</button>
            </div>
            <div style={{ padding: '20px 22px' }}>

              {/* Sélection établissement si admin */}
              {profile?.role === 'admin' && (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Établissement</label>
                  <SearchableSelect
                    options={etablissements.map(e => ({ value: e.id, label: e.nom }))}
                    value={selectedEtab}
                    onChange={setSelectedEtab}
                    placeholder="Sélectionner un établissement..."
                  />
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#6B7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Description *</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={5}
                  placeholder="Décrivez le matériel souhaité, la quantité, le contexte d'utilisation..."
                  style={{ width: '100%', padding: '10px 12px', border: '0.5px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', color: '#111827', fontFamily: 'inherit', outline: 'none', resize: 'vertical' }} />
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', background: '#F9FAFB', border: '0.5px solid #E5E7EB', borderRadius: '8px', color: '#6B7280', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>Annuler</button>
                <button onClick={handleSend} disabled={saving || !description}
                  style={{ flex: 1, padding: '10px', background: saving || !description ? '#93AEED' : '#1A56DB', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'inherit' }}>
                  {saving ? 'Envoi...' : 'Envoyer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}