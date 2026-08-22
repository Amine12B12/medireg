'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'

type Message = { role: 'user' | 'assistant'; content: string }

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [societe, setSociete] = useState<any>(null)
  const [critereNonTraites, setCriteresNonTraites] = useState<any[]>([])
  const [score, setScore] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('role, client_id').eq('id', user.id).single()

      // Charger contexte societe
      if (prof?.client_id) {
        const { data: soc } = await supabase.from('societes').select('*').eq('client_id', prof.client_id).single()
        setSociete(soc)

        if (soc) {
          const { data: etabs } = await supabase.from('etablissements_psdm').select('id').eq('societe_id', soc.id)
          const etabId = etabs?.[0]?.id
          if (etabId) {
            const { data: crits } = await supabase.from('criteres_psdm').select('id, code, titre, chapitre').order('code')
            const { data: reps } = await supabase.from('reponses_criteres').select('*').eq('etablissement_id', etabId)
            const total = crits?.length || 0
            const conformes = reps?.filter(r => r.statut === 'conforme').length || 0
            setScore(total > 0 ? Math.round((conformes / total) * 100) : 0)
            const nonTraites = (crits || []).filter(c => !reps?.find(r => r.critere_id === c.id && r.statut !== 'non_traite'))
            setCriteresNonTraites(nonTraites.slice(0, 5))
          }
        }
      }

      // Verifier question pre-remplie depuis URL
      const params = new URLSearchParams(window.location.search)
      const q = params.get('q')
      if (q) setInput(q)
    }
    init()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Suggestions dynamiques selon le contexte
  const suggestions = [
    ...(critereNonTraites.length > 0 ? [
      `Comment prouver ma conformité au critère ${critereNonTraites[0]?.code} ?`,
      `Quels documents fournir pour le critère ${critereNonTraites[1]?.code || '1.2.2'} ?`,
    ] : []),
    'Quels sont les critères les plus importants pour la certification HAS PSDM ?',
    'Comment rédiger une charte éthique pour un PSDM ?',
    'Que vérifie le certificateur HAS lors d\'un audit ?',
    'Comment mettre en place une enquête de satisfaction patient ?',
    'Quelles sont les preuves à fournir pour le chapitre 2 ?',
    'Comment gérer les réclamations patients selon la HAS ?',
  ].slice(0, 6)

  async function sendMessage(text?: string) {
    const msg = text || input
    if (!msg.trim() || loading) return

    const userMessage: Message = { role: 'user', content: msg }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    // Contexte societe injecte dans le system
    const contexte = societe ? `
L'utilisateur est ${societe.raison_sociale}, un Prestataire de Santé à Domicile (PSDM) en cours de certification HAS.
Score actuel : ${score}% de conformité.
Critères prioritaires non traités : ${critereNonTraites.map(c => `${c.code} - ${c.titre}`).join(', ') || 'aucun'}.
Réponds en français, de façon pratique et actionnable, spécifiquement pour ce PSDM.
    ` : 'Tu es un expert en certification HAS PSDM. Réponds en français de façon pratique.'

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, system: contexte })
      })
      const data = await res.json()
      const reply = data.content?.[0]?.text || 'Désolé, une erreur est survenue.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erreur de connexion. Veuillez réessayer.' }])
    }
    setLoading(false)
  }

  function formatMessage(content: string) {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('### ')) return <div key={i} style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '16px', marginBottom: '6px' }}>{line.replace('### ', '')}</div>
      if (line.startsWith('## ')) return <div key={i} style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '20px', marginBottom: '8px' }}>{line.replace('## ', '')}</div>
      if (line.startsWith('# ')) return <div key={i} style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', marginTop: '20px', marginBottom: '8px' }}>{line.replace('# ', '')}</div>
      if (line.startsWith('**') && line.endsWith('**')) return <div key={i} style={{ fontWeight: '600', color: 'var(--text-primary)', marginTop: '8px' }}>{line.replace(/\*\*/g, '')}</div>
      if (line.startsWith('- ') || line.startsWith('• ')) return (
        <div key={i} style={{ display: 'flex', gap: '8px', marginTop: '4px', paddingLeft: '8px' }}>
          <span style={{ color: '#7C3AED', flexShrink: 0, marginTop: '2px' }}>▸</span>
          <span>{line.replace(/^[-•] /, '')}</span>
        </div>
      )
      if (line.match(/^\d+\. /)) return (
        <div key={i} style={{ display: 'flex', gap: '8px', marginTop: '4px', paddingLeft: '8px' }}>
          <span style={{ color: '#7C3AED', flexShrink: 0, fontWeight: '600', minWidth: '20px' }}>{line.match(/^\d+/)?.[0]}.</span>
          <span>{line.replace(/^\d+\. /, '')}</span>
        </div>
      )
      if (line === '') return <div key={i} style={{ height: '6px' }} />
      return <div key={i} style={{ marginTop: '2px', lineHeight: '1.6' }}>{line}</div>
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 58px)', fontFamily: 'var(--font)' }}>

      {/* Header */}
      <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #7C3AED, #1A56DB)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className="ti ti-sparkles" style={{ fontSize: '18px', color: '#fff' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Assistant certification HAS</div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
            {societe ? `${societe.raison_sociale} · Score ${score}%` : 'Expert PSDM · Certification HAS'}
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])}
            style={{ padding: '6px 12px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <i className="ti ti-trash" style={{ fontSize: '13px' }} />
            Effacer
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {messages.length === 0 ? (
          <div style={{ maxWidth: '680px', margin: '0 auto' }}>

            {/* Contexte score si disponible */}
            {societe && (
              <div style={{ background: 'linear-gradient(135deg, #1E1B4B, #1e3a5f)', borderRadius: '14px', padding: '20px 24px', marginBottom: '28px', display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ position: 'relative', width: '60px', height: '60px', flexShrink: 0 }}>
                  <svg width="60" height="60" viewBox="0 0 60 60">
                    <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                    <circle cx="30" cy="30" r="24" fill="none"
                      stroke={score >= 75 ? '#10B981' : score >= 50 ? '#F59E0B' : '#6366F1'}
                      strokeWidth="6"
                      strokeDasharray={`${2 * Math.PI * 24}`}
                      strokeDashoffset={`${2 * Math.PI * 24 * (1 - score / 100)}`}
                      strokeLinecap="round" transform="rotate(-90 30 30)" />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>{score}%</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#fff', marginBottom: '4px' }}>{societe.raison_sociale}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                    {score === 0 ? 'Démarrez votre certification — posez vos questions ici' :
                     score < 50 ? 'En cours de certification — je peux vous guider' :
                     score < 80 ? 'Bonne progression — encore quelques étapes' :
                     'Presque certifié — finalisons ensemble'}
                  </div>
                </div>
              </div>
            )}

            {/* Intro sans contexte */}
            {!societe && (
              <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #7C3AED, #1A56DB)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                  <i className="ti ti-sparkles" style={{ fontSize: '26px', color: '#fff' }} />
                </div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>Assistant certification HAS PSDM</div>
                <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', maxWidth: '380px', margin: '0 auto' }}>
                  Posez vos questions sur la certification, les critères HAS ou les documents à fournir.
                </div>
              </div>
            )}

            {/* Suggestions */}
            <div style={{ marginBottom: '12px', fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {critereNonTraites.length > 0 ? 'Suggestions basées sur vos critères prioritaires' : 'Questions fréquentes'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => sendMessage(s)}
                  style={{ padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left', lineHeight: '1.4', transition: 'all 0.1s', display: 'flex', alignItems: 'center', gap: '10px' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = '#F8FAFF'; el.style.borderColor = '#BFDBFE'; el.style.color = '#1A56DB' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLButtonElement; el.style.background = 'var(--surface)'; el.style.borderColor = 'var(--border)'; el.style.color = 'var(--text-secondary)' }}>
                  <i className="ti ti-arrow-right" style={{ fontSize: '13px', flexShrink: 0, opacity: 0.5 }} />
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: msg.role === 'user' ? '#EBF2FF' : 'linear-gradient(135deg, #7C3AED, #1A56DB)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {msg.role === 'user'
                    ? <i className="ti ti-user" style={{ fontSize: '15px', color: '#1A56DB' }} />
                    : <i className="ti ti-sparkles" style={{ fontSize: '15px', color: '#fff' }} />
                  }
                </div>
                <div style={{ maxWidth: '85%', padding: '12px 16px', borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px', background: msg.role === 'user' ? '#1A56DB' : 'var(--surface)', border: msg.role === 'user' ? 'none' : '1px solid var(--border)', color: msg.role === 'user' ? '#fff' : 'var(--text-primary)', fontSize: '13px', lineHeight: '1.6', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  {msg.role === 'user' ? msg.content : formatMessage(msg.content)}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #7C3AED, #1A56DB)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="ti ti-sparkles" style={{ fontSize: '15px', color: '#fff' }} />
                </div>
                <div style={{ padding: '14px 18px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px 16px 16px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {[0, 1, 2].map(j => (
                    <div key={j} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#7C3AED', opacity: 0.4, animation: `pulse 1.2s ease-in-out ${j * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Posez votre question... (Entrée pour envoyer)"
              rows={1}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '10px', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface-hover)', resize: 'none', lineHeight: '1.5', maxHeight: '120px', overflowY: 'auto', boxSizing: 'border-box', transition: 'border-color 0.1s' }}
              onInput={e => { const el = e.target as HTMLTextAreaElement; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px' }}
              onFocus={e => e.target.style.borderColor = '#7C3AED'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
            style={{ width: '44px', height: '44px', background: loading || !input.trim() ? 'rgba(124,58,237,0.2)' : 'linear-gradient(135deg, #7C3AED, #1A56DB)', border: 'none', borderRadius: '10px', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.1s' }}>
            <i className="ti ti-send" style={{ fontSize: '18px', color: '#fff' }} />
          </button>
        </div>
        <div style={{ maxWidth: '720px', margin: '8px auto 0', fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
          Expert HAS PSDM · Shift+Entrée pour nouvelle ligne
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  )
}