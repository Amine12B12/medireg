'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Props = { role: string; alertCount?: number }

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
  { label: 'Demande de devis', path: '/dashboard/devis', icon: 'ti-file-invoice' },
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
      width: '210px', minHeight: '100vh', background: '#fff',
      borderRight: '0.5px solid #E5E7EB', display: 'flex',
      flexDirection: 'column', flexShrink: 0,
      fontFamily: 'Inter, -apple-system, sans-serif'
    }}>
      {/* Logo */}
      <div style={{ padding: '16px', borderBottom: '0.5px solid #E5E7EB' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', background: '#1A56DB', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-activity-heartbeat" style={{ fontSize: '14px', color: '#fff' }} aria-hidden="true" />
          </div>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>
            Medi<span style={{ color: '#1A56DB' }}>Track</span>
          </span>
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: '8px 0' }}>
        <div style={{ padding: '8px 16px 4px', fontSize: '10px', fontWeight: '500', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          {role === 'admin' ? 'Administration' : 'Mon espace'}
        </div>
        {nav.map(item => {
          const active = pathname === item.path
          return (
            <button key={item.path} onClick={() => router.push(item.path)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 16px', border: 'none', borderLeft: `2px solid ${active ? '#1A56DB' : 'transparent'}`,
                background: active ? '#EFF6FF' : 'transparent',
                color: active ? '#1A56DB' : '#6B7280',
                fontSize: '13px', fontWeight: active ? '500' : '400',
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                transition: 'all 0.1s'
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              <i className={`ti ${item.icon}`} style={{ fontSize: '15px' }} aria-hidden="true" />
              {item.label}
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 16px', borderTop: '0.5px solid #E5E7EB' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#EFF6FF', border: '0.5px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '600', color: '#1A56DB' }}>
            {role === 'admin' ? 'AD' : 'EP'}
          </div>
          <div>
            <div style={{ fontSize: '12px', fontWeight: '500', color: '#111827' }}>{role === 'admin' ? 'Admin PSDM' : 'EHPAD Les Pins'}</div>
            <div style={{ fontSize: '10px', color: '#9CA3AF' }}>{role === 'admin' ? 'Administrateur' : 'Établissement'}</div>
          </div>
        </div>
        <button onClick={logout}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 8px', border: '0.5px solid #E5E7EB', borderRadius: '6px', background: 'transparent', color: '#6B7280', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB'}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
        >
          <i className="ti ti-logout" style={{ fontSize: '14px' }} aria-hidden="true" />
          Déconnexion
        </button>
      </div>
    </div>
  )
}