'use client'

import { useRouter } from 'next/navigation'

type Props = {
  feature: string
  formule: string | null
  role: string | null
  can: (f: string) => boolean
  children: React.ReactNode
}

const FORMULE_LABELS: Record<string, string> = {
  'alertes_maintenance': 'Alertes de maintenance',
  'assistant_ia': 'Assistant IA MediTrack',
  'conformite': 'Score de conformité',
  'reporting': 'Reporting avancé',
  'score_conformite': 'Score de conformité avancé',
  'multi_sites': 'Multi-sites',
}

const FORMULE_REQUIRED: Record<string, string> = {
  'alertes_maintenance': 'Premium',
  'assistant_ia': 'Premium',
  'conformite': 'Premium',
  'reporting': 'Privilège',
  'score_conformite': 'Privilège',
  'multi_sites': 'Privilège',
}

export default function FormuleGate({ feature, can, children }: Props) {
  const router = useRouter()

  if (can(feature)) return <>{children}</>

  const required = FORMULE_REQUIRED[feature] || 'Premium'
  const label = FORMULE_LABELS[feature] || feature

  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: '40px', maxWidth: '420px', width: '100%', textAlign: 'center', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <i className="ti ti-lock" style={{ fontSize: '24px', color: 'var(--accent)' }} aria-hidden="true" />
        </div>
        <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '-0.3px', marginBottom: '8px' }}>
          {label}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
          Cette fonctionnalité est disponible à partir de la formule
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: required === 'Privilège' ? 'var(--purple-light)' : 'var(--accent-light)', borderRadius: '20px', marginBottom: '24px' }}>
          <i className="ti ti-star" style={{ fontSize: '14px', color: required === 'Privilège' ? 'var(--purple)' : 'var(--accent)' }} aria-hidden="true" />
          <span style={{ fontSize: '13px', fontWeight: '600', color: required === 'Privilège' ? 'var(--purple)' : 'var(--accent)' }}>
            Formule {required}
          </span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '20px' }}>
          Contactez votre prestataire pour upgrader votre formule et accéder à cette fonctionnalité.
        </div>
        <button onClick={() => router.push('/dashboard')}
          style={{ padding: '10px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', boxShadow: '0 1px 4px rgba(26,86,219,0.3)' }}>
          Retour au tableau de bord
        </button>
      </div>
    </div>
  )
}