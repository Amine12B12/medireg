'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ConformitePage() {
  const [profile, setProfile] = useState<any>(null)
  const [audits, setAudits] = useState<any[]>([])
  const [nonConformites, setNonConformites] = useState<any[]>([])
  const [plansActions, setPlansActions] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('role, client_id').eq('id', user.id).single()
      setProfile(prof)
      if (prof?.role === 'consultant') {
        const { data: cls } = await supabase.from('clients').select('id, nom').order('nom')
        setClients(cls || [])
      }
      await load(prof?.role, prof?.client_id, '')
    }
    init()
  }, [])

  async function load(role?: string, clientId?: string, filterClientId?: string) {
    const cId = filterClientId || clientId

    if (role === 'consultant' && !filterClientId) {
      const { data: aud } = await supabase.from('audits').select('*, clients(nom), referentiels(nom)').order('created_at', { ascending: false })
      const { data: ncs } = await supabase.from('non_conformites').select('*, clients(nom)').order('created_at', { ascending: false })
      const { data: pas } = await supabase.from('plans_actions').select('*, non_conformites(titre)').order('echeance', { ascending: true })
      setAudits(aud || [])
      setNonConformites(ncs || [])
      setPlansActions(pas || [])
    } else if (cId) {
      const { data: aud } = await supabase.from('audits').select('*, clients(nom), referentiels(nom)').eq('client_id', cId).order('created_at', { ascending: false })
      const { data: ncs } = await supabase.from('non_conformites').select('*, clients(nom)').eq('client_id', cId).order('created_at', { ascending: false })
      const ncIds = (ncs || []).map((n: any) => n.id)
      let pas: any[] = []
      if (ncIds.length > 0) {
        const { data } = await supabase.from('plans_actions').select('*, non_conformites(titre)').in('non_conformite_id', ncIds).order('echeance', { ascending: true })
        pas = data || []
      }
      setAudits(aud || [])
      setNonConformites(ncs || [])
      setPlansActions(pas || [])
    }
    setLoading(false)
  }

  async function handleFilterClient(cId: string) {
    setSelectedClientId(cId)
    setLoading(true)
    await load(profile?.role, profile?.client_id, cId)
  }

  // Calcul score global
  const auditsTermines = audits.filter(a => a.statut === 'termine' && a.score !== null)
  const scoreGlobal = auditsTermines.length > 0
    ? Math.round(auditsTermines.reduce((sum, a) => sum + a.score, 0) / auditsTermines.length)
    : null

  const ncMajeures = nonConformites.filter(n => n.niveau === 'majeure' && n.statut !== 'resolue')
  const ncMineures = nonConformites.filter(n => n.niveau === 'mineure' && n.statut !== 'resolue')
  const ncObservations = nonConformites.filter(n => n.niveau === 'observation' && n.statut !== 'resolue')
  const paAFaire = plansActions.filter(p => p.statut === 'a_faire')
  const paEnCours = plansActions.filter(p => p.statut === 'en_cours')
  const paTermines = plansActions.filter(p => p.statut === 'termine')
  const progressionPA = plansActions.length > 0 ? Math.round((paTermines.length / plansActions.length) * 100) : 0

  const scoreColor = scoreGlobal === null ? 'var(--text-tertiary)' : scoreGlobal >= 80 ? 'var(--success)' : scoreGlobal >= 60 ? 'var(--warning)' : 'var(--danger)'
  const scoreBg = scoreGlobal === null ? 'var(--surface-hover)' : scoreGlobal >= 80 ? 'var(--success-light)' : scoreGlobal >= 60 ? 'var(--warning-light)' : 'var(--danger-light)'
  const scoreLabel = scoreGlobal === null ? 'Aucun audit termine' : scoreGlobal >= 80 ? 'Pret pour la certification' : scoreGlobal >= 60 ? 'En progression' : 'Actions requises'

  const niveauStyle = (n: string) => {
    if (n === 'majeure') return { color: 'var(--danger)', bg: 'var(--danger-light)' }
    if (n === 'mineure') return { color: 'var(--warning)', bg: 'var(--warning-light)' }
    return { color: 'var(--text-tertiary)', bg: 'var(--surface-hover)' }
  }

  const statutPaStyle = (s: string) => {
    if (s === 'termine') return { color: 'var(--success)', bg: 'var(--success-light)', label: 'Termine' }
    if (s === 'en_cours') return { color: 'var(--warning)', bg: 'var(--warning-light)', label: 'En cours' }
    return { color: 'var(--accent)', bg: 'var(--accent-light)', label: 'A faire' }
  }

  if (loading) return <div style={{ padding: '28px', color: 'var(--text-tertiary)', fontSize: '13px', fontFamily: 'var(--font)' }}>Chargement...</div>

  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)', maxWidth: '1100px' }}>

      {/* Filtre client consultant */}
      {profile?.role === 'consultant' && clients.length > 0 && (
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="ti ti-building-hospital" style={{ fontSize: '15px', color: 'var(--text-tertiary)' }} />
          <select value={selectedClientId} onChange={e => handleFilterClient(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface)', cursor: 'pointer' }}>
            <option value=''>Tous les clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
      )}

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>

        {/* Score global */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px', boxShadow: 'var(--shadow-sm)', gridColumn: 'span 1' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-sm)', background: scoreBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-shield-check" style={{ fontSize: '17px', color: scoreColor }} />
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Score global</span>
          </div>
          <div style={{ fontSize: '32px', fontWeight: '700', color: scoreColor, letterSpacing: '-1px', lineHeight: 1, marginBottom: '4px' }}>
            {scoreGlobal !== null ? `${scoreGlobal}%` : '-'}
          </div>
          <div style={{ fontSize: '11px', color: scoreColor, background: scoreBg, padding: '2px 8px', borderRadius: '20px', display: 'inline-block' }}>{scoreLabel}</div>
        </div>

        {[
          { label: 'Audits', value: audits.length, sub: `${auditsTermines.length} termine${auditsTermines.length > 1 ? 's' : ''}`, color: '#7C3AED', bg: '#F5F3FF', icon: 'ti-clipboard-check' },
          { label: 'NC majeures', value: ncMajeures.length, sub: 'Ouvertes', color: 'var(--danger)', bg: 'var(--danger-light)', icon: 'ti-alert-triangle' },
          { label: 'NC mineures', value: ncMineures.length, sub: 'Ouvertes', color: 'var(--warning)', bg: 'var(--warning-light)', icon: 'ti-alert-circle' },
          { label: 'Plans d actions', value: plansActions.length, sub: `${paTermines.length} termine${paTermines.length > 1 ? 's' : ''}`, color: 'var(--accent)', bg: 'var(--accent-light)', icon: 'ti-list-check' },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-sm)', background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`ti ${k.icon}`} style={{ fontSize: '17px', color: k.color }} />
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{k.label}</span>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: k.color, letterSpacing: '-1px', lineHeight: 1, marginBottom: '4px' }}>{k.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Progression plans d actions */}
      {plansActions.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '16px 20px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>Progression des plans d actions</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: progressionPA >= 75 ? 'var(--success)' : progressionPA >= 50 ? 'var(--warning)' : 'var(--accent)' }}>{progressionPA}%</div>
          </div>
          <div style={{ height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
            <div style={{ height: '100%', width: `${progressionPA}%`, background: progressionPA >= 75 ? 'var(--success)' : progressionPA >= 50 ? 'var(--warning)' : 'var(--accent)', borderRadius: '4px', transition: 'width 0.3s' }} />
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
            <span style={{ color: 'var(--accent)' }}>{paAFaire.length} a faire</span>
            <span style={{ color: 'var(--warning)' }}>{paEnCours.length} en cours</span>
            <span style={{ color: 'var(--success)' }}>{paTermines.length} termines</span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>

        {/* Audits */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="ti ti-clipboard-check" style={{ fontSize: '15px', color: '#7C3AED' }} />
              Audits
            </div>
            <button onClick={() => router.push('/dashboard/audits')}
              style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: '500' }}>
              Voir tout
            </button>
          </div>
          {audits.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>Aucun audit</div>
          ) : audits.slice(0, 5).map((a, i) => (
            <div key={a.id} style={{ padding: '12px 18px', borderBottom: i < Math.min(audits.length, 5) - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.titre}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  {(a.clients as any)?.nom || '-'} {(a.referentiels as any)?.nom ? '· ' + (a.referentiels as any).nom : ''}
                </div>
              </div>
              {a.score !== null && (
                <div style={{ fontSize: '14px', fontWeight: '700', color: a.score >= 80 ? 'var(--success)' : a.score >= 60 ? 'var(--warning)' : 'var(--danger)', flexShrink: 0 }}>
                  {a.score}%
                </div>
              )}
              <span style={{ fontSize: '10px', fontWeight: '500', padding: '2px 8px', borderRadius: '20px', flexShrink: 0,
                color: a.statut === 'termine' ? 'var(--success)' : a.statut === 'en_cours' ? 'var(--warning)' : 'var(--text-tertiary)',
                background: a.statut === 'termine' ? 'var(--success-light)' : a.statut === 'en_cours' ? 'var(--warning-light)' : 'var(--surface-hover)' }}>
                {a.statut === 'termine' ? 'Termine' : a.statut === 'en_cours' ? 'En cours' : 'Archive'}
              </span>
            </div>
          ))}
        </div>

        {/* Non-conformites */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: '15px', color: 'var(--danger)' }} />
              Non-conformites
              {nonConformites.filter(n => n.statut !== 'resolue').length > 0 && (
                <span style={{ background: 'var(--danger)', color: '#fff', fontSize: '10px', fontWeight: '600', padding: '1px 6px', borderRadius: '10px' }}>
                  {nonConformites.filter(n => n.statut !== 'resolue').length}
                </span>
              )}
            </div>
          </div>
          {nonConformites.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center' }}>
              <i className="ti ti-check" style={{ fontSize: '24px', display: 'block', marginBottom: '6px', color: 'var(--success)' }} />
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Aucune non-conformite</div>
            </div>
          ) : nonConformites.slice(0, 6).map((nc, i) => {
            const nv = niveauStyle(nc.niveau)
            return (
              <div key={nc.id} style={{ padding: '10px 18px', borderBottom: i < Math.min(nonConformites.length, 6) - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: nv.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: '500', color: nc.statut === 'resolue' ? 'var(--text-tertiary)' : 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: nc.statut === 'resolue' ? 'line-through' : 'none' }}>
                    {nc.titre}
                  </div>
                  {(nc.clients as any)?.nom && <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '1px' }}>{(nc.clients as any).nom}</div>}
                </div>
                <span style={{ background: nv.bg, color: nv.color, padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '500', flexShrink: 0, textTransform: 'capitalize' }}>
                  {nc.niveau}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Plans d'actions */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="ti ti-list-check" style={{ fontSize: '15px', color: 'var(--warning)' }} />
            Plans d actions
          </div>
          <button onClick={() => router.push('/dashboard/audits')}
            style={{ fontSize: '11px', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: '500' }}>
            Gerer dans Audits
          </button>
        </div>
        {plansActions.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '12px' }}>Aucun plan d action</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--surface-hover)' }}>
                {['Action', 'Non-conformite liee', 'Responsable', 'Echeance', 'Statut'].map(h => (
                  <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: 'var(--text-tertiary)', letterSpacing: '0.4px', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plansActions.slice(0, 10).map((pa, i) => {
                const st = statutPaStyle(pa.statut)
                const depasse = pa.echeance && new Date(pa.echeance) < new Date() && pa.statut !== 'termine'
                return (
                  <tr key={pa.id} style={{ borderBottom: i < Math.min(plansActions.length, 10) - 1 ? '1px solid var(--border)' : 'none' }}>
                    <td style={{ padding: '10px 14px', fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pa.titre}</td>
                    <td style={{ padding: '10px 14px', fontSize: '11px', color: 'var(--text-tertiary)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(pa.non_conformites as any)?.titre || '-'}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>{pa.responsable || '-'}</td>
                    <td style={{ padding: '10px 14px', fontSize: '11px', color: depasse ? 'var(--danger)' : 'var(--text-tertiary)', fontWeight: depasse ? '600' : '400' }}>
                      {pa.echeance ? new Date(pa.echeance).toLocaleDateString('fr-FR') : '-'}
                      {depasse && ' ⚠'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ background: st.bg, color: st.color, padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>{st.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}