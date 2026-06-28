'use client'

import { useState, useEffect, useRef } from 'react'
import { useFormule } from '@/lib/useFormule'
import FormuleGate from '@/components/FormuleGate'
import { createClient } from '@/lib/supabase'

type Message = { role: 'user' | 'assistant'; content: string; action?: ActionPayload }
type ActionPayload = {
  type: 'update_equipement'
  equipement_id: string
  field: string
  old_value: string
  new_value: string
  description: string
}

function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*)/gm, '<div style="font-size:13px;font-weight:700;margin:10px 0 4px">$1</div>')
    .replace(/^## (.*)/gm, '<div style="font-size:14px;font-weight:700;margin:10px 0 4px">$1</div>')
    .replace(/^# (.*)/gm, '<div style="font-size:15px;font-weight:700;margin:10px 0 4px">$1</div>')
    .replace(/^- (.*)/gm, '<div style="display:flex;gap:6px;margin:3px 0"><span style="flex-shrink:0">•</span><span>$1</span></div>')
    .replace(/^\* (.*)/gm, '<div style="display:flex;gap:6px;margin:3px 0"><span style="flex-shrink:0">•</span><span>$1</span></div>')
    .replace(/\|.*\|/g, '')
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
  const [confirming, setConfirming] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  const suggestions = role === 'admin' ? [
    'Combien d\'équipements sont hors service ?',
    'Change le Lit médicalisé de chambre 12 à chambre 23',
    'Mets le fauteuil roulant en maintenance',
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
      const text = data.content?.[0]?.text || ''

      // Détecte si la réponse contient une action JSON
      const actionMatch = text.match(/```action\n([\s\S]*?)\n```/)
      let action: ActionPayload | undefined
      let displayText = text

      if (actionMatch) {
        try {
          action = JSON.parse(actionMatch[1])
          displayText = text.replace(/```action\n[\s\S]*?\n```/, '').trim()
        } catch {}
      }

      const assistantMsg: Message = {
        role: 'assistant',
        content: displayText || 'Désolé, je n\'ai pas pu générer une réponse.',
        action
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Une erreur est survenue. Veuillez réessayer.' }])
    }
    setLoading(false)
  }

  async function handleConfirmAction(action: ActionPayload, msgIndex: number) {
    setConfirming(`${msgIndex}`)
    try {
      const response = await fetch('/api/assistant/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(action)
      })
      const data = await response.json()

      if (data.success) {
        // Supprime l'action du message (déjà confirmée)
        setMessages(prev => prev.map((m, i) =>
          i === msgIndex ? { ...m, action: undefined } : m
        ))
        // Ajoute un message de confirmation
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `✅ Modification appliquée — ${action.description}`
        }])
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `❌ Erreur lors de la modification : ${data.error || 'erreur inconnue'}`
        }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '❌ Erreur lors de la modification.' }])
    }
    setConfirming(null)
  }

  function handleCancelAction(msgIndex: number) {
    setMessages(prev => prev.map((m, i) =>
      i === msgIndex ? { ...m, action: undefined } : m
    ))
    setMessages(prev => [...prev, { role: 'assistant', content: 'Modification annulée.' }])
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
            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Connecté à vos données · Peut modifier les équipements</div>
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
                <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', maxWidth: '400px' }}>
                  Je peux répondre à vos questions ET modifier directement vos équipements. Essayez : "Change le Lit médicalisé de chambre 12 à chambre 23"
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', maxWidth: '520px' }}>
                {suggestions.map(s => (
                  <button key={s} onClick={() => handleSend(s)}
                    style={{ padding: '12px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'var(--font)', textAlign: 'left', lineHeight: '1.4', transition: 'all 0.1s' }}
                    onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'var(--accent-light)'; b.style.color = 'var(--accent)'; b.style.borderColor = 'rgba(26,86,219,0.3)' }}
                    onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'var(--surface)'; b.style.color = 'var(--text-secondary)'; b.style.borderColor = 'var(--border)' }}>
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
                  <div style={{ maxWidth: '70%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{
                      padding: '12px 16px',
                      background: msg.role === 'user' ? 'var(--accent)' : 'var(--surface)',
                      color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                      borderRadius: msg.role === 'user' ? 'var(--radius-lg) var(--radius-lg) var(--radius-sm) var(--radius-lg)' : 'var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-sm)',
                      fontSize: '13px', lineHeight: '1.6',
                      border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                      dangerouslySetInnerHTML={msg.role === 'assistant' ? { __html: renderMarkdown(msg.content) } : undefined}>
                      {msg.role === 'user' ? msg.content : undefined}
                    </div>

                    {/* Carte de confirmation d'action */}
                    {msg.action && msg.role === 'assistant' && (
                      <div style={{ padding: '14px 16px', background: 'var(--warning-light)', border: '1px solid rgba(158,94,0,0.3)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <i className="ti ti-edit" style={{ fontSize: '16px', color: 'var(--warning)' }} aria-hidden="true" />
                          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--warning)' }}>Modification en attente de confirmation</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'var(--surface)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                          <div>{msg.action.description}</div>
                          <div style={{ marginTop: '4px', display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                            <span style={{ textDecoration: 'line-through' }}>{msg.action.old_value}</span>
                            <span>→</span>
                            <span style={{ fontWeight: '600', color: 'var(--success)' }}>{msg.action.new_value}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button onClick={() => handleCancelAction(i)}
                            style={{ flex: 1, padding: '8px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                            Annuler
                          </button>
                          <button onClick={() => handleConfirmAction(msg.action!, i)} disabled={confirming === `${i}`}
                            style={{ flex: 1, padding: '8px', background: confirming === `${i}` ? 'rgba(10,124,78,0.4)' : 'var(--success)', border: 'none', borderRadius: 'var(--radius-sm)', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: confirming === `${i}` ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                            <i className="ti ti-check" style={{ fontSize: '13px' }} aria-hidden="true" />
                            {confirming === `${i}` ? 'Application...' : 'Confirmer la modification'}
                          </button>
                        </div>
                      </div>
                    )}
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
              placeholder="Posez une question ou demandez une modification... (ex: Change le Lit de chambre 12 à chambre 23)"
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
            MediTrack AI · Peut modifier vos données · Shift+Entrée pour nouvelle ligne
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