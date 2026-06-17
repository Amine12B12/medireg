'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

function SetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function handleHash() {
      // Extrait les params du hash (#access_token=...&type=invite)
      const hash = window.location.hash.substring(1)
      const params = new URLSearchParams(hash)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      const type = params.get('type')

      if (accessToken && refreshToken) {
        // Établit la session manuellement depuis les tokens
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        })
        if (sessionError) {
          setError('Lien invalide ou expiré. Contactez votre prestataire.')
          return
        }
        setSessionReady(true)
      } else {
        // Vérifie si une session existe déjà
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setSessionReady(true)
        } else {
          setError('Lien invalide ou expiré. Contactez votre prestataire.')
        }
      }
    }
    handleHash()
  }, [])

  async function handleSubmit() {
    if (!password || !confirm) return
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return }
    if (password.length < 8) { setError('Minimum 8 caractères'); return }
    setLoading(true)
    setError('')

    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/dashboard'), 2000)
  }

  const inputStyle = {
    width: '100%', padding: '12px 14px', border: '1px solid #e5e5e5',
    borderRadius: '8px', fontSize: '14px', color: '#1a1a1a',
    fontFamily: 'Inter, sans-serif', outline: 'none', background: '#fff',
    boxSizing: 'border-box' as const
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F7F7F5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '26px', fontWeight: '700', color: '#1A56DB', letterSpacing: '-0.5px' }}>MediTrack</div>
          <div style={{ fontSize: '13px', color: '#999', marginTop: '4px' }}>Plateforme de gestion PSDM</div>
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', border: '1px solid #e5e5e5', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '28px 32px 0' }}>
            <div style={{ fontSize: '20px', fontWeight: '600', color: '#1a1a1a', letterSpacing: '-0.3px', marginBottom: '6px' }}>
              Créer votre mot de passe
            </div>
            <div style={{ fontSize: '13px', color: '#6B6B6B', marginBottom: '28px', lineHeight: '1.5' }}>
              Choisissez un mot de passe sécurisé pour accéder à votre espace MediTrack.
            </div>
          </div>

          <div style={{ padding: '0 32px 28px' }}>
            {success ? (
              <div style={{ padding: '20px', background: '#E8F5EE', borderRadius: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>✅</div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: '#0A7C4E', marginBottom: '4px' }}>Mot de passe créé !</div>
                <div style={{ fontSize: '13px', color: '#0A7C4E', opacity: 0.8 }}>Redirection vers votre espace...</div>
              </div>
            ) : error && !sessionReady ? (
              <div style={{ padding: '16px', background: '#FEF0EE', border: '1px solid rgba(194,54,42,0.2)', borderRadius: '8px', fontSize: '13px', color: '#C2362A', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️</div>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>Lien expiré</div>
                <div style={{ opacity: 0.8 }}>Contactez votre prestataire pour recevoir un nouvel accès.</div>
              </div>
            ) : !sessionReady ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: '13px' }}>
                Vérification du lien...
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6B6B6B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Nouveau mot de passe
                  </label>
                  <input type='password' value={password} onChange={e => setPassword(e.target.value)}
                    placeholder='Minimum 8 caractères' style={inputStyle} autoFocus />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#6B6B6B', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    Confirmer le mot de passe
                  </label>
                  <input type='password' value={confirm} onChange={e => setConfirm(e.target.value)}
                    placeholder='Répétez votre mot de passe' style={inputStyle}
                    onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
                </div>
                {error && (
                  <div style={{ padding: '10px 14px', background: '#FEF0EE', border: '1px solid rgba(194,54,42,0.2)', borderRadius: '8px', fontSize: '12px', color: '#C2362A', marginBottom: '16px' }}>
                    {error}
                  </div>
                )}
                <button onClick={handleSubmit} disabled={loading || !password || !confirm}
                  style={{ width: '100%', padding: '13px', background: loading || !password || !confirm ? 'rgba(26,86,219,0.4)' : '#1A56DB', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: loading || !password || !confirm ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif' }}>
                  {loading ? 'Enregistrement...' : 'Créer mon mot de passe →'}
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#bbb' }}>
          MediTrack · Plateforme de gestion PSDM
        </div>
      </div>
    </div>
  )
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', color: '#999' }}>Chargement...</div>}>
      <SetPasswordForm />
    </Suspense>
  )
}