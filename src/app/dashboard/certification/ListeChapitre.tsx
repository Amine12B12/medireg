'use client'

import { useState } from 'react'
import type { ChapitreInfo } from './AccueilChapitres'

type Statut = { key: string; label: string; color: string; bg: string; dot: string }

type Props = {
  code: string
  chapitre: ChapitreInfo
  criteresDuChapitre: any[]   // tous les critères applicables du chapitre (pour le bandeau)
  criteresAffiches: any[]     // après filtre de statut
  statuts: Statut[]
  getStatut: (critereId: string) => string
  messagesNonLus: Record<string, number>
  docsAttendus: (code: string) => { total: number; generes: number }
  onOuvrir: (critere: any) => void
}

// Thème d'un critère = ses deux premiers niveaux de code (2.3.2 → 2.3)
export const themeDe = (code: string) => code.split('.').slice(0, 2).join('.')

const cleRepli = (chap: string) => `medireg:bandeau-replie:${chap}`

export default function ListeChapitre({ code, chapitre: ch, criteresDuChapitre, criteresAffiches, statuts, getStatut, messagesNonLus, docsAttendus, onOuvrir }: Props) {
  const [replie, setReplie] = useState<boolean>(() => {
    try { return localStorage.getItem(cleRepli(code)) === '1' } catch { return false }
  })
  function basculer() {
    const v = !replie
    setReplie(v)
    try { localStorage.setItem(cleRepli(code), v ? '1' : '0') } catch {}
  }

  const total = criteresDuChapitre.length
  const prets = criteresDuChapitre.filter(c => getStatut(c.id) === 'pret_audit').length
  const pct = total > 0 ? Math.round((prets / total) * 100) : 0
  const statutStyle = (k: string) => statuts.find(s => s.key === k) || statuts[0]

  const themes: { theme: string; criteres: any[] }[] = []
  for (const c of criteresAffiches) {
    const t = themeDe(c.code)
    let g = themes.find(x => x.theme === t)
    if (!g) { g = { theme: t, criteres: [] }; themes.push(g) }
    g.criteres.push(c)
  }

  return (
    <div>
      <section data-testid="bandeau-chapitre" style={{ background: ch.bg, border: `1px solid ${ch.border}`, borderRadius: 'var(--radius-lg)', padding: replie ? '12px 18px' : '18px 20px', marginBottom: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', background: 'var(--surface)', border: `1px solid ${ch.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className={`ti ${ch.icon}`} style={{ fontSize: '18px', color: ch.color }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '16px', fontWeight: '700', color: ch.color }}>Chapitre {code} — {ch.label}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {total} critère{total > 1 ? 's' : ''} · {prets} prêt{prets > 1 ? 's' : ''} pour l’audit · {pct}%
            </div>
          </div>
          <button onClick={basculer} aria-expanded={!replie}
            style={{ padding: '6px 10px', background: 'var(--surface)', border: `1px solid ${ch.border}`, borderRadius: 'var(--radius-sm)', color: ch.color, fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            <i className={`ti ${replie ? 'ti-chevron-down' : 'ti-chevron-up'}`} style={{ fontSize: '13px' }} />
            {replie ? 'Présentation' : 'Replier'}
          </button>
        </div>
        {!replie && (
          <div style={{ marginTop: '14px', display: 'grid', gap: '12px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-primary)', lineHeight: '1.6', maxWidth: '75ch' }}>{ch.description}</p>
            <div style={{ height: '6px', background: 'var(--surface)', borderRadius: '3px', overflow: 'hidden', maxWidth: '420px' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: ch.color, borderRadius: '3px' }} />
            </div>
          </div>
        )}
      </section>

      {themes.length === 0 && (
        <div style={{ padding: '28px', textAlign: 'center', background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', fontSize: '13px', color: 'var(--text-tertiary)' }}>
          Aucun critère de ce chapitre ne correspond au filtre choisi.
        </div>
      )}

      <div style={{ display: 'grid', gap: '18px' }}>
        {themes.map(g => {
          const pretsTheme = g.criteres.filter(c => getStatut(c.id) === 'pret_audit').length
          return (
            <section key={g.theme} data-testid={`theme-${g.theme}`}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '10px', padding: '0 4px 8px' }}>
                <h3 style={{ margin: 0, fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Thème {g.theme}</h3>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{pretsTheme} / {g.criteres.length} prêt{pretsTheme > 1 ? 's' : ''}</span>
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                {g.criteres.map((c, i) => {
                  const st = statutStyle(getStatut(c.id))
                  const docs = docsAttendus(c.code)
                  const nbMsg = messagesNonLus[c.id] || 0
                  return (
                    <li key={c.id} style={{ borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                      <button onClick={() => onOuvrir(c)} data-testid={`critere-${c.code}`}
                        style={{ width: '100%', display: 'grid', gridTemplateColumns: '64px minmax(0,1fr) auto auto', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left', borderLeft: `3px solid ${st.dot}` }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-hover)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                        <span style={{ fontSize: '12px', fontWeight: '700', color: ch.color }}>{c.code}</span>
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', lineHeight: '1.45' }}>{c.titre}</span>
                          {(c.champ_application || nbMsg > 0 || docs.total > 0) && (
                            <span style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                              {c.champ_application && <span style={{ fontSize: '10px', color: '#7C3AED', background: '#F5F3FF', padding: '1px 6px', borderRadius: '4px', fontWeight: '500' }}>{c.champ_application}</span>}
                              {nbMsg > 0 && <span style={{ fontSize: '10px', color: '#DC2626', background: '#FEF2F2', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>{nbMsg} message{nbMsg > 1 ? 's' : ''}</span>}
                              {docs.total > 0 && <span style={{ fontSize: '10px', color: docs.generes === docs.total ? '#059669' : 'var(--accent)', background: docs.generes === docs.total ? '#D1FAE5' : 'var(--accent-light)', padding: '1px 6px', borderRadius: '4px', fontWeight: '500' }}>{docs.generes}/{docs.total} docs</span>}
                            </span>
                          )}
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', background: st.bg, borderRadius: '20px', fontSize: '11px', fontWeight: '600', color: st.color, whiteSpace: 'nowrap' }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: st.dot }} />{st.label}
                        </span>
                        <i className="ti ti-chevron-right" style={{ fontSize: '15px', color: 'var(--text-tertiary)' }} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}
