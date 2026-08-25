'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const CHAPITRES: Record<string, { color: string; bg: string }> = {
  '1': { color: '#7C3AED', bg: '#F5F3FF' },
  '2': { color: '#1A56DB', bg: '#EBF2FF' },
  '3': { color: '#0A7C4E', bg: '#E8F5EE' },
  '4': { color: '#B45309', bg: '#FEF3C7' },
}

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'toutes' | 'non_lues'>('non_lues')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => { loadNotifs() }, [filter])

  async function loadNotifs() {
    setLoading(true)
    let query = supabase
      .from('notifications')
      .select('*, clients(nom, forfait)')
      .order('created_at', { ascending: false })
      .limit(50)

    if (filter === 'non_lues') query = query.eq('lu', false)

    const { data } = await query
    setNotifs(data || [])
    setLoading(false)
  }

  async function marquerLu(id: string) {
    await supabase.from('notifications').update({ lu: true }).eq('id', id)
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, lu: true } : n))
  }

  async function toutMarquerLu() {
    await supabase.from('notifications').update({ lu: true }).eq('lu', false)
    setNotifs(prev => prev.map(n => ({ ...n, lu: true })))
  }

  const chapFromCode = (code: string) => {
    const chap = code?.split('.')?.[0] || '1'
    return CHAPITRES[chap] || CHAPITRES['1']
  }

  const nonLues = notifs.filter(n => !n.lu).length

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: 'var(--font)', color: 'var(--text-tertiary)', fontSize: '13px' }}>
      Chargement...
    </div>
  )

  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)', maxWidth: '800px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Notifications</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '3px' }}>
            {nonLues > 0 ? `${nonLues} document${nonLues > 1 ? 's' : ''} en attente de validation` : 'Tout est à jour'}
          </div>
        </div>
        {nonLues > 0 && (
          <button onClick={toutMarquerLu}
            style={{ padding: '8px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="ti ti-checks" style={{ fontSize: '14px' }} />
            Tout marquer lu
          </button>
        )}
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px' }}>
        {[
          { key: 'non_lues', label: 'Non lues' },
          { key: 'toutes', label: 'Toutes' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key as any)}
            style={{ padding: '7px 16px', borderRadius: '20px', border: `1px solid ${filter === f.key ? '#1A56DB' : 'var(--border)'}`, background: filter === f.key ? '#EBF2FF' : 'var(--surface)', color: filter === f.key ? '#1A56DB' : 'var(--text-secondary)', fontSize: '12px', fontWeight: filter === f.key ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)' }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {notifs.length === 0 ? (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '64px', textAlign: 'center' }}>
          <i className="ti ti-bell-off" style={{ fontSize: '32px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '12px', opacity: 0.3 }} />
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>Aucune notification</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
            {filter === 'non_lues' ? 'Tous les documents ont été validés' : 'Aucune notification pour le moment'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {notifs.map(notif => {
            const chap = chapFromCode(notif.critere_code)
            return (
              <div key={notif.id}
                style={{ background: notif.lu ? 'var(--surface)' : '#FAFBFF', border: `1px solid ${notif.lu ? 'var(--border)' : '#BFDBFE'}`, borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: '14px', transition: 'all 0.1s' }}>

                {/* Icone */}
                <div style={{ width: '38px', height: '38px', borderRadius: '9px', background: notif.lu ? '#F3F4F6' : '#EBF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="ti ti-file-upload" style={{ fontSize: '18px', color: notif.lu ? '#9CA3AF' : '#1A56DB' }} />
                </div>

                {/* Contenu */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                      {notif.clients?.nom}
                    </span>
                    {notif.critere_code && (
                      <span style={{ fontSize: '11px', fontWeight: '600', color: chap.color, background: chap.bg, padding: '2px 8px', borderRadius: '4px' }}>
                        Critère {notif.critere_code}
                      </span>
                    )}
                    {!notif.lu && (
                      <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#3B82F6', flexShrink: 0 }} />
                    )}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    {notif.message}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    {new Date(notif.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  <button onClick={() => router.push('/dashboard/clients')}
                    style={{ height: '32px', padding: '0 14px', background: '#EBF2FF', border: '1px solid #BFDBFE', borderRadius: '8px', color: '#1A56DB', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <i className="ti ti-eye" style={{ fontSize: '12px' }} />
                    Voir
                  </button>
                  {!notif.lu && (
                    <button onClick={() => marquerLu(notif.id)}
                      style={{ height: '32px', padding: '0 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                      <i className="ti ti-check" style={{ fontSize: '13px' }} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}