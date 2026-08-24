'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const FORFAITS = {
  starter: { label: 'Starter', color: '#6B7280', bg: '#F3F4F6' },
  pro: { label: 'Pro', color: '#1A56DB', bg: '#EBF2FF' },
  premium: { label: 'Premium', color: '#7C3AED', bg: '#F5F3FF' },
}

const CHAPITRES = ['1', '2', '3', '4']

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [kpis, setKpis] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [selectedClient, setSelectedClient] = useState<any>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showForfaitModal, setShowForfaitModal] = useState<any>(null)
  const [search, setSearch] = useState('')
  const [filterForfait, setFilterForfait] = useState('tous')
  const [form, setForm] = useState({ nom: '', email: '', forfait: 'starter' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { loadClients() }, [])

  async function loadClients() {
    setLoading(true)
    const { data: cls } = await supabase.from('clients').select('*').order('created_at', { ascending: false })
    setClients(cls || [])

    // Charger KPI certification pour chaque client
    const kpiMap: Record<string, any> = {}
    for (const client of cls || []) {
      const { data: soc } = await supabase.from('societes').select('id').eq('client_id', client.id).single()
      if (!soc) { kpiMap[client.id] = { score: 0, chapitres: {}, docs: 0, lastActivity: null }; continue }

      const { data: etabs } = await supabase.from('etablissements_psdm').select('id').eq('societe_id', soc.id)
      const etabId = etabs?.[0]?.id
      if (!etabId) { kpiMap[client.id] = { score: 0, chapitres: {}, docs: 0, lastActivity: null }; continue }

      const { data: crits } = await supabase.from('criteres_psdm').select('id, chapitre').order('code')
      const { data: reps } = await supabase.from('reponses_criteres').select('*').eq('etablissement_id', etabId)
      const { count: docsCount } = await supabase.from('documents_qualite').select('*', { count: 'exact', head: true }).eq('etablissement_id', etabId)

      const total = crits?.length || 0
      const conformes = reps?.filter(r => r.statut === 'conforme').length || 0
      const score = total > 0 ? Math.round((conformes / total) * 100) : 0

      // Score par chapitre
      const chapScores: Record<string, { score: number; conformes: number; total: number }> = {}
      for (const chap of CHAPITRES) {
        const critChap = crits?.filter(c => c.chapitre === chap) || []
        const confChap = reps?.filter(r => critChap.find(c => c.id === r.critere_id) && r.statut === 'conforme').length || 0
        chapScores[chap] = { score: critChap.length > 0 ? Math.round((confChap / critChap.length) * 100) : 0, conformes: confChap, total: critChap.length }
      }

      const lastRep = reps?.sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())[0]

      kpiMap[client.id] = { score, chapitres: chapScores, docs: docsCount || 0, lastActivity: lastRep?.updated_at || lastRep?.created_at || null }
    }
    setKpis(kpiMap)
    setLoading(false)
  }

  async function handleAdd() {
    if (!form.nom || !form.email) return
    setSaving(true)
    try {
      const res = await fetch('/api/create-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nom: form.nom, email: form.email, forfait: form.forfait })
      })
      const data = await res.json()
      if (!res.ok) { alert('Erreur : ' + data.error); return }
      setShowAddModal(false)
      setForm({ nom: '', email: '', forfait: 'starter' })
      loadClients()
    } catch (e: any) {
      alert('Erreur : ' + e.message)
    }
    setSaving(false)
  }

  async function updateForfait(clientId: string, forfait: string, actif: boolean) {
    await supabase.from('clients').update({ forfait, forfait_actif: actif }).eq('id', clientId)
    setShowForfaitModal(null)
    loadClients()
  }

  const filtered = clients
    .filter(c => filterForfait === 'tous' || c.forfait === filterForfait)
    .filter(c => !search || c.nom?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase()))

  const scoreColor = (s: number) => s >= 75 ? '#10B981' : s >= 50 ? '#F59E0B' : s >= 25 ? '#F97316' : '#EF4444'

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: 'var(--font)', color: 'var(--text-tertiary)', fontSize: '13px' }}>
      Chargement des clients...
    </div>
  )

  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)', maxWidth: '1200px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Clients</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '3px' }}>{clients.length} client{clients.length > 1 ? 's' : ''} · {clients.filter(c => c.forfait_actif).length} actifs</div>
        </div>
        <button onClick={() => setShowAddModal(true)}
          style={{ padding: '9px 18px', background: '#1A56DB', border: 'none', borderRadius: '9px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '7px', boxShadow: '0 1px 4px rgba(26,86,219,0.25)' }}>
          <i className="ti ti-user-plus" style={{ fontSize: '15px' }} />
          Ajouter un client
        </button>
      </div>

      {/* Stats forfaits */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {Object.entries(FORFAITS).map(([key, f]) => {
          const count = clients.filter(c => c.forfait === key && c.forfait_actif).length
          return (
            <div key={key} style={{ background: 'var(--surface)', border: `1px solid ${f.bg}`, borderRadius: '12px', padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '9px', background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: f.color }}>{f.label.toUpperCase()}</span>
              </div>
              <div>
                <div style={{ fontSize: '24px', fontWeight: '700', color: f.color, letterSpacing: '-0.5px', lineHeight: 1 }}>{count}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '3px' }}>{f.label}</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative' }}>
          <i className="ti ti-search" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'var(--text-tertiary)' }} />
          <input placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ padding: '8px 12px 8px 32px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface)', width: '200px' }} />
        </div>
        {['tous', 'starter', 'pro', 'premium'].map(f => (
          <button key={f} onClick={() => setFilterForfait(f)}
            style={{ padding: '7px 14px', borderRadius: '20px', border: `1px solid ${filterForfait === f ? '#1A56DB' : 'var(--border)'}`, background: filterForfait === f ? '#EBF2FF' : 'var(--surface)', color: filterForfait === f ? '#1A56DB' : 'var(--text-secondary)', fontSize: '12px', fontWeight: filterForfait === f ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)', textTransform: 'capitalize' }}>
            {f === 'tous' ? 'Tous' : f}
          </button>
        ))}
      </div>

      {/* Table clients */}
      {filtered.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '64px', textAlign: 'center' }}>
          <i className="ti ti-users" style={{ fontSize: '32px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '12px', opacity: 0.3 }} />
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>Aucun client</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>Ajoutez votre premier client pour commencer</div>
          <button onClick={() => setShowAddModal(true)}
            style={{ padding: '9px 20px', background: '#1A56DB', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)' }}>
            Ajouter un client
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(client => {
            const kpi = kpis[client.id] || { score: 0, chapitres: {}, docs: 0, lastActivity: null }
            const forfait = FORFAITS[client.forfait as keyof typeof FORFAITS] || FORFAITS.starter
            const isActif = client.forfait_actif !== false

            return (
              <div key={client.id}
                style={{ background: 'var(--surface)', border: `1px solid ${isActif ? 'var(--border)' : '#FEE2E2'}`, borderRadius: '12px', padding: '16px 20px', opacity: isActif ? 1 : 0.7, transition: 'all 0.1s' }}
                onMouseEnter={e => { if (isActif) (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)' }}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'}>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>

                  {/* Avatar + nom */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '0 0 220px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: forfait.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '14px', fontWeight: '800', color: forfait.color }}>{client.nom?.charAt(0).toUpperCase()}</span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.nom}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.email}</div>
                    </div>
                  </div>

                  {/* Forfait badge */}
                  <div style={{ flex: '0 0 100px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: forfait.color, background: forfait.bg, padding: '3px 10px', borderRadius: '20px' }}>
                      {isActif ? forfait.label : '⏸ Suspendu'}
                    </span>
                  </div>

                  {/* Score global */}
                  <div style={{ flex: '0 0 80px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ position: 'relative', width: '36px', height: '36px', flexShrink: 0 }}>
                      <svg width="36" height="36" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="14" fill="none" stroke="#F3F4F6" strokeWidth="4" />
                        <circle cx="18" cy="18" r="14" fill="none"
                          stroke={scoreColor(kpi.score)}
                          strokeWidth="4"
                          strokeDasharray={`${2 * Math.PI * 14}`}
                          strokeDashoffset={`${2 * Math.PI * 14 * (1 - kpi.score / 100)}`}
                          strokeLinecap="round" transform="rotate(-90 18 18)" />
                      </svg>
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: '9px', fontWeight: '800', color: scoreColor(kpi.score) }}>{kpi.score}%</span>
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Score</div>
                  </div>

                  {/* KPI chapitres */}
                  <div style={{ flex: 1, display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {CHAPITRES.map(chap => {
                      const chapData = kpi.chapitres?.[chap] || { score: 0, conformes: 0, total: 0 }
                      const colors = ['#7C3AED', '#1A56DB', '#0A7C4E', '#B45309']
                      const color = colors[parseInt(chap) - 1]
                      return (
                        <div key={chap} style={{ flex: 1, minWidth: '60px', background: '#F9FAFB', borderRadius: '8px', padding: '6px 8px' }}>
                          <div style={{ fontSize: '10px', fontWeight: '700', color, marginBottom: '3px' }}>Ch.{chap}</div>
                          <div style={{ height: '3px', background: '#E5E7EB', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${chapData.score}%`, background: color, borderRadius: '2px' }} />
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '3px' }}>{chapData.conformes}/{chapData.total}</div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Docs + activite */}
                  <div style={{ flex: '0 0 80px', textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: '700', color: '#1A56DB' }}>{kpi.docs}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>docs</div>
                  </div>

                  {/* Derniere activite */}
                  <div style={{ flex: '0 0 100px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                      {kpi.lastActivity
                        ? new Date(kpi.lastActivity).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
                        : 'Aucune activité'}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => router.push(`/dashboard/certification?client_id=${client.id}`)}
                      style={{ height: '32px', padding: '0 14px', background: '#EBF2FF', border: '1px solid #BFDBFE', borderRadius: '8px', color: '#1A56DB', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <i className="ti ti-eye" style={{ fontSize: '13px' }} />
                      Voir
                    </button>
                    <button onClick={() => setShowForfaitModal(client)}
                      style={{ height: '32px', padding: '0 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <i className="ti ti-settings" style={{ fontSize: '13px' }} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal ajout client */}
      {showAddModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowAddModal(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '480px', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: '#111827' }}>Ajouter un client</div>
              <button onClick={() => setShowAddModal(false)}
                style={{ width: '28px', height: '28px', border: 'none', borderRadius: '6px', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
                <i className="ti ti-x" style={{ fontSize: '14px' }} />
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Nom de l'entreprise *</label>
                <input value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
                  placeholder="SARL Medical Services"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', color: '#111827', fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Email de connexion *</label>
                <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                  placeholder="contact@medical-services.fr" type="email"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #E5E7EB', borderRadius: '8px', fontSize: '13px', color: '#111827', fontFamily: 'var(--font)', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>Forfait</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {Object.entries(FORFAITS).map(([key, f]) => (
                    <button key={key} onClick={() => setForm(p => ({ ...p, forfait: key }))}
                      style={{ flex: 1, padding: '10px 8px', border: `2px solid ${form.forfait === key ? f.color : '#E5E7EB'}`, borderRadius: '10px', background: form.forfait === key ? f.bg : '#fff', cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.1s' }}>
                      <div style={{ fontSize: '12px', fontWeight: '700', color: form.forfait === key ? f.color : '#6B7280' }}>{f.label}</div>

                    </button>
                  ))}
                </div>
              </div>
              <div style={{ background: '#FEF9C3', border: '1px solid #FDE68A', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#92400E' }}>
                <i className="ti ti-mail" style={{ fontSize: '13px', marginRight: '6px' }} />
                Un email de connexion sera envoyé automatiquement au client.
              </div>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', gap: '10px' }}>
              <button onClick={() => setShowAddModal(false)}
                style={{ flex: 1, padding: '10px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', color: '#6B7280', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                Annuler
              </button>
              <button onClick={handleAdd} disabled={saving || !form.nom || !form.email}
                style={{ flex: 1, padding: '10px', background: !form.nom || !form.email ? 'rgba(26,86,219,0.3)' : '#1A56DB', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: !form.nom || !form.email ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)' }}>
                {saving ? 'Création...' : 'Créer le client'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal gestion forfait */}
      {showForfaitModal && (
        <div onClick={e => { if (e.target === e.currentTarget) setShowForfaitModal(null) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '440px', boxShadow: '0 24px 64px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '700', color: '#111827' }}>Gérer le forfait</div>
                <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '2px' }}>{showForfaitModal.nom}</div>
              </div>
              <button onClick={() => setShowForfaitModal(null)}
                style={{ width: '28px', height: '28px', border: 'none', borderRadius: '6px', background: '#F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
                <i className="ti ti-x" style={{ fontSize: '14px' }} />
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '4px' }}>Changer de forfait</div>
              {Object.entries(FORFAITS).map(([key, f]) => (
                <button key={key} onClick={() => updateForfait(showForfaitModal.id, key, true)}
                  style={{ padding: '12px 16px', border: `2px solid ${showForfaitModal.forfait === key ? f.color : '#E5E7EB'}`, borderRadius: '10px', background: showForfaitModal.forfait === key ? f.bg : '#fff', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.1s' }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: showForfaitModal.forfait === key ? f.color : '#374151' }}>{f.label}</div>

                  </div>
                  {showForfaitModal.forfait === key && <i className="ti ti-check" style={{ fontSize: '16px', color: f.color }} />}
                </button>
              ))}
              <div style={{ height: '1px', background: '#F3F4F6', margin: '4px 0' }} />
              <button onClick={() => updateForfait(showForfaitModal.id, showForfaitModal.forfait, !showForfaitModal.forfait_actif)}
                style={{ padding: '10px 16px', border: `1px solid ${showForfaitModal.forfait_actif ? '#FEE2E2' : '#D1FAE5'}`, borderRadius: '9px', background: showForfaitModal.forfait_actif ? '#FEF2F2' : '#ECFDF5', cursor: 'pointer', fontFamily: 'var(--font)', fontSize: '13px', fontWeight: '600', color: showForfaitModal.forfait_actif ? '#DC2626' : '#059669', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                <i className={`ti ${showForfaitModal.forfait_actif ? 'ti-player-pause' : 'ti-player-play'}`} style={{ fontSize: '14px' }} />
                {showForfaitModal.forfait_actif ? 'Suspendre l\'accès' : 'Réactiver l\'accès'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}