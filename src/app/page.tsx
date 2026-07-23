'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
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
      setError('Identifiants incorrects. Verifiez votre email et mot de passe.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #F5F3FF 0%, #EBF2FF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, -apple-system, sans-serif', padding: '20px' }}>
      <div style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '420px', padding: '44px 40px', border: '1px solid #E5E7EB', boxShadow: '0 8px 40px rgba(124,58,237,0.08)' }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #7C3AED 0%, #1A56DB 100%)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#0A1628', letterSpacing: '-0.3px' }}>
              Medi<span style={{ color: '#7C3AED' }}>Reg</span>
            </div>
            <div style={{ fontSize: '11px', color: '#6B7A99', marginTop: '1px' }}>Conformite reglementaire sante</div>
          </div>
        </div>

        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#F5F3FF', color: '#7C3AED', fontSize: '11px', fontWeight: '500', padding: '4px 10px', borderRadius: '20px', marginBottom: '24px', border: '1px solid #EDE9FE' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
          </svg>
          HAS · ANSM · ISO · Normes Maroc
        </div>

        <div style={{ fontSize: '22px', fontWeight: '700', color: '#0A1628', letterSpacing: '-0.4px', marginBottom: '4px' }}>Bon retour</div>
        <div style={{ fontSize: '13px', color: '#6B7A99', marginBottom: '28px' }}>Connectez-vous a votre espace MediReg</div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6B7A99', marginBottom: '6px' }}>Adresse e-mail</label>
          <input
            type='email'
            placeholder='nom@etablissement.fr'
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', color: '#0A1628', fontFamily: 'inherit', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = '#7C3AED'}
            onBlur={e => e.target.style.borderColor = '#E5E7EB'}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6B7A99', marginBottom: '6px' }}>Mot de passe</label>
          <input
            type='password'
            placeholder='••••••••'
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            style={{ width: '100%', padding: '12px 14px', border: '1.5px solid #E5E7EB', borderRadius: '10px', fontSize: '14px', color: '#0A1628', fontFamily: 'inherit', outline: 'none', background: '#fff', boxSizing: 'border-box' }}
            onFocus={e => e.target.style.borderColor = '#7C3AED'}
            onBlur={e => e.target.style.borderColor = '#E5E7EB'}
          />
        </div>

        {error && (
          <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#FEF2F2', color: '#DC2626', fontSize: '13px', marginBottom: '14px', border: '1px solid #FECACA' }}>
            {error}
          </div>
        )}

        <button onClick={handleLogin} disabled={loading}
          style={{ width: '100%', padding: '13px', background: loading ? 'rgba(124,58,237,0.5)' : 'linear-gradient(135deg, #7C3AED 0%, #1A56DB 100%)', color: '#fff', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '600', fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          {loading ? 'Connexion...' : 'Se connecter →'}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '24px', fontSize: '11px', color: '#B0BCCE' }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#7C3AED" strokeWidth="2.5">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Connexion securisee TLS 1.3
        </div>
      </div>
    </div>
  )
}