'use client'

import { useEffect, useState } from 'react'
import MeditrackSaisie from './MeditrackSaisie'

// Les données MediTrack passent par /api/meditrack : aucune clé MediTrack dans le navigateur

interface Props {
  meditrackEtabId: string | null | undefined
  clientId: string | null | undefined
  critereCode: string
  userEmail?: string
  onLink?: (etabId: string) => void
}

type Indicateur = { cle: string; label: string; icon: string; color: string; bg: string }
const BLEU = { color: 'var(--accent)', bg: 'var(--accent-light)' }, VERT = { color: '#059669', bg: '#ECFDF5' }, VIOLET = { color: '#7C3AED', bg: '#F5F3FF' }, ROUGE = { color: '#DC2626', bg: '#FEF2F2' }

// Chaque indicateur correspond à un compteur renvoyé par la passerelle MediTrack (/api/passerelle/medireg)
const CRITERE_CONFIG: Record<string, { titre: string; description: string; tables: Indicateur[] }> = {
  '2.2.1': {
    titre: 'Traçabilité des prescriptions',
    description: "MediTrack rattache chaque dossier à son ordonnance et à son prescripteur, et gère le parc d'équipements prescrits.",
    tables: [
      { cle: 'dossiers', label: 'Dossiers patients', icon: 'ti-folders', ...BLEU },
      { cle: 'ordonnances', label: 'Ordonnances enregistrées', icon: 'ti-prescription', ...VERT },
      { cle: 'equipements', label: 'Équipements gérés', icon: 'ti-medical-cross', ...VIOLET },
    ],
  },
  '2.3.2': {
    titre: 'Traçabilité des livraisons',
    description: "MediTrack trace chaque livraison et installation — c'est la preuve que vos installations sont conformes à la prescription.",
    tables: [
      { cle: 'installations_effectuees', label: 'Installations à domicile', icon: 'ti-home-check', ...BLEU },
      { cle: 'livraisons_effectuees', label: 'Livraisons effectuées', icon: 'ti-truck-delivery', ...VERT },
      { cle: 'equipements_en_service', label: 'Équipements en service', icon: 'ti-medical-cross', ...VIOLET },
    ],
  },
  '2.4.3': {
    titre: 'Traçabilité des maintenances',
    description: 'MediTrack trace chaque maintenance, dépannage et désinfection — preuve de la continuité du service SAV.',
    tables: [
      { cle: 'maintenances_terminees', label: 'Maintenances réalisées', icon: 'ti-tool', ...VIOLET },
      { cle: 'desinfections_tracees', label: 'Désinfections tracées', icon: 'ti-spray', ...VERT },
      { cle: 'equipements', label: 'Équipements gérés', icon: 'ti-medical-cross', ...BLEU },
    ],
  },
  '2.5.1': {
    titre: 'Traçabilité des reprises',
    description: 'MediTrack trace chaque reprise de matériel en fin de prestation, suivie de sa désinfection.',
    tables: [
      { cle: 'reprises_effectuees', label: 'Reprises effectuées', icon: 'ti-arrow-back-up', ...ROUGE },
      { cle: 'equipements_retires', label: 'Équipements retirés', icon: 'ti-arrow-back', ...VIOLET },
      { cle: 'desinfections_tracees', label: 'Désinfections tracées', icon: 'ti-spray', ...VERT },
    ],
  },
}

export default function MeditrackWidget({ meditrackEtabId, clientId, critereCode, userEmail, onLink }: Props) {
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
    const res = await fetch(`/api/meditrack?action=stats&clientId=${encodeURIComponent(clientId || '')}`)
    const json = res.ok ? await res.json() : {}
    setStats(json.stats || {})
    setLoading(false)
  }

  async function loadEtabs() {
    const res = await fetch(`/api/meditrack?action=etablissements&clientId=${encodeURIComponent(clientId || '')}`)
    const json = res.ok ? await res.json() : {}
    setEtabs(json.etablissements || [])
    setShowLink(true)
  }

  if (!meditrackEtabId) {
    return (
      <div style={{ background: '#F8FAFF', border: '1px solid #BFDBFE', borderRadius: '12px', padding: '20px', marginTop: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--accent-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="ti ti-link" style={{ fontSize: '20px', color: 'var(--accent)' }} />
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent)' }}>Connecter MediTrack</div>
            <div style={{ fontSize: '12px', color: '#6B7280', marginTop: '2px' }}>{config.description}</div>
          </div>
        </div>

        {!showLink ? (
          <button onClick={loadEtabs}
            style={{ padding: '9px 18px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
            <button onClick={async () => {
              if (!selectedEtab) return
              const res = await fetch('/api/meditrack', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'lier', clientId, etablissementId: selectedEtab }) })
              if (res.ok) onLink?.(selectedEtab)
            }} disabled={!selectedEtab}
              style={{ padding: '9px 18px', background: selectedEtab ? 'var(--accent)' : 'rgba(26,86,219,0.3)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: selectedEtab ? 'pointer' : 'not-allowed', fontFamily: 'var(--font)' }}>
              Lier
            </button>
          </div>
        )}

        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#9CA3AF' }}>
          <i className="ti ti-info-circle" style={{ fontSize: '12px' }} />
          Pas encore de compte MediTrack ?
          <a href="https://www.meditrack-app.fr" target="_blank" style={{ color: 'var(--accent)', fontWeight: '600', textDecoration: 'none' }}>
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
            <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="ti ti-database" style={{ fontSize: '17px', color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--accent)' }}>MediTrack — {config.titre}</div>
              <div style={{ fontSize: '11px', color: '#6B7280' }}>Données en temps réel depuis votre logiciel métier</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setShowSaisie(true)}
              style={{ padding: '7px 14px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <i className="ti ti-plus" style={{ fontSize: '13px' }} />
              Saisir des données
            </button>
            <a href={`https://www.meditrack-app.fr/login?email=${encodeURIComponent(userEmail || '')}`} target="_blank"
              style={{ padding: '7px 14px', background: 'rgba(26,86,219,0.1)', border: '1px solid #BFDBFE', borderRadius: '8px', color: 'var(--accent)', fontSize: '12px', fontWeight: '600', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
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
              const key = t.cle
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
          clientId={clientId}
          critereCode={critereCode}
          onClose={() => setShowSaisie(false)}
          onSaved={() => { if (meditrackEtabId) loadStats(meditrackEtabId as string); setShowSaisie(false) }}
        />
      )}
    </>
  )
}