'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [role, setRole] = useState<'admin' | 'client'>('admin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Identifiants incorrects. Vérifiez votre email et mot de passe.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F0F4FA',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, -apple-system, sans-serif',
      padding: '20px'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '420px',
        padding: '44px 40px',
        border: '0.5px solid #DDE5F0',
        boxShadow: '0 4px 32px rgba(10,22,40,0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
          <div style={{ width: '36px', height: '36px', background: '#1A56DB', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <div style={{ fontSize: '17px', fontWeight: '600', color: '#0A1628', letterSpacing: '-0.2px' }}>
            Medi<span style={{ color: '#1A56DB' }}>Track</span>
          </div>
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#E8F5EF', color: '#00875A', fontSize: '11px', fontWeight: '500', padding: '4px 10px', borderRadius: '20px', marginBottom: '20px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          Plateforme certifiée données médicales
        </div>

        <div style={{ fontSize: '24px', fontWeight: '600', color: '#0A1628', letterSpacing: '-0.4px', marginBottom: '4px' }}>Bon retour</div>
        <div style={{ fontSize: '14px', color: '#6B7A99', marginBottom: '24px' }}>Connectez-vous à votre espace</div>

        <div style={{ display: 'flex', background: '#F0F4FA', borderRadius: '10px', padding: '3px', gap: '3px', marginBottom: '24px' }}>
          {(['admin', 'client'] as const).map((r) => (
            <button key={r} onClick={() => setRole(r)} style={{ flex: 1, padding: '9px', border: 'none', borderRadius: '8px', fontSize: '13px', fontFamily: 'inherit', cursor: 'pointer', fontWeight: role === r ? '500' : '400', color: role === r ? '#0A1628' : '#6B7A99', background: role === r ? '#fff' : 'transparent', boxShadow: role === r ? '0 1px 4px rgba(10,22,40,0.08)' : 'none', transition: 'all 0.15s' }}>
              {r === 'admin' ? 'Administrateur' : 'Établissement'}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6B7A99', marginBottom: '6px' }}>Adresse e-mail</label>
          <input type="email" placeholder="nom@structure.fr" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #DDE5F0', borderRadius: '10px', fontSize: '14px', color: '#0A1628', fontFamily: 'inherit', outline: 'none', background: '#fff' }} onFocus={e => e.target.style.borderColor='#1A56DB'} onBlur={e => e.target.style.borderColor='#DDE5F0'} />
        </div>

        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6B7A99', marginBottom: '6px' }}>Mot de passe</label>
          <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #DDE5F0', borderRadius: '10px', fontSize: '14px', color: '#0A1628', fontFamily: 'inherit', outline: 'none', background: '#fff' }} onFocus={e => e.target.style.borderColor='#1A56DB'} onBlur={e => e.target.style.borderColor='#DDE5F0'} />
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#FEF2F2', color: '#DC2626', fontSize: '13px', marginBottom: '12px', border: '0.5px solid #FECACA' }}>{error}</div>
        )}

        <button onClick={handleLogin} disabled={loading} style={{ width: '100%', padding: '13px', background: loading ? '#93AEED' : '#1A56DB', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '500', fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'background 0.15s' }}>
          {loading ? 'Connexion...' : 'Se connecter →'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '24px', fontSize: '12px', color: '#B0BCCE' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00B37E" strokeWidth="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Connexion chiffrée TLS 1.3
        </div>
      </div>
    </div>
  )
}
