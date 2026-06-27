'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import Sidebar from '@/components/sidebar'

const pageTitles: Record<string, { title: string; sub: string }> = {
  '/dashboard': { title: 'Tableau de bord', sub: 'Vue globale du parc' },
  '/dashboard/clients': { title: 'Clients', sub: 'Établissements pilotés' },
  '/dashboard/materiel': { title: 'Matériel', sub: 'Parc d\'équipements' },
  '/dashboard/maintenance': { title: 'Maintenance', sub: 'Planning des interventions' },
  '/dashboard/livraisons': { title: 'Livraisons', sub: 'Installations planifiées' },
  '/dashboard/alertes': { title: 'Alertes', sub: 'Équipements hors service' },
  '/dashboard/devis': { title: 'Devis', sub: 'Demandes en cours' },
  '/dashboard/conformite': { title: 'Conformité', sub: 'Score de préparation contrôle' },
  '/dashboard/assistant': { title: 'Assistant IA', sub: 'Expert en gestion PSDM' },
  '/dashboard/reporting': { title: 'Reporting', sub: 'Analyse avancée du parc' },
  '/dashboard/materiovigilance': { title: 'Matériovigilance', sub: 'Gestion des incidents' },
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<string | null>(null)
  const [formule, setFormule] = useState<string>('Essentiel')
  const [etabNom, setEtabNom] = useState<string>('')
  const [contactNom, setContactNom] = useState<string>('')
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

      const { data: prof } = await supabase
        .from('profiles')
        .select('role, etablissement_id')
        .eq('id', user.id)
        .single()

      if (!prof) return

      setRole(prof.role)

      if (prof.role === 'admin') {
        setFormule('Privilège')
        setEtabNom('Administration')
        setContactNom('Admin PSDM')
      } else if (prof.etablissement_id) {
        const { data: etab } = await supabase
          .from('etablissements')
          .select('formule, nom, statut, contact_nom')
          .eq('id', prof.etablissement_id)
          .single()

        if (etab?.statut === 'bloque') {
          await supabase.auth.signOut()
          router.push('/login?blocked=1')
          return
        }

        setFormule(etab?.formule || 'Essentiel')
        setEtabNom(etab?.nom || '')
        setContactNom(etab?.contact_nom || user.email || '')
      } else {
        setEtabNom(user.email || '')
        setContactNom(user.email || '')
      }

      const { count } = await supabase
        .from('pannes')
        .select('*', { count: 'exact', head: true })
        .eq('statut', 'ouvert')
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

      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200, backdropFilter: 'blur(2px)' }} />
      )}

      <div style={{
        position: isMobile ? 'fixed' : 'relative',
        left: isMobile ? (sidebarOpen ? 0 : '-220px') : 0,
        top: 0, bottom: 0, zIndex: 300,
        transition: 'left 0.2s ease', flexShrink: 0
      }}>
        <Sidebar role={role} formule={formule} etabNom={etabNom} contactNom={contactNom} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'auto', minWidth: 0 }}>
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 24px', height: '58px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 100, flexShrink: 0 }}>
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
          </div>
        </div>

        <div style={{ flex: 1 }}>{children}</div>
      </div>
    </div>
  )
}