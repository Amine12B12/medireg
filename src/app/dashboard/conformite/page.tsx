'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useFormule } from '@/lib/useFormule'
import FormuleGate from '@/components/FormuleGate'

export default function ConformitePage() {
  const [equipements, setEquipements] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [maintenances, setMaintenances] = useState<any[]>([])
  const [pannes, setPannes] = useState<any[]>([])
  const [etablissements, setEtablissements] = useState<any[]>([])
  const [selectedEtabId, setSelectedEtabId] = useState<string>('tous')
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const supabase = createClient()
  const router = useRouter()
  const { formule, role, loading: formuleLoading, can } = useFormule()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)
      if (prof?.role === 'admin') {
        const { data: etabs } = await supabase.from('etablissements').select('id, nom').order('nom')
        setEtablissements(etabs || [])
      }
      const { data: docs } = await supabase.from('documents').select('*')
      const { data: maints } = await supabase.from('maintenances').select('*')
      const { data: pns } = await supabase.from('pannes').select('*')
      setDocuments(docs || [])
      setMaintenances(maints || [])
      setPannes(pns || [])
      await loadEquipements(prof)
      setLoading(false)
    }
    load()
  }, [])

  async function loadEquipements(prof: any, etabId?: string) {
    let query = supabase.from('equipements').select('*')
    if (prof?.role === 'client' && prof?.etablissement_id) {
      query = query.eq('etablissement_id', prof.etablissement_id)
    } else if (etabId && etabId !== 'tous') {
      query = query.eq('etablissement_id', etabId)
    }
    const { data } = await query
    setEquipements(data || [])
  }

  async function handleEtabChange(etabId: string) {
    setSelectedEtabId(etabId)
    setLoading(true)
    await loadEquipements(profile, etabId)
    setLoading(false)
  }

  if (loading) return <div style={{ padding: '28px', color: 'var(--text-tertiary)', fontSize: '13px', fontFamily: 'var(--font)' }}>Calcul en cours...</div>

  const equips = selectedEtabId === 'tous' ? equipements : equipements.filter(e => e.etablissement_id === selectedEtabId)
  const total = equips.length

  if (total === 0) return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)' }}>
      {profile?.role === 'admin' && (
        <div style={{ marginBottom: '16px' }}>
          <select value={selectedEtabId} onChange={e => handleEtabChange(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface)', cursor: 'pointer' }}>
            <option value='tous'>Tous les établissements</option>
            {etablissements.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
          </select>
        </div>
      )}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '48px', textAlign: 'center' }}>
        <i className="ti ti-shield-check" style={{ fontSize: '32px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '10px', opacity: 0.3 }} aria-hidden="true" />
        <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>Aucun équipement</div>
        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Ajoutez des équipements pour calculer le score</div>
      </div>
    </div>
  )

  // Calcul scores
  const equipIdsAvecDoc = new Set(documents.map(d => d.equipement_id))
  const equipIdsAvecMaint = new Set(maintenances.map(m => m.equipement_id))

  const equipAvecLocalisation = equips.filter(e => e.localisation?.trim()).length
  const equipAvecCategorie = equips.filter(e => e.categorie?.trim()).length
  const equipAvecStatut = equips.filter(e => e.statut).length
  const equipAvecNumSerie = equips.filter(e => e.numero_serie?.trim()).length
  const equipAvecDoc = equips.filter(e => equipIdsAvecDoc.has(e.id)).length
  const equipAvecMaint = equips.filter(e => equipIdsAvecMaint.has(e.id)).length
  const equipComplets = equips.filter(e => e.designation && e.reference && e.fabricant && e.localisation && e.categorie).length
  const equipAffectes = equips.filter(e => e.etablissement_id).length
  const pannesResolues = pannes.filter(p => p.statut === 'resolu').length

  const traceScore = Math.round(((equipAvecLocalisation + equipAvecCategorie + equipAvecStatut + equipAvecNumSerie) / (total * 4)) * 100)
  const docScore = Math.round((equipAvecDoc / total) * 100)
  const maintScore = Math.round(((equipAvecMaint / total) * 0.7 + (pannes.length > 0 ? pannesResolues / pannes.length : 1) * 0.3) * 100)
  const coherenceScore = Math.round(((equipAffectes + equipComplets) / (total * 2)) * 100)
  const scoreGlobal = Math.round((traceScore * 0.30) + (docScore * 0.25) + (maintScore * 0.25) + (coherenceScore * 0.20))

  const scoreColor = scoreGlobal >= 75 ? 'var(--success)' : scoreGlobal >= 50 ? 'var(--warning)' : 'var(--danger)'
  const scoreBg = scoreGlobal >= 75 ? 'var(--success-light)' : scoreGlobal >= 50 ? 'var(--warning-light)' : 'var(--danger-light)'
  const scoreLabel = scoreGlobal >= 75 ? 'Bon niveau de préparation' : scoreGlobal >= 50 ? 'À renforcer' : 'Risque documentaire'

  const pointsOK: string[] = []
  const pointsAmeliorer: string[] = []
  if (equipAvecLocalisation === total) pointsOK.push('Équipements localisés')
  else pointsAmeliorer.push(`${total - equipAvecLocalisation} équipement${total - equipAvecLocalisation > 1 ? 's' : ''} sans localisation`)
  if (equipAvecCategorie === total) pointsOK.push('Catégories renseignées')
  else pointsAmeliorer.push(`${total - equipAvecCategorie} équipement${total - equipAvecCategorie > 1 ? 's' : ''} sans catégorie`)
  if (equipAvecDoc === total) pointsOK.push('Documents présents')
  else pointsAmeliorer.push(`${total - equipAvecDoc} équipement${total - equipAvecDoc > 1 ? 's' : ''} sans document`)
  if (equipAvecMaint === total) pointsOK.push('Historique maintenance complet')
  else pointsAmeliorer.push(`${total - equipAvecMaint} équipement${total - equipAvecMaint > 1 ? 's' : ''} sans maintenance`)
  if (equipAvecNumSerie === total) pointsOK.push('Numéros de série complets')
  else pointsAmeliorer.push(`${total - equipAvecNumSerie} équipement${total - equipAvecNumSerie > 1 ? 's' : ''} sans numéro de série`)
  if (equipComplets === total) pointsOK.push('Fiches complètes')
  else pointsAmeliorer.push(`${total - equipComplets} fiche${total - equipComplets > 1 ? 's' : ''} incomplète${total - equipComplets > 1 ? 's' : ''}`)

  // Détail par équipement
  const equipDetails = equips.map(eq => {
    const hasDoc = equipIdsAvecDoc.has(eq.id)
    const hasMaint = equipIdsAvecMaint.has(eq.id)
    const checks = [
      eq.localisation?.trim(), eq.categorie?.trim(), eq.numero_serie?.trim(),
      eq.fabricant?.trim(), hasDoc, hasMaint
    ]
    const score = Math.round((checks.filter(Boolean).length / checks.length) * 100)
    return { ...eq, score, hasDoc, hasMaint }
  }).sort((a, b) => a.score - b.score)

  return (
    <FormuleGate feature="conformite" formule={formule} role={role} can={can}>
    <div style={{ padding: '24px 28px', fontFamily: 'var(--font)', maxWidth: '960px' }}>

      {/* Filtre établissement — admin seulement */}
      {profile?.role === 'admin' && (
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="ti ti-building-hospital" style={{ fontSize: '15px', color: 'var(--text-tertiary)' }} aria-hidden="true" />
          <select value={selectedEtabId} onChange={e => handleEtabChange(e.target.value)}
            style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface)', cursor: 'pointer' }}>
            <option value='tous'>Tous les établissements</option>
            {etablissements.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
          </select>
          <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{total} équipement{total > 1 ? 's' : ''} analysé{total > 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Score + mini critères en une seule ligne */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '14px', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>

          {/* Score cercle compact */}
          <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="32" fill="none" stroke="var(--border)" strokeWidth="8" />
              <circle cx="40" cy="40" r="32" fill="none" stroke={scoreColor} strokeWidth="8"
                strokeDasharray={`${2 * Math.PI * 32}`}
                strokeDashoffset={`${2 * Math.PI * 32 * (1 - scoreGlobal / 100)}`}
                strokeLinecap="round" transform="rotate(-90 40 40)" />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color: scoreColor, lineHeight: 1 }}>{scoreGlobal}%</div>
            </div>
          </div>

          <div style={{ flex: 1, minWidth: '150px' }}>
            <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>Score de conformité</div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '4px', padding: '3px 10px', background: scoreBg, borderRadius: '20px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: scoreColor }} />
              <span style={{ fontSize: '12px', fontWeight: '500', color: scoreColor }}>{scoreLabel}</span>
            </div>
          </div>

          {/* 4 scores compacts */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { label: 'Traçabilité', score: traceScore, poids: '30%' },
              { label: 'Documents', score: docScore, poids: '25%' },
              { label: 'Maintenance', score: maintScore, poids: '25%' },
              { label: 'Cohérence', score: coherenceScore, poids: '20%' },
            ].map(s => {
              const c = s.score >= 75 ? 'var(--success)' : s.score >= 50 ? 'var(--warning)' : 'var(--danger)'
              const bg = s.score >= 75 ? 'var(--success-light)' : s.score >= 50 ? 'var(--warning-light)' : 'var(--danger-light)'
              return (
                <div key={s.label} style={{ padding: '8px 12px', background: bg, borderRadius: 'var(--radius-md)', textAlign: 'center', minWidth: '72px' }}>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: c }}>{s.score}%</div>
                  <div style={{ fontSize: '10px', color: c, fontWeight: '500' }}>{s.label}</div>
                  <div style={{ fontSize: '9px', color: c, opacity: 0.7 }}>{s.poids}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Points OK + À améliorer */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="ti ti-circle-check" style={{ fontSize: '14px', color: 'var(--success)' }} aria-hidden="true" />
            <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>Ce qui est OK</span>
          </div>
          <div style={{ padding: '10px 14px' }}>
            {pointsOK.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', textAlign: 'center', padding: '8px' }}>Aucun point conforme pour l'instant</div>
            ) : pointsOK.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '4px 0', borderBottom: i < pointsOK.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{p}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: '14px', color: 'var(--warning)' }} aria-hidden="true" />
            <span style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>Points à améliorer</span>
          </div>
          <div style={{ padding: '10px 14px' }}>
            {pointsAmeliorer.length === 0 ? (
              <div style={{ fontSize: '12px', color: 'var(--success)', textAlign: 'center', padding: '8px' }}>Tout est conforme 🎉</div>
            ) : pointsAmeliorer.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '4px 0', borderBottom: i < pointsAmeliorer.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--warning)', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Détail par équipement */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>Détail par équipement</div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Trié par score croissant</div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--surface-hover)' }}>
              {['Équipement', 'Localisation', 'Catégorie', 'N° série', 'Document', 'Maintenance', 'Score'].map(h => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '10px', fontWeight: '500', color: 'var(--text-tertiary)', letterSpacing: '0.4px', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {equipDetails.map((eq, i) => {
              const sc = eq.score >= 75 ? 'var(--success)' : eq.score >= 50 ? 'var(--warning)' : 'var(--danger)'
              const check = (val: boolean) => val
                ? <i className="ti ti-check" style={{ fontSize: '14px', color: 'var(--success)' }} aria-hidden="true" />
                : <i className="ti ti-x" style={{ fontSize: '14px', color: 'var(--danger)' }} aria-hidden="true" />
              return (
                <tr key={eq.id}
                  style={{ borderBottom: i < equipDetails.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
                  onClick={() => router.push('/dashboard/materiel')}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = 'var(--surface-hover)'}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'}
                >
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>{eq.designation}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>{eq.reference}</div>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>{check(!!eq.localisation?.trim())}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>{check(!!eq.categorie?.trim())}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>{check(!!eq.numero_serie?.trim())}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>{check(eq.hasDoc)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>{check(eq.hasMaint)}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ flex: 1, height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${eq.score}%`, background: sc, borderRadius: '2px' }} />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: '600', color: sc, minWidth: '30px' }}>{eq.score}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {scoreGlobal < 75 && (
        <div style={{ marginTop: '14px', background: 'var(--accent-light)', border: '1px solid rgba(26,86,219,0.2)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent)' }}>Améliorez votre score</div>
            <div style={{ fontSize: '12px', color: 'var(--accent)', opacity: 0.8, marginTop: '2px' }}>Complétez les fiches et ajoutez les documents manquants</div>
          </div>
          <button onClick={() => router.push('/dashboard/materiel')}
            style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', whiteSpace: 'nowrap' }}>
            Compléter le parc →
          </button>
        </div>
        
      )}
    </div>
    </FormuleGate>
  )
}