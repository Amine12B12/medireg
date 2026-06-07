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
      setError('Identifiants incorrects')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#f7f4ef' }}>
      {/* LEFT */}
      <div className="w-[45%] flex flex-col justify-center items-center p-16" style={{ background: '#0f1f3d' }}>
        <div className="text-center">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 text-4xl" style={{ background: '#00b4a0' }}>🏥</div>
          <h1 className="text-5xl font-bold text-white mb-3" style={{ fontFamily: 'Georgia, serif' }}>MediTrack</h1>
          <p className="text-white/50 text-sm">Gestion de matériel médical à domicile</p>
        </div>
        <div className="mt-12 flex flex-col gap-4">
          {[['📡','Traçabilité en temps réel'],['🔔','Alertes automatiques de maintenance'],['🤖','Assistant IA intégré'],['📋','Fiches équipement complètes']].map(([icon, label]) => (
            <div key={label} className="flex items-center gap-3 text-white/60 text-sm">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,180,160,0.15)' }}>{icon}</div>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex-1 flex items-center justify-center p-16">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-bold mb-2" style={{ color: '#0f1f3d', fontFamily: 'Georgia, serif' }}>Bienvenue</h2>
          <p className="text-sm mb-8" style={{ color: '#6b7280' }}>Connectez-vous à votre espace MediTrack</p>

          <div className="mb-5">
            <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#0f1f3d' }}>Identifiant</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@exemple.fr"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{ border: '2px solid #e8e4de', fontFamily: 'inherit', color: '#0f1f3d' }}
              onFocus={e => e.target.style.borderColor = '#00b4a0'}
              onBlur={e => e.target.style.borderColor = '#e8e4de'}
            />
          </div>

          <div className="mb-6">
            <label className="block text-xs font-bold uppercase tracking-wide mb-2" style={{ color: '#0f1f3d' }}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
              style={{ border: '2px solid #e8e4de', fontFamily: 'inherit', color: '#0f1f3d' }}
              onFocus={e => e.target.style.borderColor = '#00b4a0'}
              onBlur={e => e.target.style.borderColor = '#e8e4de'}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: '#fce8e6', color: '#dc2626' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-4 rounded-xl text-white font-semibold text-sm transition-all"
            style={{ background: loading ? '#6b7280' : '#0f1f3d', fontFamily: 'inherit' }}
          >
            {loading ? 'Connexion...' : 'Se connecter →'}
          </button>
        </div>
      </div>
    </div>
  )
}