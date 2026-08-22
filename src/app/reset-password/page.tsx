'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    // Supabase parse automatiquement le token depuis l'URL hash
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
  }, [])

  async function handleSubmit() {
    if (!password || password !== confirm) {
      setError('Les mots de passe ne correspondent pas')
      return
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', padding: '20px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '40px', width: '100%', maxWidth: '400px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '48px', height: '48px', background: 'linear-gradient(135deg, #7C3AED, #1A56DB)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <i className="ti ti-shield-check" style={{ fontSize: '24px', color: '#fff' }} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#111827', letterSpacing: '-0.3px' }}>MediReg</div>
          <div style={{ fontSize: '13px', color: '#9CA3AF', marginTop: '4px' }}>Créez votre mot de passe</div>
        </div>

        {!ready ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#6B7280', fontSize: '13px' }}>
            <div style={{ marginBottom: '12px' }}>Vérification du lien...</div>
            <div style={{ fontSize: '12px', color: '#9CA3AF' }}>Si cette page ne se charge pas, le lien a peut-être expiré. Contactez votre consultant MediReg.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Minimum 8 caractères"
                style={{ width: '100%', padding: '11px 14px', border: '1px solid #E5E7EB', borderRadius: '9px', fontSize: '14px', color: '#111827', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                onFocus={e => e.target.style.borderColor = '#7C3AED'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Répétez votre mot de passe"
                style={{ width: '100%', padding: '11px 14px', border: '1px solid #E5E7EB', borderRadius: '9px', fontSize: '14px', color: '#111827', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }}
                onFocus={e => e.target.style.borderColor = '#7C3AED'}
                onBlur={e => e.target.style.borderColor = '#E5E7EB'}
                onKeyDown={e => { if (e.key === 'Enter') handleSubmit() }}
              />
            </div>

            {error && (
              <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', fontSize: '13px', color: '#DC2626' }}>
                {error}
              </div>
            )}

            <button onClick={handleSubmit} disabled={loading || !password || !confirm}
              style={{ width: '100%', padding: '13px', background: loading || !password || !confirm ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg, #7C3AED, #1A56DB)', border: 'none', borderRadius: '9px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: loading || !password || !confirm ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'Enregistrement...' : 'Accéder à mon espace →'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}