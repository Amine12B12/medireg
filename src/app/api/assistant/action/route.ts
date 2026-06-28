import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const ALLOWED_FIELDS = ['localisation', 'statut', 'commentaires', 'etablissement_id', 'date_revision', 'responsable_referent', 'service', 'etage']

export async function POST(request: Request) {
  const action = await request.json()

  if (!action.type || !action.equipement_id || !action.field || action.new_value === undefined) {
    return NextResponse.json({ success: false, error: 'Parametres manquants' }, { status: 400 })
  }

  if (!ALLOWED_FIELDS.includes(action.field)) {
    return NextResponse.json({ success: false, error: `Champ "${action.field}" non autorise` }, { status: 403 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Recupere l ancienne valeur avant modification
  const { data: ancien } = await supabaseAdmin
    .from('equipements')
    .select(action.field)
    .eq('id', action.equipement_id)
    .single()

  const { error } = await supabaseAdmin
    .from('equipements')
    .update({ [action.field]: action.new_value || null })
    .eq('id', action.equipement_id)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  // Si c est une localisation, enregistre dans l historique
  if (action.field === 'localisation') {
    await supabaseAdmin.from('historique_localisation').insert([{
      equipement_id: action.equipement_id,
      ancienne_localisation: ancien?.[action.field] || null,
      nouvelle_localisation: action.new_value || null,
      modifie_par: 'assistant_ia'
    }])
  }

  return NextResponse.json({ success: true })
}