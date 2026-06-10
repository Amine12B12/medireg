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
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<string | null>(null)
  const [alertCount, setAlertCount] = useState(0)
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()

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

  const page = pageTitles[pathname] || { title: 'MediTrack', sub: '' }

  if (!role) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, -apple-system, sans-serif', color: '#6B7280', fontSize: '13px' }}>
      Chargement...
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F9FAFB', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <Sidebar role={role} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>

        {/* TOPBAR */}
        <div style={{ background: '#fff', borderBottom: '0.5px solid #E5E7EB', padding: '0 24px', height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{page.title}</div>
            <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '1px' }}>{page.sub}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Cloche alertes */}
            <button
              onClick={() => router.push('/dashboard/alertes')}
              style={{ position: 'relative', width: '34px', height: '34px', border: '0.5px solid #E5E7EB', borderRadius: '8px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = '#F9FAFB'}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = '#fff'}
            >
              <i className="ti ti-bell" style={{ fontSize: '16px' }} aria-hidden="true" />
              {alertCount > 0 && (
                <span style={{ position: 'absolute', top: '6px', right: '6px', width: '7px', height: '7px', background: '#E53E3E', borderRadius: '50%', border: '1.5px solid #fff' }} />
              )}
            </button>

            {/* Badge role */}
            <div style={{ padding: '4px 10px', background: role === 'admin' ? '#EFF6FF' : '#F0FDF4', border: `0.5px solid ${role === 'admin' ? '#BFDBFE' : '#BBF7D0'}`, borderRadius: '20px', fontSize: '11px', fontWeight: '500', color: role === 'admin' ? '#1A56DB' : '#059669' }}>
              {role === 'admin' ? 'Administrateur' : 'Établissement'}
            </div>
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