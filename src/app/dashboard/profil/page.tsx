'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const RESPONSABILITES_LABELS: Record<string, string> = {
  direction: 'Direction / Representant legal',
  garant_psdm: 'Garant PSDM',
  materiovigilance: 'Correspondant materiovigilance',
  pharmacien: 'Pharmacien responsable',
  responsable_etablissement: 'Responsable etablissement',
  desinfection: 'Desinfection / Hygiene',
  sav_maintenance: 'SAV / Maintenance',
  reclamations: 'Reclamations',
  pilote_certification: 'Pilote certification MediReg',
  dpo: 'DPO / Interlocuteur RGPD',
}

export default function ProfilPage() {
  const [societe, setSociete] = useState<any>(null)
  const [etablissements, setEtablissements] = useState<any[]>([])
  const [personnes, setPersonnes] = useState<any[]>([])
  const [responsabilites, setResponsabilites] = useState<any[]>([])
  const [activites, setActivites] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: prof } = await supabase.from('profiles').select('role, client_id').eq('id', user.id).single()

      let clientId = prof?.client_id
      if (prof?.role === 'consultant') {
        const params = new URLSearchParams(window.location.search)
        clientId = params.get('client_id') || null
        if (!clientId) { router.push('/dashboard/clients'); return }
      }

      if (!clientId) { router.push('/dashboard'); return }

      // Societe
      const { data: soc } = await supabase.from('societes').select('*').eq('client_id', clientId).single()
      if (!soc) { router.push('/dashboard/onboarding'); return }
      setSociete(soc)

      // Etablissements
      const { data: etabs } = await supabase.from('etablissements_psdm').select('*').eq('societe_id', soc.id).order('created_at')
      setEtablissements(etabs || [])

      // Personnes
      const { data: pers } = await supabase.from('personnes').select('*').eq('societe_id', soc.id).order('created_at')
      setPersonnes(pers || [])

      // Responsabilites avec personnes
      if (pers && pers.length > 0) {
        const { data: resps } = await supabase
          .from('responsabilites_personnes')
          .select('*, personnes(nom, prenom, fonction_reelle), etablissements_psdm(nom)')
          .in('personne_id', pers.map(p => p.id))
          .eq('actif', true)
        setResponsabilites(resps || [])
      }

      // Activites
      if (etabs && etabs.length > 0) {
        const { data: acts } = await supabase
          .from('activites_etablissement')
          .select('*, etablissements_psdm(nom)')
          .in('etablissement_id', etabs.map(e => e.id))
        setActivites(acts || [])
      }

      setLoading(false)
    }
    load()
  }, [])

  const modeStyle = (mode: string) => {
    if (mode === 'interne') return { color: 'var(--success)', bg: 'var(--success-light)', label: 'Interne' }
    if (mode === 'sous_traite') return { color: 'var(--warning)', bg: 'var(--warning-light)', label: 'Sous-traite' }
    if (mode === 'mixte') return { color: 'var(--accent)', bg: 'var(--accent-light)', label: 'Mixte' }
    return { color: 'var(--text-tertiary)', bg: 'var(--surface-hover)', label: 'Non concerne' }
  }

  if (loading) return <div style={{ padding: '28px', color: 'var(--text-tertiary)', fontSize: '13px', fontFamily: 'var(--font)' }}>Chargement...</div>

  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)', maxWidth: '900px' }}>

      {/* Header avec bouton modifier */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {societe?.logo_url && (
            <img src={societe.logo_url} alt="Logo" style={{ height: '48px', objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '4px', background: '#fff' }} />
          )}
          <div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>{societe?.raison_sociale}</div>
            {societe?.nom_commercial && societe.nom_commercial !== societe.raison_sociale && (
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{societe.nom_commercial}</div>
            )}
          </div>
        </div>
        <button onClick={() => router.push('/dashboard/onboarding')}
          style={{ padding: '8px 16px', background: 'var(--accent-light)', border: '1px solid rgba(26,86,219,0.2)', borderRadius: 'var(--radius-md)', color: 'var(--accent)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="ti ti-edit" style={{ fontSize: '14px' }} />
          Modifier le profil
        </button>
      </div>

      {/* Societe */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="ti ti-building" style={{ fontSize: '14px' }} />
          Identite de la societe
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
          {[
            { label: 'Forme juridique', value: societe?.forme_juridique },
            { label: 'SIREN', value: societe?.siren },
            { label: 'Code APE', value: societe?.code_ape },
            { label: 'Adresse siege', value: [societe?.adresse_siege, societe?.code_postal, societe?.ville].filter(Boolean).join(', ') },
            { label: 'Telephone', value: societe?.telephone },
            { label: 'Email', value: societe?.email },
          ].map(f => f.value ? (
            <div key={f.label}>
              <div style={{ fontSize: '10px', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>{f.label}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{f.value}</div>
            </div>
          ) : null)}
        </div>
      </div>

      {/* Etablissements */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="ti ti-building-hospital" style={{ fontSize: '14px' }} />
            Etablissements
          </div>
          <span style={{ background: 'var(--accent-light)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '20px', fontSize: '11px' }}>{etablissements.length}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {etablissements.map((etab, i) => (
            <div key={etab.id} style={{ padding: '14px 16px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#fff', fontWeight: '700', flexShrink: 0 }}>{i + 1}</div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{etab.nom}</div>
                {etab.est_siege && <span style={{ fontSize: '10px', background: '#F5F3FF', color: '#7C3AED', padding: '2px 8px', borderRadius: '20px', fontWeight: '500' }}>Siege</span>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                {etab.siret && <span><span style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>SIRET </span>{etab.siret}</span>}
                {etab.ville && <span><span style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>Ville </span>{etab.ville}</span>}
                {etab.telephone && <span><span style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>Tel </span>{etab.telephone}</span>}
              </div>

              {/* Activites de cet etablissement */}
              {(() => {
                const actsEtab = activites.filter(a => a.etablissement_id === etab.id && a.mode !== 'non_concerne')
                if (actsEtab.length === 0) return null
                return (
                  <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {actsEtab.map(act => {
                      const ms = modeStyle(act.mode)
                      return (
                        <span key={act.id} style={{ fontSize: '10px', fontWeight: '500', color: ms.color, background: ms.bg, padding: '2px 8px', borderRadius: '20px' }}>
                          {act.activite}
                        </span>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          ))}
        </div>
      </div>

      {/* Personnes et responsabilites */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="ti ti-users" style={{ fontSize: '14px' }} />
            Personnes et responsabilites
          </div>
          <span style={{ background: 'var(--accent-light)', color: 'var(--accent)', padding: '2px 8px', borderRadius: '20px', fontSize: '11px' }}>{personnes.length}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {personnes.map(pers => {
            const persResps = responsabilites.filter(r => r.personne_id === pers.id)
            return (
              <div key={pers.id} style={{ padding: '14px 16px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#7C3AED' }}>
                    {pers.prenom.charAt(0)}{pers.nom.charAt(0)}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{pers.prenom} {pers.nom}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '8px' }}>{pers.fonction_reelle}</div>
                  {persResps.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {persResps.map(r => (
                        <span key={r.id} style={{ fontSize: '10px', fontWeight: '500', color: '#7C3AED', background: '#F5F3FF', padding: '3px 8px', borderRadius: '20px', border: '1px solid rgba(124,58,237,0.2)' }}>
                          {RESPONSABILITES_LABELS[r.responsabilite] || r.responsabilite}
                        </span>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    {pers.telephone && <span><i className="ti ti-phone" style={{ fontSize: '11px' }} /> {pers.telephone}</span>}
                    {pers.email && <span><i className="ti ti-mail" style={{ fontSize: '11px' }} /> {pers.email}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Variables disponibles pour les documents */}
      <div style={{ background: 'var(--surface-hover)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <i className="ti ti-code" style={{ fontSize: '14px' }} />
          Variables disponibles dans vos documents
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            '{{logo}}', '{{raison_sociale}}', '{{siren}}', '{{adresse_siege}}',
            '{{dirigeant_nom}}', '{{garant_psdm}}', '{{correspondant_materiovigilance}}',
            '{{responsable_desinfection}}', '{{responsable_sav}}', '{{responsable_reclamations}}',
            '{{pilote_certification}}', '{{nom_etablissement}}', '{{siret_etablissement}}',
          ].map(v => (
            <span key={v} style={{ fontSize: '11px', fontFamily: 'monospace', background: '#fff', border: '1px solid var(--border)', padding: '3px 8px', borderRadius: '4px', color: 'var(--accent)' }}>{v}</span>
          ))}
        </div>
      </div>
    </div>
  )
}