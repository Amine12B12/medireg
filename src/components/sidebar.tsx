'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Props = { role: string; formule: string; etabNom?: string; contactNom?: string }

const navAdmin = [
  { label: 'Tableau de bord', path: '/dashboard', icon: 'ti-layout-dashboard', feature: null },
  { label: 'Clients', path: '/dashboard/clients', icon: 'ti-building-hospital', feature: null },
  { label: 'Matériel', path: '/dashboard/materiel', icon: 'ti-device-heart-monitor', feature: null },
  { label: 'Maintenance', path: '/dashboard/maintenance', icon: 'ti-tool', feature: null },
  { label: 'Livraisons', path: '/dashboard/livraisons', icon: 'ti-truck', feature: null },
  { label: 'Alertes', path: '/dashboard/alertes', icon: 'ti-bell', feature: null },
  { label: 'Devis', path: '/dashboard/devis', icon: 'ti-file-invoice', feature: null },
  { label: 'Conformité', path: '/dashboard/conformite', icon: 'ti-shield-check', feature: null },
  { label: 'Matériovigilance', path: '/dashboard/materiovigilance', icon: 'ti-shield-exclamation', feature: null },
  { label: 'Assistant IA', path: '/dashboard/assistant', icon: 'ti-sparkles', feature: null },
  { label: 'Reporting', path: '/dashboard/reporting', icon: 'ti-chart-bar', feature: null },
]

const navClient = [
  { label: 'Tableau de bord', path: '/dashboard', icon: 'ti-layout-dashboard', feature: null },
  { label: 'Mon matériel', path: '/dashboard/materiel', icon: 'ti-device-heart-monitor', feature: 'parc' },
  { label: 'Alertes', path: '/dashboard/alertes', icon: 'ti-bell', feature: null },
  { label: 'Maintenance', path: '/dashboard/maintenance', icon: 'ti-tool', feature: 'alertes_maintenance' },
  { label: 'Devis', path: '/dashboard/devis', icon: 'ti-file-invoice', feature: 'intervention' },
  { label: 'Conformité', path: '/dashboard/conformite', icon: 'ti-shield-check', feature: 'conformite' },
  { label: 'Assistant IA', path: '/dashboard/assistant', icon: 'ti-sparkles', feature: 'assistant_ia' },
]

export default function Sidebar({ role, formule, etabNom, contactNom }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  const can = (feature: string | null): boolean => {
    if (!feature) return true
    if (role === 'admin') return true
    const rules: Record<string, string[]> = {
      'parc': ['Essentiel', 'Premium', 'Privilège'],
      'localisation': ['Essentiel', 'Premium', 'Privilège'],
      'categories': ['Essentiel', 'Premium', 'Privilège'],
      'historique': ['Essentiel', 'Premium', 'Privilège'],
      'documents': ['Essentiel', 'Premium', 'Privilège'],
      'intervention': ['Essentiel', 'Premium', 'Privilège'],
      'alertes_maintenance': ['Premium', 'Privilège'],
      'assistant_ia': ['Premium', 'Privilège'],
      'conformite': ['Premium', 'Privilège'],
      'support_prioritaire': ['Premium', 'Privilège'],
      'score_conformite': ['Privilège'],
      'reporting': ['Privilège'],
      'multi_sites': ['Privilège'],
    }
    return rules[feature]?.includes(formule) ?? false
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const nav = role === 'admin' ? navAdmin : navClient
  const initiales = contactNom
    ? contactNom.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : etabNom?.slice(0, 2).toUpperCase() || 'EP'

  return (
    <div style={{ width: '220px', minHeight: '100vh', background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', flexShrink: 0, fontFamily: 'var(--font)' }}>

      {/* Logo + nom établissement */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #1A56DB 0%, #3B82F6 100%)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(26,86,219,0.3)' }}>
            <i className="ti ti-activity-heartbeat" style={{ fontSize: '16px', color: '#fff' }} aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
              Medi<span style={{ color: 'var(--accent)' }}>Track</span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '1px' }}>
              {role === 'admin' ? 'Administration' : etabNom || 'Espace client'}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: '8px', overflowY: 'auto' }}>
        <div style={{ fontSize: '10px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '8px 8px 4px' }}>
          {role === 'admin' ? 'Gestion' : 'Mon espace'}
        </div>
        {nav.map((item) => {
          const active = pathname === item.path
          const locked = role === 'client' && !can(item.feature)
          return (
            <button key={item.path}
              onClick={() => router.push(item.path)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '9px',
                padding: '8px 10px', border: 'none', borderRadius: 'var(--radius-sm)',
                background: active ? 'var(--accent-light)' : 'transparent',
                color: locked ? 'var(--text-tertiary)' : active ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: '13px', fontWeight: active ? '500' : '400',
                cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left',
                marginBottom: '1px', transition: 'all 0.1s',
                opacity: locked ? 0.5 : 1
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-hover)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              <i className={`ti ${item.icon}`} style={{ fontSize: '16px', flexShrink: 0 }} aria-hidden="true" />
              <span style={{ flex: 1 }}>{item.label}</span>
              {locked && <i className="ti ti-lock" style={{ fontSize: '11px', opacity: 0.5 }} aria-hidden="true" />}
            </button>
          )
        })}

        {/* Badge formule client */}
        {role === 'client' && formule && (
          <div style={{
            margin: '12px 8px 0', padding: '8px 10px',
            background: formule === 'Privilège' ? 'var(--purple-light)' : formule === 'Premium' ? 'var(--accent-light)' : 'var(--surface-hover)',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${formule === 'Privilège' ? 'rgba(110,86,207,0.2)' : formule === 'Premium' ? 'rgba(26,86,219,0.2)' : 'var(--border)'}`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <i className="ti ti-star" style={{ fontSize: '13px', color: formule === 'Privilège' ? 'var(--purple)' : formule === 'Premium' ? 'var(--accent)' : 'var(--text-tertiary)' }} aria-hidden="true" />
              <span style={{ fontSize: '11px', fontWeight: '600', color: formule === 'Privilège' ? 'var(--purple)' : formule === 'Premium' ? 'var(--accent)' : 'var(--text-tertiary)' }}>
                Formule {formule}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Footer — nom du contact */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: 'var(--radius-sm)', marginBottom: '4px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: role === 'admin' ? 'var(--accent-light)' : 'var(--success-light)', border: `1px solid ${role === 'admin' ? 'rgba(26,86,219,0.2)' : 'rgba(10,124,78,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700', color: role === 'admin' ? 'var(--accent)' : 'var(--success)', flexShrink: 0 }}>
            {initiales}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {contactNom || etabNom || 'Mon espace'}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {role === 'admin' ? 'Administrateur' : etabNom || formule}
            </div>
          </div>
        </div>
        <button onClick={logout}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.1s' }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-hover)'}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
        >
          <i className="ti ti-logout" style={{ fontSize: '14px' }} aria-hidden="true" />
          Déconnexion
        </button>
      </div>
    </div>
  )
}