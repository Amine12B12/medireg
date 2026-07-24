'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  'Quels sont les criteres HAS pour la certification des cliniques ?',
  'Comment rediger une procedure de traçabilite des medicaments ?',
  'Quelles sont les obligations ANSM pour un EHPAD ?',
  'Genere une checklist de preparation a la certification HAS',
  'Explique le critere 1.1 de la certification HAS',
  'Quelles preuves fournir pour un audit ISO 9001 ?',
  'Comment creer un plan d actions correctif ?',
  'Quelles sont les normes marocaines pour les cliniques ?',
]

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      setRole(prof?.role || 'client')
    }
    init()

    // Verifier si question pre-remplie depuis URL
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    if (q) {
      setInput(q)
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(text?: string) {
    const msg = text || input
    if (!msg.trim() || loading) return

    const userMessage: Message = { role: 'user', content: msg }
    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      })
      const data = await res.json()
      const reply = data.content?.[0]?.text || 'Desolee, une erreur est survenue.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Erreur de connexion. Veuillez reessayer.' }])
    }
    setLoading(false)
  }

  function formatMessage(content: string) {
    const lines = content.split('\n')
    return lines.map((line, i) => {
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
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #7C3AED 0%, #1A56DB 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className="ti ti-sparkles" style={{ fontSize: '18px', color: '#fff' }} />
        </div>
        <div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Assistant IA Reglementaire</div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Expert HAS · ANSM · ISO · Normes Maroc</div>
        </div>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])}
            style={{ marginLeft: 'auto', padding: '6px 12px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <i className="ti ti-trash" style={{ fontSize: '13px' }} />Effacer
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {messages.length === 0 ? (
          <div style={{ maxWidth: '700px', margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #7C3AED 0%, #1A56DB 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <i className="ti ti-sparkles" style={{ fontSize: '28px', color: '#fff' }} />
              </div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>Assistant IA MediReg</div>
              <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', maxWidth: '400px', margin: '0 auto' }}>
                Je suis votre expert en conformite reglementaire sante. Posez-moi vos questions sur la certification HAS, les obligations ANSM, les normes ISO ou les referentiels marocains.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => sendMessage(s)}
                  style={{ padding: '12px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left', lineHeight: '1.4', transition: 'all 0.1s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-light)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(26,86,219,0.3)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)' }}>
                  <i className="ti ti-message-question" style={{ fontSize: '13px', marginRight: '6px', color: '#7C3AED' }} />
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: msg.role === 'user' ? 'var(--accent-light)' : 'linear-gradient(135deg, #7C3AED 0%, #1A56DB 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {msg.role === 'user'
                    ? <i className="ti ti-user" style={{ fontSize: '15px', color: 'var(--accent)' }} />
                    : <i className="ti ti-sparkles" style={{ fontSize: '15px', color: '#fff' }} />
                  }
                </div>
                <div style={{ maxWidth: '85%', padding: '12px 16px', borderRadius: msg.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px', background: msg.role === 'user' ? 'var(--accent)' : 'var(--surface)', border: msg.role === 'user' ? 'none' : '1px solid var(--border)', color: msg.role === 'user' ? '#fff' : 'var(--text-primary)', fontSize: '13px', lineHeight: '1.6', boxShadow: 'var(--shadow-sm)' }}>
                  {msg.role === 'user' ? msg.content : formatMessage(msg.content)}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #7C3AED 0%, #1A56DB 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="ti ti-sparkles" style={{ fontSize: '15px', color: '#fff' }} />
                </div>
                <div style={{ padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '4px 16px 16px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
        <div style={{ maxWidth: '780px', margin: '0 auto', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Posez votre question reglementaire... (Entree pour envoyer)"
              rows={1}
              style={{ width: '100%', padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface-hover)', resize: 'none', lineHeight: '1.5', maxHeight: '120px', overflowY: 'auto', boxSizing: 'border-box' }}
              onInput={e => {
                const el = e.target as HTMLTextAreaElement
                el.style.height = 'auto'
                el.style.height = Math.min(el.scrollHeight, 120) + 'px'
              }}
              onFocus={e => e.target.style.borderColor = '#7C3AED'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
            style={{ width: '44px', height: '44px', background: loading || !input.trim() ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg, #7C3AED 0%, #1A56DB 100%)', border: 'none', borderRadius: 'var(--radius-lg)', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-send" style={{ fontSize: '18px', color: '#fff' }} />
          </button>
        </div>
        <div style={{ maxWidth: '780px', margin: '8px auto 0', fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
          MediReg IA — Expert HAS, ANSM, ISO 9001, Normes marocaines · Shift+Entree pour nouvelle ligne
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