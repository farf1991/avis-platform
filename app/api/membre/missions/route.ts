import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

async function getMembre(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return null
  const supabase = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return null
  const { data } = await supabase.from('membres').select('*').eq('user_id', user.id).single()
  return data || null
}

// GET : mission active du membre
export async function GET(req: NextRequest) {
  const membre = await getMembre(req)
  if (!membre) return NextResponse.json({ mission: null })
  const supabase = createAdminClient()
  const { data: mission } = await supabase
    .from('missions')
    .select('*, demandes(fiche_google_url)')
    .eq('membre_id', membre.id)
    .eq('statut', 'assignee')
    .order('assignee_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  return NextResponse.json({ mission: mission || null })
}

// POST : obtenir une mission à donner
export async function POST(req: NextRequest) {
  const membre = await getMembre(req)
  if (!membre) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })
  if (!membre.actif) return NextResponse.json({ success: false, error: 'Compte inactif' }, { status: 403 })
  const supabase = createAdminClient()

  // Vérifier qu'il n'a pas déjà une mission active
  const { data: existing } = await supabase
    .from('missions').select('id').eq('membre_id', membre.id).eq('statut', 'assignee').maybeSingle()
  if (existing) return NextResponse.json({ success: false, error: 'Vous avez déjà une mission en cours' })

  await supabase.rpc('expire_missions_retard')

  // Trouver la prochaine demande dispo
  const { data: demande } = await supabase
    .from('demandes')
    .select('*')
    .eq('statut', 'en_attente')
    .neq('membre_id', membre.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!demande) return NextResponse.json({ success: false, error: 'Aucune fiche disponible pour le moment. Revenez bientôt !' })

  // Vérifier anti-doublon
  const { data: dejaDonne } = await supabase
    .from('avis_donnes').select('id')
    .eq('membre_id', membre.id).eq('fiche_google_url', demande.fiche_google_url).maybeSingle()
  if (dejaDonne) return NextResponse.json({ success: false, error: 'Aucune fiche disponible pour le moment.' })

  const { data: mission } = await supabase
    .rpc('creer_mission', { p_membre_id: membre.id, p_demande_id: demande.id })
    .single() as { data: any }

  if (!mission) return NextResponse.json({ success: false, error: 'Erreur lors de l\'assignation' })

  return NextResponse.json({ success: true, mission: { ...mission, demandes: demande } })
}

// PATCH : soumettre screenshot (stocké pour validation admin)
export async function PATCH(req: NextRequest) {
  const membre = await getMembre(req)
  if (!membre) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })
  const supabase = createAdminClient()
  const formData = await req.formData()
  const missionId = formData.get('mission_id') as string
  const file = formData.get('screenshot') as File
  if (!missionId || !file) return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })

  const { data: mission } = await supabase
    .from('missions').select('id, membre_id, statut').eq('id', missionId).single()
  if (!mission || mission.membre_id !== membre.id || mission.statut !== 'assignee') {
    return NextResponse.json({ success: false, error: 'Mission introuvable ou expirée' }, { status: 403 })
  }

  const ext = file.name.split('.').pop() || 'jpg'
  const fileName = `${membre.id}/${missionId}-${Date.now()}.${ext}`
  const { error: uploadError } = await supabase.storage
    .from('screenshots').upload(fileName, file, { contentType: file.type })
  if (uploadError) return NextResponse.json({ error: 'Erreur upload' }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('screenshots').getPublicUrl(fileName)

  await supabase.from('screenshots').upsert({
    mission_id: missionId,
    membre_id: membre.id,
    wati_media_url: publicUrl,
    statut: 'en_attente'
  }, { onConflict: 'mission_id' })

  return NextResponse.json({ success: true, message: 'Screenshot soumis ! Notre équipe le valide sous peu.' })
}
