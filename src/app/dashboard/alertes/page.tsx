'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function AlertesPage() {
  const [pannes, setPannes] = useState<any[]>([])
  const [resolues, setResolues] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [etablissementId, setEtablissementId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('role, etablissement_id').eq('id', user.id).single()
      setRole(prof?.role || 'client')
      setEtablissementId(prof?.etablissement_id || null)
    }
    init()
  }, [])

  useEffect(() => {
    if (role) load()
  }, [role])

  async function load() {
    if (role === 'admin') {
      const { data: ouvertes } = await supabase
        .from('pannes')
        .select('*, equipements(reference, designation, localisation, etablissements(nom))')
        .eq('statut', 'ouvert')
        .order('created_at', { ascending: false })
      const { data: closed } = await supabase
        .from('pannes')
        .select('*, equipements(reference, designation, localisation, etablissements(nom))')
        .eq('statut', 'resolu')
        .order('updated_at', { ascending: false })
        .limit(5)
      setPannes(ouvertes || [])
      setResolues(closed || [])
    } else {
      // Client — uniquement les pannes de son établissement
      const { data: ouvertes } = await supabase
        .from('pannes')
        .select('*, equipements!inner(reference, designation, localisation, etablissement_id, etablissements(nom))')
        .eq('statut', 'ouvert')
        .eq('equipements.etablissement_id', etablissementId)
        .order('created_at', { ascending: false })
      const { data: closed } = await supabase
        .from('pannes')
        .select('*, equipements!inner(reference, designation, localisation, etablissement_id, etablissements(nom))')
        .eq('statut', 'resolu')
        .eq('equipements.etablissement_id', etablissementId)
        .order('updated_at', { ascending: false })
        .limit(5)
      setPannes(ouvertes || [])
      setResolues(closed || [])
    }
    setLoading(false)
  }

  async function handleResoudre(id: string, equipId: string) {
    setResolving(id)
    await supabase.from('pannes').update({ statut: 'resolu' }).eq('id', id)
    await supabase.from('equipements').update({ statut: 'en_service' }).eq('id', equipId)
    setResolving(null)
    load()
  }

  if (loading) return <div style={{ padding: '28px', color: 'var(--text-tertiary)', fontSize: '13px', fontFamily: 'var(--font)' }}>Chargement...</div>

  // Vue client — lecture seule, message rassurant
  if (role === 'client') {
    return (
      <div style={{ padding: '28px', fontFamily: 'var(--font)' }}>
        <div style={{ marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-bell-ringing" style={{ fontSize: '16px', color: 'var(--danger)' }} aria-hidden="true" />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Mes alertes</div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{pannes.length} panne{pannes.length > 1 ? 's' : ''} en cours de traitement</div>
            </div>
            {pannes.length > 0 && (
              <span style={{ marginLeft: 'auto', background: 'var(--danger)', color: '#fff', fontSize: '11px', fontWeight: '600', padding: '3px 9px', borderRadius: '20px' }}>{pannes.length}</span>
            )}
          </div>

          {pannes.length === 0 ? (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '48px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <i className="ti ti-check" style={{ fontSize: '24px', color: 'var(--success)' }} aria-hidden="true" />
              </div>
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '4px' }}>Aucune alerte active</div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Tous vos équipements fonctionnent normalement</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {pannes.map(p => (
                <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: '14px', boxShadow: 'var(--shadow-sm)', borderLeft: '3px solid var(--danger)' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="ti ti-alert-circle" style={{ fontSize: '20px', color: 'var(--danger)' }} aria-hidden="true" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
                          {(p.equipements as any)?.designation}
                          <span style={{ fontSize: '12px', fontWeight: '400', color: 'var(--text-tertiary)', marginLeft: '8px' }}>{(p.equipements as any)?.reference}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <i className="ti ti-map-pin" style={{ fontSize: '13px' }} aria-hidden="true" />
                            {(p.equipements as any)?.localisation || '—'}
                          </span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <i className="ti ti-clock" style={{ fontSize: '13px' }} aria-hidden="true" />
                            {new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <span style={{ background: 'var(--warning-light)', color: 'var(--warning)', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', flexShrink: 0 }}>En traitement</span>
                    </div>
                    {p.description && (
                      <div style={{ marginTop: '10px', padding: '10px 14px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        "{p.description}"
                      </div>
                    )}
                    {/* Message rassurant à la place du bouton résoudre */}
                    <div style={{ marginTop: '12px', padding: '10px 14px', background: 'var(--accent-light)', border: '1px solid rgba(26,86,219,0.15)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="ti ti-info-circle" style={{ fontSize: '14px', flexShrink: 0 }} aria-hidden="true" />
                      Votre prestataire a été notifié et prendra contact avec vous rapidement
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historique client */}
        {resolues.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-history" style={{ fontSize: '16px', color: 'var(--success)' }} aria-hidden="true" />
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Historique</div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Dernières pannes résolues</div>
              </div>
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              {resolues.map((p, i) => (
                <div key={p.id} style={{ padding: '14px 20px', borderBottom: i < resolues.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="ti ti-check" style={{ fontSize: '16px', color: 'var(--success)' }} aria-hidden="true" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{(p.equipements as any)?.designation}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{(p.equipements as any)?.reference} · {(p.equipements as any)?.localisation || '—'}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>Résolu</span>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{new Date(p.updated_at || p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Vue admin — complète avec bouton résoudre
  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)' }}>

      {/* Alertes ouvertes */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-bell-ringing" style={{ fontSize: '16px', color: 'var(--danger)' }} aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Alertes actives</div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{pannes.length} panne{pannes.length > 1 ? 's' : ''} en attente d'intervention</div>
          </div>
          {pannes.length > 0 && (
            <span style={{ marginLeft: 'auto', background: 'var(--danger)', color: '#fff', fontSize: '11px', fontWeight: '600', padding: '3px 9px', borderRadius: '20px' }}>{pannes.length}</span>
          )}
        </div>

        {pannes.length === 0 ? (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '48px', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <i className="ti ti-check" style={{ fontSize: '24px', color: 'var(--success)' }} aria-hidden="true" />
            </div>
            <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '4px' }}>Aucune alerte active</div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Tous les équipements fonctionnent normalement</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {pannes.map(p => (
              <div key={p.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: '14px', boxShadow: 'var(--shadow-sm)', borderLeft: '3px solid var(--danger)' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-md)', background: 'var(--danger-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="ti ti-alert-circle" style={{ fontSize: '20px', color: 'var(--danger)' }} aria-hidden="true" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '-0.2px' }}>
                        {(p.equipements as any)?.designation}
                        <span style={{ fontSize: '12px', fontWeight: '400', color: 'var(--text-tertiary)', marginLeft: '8px' }}>{(p.equipements as any)?.reference}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <i className="ti ti-building-hospital" style={{ fontSize: '13px' }} aria-hidden="true" />
                          {(p.equipements as any)?.etablissements?.nom || '—'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <i className="ti ti-map-pin" style={{ fontSize: '13px' }} aria-hidden="true" />
                          {(p.equipements as any)?.localisation || '—'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <i className="ti ti-clock" style={{ fontSize: '13px' }} aria-hidden="true" />
                          {new Date(p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    <span style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', flexShrink: 0 }}>Urgent</span>
                  </div>
                  {p.description && (
                    <div style={{ marginTop: '10px', padding: '10px 14px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      "{p.description}"
                    </div>
                  )}
                  <div style={{ marginTop: '12px' }}>
                    <button
                      onClick={() => handleResoudre(p.id, p.equipement_id)}
                      disabled={resolving === p.id}
                      style={{ padding: '8px 18px', background: 'var(--success-light)', border: '1px solid rgba(10,124,78,0.2)', borderRadius: 'var(--radius-md)', color: 'var(--success)', fontSize: '12px', fontWeight: '600', cursor: resolving === p.id ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="ti ti-check" style={{ fontSize: '14px' }} aria-hidden="true" />
                      {resolving === p.id ? 'Résolution...' : 'Marquer comme résolu'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historique admin */}
      {resolues.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-md)', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="ti ti-history" style={{ fontSize: '16px', color: 'var(--success)' }} aria-hidden="true" />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Historique</div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Dernières pannes résolues</div>
            </div>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
            {resolues.map((p, i) => (
              <div key={p.id} style={{ padding: '14px 20px', borderBottom: i < resolues.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: 'var(--radius-sm)', background: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="ti ti-check" style={{ fontSize: '16px', color: 'var(--success)' }} aria-hidden="true" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{(p.equipements as any)?.designation}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{(p.equipements as any)?.reference} · {(p.equipements as any)?.etablissements?.nom}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <span style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: '500' }}>Résolu</span>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{new Date(p.updated_at || p.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}