'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import MeditrackSaisie from './MeditrackSaisie'

const MEDITRACK_URL = 'https://nkfivuqomqubhpsvgdfm.supabase.co'
const MEDITRACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZml2dXFvbXF1Ymhwc3ZnZGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4NTI3OTQsImV4cCI6MjA5NjQyODc5NH0.KctQtysEc1EkFW7BzoKloJbiIzbsNgSfZDkLFdQpP9I'

const meditrackClient = createClient(MEDITRACK_URL, MEDITRACK_KEY)

interface Props {
  meditrackEtabId: string | null | undefined
  critereCode: string
  userEmail?: string
  onLink?: (etabId: string) => void
}

const CRITERE_CONFIG: Record<string, {
  titre: string
  description: string
  tables: { table: string; label: string; icon: string; color: string; bg: string; statut_field?: string; statut_value?: string }[]
}> = {
  '2.3.2': {
    titre: 'Traçabilité des livraisons',
    description: "MediTrack trace chaque livraison de matériel — c'est la preuve que vos installations sont conformes à la prescription.",
    tables: [
      { table: 'livraisons', label: 'Livraisons tracées', icon: 'ti-truck-delivery', color: '#1A56DB', bg: '#EBF2FF' },
      { table: 'equipements', label: 'Équipements en service', icon: 'ti-medical-cross', color: '#059669', bg: '#ECFDF5', statut_field: 'statut', statut_value: 'en_service' },
    ]
  },
  '2.4.3': {
    titre: 'Traçabilité des maintenances',
    description: 'MediTrack trace chaque maintenance et dépannage — preuve de la continuité du service SAV.',
    tables: [
      { table: 'maintenances', label: 'Maintenances planifiées', icon: 'ti-tool', color: '#7C3AED', bg: '#F5F3FF' },
      { table: 'equipements', label: 'Équipements gérés', icon: 'ti-medical-cross', color: '#059669', bg: '#ECFDF5' },
    ]
  },
  '2.5.1': {
    titre: 'Traçabilité des reprises',
    description: 'MediTrack trace chaque reprise de matériel en fin de prestation.',
    tables: [
      { table: 'equipements', label: 'Équipements retirés', icon: 'ti-arrow-back', color: '#DC2626', bg: '#FEF2F2', statut_field: 'statut', statut_value: 'retire' },
      { table: 'livraisons', label: 'Reprises planifiées', icon: 'ti-clipboard-check', color: '#059669', bg: '#ECFDF5' },
    ]
  },
  '2.2.1': {
    titre: 'Traçabilité des prescriptions',
    description: "MediTrack gère le parc d'équipements liés aux prescriptions médicales.",
    tables: [
      { table: 'equipements', label: 'Équipements gérés', icon: 'ti-medical-cross', color: '#1A56DB', bg: '#EBF2FF' },
      { table: 'livraisons', label: 'Mises en service', icon: 'ti-truck-delivery', color: '#059669', bg: '#ECFDF5' },
    ]
  },
}

