'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Props = { role: string }

const navAdmin = [
  { label: 'Tableau de bord', path: '/dashboard', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
  { label: 'Clients', path: '/dashboard/clients', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { label: 'Matériel', path: '/dashboard/materiel', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> },
  { label: 'Maintenance', path: '/dashboard/maintenance', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> },
  { label: 'Livraisons', path: '/dashboard/livraisons', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> },
  { label: 'Alertes', path: '/dashboard/alertes', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>, badge: 1 },
]

const navClient = [
  { label: 'Tableau de bord', path: '/dashboard', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
  { label: 'Mon matériel', path: '/dashboard/materiel', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> },
  { label: 'Maintenance', path: '/dashboard/maintenance', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg> },
  { label: 'Alertes', path: '/dashboard/alertes', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>, badge: 1 },
  { label: 'Demande de devis', path: '/dashboard/devis', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
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
      width: '220px', minHeight: '100vh', background: '#fff',
      borderRight: '0.5px solid #DDE5F0', display: 'flex',
      flexDirection: 'column', padding: '0', flexShrink: 0,
      fontFamily: 'Inter, -apple-system, sans-serif'
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '0.5px solid #F0F4FA' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '28px', height: '28px', background: '#1A56DB', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#0A1628' }}>Medi<span style={{ color: '#1A56DB' }}>Track</span></span>
        </div>
      </div>

      {/* Role badge */}
      <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #F0F4FA' }}>
        <div style={{ padding: '6px 10px', background: role === 'admin' ? '#EEF2FF' : '#E8F5EF', borderRadius: '8px', fontSize: '11px', fontWeight: '500', color: role === 'admin' ? '#3730A3' : '#00875A', textAlign: 'center' }}>
          {role === 'admin' ? 'Administrateur PSDM' : 'Établissement client'}
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex: 1, padding: '10px 10px' }}>
        {nav.map(item => {
          const active = pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => router.push(item.path)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center',
                gap: '10px', padding: '9px 12px', borderRadius: '8px',
                border: 'none', background: active ? '#EEF2FF' : 'transparent',
                color: active ? '#1A56DB' : '#6B7A99',
                fontSize: '13px', fontWeight: active ? '500' : '400',
                cursor: 'pointer', fontFamily: 'inherit',
                marginBottom: '2px', textAlign: 'left',
                transition: 'all 0.1s', position: 'relative'
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC' }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
            >
              {item.icon}
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span style={{ background: '#DC2626', color: '#fff', fontSize: '10px', fontWeight: '600', padding: '2px 6px', borderRadius: '10px' }}>
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: '12px 10px', borderTop: '0.5px solid #F0F4FA' }}>
        <button
          onClick={logout}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', border: 'none', background: 'transparent', color: '#6B7A99', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC'}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'transparent'}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Déconnexion
        </button>
      </div>
    </div>
  )
}