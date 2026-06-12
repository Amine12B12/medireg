'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from '@/components/sidebar'

const pageTitles: Record<string, { title: string; sub: string }> = {
  '/dashboard': { title: 'Tableau de bord', sub: 'Vue globale du parc' },
  '/dashboard/clients': { title: 'Clients', sub: 'Établissements pilotes' },
  '/dashboard/materiel': { title: 'Matériel', sub: 'Équipements enregistrés' },
  '/dashboard/maintenance': { title: 'Maintenance', sub: 'Planning des interventions' },
  '/dashboard/livraisons': { title: 'Livraisons', sub: 'Installations planifiées' },
  '/dashboard/alertes': { title: 'Alertes', sub: 'Équipements nécessitant une action' },
  '/dashboard/devis': { title: 'Devis', sub: 'Demandes en cours' },
  '/dashboard/categories': { title: 'Catégories', sub: 'Types de matériel' },
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

  // Ferme sidebar sur navigation mobile
  useEffect(() => { setSidebarOpen(false) }, [pathname])

  const page = pageTitles[pathname] || { title: 'MediTrack', sub: '' }

  if (!role) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, -apple-system, sans-serif', color: '#6B7280', fontSize: '13px' }}>
      Chargement...
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, -apple-system, sans-serif' }}>

      {/* Overlay mobile */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200 }}
        />
      )}

      {/* Sidebar */}
      <div style={{
        position: isMobile ? 'fixed' : 'relative',
        left: isMobile ? (sidebarOpen ? 0 : '-220px') : 0,
        top: 0, bottom: 0, zIndex: 300,
        transition: 'left 0.25s ease',
        flexShrink: 0
      }}>
        <Sidebar role={role} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', minWidth: 0 }}>

        {/* TOPBAR */}
        <div style={{
          background: '#fff', borderBottom: '0.5px solid #E5E7EB',
          padding: '0 16px', height: '56px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 100, flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Burger menu mobile */}
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{ width: '34px', height: '34px', border: '0.5px solid #E5E7EB', borderRadius: '8px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}
              >
                <i className="ti ti-menu-2" style={{ fontSize: '18px' }} aria-hidden="true" />
              </button>
            )}
            <div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{page.title}</div>
              {!isMobile && <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '1px' }}>{page.sub}</div>}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Cloche */}
            <button
              onClick={() => router.push('/dashboard/alertes')}
              style={{ position: 'relative', width: '34px', height: '34px', border: '0.5px solid #E5E7EB', borderRadius: '8px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}
            >
              <i className="ti ti-bell" style={{ fontSize: '16px' }} aria-hidden="true" />
              {alertCount > 0 && (
                <span style={{ position: 'absolute', top: '7px', right: '7px', width: '7px', height: '7px', background: '#DC2626', borderRadius: '50%', border: '1.5px solid #fff' }} />
              )}
            </button>

            {/* Badge role - caché sur mobile */}
            {!isMobile && (
              <div style={{ padding: '4px 10px', background: role === 'admin' ? '#EFF6FF' : '#F0FDF4', border: `0.5px solid ${role === 'admin' ? '#BFDBFE' : '#BBF7D0'}`, borderRadius: '20px', fontSize: '11px', fontWeight: '500', color: role === 'admin' ? '#1A56DB' : '#059669' }}>
                {role === 'admin' ? 'Administrateur' : 'Établissement'}
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