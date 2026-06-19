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
  const [showModal, setShowModal] = useState(false)
  const [selectedPanne, setSelectedPanne] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ date_prevue: '', notes: '', type: 'curative' })
  const supabase = createClient()

  const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface)' }
  const labelStyle = { display: 'block', fontSize: '11px', fontWeight: '500' as const, color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase' as const, letterSpacing: '0.4px' }

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
        .select('*, equipements(id, reference, designation, localisation, etablissements(nom))')
        .eq('statut', 'ouvert')
        .order('created_at', { ascending: false })
      const { data: closed } = await supabase
        .from('pannes')
        .select('*, equipements(id, reference, designation, localisation, etablissements(nom))')
        .eq('statut', 'resolu')
        .order('updated_at', { ascending: false })
        .limit(5)
      setPannes(ouvertes || [])
      setResolues(closed || [])
    } else {
      const { data: ouvertes } = await supabase
        .from('pannes')
        .select('*, equipements!inner(id, reference, designation, localisation, etablissement_id, etablissements(nom))')
        .eq('statut', 'ouvert')
        .eq('equipements.etablissement_id', etablissementId)
        .order('created_at', { ascending: false })
      const { data: closed } = await supabase
        .from('pannes')
        .select('*, equipements!inner(id, reference, designation, localisation, etablissement_id, etablissements(nom))')
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

  function openPlanifierModal(panne: any) {
    setSelectedPanne(panne)
    setForm({ date_prevue: '', notes: panne.description || '', type: 'curative' })
    setShowModal(true)
  }

  async function handlePlanifierIntervention() {
    if (!selectedPanne) return
    setSaving(true)
    const payload: any = {
      equipement_id: selectedPanne.equipement_id,
      type: form.type,
      statut: 'planifie',
      notes: form.notes || null,
    }
    if (form.date_prevue) payload.date_prevue = form.date_prevue
    await supabase.from('maintenances').insert([payload])
    setShowModal(false)
    setSaving(false)
    load()
  }

  if (loading || role === null) return <div style={{ padding: '28px', color: 'var(--text-tertiary)', fontSize: '13px', fontFamily: 'var(--font)' }}>Chargement...</div>

  // ── VUE CLIENT ──────────────────────────────────────────────────────────
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

  // ── VUE ADMIN ───────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)' }}>

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
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Bouton Planifier une intervention */}
                    <button
                      onClick={() => openPlanifierModal(p)}
                      style={{ padding: '8px 18px', background: 'var(--accent-light)', border: '1px solid rgba(26,86,219,0.2)', borderRadius: 'var(--radius-md)', color: 'var(--accent)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="ti ti-tool" style={{ fontSize: '14px' }} aria-hidden="true" />
                      Planifier une intervention
                    </button>
                    {/* Bouton Marquer résolu */}
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

      {/* Modal Planifier intervention */}
      {showModal && selectedPanne && (
        <div onMouseDown={e => { if (e.target === e.currentTarget) setShowModal(false) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', width: '100%', maxWidth: '480px', boxShadow: '0 24px 64px rgba(0,0,0,0.12)', border: '1px solid var(--border)' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Planifier une intervention</div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                  {(selectedPanne.equipements as any)?.designation} · {(selectedPanne.equipements as any)?.etablissements?.nom}
                </div>
              </div>
              <button onClick={() => setShowModal(false)} style={{ width: '30px', height: '30px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--surface-hover)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                <i className="ti ti-x" style={{ fontSize: '14px' }} aria-hidden="true" />
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

              {/* Infos panne */}
              <div style={{ padding: '12px 16px', background: 'var(--danger-light)', border: '1px solid rgba(194,54,42,0.2)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--danger)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <i className="ti ti-alert-circle" style={{ fontSize: '15px', flexShrink: 0, marginTop: '1px' }} aria-hidden="true" />
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '2px' }}>Panne signalée le {new Date(selectedPanne.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</div>
                  {selectedPanne.description && <div style={{ opacity: 0.8 }}>{selectedPanne.description}</div>}
                </div>
              </div>

              <div>
                <label style={labelStyle}>Type d'intervention</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} style={inputStyle}>
                  <option value='curative'>Curative (suite à une panne)</option>
                  <option value='preventive'>Préventive</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Date et heure prévue</label>
                <input type='datetime-local' value={form.date_prevue} onChange={e => setForm(p => ({ ...p, date_prevue: e.target.value }))} style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Notes pour le technicien</label>
                <textarea rows={3} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder='Instructions, observations...'
                  style={{ ...inputStyle, resize: 'none' }} />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: '11px', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                  Annuler
                </button>
                <button onClick={handlePlanifierIntervention} disabled={saving}
                  style={{ flex: 1, padding: '11px', background: saving ? 'rgba(26,86,219,0.4)' : 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '13px', fontWeight: '500', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', boxShadow: '0 1px 4px rgba(26,86,219,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <i className="ti ti-tool" style={{ fontSize: '14px' }} aria-hidden="true" />
                  {saving ? 'Enregistrement...' : 'Planifier'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}