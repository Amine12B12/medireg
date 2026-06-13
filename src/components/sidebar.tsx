'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Props = { role: string }

const navAdmin = [
  { label: 'Tableau de bord', path: '/dashboard', icon: 'ti-layout-dashboard' },
  { label: 'Clients', path: '/dashboard/clients', icon: 'ti-building-hospital' },
  { label: 'Matériel', path: '/dashboard/materiel', icon: 'ti-device-heart-monitor' },
  { label: 'Maintenance', path: '/dashboard/maintenance', icon: 'ti-tool' },
  { label: 'Livraisons', path: '/dashboard/livraisons', icon: 'ti-truck' },
  { label: 'Devis', path: '/dashboard/devis', icon: 'ti-file-invoice' },
]

const navClient = [
  { label: 'Tableau de bord', path: '/dashboard', icon: 'ti-layout-dashboard' },
  { label: 'Mon matériel', path: '/dashboard/materiel', icon: 'ti-device-heart-monitor' },
  { label: 'Maintenance', path: '/dashboard/maintenance', icon: 'ti-tool' },
  { label: 'Devis', path: '/dashboard/devis', icon: 'ti-file-invoice' },
]

export default function Sidebar({ role }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const nav = role === 'admin' ? navAdmin : navClient

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div style={{
      width: '220px', minHeight: '100vh',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      flexShrink: 0, fontFamily: 'var(--font)'
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px',
            background: 'linear-gradient(135deg, #1A56DB 0%, #3B82F6 100%)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(26,86,219,0.3)'
          }}>
            <i className="ti ti-activity-heartbeat" style={{ fontSize: '16px', color: '#fff' }} aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
              Medi<span style={{ color: 'var(--accent)' }}>Track</span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '1px' }}>
              {role === 'admin' ? 'Administration' : 'Espace client'}
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: '8px 8px', overflowY: 'auto' }}>
        <div style={{ fontSize: '10px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '8px 8px 4px' }}>
          {role === 'admin' ? 'Gestion' : 'Mon espace'}
        </div>
        {nav.map(item => {
          const active = pathname === item.path
          return (
            <button key={item.path} onClick={() => router.push(item.path)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '9px',
                padding: '8px 10px', border: 'none', borderRadius: 'var(--radius-sm)',
                background: active ? 'var(--accent-light)' : 'transparent',
                color: active ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: '13px', fontWeight: active ? '500' : '400',
                cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left',
                marginBottom: '1px', transition: 'all 0.1s'
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-hover)' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              <i className={`ti ${item.icon}`} style={{ fontSize: '16px', flexShrink: 0 }} aria-hidden="true" />
              {item.label}
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '8px 10px', borderRadius: 'var(--radius-sm)',
          marginBottom: '4px'
        }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--accent-light) 0%, #DBEAFE 100%)',
            border: '1px solid rgba(26,86,219,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: '600', color: 'var(--accent)', flexShrink: 0
          }}>
            {role === 'admin' ? 'AD' : 'EP'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {role === 'admin' ? 'Admin PSDM' : 'EHPAD Les Pins'}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
              {role === 'admin' ? 'Administrateur' : 'Établissement'}
            </div>
          </div>
        </div>
        <button onClick={logout}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
            padding: '7px 10px', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', background: 'transparent',
            color: 'var(--text-secondary)', fontSize: '12px',
            cursor: 'pointer', fontFamily: 'var(--font)',
            transition: 'all 0.1s'
          }}
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