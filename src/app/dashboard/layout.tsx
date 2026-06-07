'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<string | null>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setRole(prof?.role || 'client')
    }
    load()
  }, [])

  if (!role) return (
    <div style={{ minHeight: '100vh', background: '#F0F4FA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <div style={{ color: '#6B7A99', fontSize: '14px' }}>Chargement...</div>
    </div>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F0F4FA', fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <Sidebar role={role} />
      <div style={{ flex: 1, overflow: 'auto' }}>
        {children}
      </div>
    </div>
  )
}