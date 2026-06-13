'use client'

import { useState } from 'react'
import { useFormule } from '@/lib/useFormule'
import FormuleGate from '@/components/FormuleGate'

type Message = { role: 'user' | 'assistant'; content: string }

export default function AssistantPage() {
  const { formule, role, can } = useFormule()
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Bonjour ! Je suis l\'assistant MediTrack. Je peux vous aider sur la gestion de votre matériel médical, la conformité réglementaire, la traçabilité, ou toute question liée à votre parc d\'équipements. Comment puis-je vous aider ?'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSend() {
    if (!input.trim() || loading) return
    const userMsg: Message = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/assistant', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: newMessages.map(m => ({ role: m.role, content: m.content }))
  })
})

      const data = await response.json()
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.content?.[0]?.text || 'Désolé, je n\'ai pas pu générer une réponse.'
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Une erreur est survenue. Veuillez réessayer.' }])
    }
    setLoading(false)
  }

  return (
    <FormuleGate feature="assistant_ia" formule={formule} role={role} can={can}>
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 58px)', fontFamily: 'var(--font)' }}>

        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #1A56DB 0%, #7C3AED 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-sparkles" style={{ fontSize: '18px', color: '#fff' }} aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Assistant MediTrack</div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Expert en gestion de matériel médical · Toujours disponible</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'var(--success-light)', borderRadius: '20px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }} />
            <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--success)' }}>En ligne</span>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', background: 'var(--bg)' }}>

          {/* Suggestions initiales */}
          {messages.length === 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px', marginBottom: '8px' }}>
              {[
                'Quels documents faut-il pour un contrôle ?',
                'Comment optimiser la maintenance préventive ?',
                'Quelles sont les obligations de traçabilité ?',
                'Comment préparer un audit DDASS ?',
              ].map(s => (
                <button key={s} onClick={() => { setInput(s) }}
                  style={{ padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left', transition: 'all 0.1s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-light)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(26,86,219,0.3)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'assistant' && (
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg, #1A56DB 0%, #7C3AED 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                  <i className="ti ti-sparkles" style={{ fontSize: '14px', color: '#fff' }} aria-hidden="true" />
                </div>
              )}
              <div style={{
                maxWidth: '70%', padding: '12px 16px',
                background: msg.role === 'user' ? 'var(--accent)' : 'var(--surface)',
                color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                borderRadius: msg.role === 'user' ? 'var(--radius-lg) var(--radius-lg) var(--radius-sm) var(--radius-lg)' : 'var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-sm)',
                fontSize: '13px', lineHeight: '1.6',
                border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                boxShadow: 'var(--shadow-sm)',
                whiteSpace: 'pre-wrap'
              }}>
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px', fontSize: '11px', fontWeight: '600', color: 'var(--accent)' }}>
                  {role === 'admin' ? 'AD' : 'EP'}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg, #1A56DB 0%, #7C3AED 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="ti ti-sparkles" style={{ fontSize: '14px', color: '#fff' }} aria-hidden="true" />
              </div>
              <div style={{ padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-sm)', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)', animation: `bounce 1s ${i * 0.15}s infinite` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Posez votre question sur la gestion de matériel médical... (Entrée pour envoyer)"
              rows={1}
              style={{ flex: 1, padding: '11px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', resize: 'none', background: 'var(--surface-hover)', lineHeight: '1.5', maxHeight: '120px', overflowY: 'auto' }}
              onInput={e => {
                const t = e.target as HTMLTextAreaElement
                t.style.height = 'auto'
                t.style.height = Math.min(t.scrollHeight, 120) + 'px'
              }}
            />
            <button onClick={handleSend} disabled={loading || !input.trim()}
              style={{ width: '40px', height: '40px', background: loading || !input.trim() ? 'rgba(26,86,219,0.4)' : 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 1px 4px rgba(26,86,219,0.3)', transition: 'all 0.1s' }}>
              <i className="ti ti-send" style={{ fontSize: '16px', color: '#fff' }} aria-hidden="true" />
            </button>
          </div>
          <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
            MediTrack AI · Spécialisé en gestion PSDM · Shift+Entrée pour nouvelle ligne
          </div>
        </div>

        <style>{`
          @keyframes bounce {
            0%, 100% { transform: translateY(0); opacity: 0.4; }
            50% { transform: translateY(-4px); opacity: 1; }
          }
        `}</style>
      </div>
    </FormuleGate>
  )
}