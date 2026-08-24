'use client'

import { useState, Suspense } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()
  const blocked = searchParams.get('blocked')

  async function handleLogin() {
    if (!email || !password) { setError('Veuillez remplir tous les champs'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
      return
    }
    router.push('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', padding: '20px' }}>

      {/* Background gradients */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', right: '-10%', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-20%', left: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,86,219,0.05) 0%, transparent 70%)' }} />
      </div>

      <div style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '52px', height: '52px', background: 'linear-gradient(135deg, #7C3AED, #1A56DB)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 4px 16px rgba(124,58,237,0.25)' }}>
            <i className="ti ti-shield-check" style={{ fontSize: '26px', color: '#fff' }} />
          </div>
          <div style={{ fontSize: '26px', fontWeight: '700', color: '#111827', letterSpacing: '-0.5px' }}>MediReg</div>
          <div style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '6px' }}>Certification HAS PSDM</div>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '32px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '18px', fontWeight: '700', color: '#111827', letterSpacing: '-0.3px', marginBottom: '4px' }}>Connexion</div>
            <div style={{ fontSize: '13px', color: '#9CA3AF' }}>Accédez à votre espace MediReg</div>
          </div>

          {blocked && (
            <div style={{ padding: '12px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', fontSize: '13px', color: '#DC2626', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="ti ti-lock" style={{ fontSize: '16px', flexShrink: 0 }} />
              Votre accès a été suspendu. Contactez votre consultant MediReg.
            </div>
          )}

          {error && (
            <div style={{ padding: '12px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', fontSize: '13px', color: '#DC2626', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="ti ti-alert-circle" style={{ fontSize: '16px', flexShrink: 0 }} />
              {error}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Email</label>
            <div style={{ position: 'relative' }}>
              <i className="ti ti-mail" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: '#9CA3AF' }} />
              <input type="email" placeholder="votre@email.fr" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{ width: '100%', padding: '11px 12px 11px 38px', border: '1px solid #E5E7EB', borderRadius: '9px', fontSize: '13px', color: '#111827', fontFamily: 'inherit', outline: 'none', background: '#fff', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#7C3AED'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Mot de passe</label>
            <div style={{ position: 'relative' }}>
              <i className="ti ti-lock" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', color: '#9CA3AF' }} />
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={{ width: '100%', padding: '11px 12px 11px 38px', border: '1px solid #E5E7EB', borderRadius: '9px', fontSize: '13px', color: '#111827', fontFamily: 'inherit', outline: 'none', background: '#fff', boxSizing: 'border-box', transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = '#7C3AED'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
            </div>
          </div>

          <button onClick={handleLogin} disabled={loading}
            style={{ width: '100%', padding: '12px', background: loading ? 'rgba(124,58,237,0.4)' : 'linear-gradient(135deg, #7C3AED, #1A56DB)', border: 'none', borderRadius: '9px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', boxShadow: loading ? 'none' : '0 2px 8px rgba(124,58,237,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', transition: 'all 0.15s' }}>
            {loading ? (
              <>
                <i className="ti ti-loader-2" style={{ fontSize: '16px', animation: 'spin 1s linear infinite' }} />
                Connexion...
              </>
            ) : (
              <>
                Se connecter
                <i className="ti ti-arrow-right" style={{ fontSize: '16px' }} />
              </>
            )}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: '#9CA3AF' }}>
          MediReg · Plateforme de certification HAS PSDM
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF' }}>Chargement...</div>}>
      <LoginForm />
    </Suspense>
  )
}