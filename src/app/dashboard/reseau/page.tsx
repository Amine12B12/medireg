'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const supabase = createClient()

export default function ReseauDashboard() {
  const [reseaux, setReseaux] = useState<any[]>([])
  const [selectedReseau, setSelectedReseau] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [kpis, setKpis] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateReseau, setShowCreateReseau] = useState(false)
  const [nomReseau, setNomReseau] = useState('')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: rs } = await supabase.from('reseaux').select('*').eq('consultant_id', user.id).order('created_at')
    setReseaux(rs || [])

    if (rs && rs.length > 0) {
      await loadReseau(rs[0])
    }
    setLoading(false)
  }

  async function loadReseau(reseau: any) {
    setSelectedReseau(reseau)
    const { data: cls } = await supabase.from('clients').select('*').eq('reseau_id', reseau.id).eq('statut', 'actif').order('nom')
    setClients(cls || [])

    const kpiList: any[] = []
    for (const client of cls || []) {
      const { data: soc } = await supabase.from('societes').select('id').eq('client_id', client.id).single()
      if (!soc) { kpiList.push({ client, score: 0, prets: 0, aValider: 0, hasSociete: false }); continue }
      const { data: etabs } = await supabase.from('etablissements_psdm').select('id').eq('societe_id', soc.id)
      const etabId = etabs?.[0]?.id
      if (!etabId) { kpiList.push({ client, score: 0, prets: 0, aValider: 0, hasSociete: true }); continue }
      const { data: reps } = await supabase.from('reponses_criteres').select('statut').eq('etablissement_id', etabId)
      const total = 60
      const prets = (reps || []).filter(r => r.statut === 'pret_audit').length
      const aValider = (reps || []).filter(r => r.statut === 'procedure_a_valider').length
      kpiList.push({ client, score: Math.round((prets / total) * 100), prets, aValider, hasSociete: true })
    }
    setKpis(kpiList)
  }

  async function createReseau() {
    if (!nomReseau.trim()) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('reseaux').insert([{ nom: nomReseau, consultant_id: user!.id }]).select().single()
    if (data) {
      setReseaux(prev => [...prev, data])
      setSelectedReseau(data)
      setClients([])
      setKpis([])
    }
    setNomReseau('')
    setShowCreateReseau(false)
    setSaving(false)
  }

  async function ajouterClientAuReseau(clientId: string) {
    if (!selectedReseau) return
    await supabase.from('clients').update({ reseau_id: selectedReseau.id }).eq('id', clientId)
    await loadReseau(selectedReseau)
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: 'var(--font)', color: 'var(--text-tertiary)', fontSize: '13px' }}>
      Chargement...
    </div>
  )

  const totalPrets = kpis.reduce((a, k) => a + k.prets, 0)
  const totalAValider = kpis.reduce((a, k) => a + k.aValider, 0)
  const scoreGlobal = kpis.length > 0 ? Math.round(kpis.reduce((a, k) => a + k.score, 0) / kpis.length) : 0
  const prets100 = kpis.filter(k => k.score === 100).length
  const enCours = kpis.filter(k => k.score > 0 && k.score < 100).length
  const nonDemarres = kpis.filter(k => k.score === 0).length

  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)', maxWidth: '1200px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Tableau de bord réseau</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '3px' }}>Vue globale de l'avancement de certification de vos établissements</div>
        </div>
        <button onClick={() => setShowCreateReseau(true)}
          style={{ padding: '9px 16px', background: '#1A56DB', border: 'none', borderRadius: '9px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="ti ti-plus" style={{ fontSize: '14px' }} />
          Créer un réseau
        </button>
      </div>

      {/* Créer réseau */}
      {showCreateReseau && (
        <div style={{ background: 'var(--surface)', border: '1px solid #BFDBFE', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
          <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '12px' }}>Nouveau réseau</div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input value={nomReseau} onChange={e => setNomReseau(e.target.value)} placeholder="ex: PROVIDOM, Capvital..."
              style={{ flex: 1, padding: '10px 14px', border: '1px solid #E5E7EB', borderRadius: '9px', fontSize: '13px', fontFamily: 'var(--font)', outline: 'none' }}
              onKeyDown={e => e.key === 'Enter' && createReseau()} />
            <button onClick={() => setShowCreateReseau(false)} style={{ padding: '10px 16px', background: '#F3F4F6', border: 'none', borderRadius: '9px', color: '#6B7280', fontSize: '13px', cursor: 'pointer', fontFamily: 'var(--font)' }}>Annuler</button>
            <button onClick={createReseau} disabled={!nomReseau.trim() || saving}
              style={{ padding: '10px 16px', background: '#1A56DB', border: 'none', borderRadius: '9px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)' }}>
              {saving ? 'Création...' : 'Créer'}
            </button>
          </div>
        </div>
      )}

      {reseaux.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '64px', textAlign: 'center' }}>
          <i className="ti ti-building-community" style={{ fontSize: '32px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '12px', opacity: 0.3 }} />
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>Aucun réseau</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>Créez un réseau pour regrouper vos établissements</div>
          <button onClick={() => setShowCreateReseau(true)}
            style={{ padding: '9px 20px', background: '#1A56DB', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)' }}>
            Créer mon premier réseau
          </button>
        </div>
      ) : (
        <>
          {/* Onglets réseaux */}
          {reseaux.length > 1 && (
            <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {reseaux.map(r => (
                <button key={r.id} onClick={() => loadReseau(r)}
                  style={{ padding: '8px 16px', border: `1px solid ${selectedReseau?.id === r.id ? '#1A56DB' : 'var(--border)'}`, borderRadius: '20px', background: selectedReseau?.id === r.id ? '#EBF2FF' : 'var(--surface)', color: selectedReseau?.id === r.id ? '#1A56DB' : 'var(--text-secondary)', fontSize: '13px', fontWeight: selectedReseau?.id === r.id ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  {r.nom}
                </button>
              ))}
            </div>
          )}

          {/* KPIs réseau */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '20px' }}>
            {[
              { label: 'Établissements', value: clients.length, icon: 'ti-building', color: '#1A56DB', bg: '#EBF2FF' },
              { label: 'Score moyen', value: `${scoreGlobal}%`, icon: 'ti-chart-bar', color: scoreGlobal >= 75 ? '#059669' : '#D97706', bg: scoreGlobal >= 75 ? '#ECFDF5' : '#FFFBEB' },
              { label: 'Certifiés prêts', value: prets100, icon: 'ti-circle-check', color: '#059669', bg: '#ECFDF5' },
              { label: 'En cours', value: enCours, icon: 'ti-loader', color: '#1A56DB', bg: '#EBF2FF' },
              { label: 'Non démarrés', value: nonDemarres, icon: 'ti-clock', color: '#9CA3AF', bg: '#F3F4F6' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`ti ${s.icon}`} style={{ fontSize: '18px', color: s.color }} />
                </div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: '800', color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Barre de progression globale */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px 20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Progression globale du réseau {selectedReseau?.nom}</div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: scoreGlobal >= 75 ? '#059669' : '#D97706' }}>{scoreGlobal}%</div>
            </div>
            <div style={{ height: '10px', background: '#F3F4F6', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${scoreGlobal}%`, background: scoreGlobal >= 75 ? '#10B981' : scoreGlobal >= 40 ? '#F59E0B' : '#EF4444', borderRadius: '5px', transition: 'width 0.5s' }} />
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', color: '#059669' }}>● {prets100} établissement{prets100 > 1 ? 's' : ''} prêt{prets100 > 1 ? 's' : ''}</span>
              <span style={{ fontSize: '11px', color: '#1A56DB' }}>● {enCours} en cours</span>
              <span style={{ fontSize: '11px', color: '#9CA3AF' }}>● {nonDemarres} non démarré{nonDemarres > 1 ? 's' : ''}</span>
              {totalAValider > 0 && <span style={{ fontSize: '11px', color: '#D97706' }}>● {totalAValider} critère{totalAValider > 1 ? 's' : ''} en attente de validation</span>}
            </div>
          </div>

          {/* Liste établissements */}
          {clients.length === 0 ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '40px', textAlign: 'center' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>Aucun établissement dans ce réseau</div>
              <button onClick={() => router.push('/dashboard/clients')}
                style={{ padding: '9px 18px', background: '#1A56DB', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                Ajouter des établissements
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '10px' }}>
              {kpis.map(({ client, score, prets, aValider, hasSociete }) => (
                <div key={client.id}
                  onClick={() => router.push(`/dashboard/clients/${client.id}`)}
                  style={{ background: 'var(--surface)', border: `1px solid ${aValider > 0 ? '#FDE68A' : 'var(--border)'}`, borderRadius: '12px', padding: '16px', cursor: 'pointer', transition: 'all 0.15s', position: 'relative', overflow: 'hidden' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = '#1A56DB'; el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = aValider > 0 ? '#FDE68A' : 'var(--border)'; el.style.boxShadow = 'none' }}>

                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: score >= 75 ? '#10B981' : score >= 40 ? '#F59E0B' : '#E5E7EB' }} />

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, #7C3AED, #1A56DB)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
                      {client.nom?.[0]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.nom}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{client.contact_email}</div>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: score >= 75 ? '#059669' : score >= 40 ? '#D97706' : score > 0 ? '#DC2626' : '#9CA3AF' }}>{score}%</div>
                  </div>

                  <div style={{ height: '5px', background: '#F3F4F6', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                    <div style={{ height: '100%', width: `${score}%`, background: score >= 75 ? '#10B981' : score >= 40 ? '#F59E0B' : '#EF4444', borderRadius: '3px' }} />
                  </div>

                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {!hasSociete && <span style={{ fontSize: '10px', color: '#DC2626', background: '#FEF2F2', padding: '2px 7px', borderRadius: '20px', fontWeight: '600' }}>Profil incomplet</span>}
                    {aValider > 0 && <span style={{ fontSize: '10px', color: '#D97706', background: '#FFFBEB', padding: '2px 7px', borderRadius: '20px', fontWeight: '600' }}>⚡ {aValider} à valider</span>}
                    <span style={{ fontSize: '10px', color: '#6B7280', background: '#F3F4F6', padding: '2px 7px', borderRadius: '20px' }}>{prets}/60 critères</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}