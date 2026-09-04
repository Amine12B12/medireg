'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'

const pageTitles: Record<string, { title: string; sub: string }> = {
  '/dashboard': { title: 'Tableau de bord', sub: 'Vue globale de votre certification' },
  '/dashboard/clients': { title: 'Clients', sub: 'Etablissements accompagnes' },
  '/dashboard/certification': { title: 'Certification', sub: '60 criteres HAS PSDM' },
  '/dashboard/documents': { title: 'Documents', sub: 'Vos documents qualite' },
  '/dashboard/assistant': { title: 'Assistant IA', sub: 'Expert reglementaire' },
  '/dashboard/onboarding': { title: 'Configuration', sub: 'Mise en place de votre profil' },
  '/dashboard/profil': { title: 'Mon profil', sub: 'Informations etablissement' },
  '/dashboard/rh': { title: 'Ressources Humaines', sub: 'Compétences et formations' },
}

const navConsultant = [
  { path: '/dashboard', icon: 'ti-home', label: 'Tableau de bord' },
  { path: '/dashboard/clients', icon: 'ti-building-hospital', label: 'Clients' },
  { path: '/dashboard/assistant', icon: 'ti-sparkles', label: 'Assistant IA' },
]

const navClient = [
  { path: '/dashboard', icon: 'ti-home', label: 'Tableau de bord' },
  { path: '/dashboard/certification', icon: 'ti-shield-check', label: 'Certification' },
  { path: '/dashboard/documents', icon: 'ti-files', label: 'Documents' },
  { path: '/dashboard/rh', icon: 'ti-users', label: 'Ressources Humaines' },
  { path: '/dashboard/assistant', icon: 'ti-sparkles', label: 'Assistant IA' },
  { path: '/dashboard/profil', icon: 'ti-building', label: 'Mon profil' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [clientNom, setClientNom] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [notifCount, setNotifCount] = useState(0)
  const [showNotifs, setShowNotifs] = useState(false)
  const [notifs, setNotifs] = useState<any[]>([])
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

      if (prof.role !== 'consultant' && prof.client_id && pathname !== '/dashboard/onboarding') {
        const { data: societe } = await supabase.from('societes').select('id').eq('client_id', prof.client_id).single()
        if (!societe) { router.push('/dashboard/onboarding'); return }
      }

      // Charger notifications pour les consultants
      if (prof.role === 'consultant') {
        const { data: notifData } = await supabase
          .from('notifications')
          .select('*, clients(nom)')
          .eq('lu', false)
          .order('created_at', { ascending: false })
          .limit(20)
        setNotifs(notifData || [])
        setNotifCount((notifData || []).length)
      }
    }
    load()
  }, [pathname])

  useEffect(() => { setSidebarOpen(false) }, [pathname])

  const nav = role === 'consultant' ? navConsultant : navClient
  const page = pageTitles[pathname] || { title: 'MediReg', sub: '' }
  const roleLabel = role === 'consultant' ? 'Consultant' : 'Administrateur'
  const roleColor = role === 'consultant' ? '#7C3AED' : '#1A56DB'
  const roleBg = role === 'consultant' ? '#F5F3FF' : '#EBF2FF'

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

  if (pathname === '/dashboard/onboarding') {
    return <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)' }}>{children}</div>
  }

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
              <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '1px' }}>Certification PSDM</div>
            </div>
          </div>
        </div>

        {/* Role badge */}
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: roleBg, borderRadius: 'var(--radius-md)', border: `1px solid ${roleColor}22` }}>
            <i className={`ti ${role === 'consultant' ? 'ti-user-star' : 'ti-user-cog'}`} style={{ fontSize: '14px', color: roleColor }} />
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
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', borderRadius: 'var(--radius-md)', border: 'none', background: active ? 'var(--accent-light)' : 'transparent', color: active ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '13px', fontWeight: active ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)', marginBottom: '2px', textAlign: 'left', transition: 'all 0.1s' }}
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
              <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--accent)' }}>{userName.charAt(0).toUpperCase()}</span>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {role === 'consultant' && (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowNotifs(!showNotifs)}
                  style={{ width: '36px', height: '36px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: notifCount > 0 ? '#7C3AED' : 'var(--text-secondary)', position: 'relative' }}>
                  <i className="ti ti-bell" style={{ fontSize: '18px' }} />
                  {notifCount > 0 && (
                    <div style={{ position: 'absolute', top: '-4px', right: '-4px', width: '18px', height: '18px', background: '#EF4444', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: '#fff' }}>{notifCount > 9 ? '9+' : notifCount}</span>
                    </div>
                  )}
                </button>

                {showNotifs && (
                  <div style={{ position: 'absolute', right: 0, top: '44px', width: '340px', background: '#fff', border: '1px solid var(--border)', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', zIndex: 500, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>Documents à valider</div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {notifCount > 0 && (
                          <button onClick={async () => {
                            await supabase.from('notifications').update({ lu: true }).eq('lu', false)
                            setNotifCount(0)
                            setNotifs([])
                          }} style={{ fontSize: '11px', color: '#7C3AED', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: '600' }}>
                            Tout lire
                          </button>
                        )}
                        <button onClick={() => { router.push('/dashboard/notifications'); setShowNotifs(false) }}
                          style={{ fontSize: '11px', color: '#1A56DB', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: '600' }}>
                          Tout voir →
                        </button>
                      </div>
                    </div>
                    <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                      {notifs.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>
                          Aucune notification
                        </div>
                      ) : notifs.map((n: any) => (
                        <div key={n.id} onClick={() => { router.push('/dashboard/clients'); setShowNotifs(false) }}
                          style={{ padding: '12px 16px', borderBottom: '1px solid #F9FAFB', cursor: 'pointer', background: '#FAFAFA' }}
                          onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = '#F3F4F6'}
                          onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = '#FAFAFA'}>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827', marginBottom: '3px' }}>{n.clients?.nom}</div>
                          <div style={{ fontSize: '12px', color: '#6B7280' }}>{n.message}</div>
                          <div style={{ fontSize: '11px', color: '#9CA3AF', marginTop: '4px' }}>
                            {new Date(n.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
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