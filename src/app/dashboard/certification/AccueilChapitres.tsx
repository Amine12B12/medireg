'use client'

export type ChapitreInfo = { label: string; color: string; bg: string; border: string; icon: string; description: string; auditeur?: string[] }

export type StatsChapitre = {
  code: string
  total: number
  prets: number
  aValider: number
  actionsCorrectives: number
  messagesNonLus: number
  prochain: { code: string; titre: string } | null
}

type Props = {
  chapitres: Record<string, ChapitreInfo>
  stats: StatsChapitre[]
  dernierCritere: { code: string; titre: string; chapitre: string } | null
  onOuvrirChapitre: (chapitre: string) => void
  onOuvrirCritere: (code: string) => void
}

export default function AccueilChapitres({ chapitres, stats, dernierCritere, onOuvrirChapitre, onOuvrirCritere }: Props) {
  return (
    <div>
      {dernierCritere && (
        <button onClick={() => onOuvrirCritere(dernierCritere.code)} data-testid="reprendre"
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', marginBottom: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-player-play" style={{ fontSize: '16px', color: 'var(--accent)' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reprendre où vous en étiez</div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {dernierCritere.code} — {dernierCritere.titre}
            </div>
          </div>
          <i className="ti ti-chevron-right" style={{ fontSize: '16px', color: 'var(--text-tertiary)' }} />
        </button>
      )}

      <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '4px' }}>Les 4 chapitres du référentiel</div>
      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
        Choisissez un chapitre pour voir ses critères. Vous pouvez avancer dans l’ordre que vous voulez.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '14px' }}>
        {stats.map(s => {
          const ch = chapitres[s.code]
          const pct = s.total > 0 ? Math.round((s.prets / s.total) * 100) : 0
          const termine = s.total > 0 && s.prets === s.total
          return (
            <div key={s.code} data-testid={`chapitre-${s.code}`}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', borderTop: `4px solid ${ch.color}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: ch.bg, border: `1px solid ${ch.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`ti ${ch.icon}`} style={{ fontSize: '19px', color: ch.color }} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: '600', color: ch.color, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Chapitre {s.code}</div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>{ch.label}</div>
                </div>
              </div>

              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.55', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{ch.description}</div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Prêts pour l’audit : {s.prets} / {s.total}</span>
                  <span style={{ fontWeight: '700', color: ch.color }}>{pct}%</span>
                </div>
                <div style={{ height: '6px', background: ch.border, borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: ch.color, borderRadius: '3px' }} />
                </div>
              </div>

              {(s.actionsCorrectives > 0 || s.aValider > 0 || s.messagesNonLus > 0) && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {s.actionsCorrectives > 0 && <Pastille couleur="#DC2626" fond="#FEF2F2" texte={`${s.actionsCorrectives} action${s.actionsCorrectives > 1 ? 's' : ''} corrective${s.actionsCorrectives > 1 ? 's' : ''}`} />}
                  {s.aValider > 0 && <Pastille couleur="#2563EB" fond="#EFF6FF" texte={`${s.aValider} à valider`} />}
                  {s.messagesNonLus > 0 && <Pastille couleur="#7C3AED" fond="#F5F3FF" texte={`${s.messagesNonLus} message${s.messagesNonLus > 1 ? 's' : ''} non lu${s.messagesNonLus > 1 ? 's' : ''}`} />}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', flexWrap: 'wrap' }}>
                {s.prochain ? (
                  <button onClick={() => onOuvrirCritere(s.prochain!.code)} title={`${s.prochain.code} — ${s.prochain.titre}`}
                    style={{ padding: '9px 14px', background: ch.color, border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Continuer · {s.prochain.code}
                    <i className="ti ti-arrow-right" style={{ fontSize: '14px' }} />
                  </button>
                ) : termine ? (
                  <span style={{ padding: '9px 0', fontSize: '13px', fontWeight: '600', color: '#059669', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <i className="ti ti-circle-check-filled" style={{ fontSize: '16px' }} />Chapitre prêt pour l’audit
                  </span>
                ) : null}
                <button onClick={() => onOuvrirChapitre(s.code)}
                  style={{ padding: '9px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  {s.total > 1 ? `Voir les ${s.total} critères` : 'Voir le critère'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Pastille({ couleur, fond, texte }: { couleur: string; fond: string; texte: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', background: fond, borderRadius: '20px', fontSize: '11px', fontWeight: '600', color: couleur }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: couleur }} />{texte}
    </span>
  )
}
