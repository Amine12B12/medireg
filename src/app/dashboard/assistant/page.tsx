'use client'

import { useState, useEffect, useRef } from 'react'
import { useFormule } from '@/lib/useFormule'
import FormuleGate from '@/components/FormuleGate'
import { createClient } from '@/lib/supabase'

type Message = { role: 'user' | 'assistant'; content: string }

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*)/gm, '<div style="font-size:13px;font-weight:700;margin:10px 0 4px">$1</div>')
    .replace(/^## (.*)/gm, '<div style="font-size:14px;font-weight:700;margin:10px 0 4px">$1</div>')
    .replace(/^# (.*)/gm, '<div style="font-size:15px;font-weight:700;margin:10px 0 4px">$1</div>')
    .replace(/^- (.*)/gm, '<div style="display:flex;gap:6px;margin:3px 0"><span style="flex-shrink:0">•</span><span>$1</span></div>')
    .replace(/^\* (.*)/gm, '<div style="display:flex;gap:6px;margin:3px 0"><span style="flex-shrink:0">•</span><span>$1</span></div>')
    .replace(/^\d+\. (.*)/gm, '<div style="display:flex;gap:6px;margin:3px 0"><span>$1</span></div>')
    .replace(/\|.*\|/g, '') // supprime les tableaux markdown
    .replace(/^-{3,}$/gm, '<hr style="border:none;border-top:1px solid #eee;margin:8px 0">')
    .replace(/\n{2,}/g, '<br><br>')
    .replace(/\n/g, '<br>')
}

export default function AssistantPage() {
  const { formule, role, can } = useFormule()
  const [etablissementId, setEtablissementId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const suggestions = role === 'admin' ? [
    'Combien d\'équipements sont hors service ?',
    'Quelles maintenances sont prévues ce mois ?',
    'Quel établissement a le plus d\'alertes ?',
    'Comment préparer un audit DDASS ?',
  ] : [
    'Quels sont mes équipements en maintenance ?',
    'Quand est la prochaine révision ?',
    'Comment signaler une panne ?',
    'Quels documents faut-il pour un contrôle ?',
  ]

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('etablissement_id').eq('id', user.id).single()
      setEtablissementId(prof?.etablissement_id || null)
    }
    loadUser()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function handleSend(text?: string) {
    const content = text || input.trim()
    if (!content || loading) return
    const userMsg: Message = { role: 'user', content }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          role,
          etablissement_id: etablissementId
        })
      })

      const data = await response.json()
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.content?.[0]?.text || 'Désolé, je n\'ai pas pu générer une réponse.'
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Une erreur est survenue. Veuillez réessayer.' }])
    }
    setLoading(false)
  }

  return (
    <FormuleGate feature="assistant_ia" formule={formule} role={role} can={can}>
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 58px)', fontFamily: 'var(--font)' }}>

        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'linear-gradient(135deg, #1A56DB 0%, #7C3AED 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-sparkles" style={{ fontSize: '18px', color: '#fff' }} aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Assistant MediTrack</div>
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Connecté à vos données en temps réel</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', background: 'var(--success-light)', borderRadius: '20px' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)' }} />
            <span style={{ fontSize: '11px', fontWeight: '500', color: 'var(--success)' }}>En ligne</span>
          </div>
        </div>

        {/* Zone centrale */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: 'var(--bg)', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {messages.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #1A56DB 0%, #7C3AED 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <i className="ti ti-sparkles" style={{ fontSize: '28px', color: '#fff' }} aria-hidden="true" />
                </div>
                <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>Assistant MediTrack</div>
                <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', maxWidth: '360px' }}>
                  J'ai accès à vos données en temps réel. Posez-moi une question sur votre parc, vos maintenances ou vos pannes.
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', maxWidth: '520px' }}>
                {suggestions.map(s => (
                  <button key={s} onClick={() => handleSend(s)}
                    style={{ padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left', lineHeight: '1.4', transition: 'all 0.1s' }}
                    onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'var(--accent-light)'; b.style.color = 'var(--accent)'; b.style.borderColor = 'rgba(26,86,219,0.3)' }}
                    onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'var(--surface)'; b.style.color = 'var(--text-secondary)'; b.style.borderColor = 'var(--border)' }}
                  >
                    <i className="ti ti-message-question" style={{ fontSize: '13px', marginRight: '6px', opacity: 0.5 }} aria-hidden="true" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
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
                  }}
                    dangerouslySetInnerHTML={msg.role === 'assistant' ? {
                      __html: renderMarkdown(msg.content)
                    } : undefined}
                  >
                    {msg.role === 'user' ? msg.content : undefined}
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
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Posez une question sur vos équipements, maintenances, pannes... (Entrée pour envoyer)"
              rows={1}
              style={{ flex: 1, padding: '11px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', resize: 'none', background: 'var(--surface-hover)', lineHeight: '1.5', maxHeight: '120px', overflowY: 'auto' }}
              onInput={e => {
                const t = e.target as HTMLTextAreaElement
                t.style.height = 'auto'
                t.style.height = Math.min(t.scrollHeight, 120) + 'px'
              }}
            />
            <button onClick={() => handleSend()} disabled={loading || !input.trim()}
              style={{ width: '40px', height: '40px', background: loading || !input.trim() ? 'rgba(26,86,219,0.4)' : 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 1px 4px rgba(26,86,219,0.3)', transition: 'all 0.1s' }}>
              <i className="ti ti-send" style={{ fontSize: '16px', color: '#fff' }} aria-hidden="true" />
            </button>
          </div>
          <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-tertiary)', textAlign: 'center' }}>
            MediTrack AI · Connecté à vos données · Shift+Entrée pour nouvelle ligne
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