'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from '@/components/sidebar'

const pageTitles: Record<string, { title: string; sub: string }> = {
  '/dashboard': { title: 'Tableau de bord', sub: 'Vue globale du parc' },
  '/dashboard/conformite': { title: 'Conformité', sub: 'Score de préparation contrôle' },
  '/dashboard/clients': { title: 'Clients', sub: 'Établissements pilotés' },
  '/dashboard/materiel': { title: 'Matériel', sub: 'Parc d\'équipements' },
  '/dashboard/maintenance': { title: 'Maintenance', sub: 'Planning des interventions' },
  '/dashboard/livraisons': { title: 'Livraisons', sub: 'Installations planifiées' },
  '/dashboard/alertes': { title: 'Alertes', sub: 'Équipements hors service' },
  '/dashboard/devis': { title: 'Devis', sub: 'Demandes en cours' },
  '/dashboard/categories': { title: 'Catégories', sub: 'Types de matériel' },
  '/dashboard/assistant': { title: 'Assistant IA', sub: 'Expert en gestion PSDM' },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<string | null>(null)
  const [alertCount, setAlertCount] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth >= 768) setSidebarOpen(false)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setRole(prof?.role || 'client')
      const { count } = await supabase.from('pannes').select('*', { count: 'exact', head: true }).eq('statut', 'ouvert')
      setAlertCount(count || 0)
    }
    load()
  }, [])

  useEffect(() => { setSidebarOpen(false) }, [pathname])

  const page = pageTitles[pathname] || { title: 'MediTrack', sub: '' }

  if (!role) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font)', color: 'var(--text-tertiary)', fontSize: '13px', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #1A56DB 0%, #3B82F6 100%)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="ti ti-activity-heartbeat" style={{ fontSize: '16px', color: '#fff' }} aria-hidden="true" />
        </div>
        <span>Chargement...</span>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)' }}>

      {/* Overlay mobile */}
      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200, backdropFilter: 'blur(2px)' }} />
      )}

      {/* Sidebar */}
      <div style={{
        position: isMobile ? 'fixed' : 'relative',
        left: isMobile ? (sidebarOpen ? 0 : '-220px') : 0,
        top: 0, bottom: 0, zIndex: 300,
        transition: 'left 0.2s ease',
        flexShrink: 0
      }}>
        <Sidebar role={role} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', minWidth: 0 }}>

        {/* TOPBAR */}
        <div style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          padding: '0 24px', height: '58px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 100, flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {isMobile && (
              <button onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{ width: '34px', height: '34px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                <i className="ti ti-menu-2" style={{ fontSize: '18px' }} aria-hidden="true" />
              </button>
            )}
            <div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>{page.title}</div>
              {!isMobile && <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '1px' }}>{page.sub}</div>}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={() => router.push('/dashboard/alertes')}
              style={{ position: 'relative', width: '36px', height: '36px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              <i className="ti ti-bell" style={{ fontSize: '17px' }} aria-hidden="true" />
              {alertCount > 0 && (
                <span style={{ position: 'absolute', top: '7px', right: '7px', width: '7px', height: '7px', background: 'var(--danger)', borderRadius: '50%', border: '2px solid var(--surface)' }} />
              )}
            </button>

            {!isMobile && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 12px 6px 8px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface)'
              }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: role === 'admin' ? 'var(--accent-light)' : 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '600', color: role === 'admin' ? 'var(--accent)' : 'var(--success)' }}>
                  {role === 'admin' ? 'AD' : 'EP'}
                </div>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>{role === 'admin' ? 'Admin PSDM' : 'Mon espace'}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>{role === 'admin' ? 'Administrateur' : 'Établissement'}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  )
}