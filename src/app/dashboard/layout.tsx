'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

const pageTitles: Record<string, { title: string; sub: string }> = {
  '/dashboard': { title: 'Tableau de bord', sub: 'Vue globale' },
  '/dashboard/clients': { title: 'Clients', sub: 'Etablissements accompagnes' },
  '/dashboard/audits': { title: 'Audits', sub: 'Preparation a la certification' },
  '/dashboard/bibliotheque': { title: 'Bibliotheque', sub: 'Documents et modeles' },
  '/dashboard/referentiel': { title: 'Referentiel', sub: 'HAS, ANSM, Normes' },
  '/dashboard/pilotage': { title: 'Pilotage', sub: 'Scores et KPI' },
  '/dashboard/taches': { title: 'Mes actions', sub: 'Taches et echeances' },
  '/dashboard/conformite': { title: 'Conformite', sub: 'Obligations et criteres' },
  '/dashboard/assistant': { title: 'Assistant IA', sub: 'Expert reglementaire' },
}

const navConsultant = [
  { path: '/dashboard', icon: 'ti-home', label: 'Tableau de bord' },
  { path: '/dashboard/clients', icon: 'ti-building-hospital', label: 'Clients' },
  { path: '/dashboard/audits', icon: 'ti-clipboard-check', label: 'Audits' },
  { path: '/dashboard/bibliotheque', icon: 'ti-books', label: 'Bibliotheque' },
  { path: '/dashboard/referentiel', icon: 'ti-book', label: 'Referentiel' },
  { path: '/dashboard/pilotage', icon: 'ti-chart-bar', label: 'Pilotage' },
  { path: '/dashboard/assistant', icon: 'ti-sparkles', label: 'Assistant IA' },
]

const navAdmin = [
  { path: '/dashboard', icon: 'ti-home', label: 'Tableau de bord' },
  { path: '/dashboard/conformite', icon: 'ti-clipboard-check', label: 'Conformite' },
  { path: '/dashboard/taches', icon: 'ti-checklist', label: 'Mes actions' },
  { path: '/dashboard/bibliotheque', icon: 'ti-books', label: 'Documents' },
  { path: '/dashboard/assistant', icon: 'ti-sparkles', label: 'Assistant IA' },
]

const navClient = [
  { path: '/dashboard', icon: 'ti-home', label: 'Accueil' },
  { path: '/dashboard/taches', icon: 'ti-checklist', label: 'Mes actions' },
  { path: '/dashboard/bibliotheque', icon: 'ti-books', label: 'Mes documents' },
  { path: '/dashboard/conformite', icon: 'ti-chart-pie', label: 'Ma conformite' },
  { path: '/dashboard/assistant', icon: 'ti-sparkles', label: 'Assistant IA' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [clientNom, setClientNom] = useState('')
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
      const { data: prof } = await supabase.from('profiles').select('role, client_id, nom, prenom').eq('id', user.id).single()
      if (!prof) return
      setRole(prof.role)
      setUserName(`${prof.prenom || ''} ${prof.nom || ''}`.trim() || user.email || '')
      if (prof.client_id) {
        const { data: client } = await supabase.from('clients').select('nom').eq('id', prof.client_id).single()
        setClientNom(client?.nom || '')
      }
    }
    load()
  }, [])

  useEffect(() => { setSidebarOpen(false) }, [pathname])

  const nav = role === 'consultant' ? navConsultant : role === 'admin' ? navAdmin : navClient
  const page = pageTitles[pathname] || { title: 'MediReg', sub: '' }

  const roleLabel = role === 'consultant' ? 'Consultant' : role === 'admin' ? 'Administrateur' : 'Client'
  const roleColor = role === 'consultant' ? '#7C3AED' : role === 'admin' ? '#1A56DB' : '#0A7C4E'
  const roleBg = role === 'consultant' ? '#F5F3FF' : role === 'admin' ? '#EBF2FF' : '#E8F5EE'

  if (!role) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font)', color: 'var(--text-tertiary)', fontSize: '13px', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #7C3AED 0%, #1A56DB 100%)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="ti ti-shield-check" style={{ fontSize: '16px', color: '#fff' }} />
        </div>
        <span>Chargement...</span>
      </div>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)' }}>

      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200, backdropFilter: 'blur(2px)' }} />
      )}

      {/* SIDEBAR */}
      <div style={{
        position: isMobile ? 'fixed' : 'sticky',
        left: isMobile ? (sidebarOpen ? 0 : '-220px') : 0,
        top: 0, height: '100vh', zIndex: 300,
        transition: 'left 0.2s ease', flexShrink: 0,
        width: '220px', background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column'
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 18px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #7C3AED 0%, #1A56DB 100%)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="ti ti-shield-check" style={{ fontSize: '16px', color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>MediReg</div>
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '1px' }}>Conformite reglementaire</div>
            </div>
          </div>
        </div>

        {/* Role badge */}
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: roleBg, borderRadius: 'var(--radius-md)', border: `1px solid ${roleColor}22` }}>
            <i className={`ti ${role === 'consultant' ? 'ti-user-star' : role === 'admin' ? 'ti-user-cog' : 'ti-user'}`} style={{ fontSize: '14px', color: roleColor }} />
            <div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: roleColor }}>{roleLabel}</div>
              {clientNom && <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '1px' }}>{clientNom}</div>}
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
          {nav.map(item => {
            const active = pathname === item.path || (item.path !== '/dashboard' && pathname.startsWith(item.path))
            return (
              <button key={item.path} onClick={() => router.push(item.path)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: 'var(--radius-md)', border: 'none', background: active ? 'var(--accent-light)' : 'transparent', color: active ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: active ? '500' : '400', cursor: 'pointer', fontFamily: 'var(--font)', marginBottom: '2px', textAlign: 'left', transition: 'all 0.1s' }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-hover)' }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
                <i className={`ti ${item.icon}`} style={{ fontSize: '17px', flexShrink: 0 }} />
                {item.label}
              </button>
            )
          })}
        </nav>

        {/* User footer */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--accent)' }}>
                {userName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userName}</div>
            </div>
          </div>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            style={{ width: '100%', padding: '7px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'transparent', color: 'var(--text-tertiary)', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <i className="ti ti-logout" style={{ fontSize: '14px' }} />
            Deconnexion
          </button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', minWidth: 0 }}>
        {/* Header */}
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 24px', height: '58px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {isMobile && (
              <button onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{ width: '34px', height: '34px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                <i className="ti ti-menu-2" style={{ fontSize: '18px' }} />
              </button>
            )}
            <div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>{page.title}</div>
              {!isMobile && <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '1px' }}>{page.sub}</div>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ padding: '4px 10px', background: roleBg, borderRadius: '20px', border: `1px solid ${roleColor}22` }}>
              <span style={{ fontSize: '11px', fontWeight: '500', color: roleColor }}>{roleLabel}</span>
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }}>{children}</div>
      </div>
    </div>
  )
}