'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font)', outline: 'none', background: 'var(--surface)' }
const labelStyle = { display: 'block', fontSize: '11px', fontWeight: '600' as const, color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.4px' }

const ACTIVITES = ['MAD', 'Handicap', 'Oxygene', 'VPH', 'Nutrition', 'Stomie', 'Continence', 'Diabete', 'Autre']

export default function ProfilPage() {
  const [profil, setProfil] = useState<any>(null)
  const [clientId, setClientId] = useState<string | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [isNew, setIsNew] = useState(false)
  const [form, setForm] = useState({
    raison_sociale: '',
    siret: '',
    adresse: '',
    code_postal: '',
    ville: '',
    telephone: '',
    email: '',
    dirigeant: '',
    responsable_qualite: '',
    logo_url: '',
    activites: [] as string[],
    date_creation_entreprise: '',
    numero_autorisation: '',
  })
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: prof } = await supabase.from('profiles').select('role, client_id').eq('id', user.id).single()
      setRole(prof?.role || 'client')

      let cId = prof?.client_id
      if (prof?.role === 'consultant') {
        const params = new URLSearchParams(window.location.search)
        cId = params.get('client_id') || null
      }
      setClientId(cId)

      if (cId) {
        const { data: profilEtab } = await supabase.from('profils_etablissement').select('*').eq('client_id', cId).single()
        if (profilEtab) {
          setProfil(profilEtab)
          setForm({
            raison_sociale: profilEtab.raison_sociale || '',
            siret: profilEtab.siret || '',
            adresse: profilEtab.adresse || '',
            code_postal: profilEtab.code_postal || '',
            ville: profilEtab.ville || '',
            telephone: profilEtab.telephone || '',
            email: profilEtab.email || '',
            dirigeant: profilEtab.dirigeant || '',
            responsable_qualite: profilEtab.responsable_qualite || '',
            logo_url: profilEtab.logo_url || '',
            activites: profilEtab.activites || [],
            date_creation_entreprise: profilEtab.date_creation_entreprise || '',
            numero_autorisation: profilEtab.numero_autorisation || '',
          })
        } else {
          setIsNew(true)
          // Pre-remplir avec les infos du client
          const { data: client } = await supabase.from('clients').select('*').eq('id', cId).single()
          if (client) {
            setForm(prev => ({
              ...prev,
              raison_sociale: client.nom || '',
              ville: client.ville || '',
              email: client.contact_email || '',
              dirigeant: client.contact_nom || '',
            }))
          }
        }
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleUploadLogo(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || !clientId) return
    const file = e.target.files[0]
    setUploadingLogo(true)
    const path = `logos/${clientId}_${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from('documents').upload(path, file)
    if (!error) {
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path)
      setForm(prev => ({ ...prev, logo_url: urlData.publicUrl }))
    }
    setUploadingLogo(false)
    e.target.value = ''
  }

  function toggleActivite(act: string) {
    setForm(prev => ({
      ...prev,
      activites: prev.activites.includes(act)
        ? prev.activites.filter(a => a !== act)
        : [...prev.activites, act]
    }))
  }

  async function handleSave() {
    if (!clientId) return
    setSaving(true)
    const payload = { ...form, client_id: clientId, updated_at: new Date().toISOString() }

    if (isNew) {
      await supabase.from('profils_etablissement').insert([payload])
      setIsNew(false)
    } else {
      await supabase.from('profils_etablissement').update(payload).eq('client_id', clientId)
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  if (loading) return <div style={{ padding: '28px', color: 'var(--text-tertiary)', fontSize: '13px', fontFamily: 'var(--font)' }}>Chargement...</div>

  if (!clientId) return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '48px', textAlign: 'center' }}>
        <i className="ti ti-building-hospital" style={{ fontSize: '36px', display: 'block', marginBottom: '12px', color: 'var(--text-tertiary)', opacity: 0.4 }} />
        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '6px' }}>Aucun etablissement associe</div>
        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>Selectionnez un client depuis la page Clients</div>
      </div>
    </div>
  )

  return (
    <div style={{ padding: '28px', fontFamily: 'var(--font)', maxWidth: '800px' }}>

      {isNew && (
        <div style={{ background: '#EBF2FF', border: '1px solid rgba(26,86,219,0.3)', borderRadius: 'var(--radius-lg)', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="ti ti-info-circle" style={{ fontSize: '18px', color: 'var(--accent)', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--accent)' }}>Premiere configuration</div>
            <div style={{ fontSize: '12px', color: 'var(--accent)', opacity: 0.8, marginTop: '2px' }}>Ces informations seront automatiquement integrees dans tous vos documents qualite generes.</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>Profil etablissement</div>
          <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Ces informations apparaissent automatiquement sur tous vos documents</div>
        </div>
        <button onClick={handleSave} disabled={saving}
          style={{ padding: '10px 20px', background: saved ? 'var(--success)' : saving ? 'rgba(26,86,219,0.4)' : 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 1px 4px rgba(26,86,219,0.3)' }}>
          <i className={`ti ${saved ? 'ti-check' : 'ti-device-floppy'}`} style={{ fontSize: '15px' }} />
          {saved ? 'Enregistre !' : saving ? 'Enregistrement...' : 'Sauvegarder'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Section Logo */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
            Logo de l etablissement
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ width: '100px', height: '80px', border: '2px dashed var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-hover)', flexShrink: 0, overflow: 'hidden' }}>
              {form.logo_url ? (
                <img src={form.logo_url} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <i className="ti ti-photo" style={{ fontSize: '24px', color: 'var(--text-tertiary)', display: 'block', marginBottom: '4px' }} />
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>Logo</div>
                </div>
              )}
            </div>
            <div>
              <label style={{ padding: '8px 16px', background: 'var(--accent-light)', border: '1px solid rgba(26,86,219,0.2)', borderRadius: 'var(--radius-sm)', color: 'var(--accent)', fontSize: '12px', fontWeight: '500', cursor: 'pointer', fontFamily: 'var(--font)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <i className="ti ti-upload" style={{ fontSize: '14px' }} />
                {uploadingLogo ? 'Upload...' : 'Choisir un logo'}
                <input type='file' accept='image/*' style={{ display: 'none' }} onChange={handleUploadLogo} disabled={uploadingLogo} />
              </label>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '8px' }}>PNG, JPG — Le logo apparaitra sur tous vos documents qualite</div>
              {form.logo_url && (
                <button onClick={() => setForm(prev => ({ ...prev, logo_url: '' }))}
                  style={{ marginTop: '6px', fontSize: '11px', color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <i className="ti ti-trash" style={{ fontSize: '12px' }} />Supprimer le logo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Section Identite */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
            Identite de l etablissement
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Raison sociale *</label>
              <input value={form.raison_sociale} onChange={e => setForm(prev => ({ ...prev, raison_sociale: e.target.value }))} placeholder="SARL Global Medical" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>SIRET</label>
              <input value={form.siret} onChange={e => setForm(prev => ({ ...prev, siret: e.target.value }))} placeholder="123 456 789 00012" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Date creation</label>
              <input type='date' value={form.date_creation_entreprise} onChange={e => setForm(prev => ({ ...prev, date_creation_entreprise: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>N autorisation ARS</label>
              <input value={form.numero_autorisation} onChange={e => setForm(prev => ({ ...prev, numero_autorisation: e.target.value }))} placeholder="ARS-2024-XXXX" style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Section Contact */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
            Coordonnees
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Adresse</label>
              <input value={form.adresse} onChange={e => setForm(prev => ({ ...prev, adresse: e.target.value }))} placeholder="12 rue de la Paix" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Code postal</label>
              <input value={form.code_postal} onChange={e => setForm(prev => ({ ...prev, code_postal: e.target.value }))} placeholder="75001" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Ville</label>
              <input value={form.ville} onChange={e => setForm(prev => ({ ...prev, ville: e.target.value }))} placeholder="Paris" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Telephone</label>
              <input value={form.telephone} onChange={e => setForm(prev => ({ ...prev, telephone: e.target.value }))} placeholder="01 23 45 67 89" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input type='email' value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} placeholder="contact@entreprise.fr" style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Section Responsables */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
            Responsables
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle}>Dirigeant / Gerant</label>
              <input value={form.dirigeant} onChange={e => setForm(prev => ({ ...prev, dirigeant: e.target.value }))} placeholder="M. Jean Dupont" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Responsable qualite</label>
              <input value={form.responsable_qualite} onChange={e => setForm(prev => ({ ...prev, responsable_qualite: e.target.value }))} placeholder="Mme Marie Martin" style={inputStyle} />
            </div>
          </div>
        </div>

        {/* Section Activites */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
          <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
            Activites exercees
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '14px' }}>
            Ces activites determinent quels criteres du referentiel HAS s appliquent a votre etablissement
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {ACTIVITES.map(act => (
              <button key={act} onClick={() => toggleActivite(act)}
                style={{ padding: '8px 16px', border: `1px solid ${form.activites.includes(act) ? 'var(--accent)' : 'var(--border)'}`, borderRadius: 'var(--radius-md)', background: form.activites.includes(act) ? 'var(--accent-light)' : 'transparent', color: form.activites.includes(act) ? 'var(--accent)' : 'var(--text-secondary)', fontSize: '12px', fontWeight: form.activites.includes(act) ? '600' : '400', cursor: 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {form.activites.includes(act) && <i className="ti ti-check" style={{ fontSize: '13px' }} />}
                {act}
              </button>
            ))}
          </div>
        </div>

        {/* Preview document */}
        <div style={{ background: 'var(--surface-hover)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 24px' }}>
          <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '14px' }}>
            Apercu dans les documents
          </div>
          <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            {form.logo_url ? (
              <img src={form.logo_url} alt="Logo" style={{ height: '50px', objectFit: 'contain', flexShrink: 0 }} />
            ) : (
              <div style={{ width: '80px', height: '50px', background: 'var(--surface-hover)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>LOGO</span>
              </div>
            )}
            <div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: '#1a1a1a' }}>{form.raison_sociale || 'Raison sociale'}</div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>
                {[form.adresse, form.code_postal, form.ville].filter(Boolean).join(' ') || 'Adresse'}
              </div>
              <div style={{ fontSize: '11px', color: '#666' }}>
                {[form.telephone, form.email].filter(Boolean).join(' | ') || 'Contact'}
              </div>
            </div>
          </div>
        </div>

        <button onClick={handleSave} disabled={saving}
          style={{ padding: '13px', background: saved ? 'var(--success)' : saving ? 'rgba(26,86,219,0.4)' : 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 1px 4px rgba(26,86,219,0.3)' }}>
          <i className={`ti ${saved ? 'ti-check' : 'ti-device-floppy'}`} style={{ fontSize: '16px' }} />
          {saved ? 'Profil enregistre !' : saving ? 'Enregistrement...' : 'Sauvegarder le profil'}
        </button>
      </div>
    </div>
  )
}