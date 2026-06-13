'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useFormule } from '@/lib/useFormule'
import FormuleGate from '@/components/FormuleGate'
import { exportToCSV } from '@/lib/csv'

export default function ReportingPage() {
  const { formule, role, can } = useFormule()
  const [equipements, setEquipements] = useState<any[]>([])
  const [pannes, setPannes] = useState<any[]>([])
  const [maintenances, setMaintenances] = useState<any[]>([])
  const [etablissements, setEtablissements] = useState<any[]>([])
  const [livraisons, setLivraisons] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEtab, setSelectedEtab] = useState('tous')
  const chartRef1 = useRef<HTMLCanvasElement>(null)
  const chartRef2 = useRef<HTMLCanvasElement>(null)
  const chartRef3 = useRef<HTMLCanvasElement>(null)
  const charts = useRef<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data: e } = await supabase.from('equipements').select('*')
      const { data: p } = await supabase.from('pannes').select('*').order('created_at')
      const { data: m } = await supabase.from('maintenances').select('*')
      const { data: etabs } = await supabase.from('etablissements').select('*').order('nom')
      const { data: l } = await supabase.from('livraisons').select('*')
      setEquipements(e || [])
      setPannes(p || [])
      setMaintenances(m || [])
      setEtablissements(etabs || [])
      setLivraisons(l || [])
      setLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    if (loading || !chartRef1.current || !chartRef2.current || !chartRef3.current) return
    charts.current.forEach(c => c?.destroy())
    charts.current = []

    const equips = selectedEtab === 'tous' ? equipements : equipements.filter(e => e.etablissement_id === selectedEtab)

    const Chart = (window as any).Chart
    if (!Chart) return

    // Chart 1 — Répartition statuts
    const c1 = new Chart(chartRef1.current, {
      type: 'doughnut',
      data: {
        labels: ['En service', 'Maintenance', 'Hors service'],
        datasets: [{
          data: [
            equips.filter(e => e.statut === 'en_service').length,
            equips.filter(e => e.statut === 'maintenance').length,
            equips.filter(e => e.statut === 'hors_service').length,
          ],
          backgroundColor: ['#0A7C4E', '#9E5E00', '#C2362A'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        cutout: '65%'
      }
    })
    charts.current.push(c1)

    // Chart 2 — Pannes par mois (6 derniers mois)
    const months: string[] = []
    const panneCounts: number[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const label = d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
      months.push(label)
      const count = pannes.filter(p => {
        const pd = new Date(p.created_at)
        return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear()
      }).length
      panneCounts.push(count)
    }
    const c2 = new Chart(chartRef2.current, {
      type: 'bar',
      data: {
        labels: months,
        datasets: [{
          label: 'Pannes',
          data: panneCounts,
          backgroundColor: '#C2362A',
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#999' } },
          y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { stepSize: 1, font: { size: 11 }, color: '#999' }, beginAtZero: true }
        }
      }
    })
    charts.current.push(c2)

    // Chart 3 — Équipements par établissement
    const etabLabels = etablissements.map(e => e.nom.slice(0, 12) + (e.nom.length > 12 ? '...' : ''))
    const etabCounts = etablissements.map(e => equipements.filter(eq => eq.etablissement_id === e.id).length)
    const c3 = new Chart(chartRef3.current, {
      type: 'bar',
      data: {
        labels: etabLabels,
        datasets: [{
          label: 'Équipements',
          data: etabCounts,
          backgroundColor: '#1A56DB',
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#999' } },
          y: { grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { stepSize: 1, font: { size: 11 }, color: '#999' }, beginAtZero: true }
        }
      }
    })
    charts.current.push(c3)

    return () => { charts.current.forEach(c => c?.destroy()) }
  }, [loading, equipements, pannes, etablissements, selectedEtab])

  function handleExport() {
    const data = equipements.map(eq => {
      const etab = etablissements.find(e => e.id === eq.etablissement_id)
      const pannesEq = pannes.filter(p => p.equipement_id === eq.id)
      const maintsEq = maintenances.filter(m => m.equipement_id === eq.id)
      return {
        reference: eq.reference,
        designation: eq.designation,
        categorie: eq.categorie || '',
        fabricant: eq.fabricant || '',
        statut: eq.statut,
        localisation: eq.localisation || '',
        etablissement: etab?.nom || '',
        nb_pannes: pannesEq.length,
        nb_maintenances: maintsEq.length,
        date_mes: eq.date_mes || '',
        date_revision: eq.date_revision || '',
      }
    })
    exportToCSV(data, `meditrack_rapport_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const equips = selectedEtab === 'tous' ? equipements : equipements.filter(e => e.etablissement_id === selectedEtab)
  const tauxDispo = equips.length > 0 ? Math.round((equips.filter(e => e.statut === 'en_service').length / equips.length) * 100) : 0
  const tauxColor = tauxDispo >= 80 ? 'var(--success)' : tauxDispo >= 60 ? 'var(--warning)' : 'var(--danger)'

  return (
    <FormuleGate feature="reporting" formule={formule} role={role} can={can}>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js" async />

      <div style={{ padding: '28px', fontFamily: 'var(--font)' }}>

        {/* Header */}
        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <i className="ti ti-building-hospital" style={{ fontSize: '15px', color: 'var(--text-tertiary)' }} aria-hidden="true" />
            <select value={selectedEtab} onChange={e => setSelectedEtab(e.target.value)}
              style={{ padding: '7px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '12px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface)', cursor: 'pointer' }}>
              <option value='tous'>Tous les établissements</option>
              {etablissements.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
            </select>
          </div>
          <button onClick={handleExport}
            style={{ padding: '8px 16px', background: 'var(--surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <i className="ti ti-download" style={{ fontSize: '14px' }} aria-hidden="true" />
            Exporter CSV
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-tertiary)', fontSize: '13px' }}>Chargement...</div>
        ) : (
          <>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', marginBottom: '20px' }}>
              {[
                { label: 'Total équipements', value: equips.length, color: 'var(--accent)', icon: 'ti-device-heart-monitor' },
                { label: 'Taux de dispo', value: `${tauxDispo}%`, color: tauxColor, icon: 'ti-activity' },
                { label: 'Pannes totales', value: pannes.length, color: 'var(--danger)', icon: 'ti-alert-circle' },
                { label: 'Maintenances', value: maintenances.length, color: 'var(--warning)', icon: 'ti-tool' },
                { label: 'Livraisons', value: livraisons.length, color: 'var(--purple)', icon: 'ti-truck' },
                { label: 'Établissements', value: etablissements.length, color: 'var(--success)', icon: 'ti-building-hospital' },
              ].map(s => (
                <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '14px 16px', boxShadow: 'var(--shadow-sm)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{s.label}</div>
                    <i className={`ti ${s.icon}`} style={{ fontSize: '14px', color: s.color, opacity: 0.6 }} aria-hidden="true" />
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: s.color, letterSpacing: '-0.5px' }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Graphiques */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>

              {/* Répartition statuts */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '4px' }}>Répartition du parc</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>{equips.length} équipements analysés</div>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  {[
                    { label: 'En service', color: '#0A7C4E', count: equips.filter(e => e.statut === 'en_service').length },
                    { label: 'Maintenance', color: '#9E5E00', count: equips.filter(e => e.statut === 'maintenance').length },
                    { label: 'Hors service', color: '#C2362A', count: equips.filter(e => e.statut === 'hors_service').length },
                  ].map(l => (
                    <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: l.color }} />
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{l.label} ({l.count})</span>
                    </div>
                  ))}
                </div>
                <div style={{ position: 'relative', height: '180px' }}>
                  <canvas ref={chartRef1} role="img" aria-label="Répartition des équipements par statut" />
                </div>
              </div>

              {/* Pannes par mois */}
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '4px' }}>Pannes par mois</div>
                <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>6 derniers mois</div>
                <div style={{ position: 'relative', height: '200px' }}>
                  <canvas ref={chartRef2} role="img" aria-label="Nombre de pannes par mois sur les 6 derniers mois" />
                </div>
              </div>
            </div>

            {/* Équipements par établissement */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px', boxShadow: 'var(--shadow-sm)', marginBottom: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)', marginBottom: '4px' }}>Équipements par établissement</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>{etablissements.length} établissements</div>
              <div style={{ position: 'relative', height: '200px' }}>
                <canvas ref={chartRef3} role="img" aria-label="Nombre d'équipements par établissement" />
              </div>
            </div>

            {/* Tableau détaillé */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>Détail par établissement</div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--surface-hover)' }}>
                    {['Établissement', 'Type', 'Formule', 'Équipements', 'En service', 'Pannes', 'Taux dispo'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11px', fontWeight: '500', color: 'var(--text-tertiary)', letterSpacing: '0.4px', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {etablissements.map((etab, i) => {
                    const etabEquips = equipements.filter(e => e.etablissement_id === etab.id)
                    const enService = etabEquips.filter(e => e.statut === 'en_service').length
                    const etabPannes = pannes.filter(p => {
                      const eq = equipements.find(e => e.id === p.equipement_id)
                      return eq?.etablissement_id === etab.id
                    }).length
                    const taux = etabEquips.length > 0 ? Math.round((enService / etabEquips.length) * 100) : 0
                    const tauxC = taux >= 80 ? 'var(--success)' : taux >= 60 ? 'var(--warning)' : 'var(--danger)'
                    return (
                      <tr key={etab.id} style={{ borderBottom: i < etablissements.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-primary)' }}>{etab.nom}</div>
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: '12px', color: 'var(--text-secondary)' }}>{etab.type}</td>
                        <td style={{ padding: '11px 14px' }}>
                          <span style={{ fontSize: '11px', fontWeight: '500', padding: '2px 8px', borderRadius: '20px', background: etab.formule === 'Privilège' ? 'var(--purple-light)' : etab.formule === 'Premium' ? 'var(--accent-light)' : 'var(--surface-hover)', color: etab.formule === 'Privilège' ? 'var(--purple)' : etab.formule === 'Premium' ? 'var(--accent)' : 'var(--text-secondary)' }}>
                            {etab.formule || 'Essentiel'}
                          </span>
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: '13px', fontWeight: '600', color: 'var(--accent)' }}>{etabEquips.length}</td>
                        <td style={{ padding: '11px 14px', fontSize: '13px', color: 'var(--success)', fontWeight: '500' }}>{enService}</td>
                        <td style={{ padding: '11px 14px', fontSize: '13px', color: etabPannes > 0 ? 'var(--danger)' : 'var(--text-tertiary)', fontWeight: etabPannes > 0 ? '600' : '400' }}>{etabPannes}</td>
                        <td style={{ padding: '11px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${taux}%`, background: tauxC, borderRadius: '2px' }} />
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: '600', color: tauxC, minWidth: '32px' }}>{taux}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </FormuleGate>
  )
}