export default function MeditrackWidget({ meditrackEtabId, critereCode, userEmail, onLink }: Props) {
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [etabs, setEtabs] = useState<any[]>([])
  const [showLink, setShowLink] = useState(false)
  const [selectedEtab, setSelectedEtab] = useState('')
  const [showSaisie, setShowSaisie] = useState(false)

  const config = CRITERE_CONFIG[critereCode]
  if (!config) return null
  const etabId = meditrackEtabId || null

  useEffect(() => {
    if (meditrackEtabId) loadStats(meditrackEtabId as string)
  }, [meditrackEtabId])

  async function loadStats(etabId: string) {
    setLoading(true)
    const newStats: Record<string, number> = {}
    for (const t of config.tables) {
      let query = meditrackClient.from(t.table).select('id', { count: 'exact', head: true }).eq('etablissement_id', etabId)
      if (t.statut_field && t.statut_value) {
        query = (query as any).eq(t.statut_field, t.statut_value)
      }
      const { count } = await query
      newStats[t.table + (t.statut_value || '')] = count || 0
    }
    setStats(newStats)
    setLoading(false)
  }

  async function loadEtabs() {
    const { data } = await meditrackClient.from('etablissements').select('id, nom, ville').order('nom')
    setEtabs(data || [])
    setShowLink(true)
  }

  if (!meditrackEtabId) {
    return (
      <div style={{ background: '#F8FAFF', border: '1px solid #BFDBFE', borderRadius: '12px', padding: '20px', marginTop: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#EBF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-link" style={{ fontSize: '20px', color: '#1A56DB' }} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#1A56DB' }}>Connecter MediTrack</div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>{config.description}</div>
          </div>
        </div>

        {!showLink ? (
          <button onClick={loadEtabs}
            style={{ padding: '9px 18px', background: '#1A56DB', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="ti ti-link" style={{ fontSize: '14px' }} />
            Lier mon établissement MediTrack
          </button>
        ) : (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={selectedEtab} onChange={e => setSelectedEtab(e.target.value)}
              style={{ flex: 1, padding: '9px 12px', border: '1px solid #BFDBFE', borderRadius: '8px', fontSize: '13px', fontFamily: 'var(--font)', outline: 'none', background: '#fff', minWidth: '200px' }}>
              <option value="">Sélectionnez votre établissement...</option>
              {etabs.map(e => <option key={e.id} value={e.id}>{e.nom} — {e.ville}</option>)}
            </select>
            <button onClick={() => selectedEtab && onLink?.(selectedEtab)} disabled={!selectedEtab}
              style={{ padding: '9px 18px', background: selectedEtab ? '#1A56DB' : 'rgba(26,86,219,0.3)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: selectedEtab ? 'pointer' : 'not-allowed', fontFamily: 'var(--font)' }}>
              Lier
            </button>
          </div>
        )}

        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#9CA3AF' }}>
          <i className="ti ti-info-circle" style={{ fontSize: '12px' }} />
          Pas encore de compte MediTrack ?
          <a href="https://www.meditrack-app.fr" target="_blank" style={{ color: '#1A56DB', fontWeight: '600', textDecoration: 'none' }}>
            Créer un compte →
          </a>
        </div>
      </div>
    )
  }

  return (
    <>
      <div style={{ background: '#F8FAFF', border: '1px solid #BFDBFE', borderRadius: '12px', padding: '20px', marginTop: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: '#1A56DB', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="ti ti-database" style={{ fontSize: '17px', color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#1A56DB' }}>MediTrack — {config.titre}</div>
              <div style={{ fontSize: '11px', color: '#6B7280' }}>Données en temps réel depuis votre logiciel métier</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowSaisie(true)}
              style={{ padding: '7px 14px', background: '#1A56DB', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <i className="ti ti-plus" style={{ fontSize: '13px' }} />
              Saisir des données
            </button>
            <a href={`https://www.meditrack-app.fr/login?email=${encodeURIComponent(userEmail || '')}`} target="_blank"
              style={{ padding: '7px 14px', background: 'rgba(26,86,219,0.1)', border: '1px solid #BFDBFE', borderRadius: '8px', color: '#1A56DB', fontSize: '12px', fontWeight: '600', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <i className="ti ti-external-link" style={{ fontSize: '13px' }} />
              Vue complète
            </a>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px', color: '#9CA3AF', fontSize: '12px' }}>Chargement des données...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px' }}>
            {config.tables.map(t => {
              const key = t.table + (t.statut_value || '')
              const count = stats[key] || 0
              return (
                <div key={key} style={{ padding: '14px', background: '#fff', borderRadius: '10px', border: `1px solid ${t.bg}` }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
                    <i className={`ti ${t.icon}`} style={{ fontSize: '16px', color: t.color }} />
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '800', color: t.color, lineHeight: 1 }}>{count}</div>
                  <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '4px' }}>{t.label}</div>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ marginTop: '14px', padding: '10px 14px', background: '#ECFDF5', borderRadius: '8px', border: '1px solid #A7F3D0', fontSize: '12px', color: '#065F46', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <i className="ti ti-circle-check-filled" style={{ fontSize: '14px', color: '#10B981' }} />
          Ces données sont tracées dans MediTrack et constituent une preuve de conformité pour l'inspecteur HAS.
        </div>
      </div>

      {showSaisie && (
        <MeditrackSaisie
          meditrackEtabId={meditrackEtabId}
          critereCode={critereCode}
          onClose={() => setShowSaisie(false)}
          onSaved={() => { if (meditrackEtabId) loadStats(meditrackEtabId as string); setShowSaisie(false) }}
        />
      )}
    </>
  )
}