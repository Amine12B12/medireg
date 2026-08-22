'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const CHAPITRES = [
  { num: '1', label: 'Ethique, droits et satisfaction', color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', total: 7 },
  { num: '2', label: 'Distribution et realisation', color: '#1A56DB', bg: '#EBF2FF', border: '#BFDBFE', total: 20 },
  { num: '3', label: 'Fonctions support', color: '#0A7C4E', bg: '#E8F5EE', border: '#A7F3D0', total: 24 },
  { num: '4', label: 'Qualite et risques', color: '#B45309', bg: '#FEF3C7', border: '#FDE68A', total: 9 },
]

export default function Dashboard() {
  const [profile, setProfile] = useState<any>(null)
  const [societe, setSociete] = useState<any>(null)
  const [clients, setClients] = useState<any[]>([])
  const [reponses, setReponses] = useState<any[]>([])
  const [criteres, setCriteres] = useState<any[]>([])
  const [docsCount, setDocsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(prof)

      if (prof?.role === 'consultant') {
        const { data: cls } = await supabase.from('clients').select('id, nom, statut').eq('statut', 'actif').order('nom')
        setClients(cls || [])
      } else if (prof?.client_id) {
        // Charger la societe
        const { data: soc } = await supabase.from('societes').select('*').eq('client_id', prof.client_id).single()
        setSociete(soc)

        if (soc) {
          // Charger etablissement
          const { data: etabs } = await supabase.from('etablissements_psdm').select('id').eq('societe_id', soc.id)
          const etabId = etabs?.[0]?.id

          if (etabId) {
            // Reponses criteres
            const { data: reps } = await supabase.from('reponses_criteres').select('*').eq('etablissement_id', etabId)
            setReponses(reps || [])

            // Docs generes
            const { count } = await supabase.from('documents_qualite').select('*', { count: 'exact', head: true }).eq('etablissement_id', etabId)
            setDocsCount(count || 0)
          }

          // Criteres
          const { data: crits } = await supabase.from('criteres_psdm').select('*').order('code')
          setCriteres(crits || [])
        }
      }

      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', fontFamily: 'var(--font)', color: 'var(--text-tertiary)', fontSize: '13px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #7C3AED, #1A56DB)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
          <i className="ti ti-shield-check" style={{ fontSize: '20px', color: '#fff' }} />
        </div>
        Chargement...
      </div>
    </div>
  )

  // Stats certification
  const total = criteres.length
  const conformes = reponses.filter(r => r.statut === 'conforme').length
  const enCours = reponses.filter(r => r.statut === 'en_cours').length
  const nonConformes = reponses.filter(r => r.statut === 'non_conforme').length
  const nonTraites = total - conformes - enCours - nonConformes
  const score = total > 0 ? Math.round((conformes / total) * 100) : 0

  // Prochains criteres a traiter (non traites en premier)
  const criteresNonTraites = criteres.filter(c => {
    const rep = reponses.find(r => r.critere_id === c.id)
    return !rep || rep.statut === 'non_traite'
  }).slice(0, 4)

  // Stats par chapitre
  const statsByChap = CHAPITRES.map(ch => {
    const critChap = criteres.filter(c => c.chapitre === ch.num)
    const conformesChap = critChap.filter(c => reponses.find(r => r.critere_id === c.id && r.statut === 'conforme')).length
    const enCoursChap = critChap.filter(c => reponses.find(r => r.critere_id === c.id && r.statut === 'en_cours')).length
    return { ...ch, criteres: critChap.length || ch.total, conformes: conformesChap, enCours: enCoursChap }
  })

  // Vue CONSULTANT
  if (profile?.role === 'consultant') {
    return (
      <div style={{ padding: '28px', fontFamily: 'var(--font)', maxWidth: '1100px' }}>
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Bonjour {profile?.prenom || ''} 👋
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* Stats globales */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { icon: 'ti-building-hospital', color: '#1A56DB', bg: '#EBF2FF', value: clients.length, label: 'Clients actifs' },
            { icon: 'ti-shield-check', color: '#7C3AED', bg: '#F5F3FF', value: clients.length, label: 'Certifications suivies' },
            { icon: 'ti-sparkles', color: '#0A7C4E', bg: '#E8F5EE', value: '—', label: 'Score moyen' },
          ].map(k => (
            <div key={k.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: k.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`ti ${k.icon}`} style={{ fontSize: '20px', color: k.color }} />
              </div>
              <div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: k.color, letterSpacing: '-0.5px', lineHeight: 1 }}>{k.value}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{k.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Liste clients */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>Mes clients</div>
            <button onClick={() => router.push('/dashboard/clients')}
              style={{ padding: '6px 14px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)' }}>
              Gérer les clients
            </button>
          </div>
          {clients.length === 0 ? (
            <div style={{ padding: '48px', textAlign: 'center' }}>
              <i className="ti ti-building-hospital" style={{ fontSize: '32px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '12px', opacity: 0.3 }} />
              <div style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '4px' }}>Aucun client pour le moment</div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>Ajoutez votre premier client pour commencer</div>
              <button onClick={() => router.push('/dashboard/clients')}
                style={{ padding: '9px 20px', background: 'var(--accent)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)' }}>
                Ajouter un client
              </button>
            </div>
          ) : (
            <div>
              {clients.map((c, i) => (
                <div key={c.id} style={{ padding: '14px 20px', borderBottom: i < clients.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}
                  onClick={() => router.push(`/dashboard/certification?client_id=${c.id}`)}
                  onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-hover)'}
                  onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#EBF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#1A56DB' }}>{c.nom.charAt(0).toUpperCase()}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>{c.nom}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Certification PSDM HAS</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#059669', background: '#D1FAE5', padding: '3px 10px', borderRadius: '20px', fontWeight: '500' }}>Actif</span>
                    <i className="ti ti-chevron-right" style={{ fontSize: '14px', color: 'var(--text-tertiary)' }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Vue CLIENT/ADMIN — pas de societe encore
  if (!societe) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh', fontFamily: 'var(--font)' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, #7C3AED, #1A56DB)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <i className="ti ti-shield-check" style={{ fontSize: '28px', color: '#fff' }} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
            Bienvenue sur MediReg
          </div>
          <div style={{ fontSize: '14px', color: 'var(--text-tertiary)', lineHeight: '1.6', marginBottom: '24px' }}>
            Configurez votre profil pour commencer votre parcours de certification HAS PSDM.
          </div>
          <button onClick={() => router.push('/dashboard/onboarding')}
            style={{ padding: '12px 28px', background: 'linear-gradient(135deg, #7C3AED, #1A56DB)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
            Configurer mon profil
          </button>
        </div>
      </div>
    )
  }

  // Vue CLIENT/ADMIN — avec certification
  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)', maxWidth: '1000px' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Bonjour {profile?.prenom || ''} 👋
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
            {societe.raison_sociale} · {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
        <button onClick={() => router.push('/dashboard/certification')}
          style={{ padding: '10px 20px', background: '#1A56DB', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 8px rgba(26,86,219,0.25)' }}>
          <i className="ti ti-shield-check" style={{ fontSize: '15px' }} />
          Continuer ma certification
        </button>
      </div>

      {/* Score hero */}
      <div style={{ background: 'linear-gradient(135deg, #1E1B4B 0%, #1e3a5f 100%)', borderRadius: '16px', padding: '28px 32px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '32px', flexWrap: 'wrap' }}>
        {/* Cercle score */}
        <div style={{ position: 'relative', width: '100px', height: '100px', flexShrink: 0 }}>
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
            <circle cx="50" cy="50" r="42" fill="none"
              stroke={score >= 75 ? '#10B981' : score >= 50 ? '#F59E0B' : '#6366F1'}
              strokeWidth="10"
              strokeDasharray={`${2 * Math.PI * 42}`}
              strokeDashoffset={`${2 * Math.PI * 42 * (1 - score / 100)}`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <span style={{ fontSize: '24px', fontWeight: '800', color: '#fff', letterSpacing: '-1px' }}>{score}%</span>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Score de certification HAS PSDM</div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '14px' }}>
            {score === 0 ? 'Commencez votre certification' : score < 30 ? 'Bon début — continuez !' : score < 60 ? 'Bonne progression' : score < 80 ? 'Presque prêt' : 'Excellent niveau !'}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { label: 'Conformes', value: conformes, color: '#10B981' },
              { label: 'En cours', value: enCours, color: '#F59E0B' },
              { label: 'Non conformes', value: nonConformes, color: '#EF4444' },
              { label: 'À traiter', value: nonTraites, color: 'rgba(255,255,255,0.4)' },
            ].map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: s.color }} />
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>{s.value} {s.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
          <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>{docsCount}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>Documents générés</div>
          </div>
          <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.08)', borderRadius: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff' }}>{total}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>Critères total</div>
          </div>
        </div>
      </div>

      {/* Progression par chapitre */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {statsByChap.map(ch => {
          const pct = ch.criteres > 0 ? Math.round((ch.conformes / ch.criteres) * 100) : 0
          return (
            <div key={ch.num} onClick={() => router.push('/dashboard/certification')}
              style={{ background: 'var(--surface)', border: `1px solid ${ch.border}`, borderRadius: '12px', padding: '16px 18px', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: ch.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: ch.color }}>Ch.{ch.num}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{ch.conformes}/{ch.criteres} conformes</div>
                </div>
                <span style={{ fontSize: '14px', fontWeight: '700', color: ch.color }}>{pct}%</span>
              </div>
              <div style={{ height: '5px', background: ch.border, borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: ch.color, borderRadius: '3px', transition: 'width 0.5s' }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Prochains criteres a traiter */}
      {criteresNonTraites.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="ti ti-arrow-right" style={{ fontSize: '15px', color: '#1A56DB' }} />
              Prochaines étapes
            </div>
            <button onClick={() => router.push('/dashboard/certification')}
              style={{ fontSize: '12px', color: '#1A56DB', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
              Voir tout <i className="ti ti-arrow-right" style={{ fontSize: '12px' }} />
            </button>
          </div>
          {criteresNonTraites.map((c, i) => {
            const chap = CHAPITRES.find(ch => ch.num === c.chapitre)
            return (
              <div key={c.id} onClick={() => router.push('/dashboard/certification')}
                style={{ padding: '14px 20px', borderBottom: i < criteresNonTraites.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-hover)'}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}>
                <div style={{ width: '32px', height: '32px', borderRadius: '7px', background: chap?.bg || '#F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: chap?.color || '#6B7280' }}>{c.code}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.titre}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>Chapitre {c.chapitre} · Non traité</div>
                </div>
                <i className="ti ti-chevron-right" style={{ fontSize: '14px', color: 'var(--text-tertiary)', flexShrink: 0 }} />
              </div>
            )
          })}
        </div>
      )}

      {/* Tout conforme */}
      {criteresNonTraites.length === 0 && score === 100 && (
        <div style={{ background: 'linear-gradient(135deg, #059669, #10B981)', borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
          <i className="ti ti-trophy" style={{ fontSize: '40px', color: '#fff', display: 'block', marginBottom: '12px' }} />
          <div style={{ fontSize: '20px', fontWeight: '700', color: '#fff', marginBottom: '8px' }}>Certification complète !</div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>Tous les critères sont conformes. Vous êtes prêt pour l'audit HAS.</div>
        </div>
      )}
    </div>
  )
}