'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function PilotagePage() {
  const [stats, setStats] = useState<any>(null)
  const [clientsData, setClientsData] = useState<any[]>([])
  const [auditsData, setAuditsData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (prof?.role !== 'consultant') { router.push('/dashboard'); return }

      const { data: clients } = await supabase.from('clients').select('*').order('nom')
      const { data: audits } = await supabase.from('audits').select('*, clients(nom, type), referentiels(nom, organisme)').order('created_at', { ascending: false })
      const { data: ncs } = await supabase.from('non_conformites').select('*')
      const { data: pas } = await supabase.from('plans_actions').select('*')
      const { data: taches } = await supabase.from('taches').select('*')
      const { data: docs } = await supabase.from('documents').select('*')

      // Stats globales
      const auditsTermines = (audits || []).filter(a => a.statut === 'termine' && a.score !== null)
      const scoreMoyen = auditsTermines.length > 0
        ? Math.round(auditsTermines.reduce((s: number, a: any) => s + a.score, 0) / auditsTermines.length)
        : null

      setStats({
        clients: (clients || []).length,
        clientsActifs: (clients || []).filter(c => c.statut === 'actif').length,
        audits: (audits || []).length,
        auditsEnCours: (audits || []).filter(a => a.statut === 'en_cours').length,
        auditsTermines: auditsTermines.length,
        scoreMoyen,
        ncTotal: (ncs || []).length,
        ncOuvertes: (ncs || []).filter(n => n.statut === 'ouverte').length,
        ncMajeures: (ncs || []).filter(n => n.niveau === 'majeure' && n.statut !== 'resolue').length,
        paTotal: (pas || []).length,
        paTermines: (pas || []).filter(p => p.statut === 'termine').length,
        tachesEnCours: (taches || []).filter(t => t.statut !== 'termine').length,
        documents: (docs || []).length,
      })

      // Stats par client
      const clientsWithStats = (clients || []).map(c => {
        const clientAudits = (audits || []).filter(a => a.client_id === c.id)
        const clientAuditsTermines = clientAudits.filter(a => a.statut === 'termine' && a.score !== null)
        const clientScore = clientAuditsTermines.length > 0
          ? Math.round(clientAuditsTermines.reduce((s: number, a: any) => s + a.score, 0) / clientAuditsTermines.length)
          : null
        const clientNCs = (ncs || []).filter(n => n.client_id === c.id && n.statut !== 'resolue')
        const clientPAs = (pas || []).filter(p => p.client_id === c.id)
        const clientPAsTermines = clientPAs.filter(p => p.statut === 'termine')
        return {
          ...c,
          audits: clientAudits.length,
          score: clientScore,
          ncOuvertes: clientNCs.length,
          ncMajeures: clientNCs.filter((n: any) => n.niveau === 'majeure').length,
          paTotal: clientPAs.length,
          paTermines: clientPAsTermines.length,
          progressionPA: clientPAs.length > 0 ? Math.round((clientPAsTermines.length / clientPAs.length) * 100) : 0
        }
      })

      setClientsData(clientsWithStats)
      setAuditsData(audits || [])
      setLoading(false)
    }
    load()
  }, [])

  const scoreColor = (s: number | null) => {
    if (s === null) return 'var(--text-tertiary)'
    if (s >= 80) return 'var(--success)'
    if (s >= 60) return 'var(--warning)'
    return 'var(--danger)'
  }

  const typeColors: Record<string, { color: string; bg: string }> = {
    'Hopital': { color: 'var(--danger)', bg: 'var(--danger-light)' },
    'Clinique': { color: '#7C3AED', bg: '#F5F3FF' },
    'PSDM': { color: 'var(--accent)', bg: 'var(--accent-light)' },
    'EHPAD': { color: 'var(--success)', bg: 'var(--success-light)' },
    'Pharmacie': { color: 'var(--warning)', bg: 'var(--warning-light)' },
    'Centre de soins': { color: '#0891B2', bg: '#E0F2FE' },
  }

  if (loading) return <div style={{ padding: '28px', color: 'var(--text-tertiary)', fontSize: '13px', fontFamily: 'var(--font)' }}>Chargement...</div>

  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)' }}>

      {/* KPI globaux */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Clients actifs', value: `${stats.clientsActifs}/${stats.clients}`, color: 'var(--accent)', bg: 'var(--accent-light)', icon: 'ti-building-hospital' },
          { label: 'Score moyen', value: stats.scoreMoyen !== null ? `${stats.scoreMoyen}%` : '-', color: scoreColor(stats.scoreMoyen), bg: stats.scoreMoyen === null ? 'var(--surface-hover)' : stats.scoreMoyen >= 80 ? 'var(--success-light)' : stats.scoreMoyen >= 60 ? 'var(--warning-light)' : 'var(--danger-light)', icon: 'ti-chart-pie' },
          { label: 'Audits', value: stats.audits, color: '#7C3AED', bg: '#F5F3FF', icon: 'ti-clipboard-check', sub: `${stats.auditsEnCours} en cours` },
          { label: 'NC ouvertes', value: stats.ncOuvertes, color: 'var(--danger)', bg: 'var(--danger-light)', icon: 'ti-alert-triangle', sub: `${stats.ncMajeures} majeures` },
          { label: 'Plans d actions', value: stats.paTotal, color: 'var(--warning)', bg: 'var(--warning-light)', icon: 'ti-list-check', sub: `${stats.paTermines} termines` },
          { label: 'Documents', value: stats.documents, color: 'var(--success)', bg: 'var(--success-light)', icon: 'ti-books' },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: 'var(--radius-sm)', background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`ti ${k.icon}`} style={{ fontSize: '15px', color: k.color }} />
              </div>
            </div>
            <div style={{ fontSize: '26px', fontWeight: '700', color: k.color, letterSpacing: '-0.5px', lineHeight: 1, marginBottom: '4px' }}>{k.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{k.label}</div>
            {(k as any).sub && <div style={{ fontSize: '10px', color: k.color, opacity: 0.7, marginTop: '2px' }}>{(k as any).sub}</div>}
          </div>
        ))}
      </div>

      {/* Tableau comparatif clients */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: '20px' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="ti ti-chart-bar" style={{ fontSize: '15px', color: '#7C3AED' }} />
            Comparatif clients
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{clientsData.length} clients</div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-hover)' }}>
              {['Client', 'Type', 'Audits', 'Score', 'NC ouvertes', 'Plans actions', 'Progression'].map(h => (
                <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: 'var(--text-tertiary)', letterSpacing: '0.4px', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clientsData.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>Aucun client</td></tr>
            ) : clientsData.sort((a, b) => (b.score || 0) - (a.score || 0)).map((c, i) => {
              const tc = typeColors[c.type] || { color: 'var(--text-secondary)', bg: 'var(--surface-hover)' }
              return (
                <tr key={c.id} style={{ borderBottom: i < clientsData.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
                  onClick={() => router.push('/dashboard/clients')}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--surface-hover)'}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: 'var(--radius-sm)', background: tc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700', color: tc.color, flexShrink: 0 }}>
                        {c.nom.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>{c.nom}</div>
                        {c.ville && <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{c.ville}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ background: tc.bg, color: tc.color, padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '500' }}>{c.type}</span>
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '13px', fontWeight: '600', color: c.audits > 0 ? '#7C3AED' : 'var(--text-tertiary)' }}>{c.audits}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: scoreColor(c.score) }}>
                      {c.score !== null ? `${c.score}%` : '-'}
                    </div>
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    {c.ncOuvertes > 0 ? (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <span style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>{c.ncOuvertes}</span>
                        {c.ncMajeures > 0 && <span style={{ fontSize: '10px', color: 'var(--danger)' }}>({c.ncMajeures} maj.)</span>}
                      </div>
                    ) : (
                      <span style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>OK</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>{c.paTermines}/{c.paTotal}</td>
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden', minWidth: '60px' }}>
                        <div style={{ height: '100%', width: `${c.progressionPA}%`, background: c.progressionPA >= 75 ? 'var(--success)' : c.progressionPA >= 50 ? 'var(--warning)' : 'var(--accent)', borderRadius: '3px' }} />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: c.progressionPA >= 75 ? 'var(--success)' : c.progressionPA >= 50 ? 'var(--warning)' : 'var(--accent)', minWidth: '30px' }}>{c.progressionPA}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Audits recents */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="ti ti-clipboard-check" style={{ fontSize: '15px', color: '#7C3AED' }} />
            Derniers audits
          </div>
          <button onClick={() => router.push('/dashboard/audits')}
            style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: '500' }}>
            Voir tout
          </button>
        </div>
        {auditsData.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>Aucun audit</div>
        ) : auditsData.slice(0, 8).map((a, i) => (
          <div key={a.id} style={{ padding: '12px 18px', borderBottom: i < Math.min(auditsData.length, 8) - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.titre}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px', display: 'flex', gap: '8px' }}>
                {(a.clients as any)?.nom && <span>{(a.clients as any).nom}</span>}
                {(a.referentiels as any)?.nom && <span>· {(a.referentiels as any).nom}</span>}
                {a.date_audit && <span>· {new Date(a.date_audit).toLocaleDateString('fr-FR')}</span>}
              </div>
            </div>
            {a.score !== null && (
              <div style={{ fontSize: '16px', fontWeight: '700', color: scoreColor(a.score), flexShrink: 0 }}>{a.score}%</div>
            )}
            <span style={{ fontSize: '10px', fontWeight: '500', padding: '3px 9px', borderRadius: '20px', flexShrink: 0,
              color: a.statut === 'termine' ? 'var(--success)' : a.statut === 'en_cours' ? 'var(--warning)' : 'var(--text-tertiary)',
              background: a.statut === 'termine' ? 'var(--success-light)' : a.statut === 'en_cours' ? 'var(--warning-light)' : 'var(--surface-hover)' }}>
              {a.statut === 'termine' ? 'Termine' : a.statut === 'en_cours' ? 'En cours' : 'Archive'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}