import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerClient } from '@/lib/supabase'
import { notifier } from '@/lib/whatsapp'

// GET : récupérer la mission active du membre
export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const admin = createAdminClient()
  const { data: membre } = await admin.from('membres').select('id').eq('user_id', user.id).single()
  if (!membre) return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 })

  const { data: mission } = await admin.from('missions')
    .select('*, demandes(fiche_google_url)')
    .eq('membre_id', membre.id)
    .eq('statut', 'assignee')
    .order('assignee_at', { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json({ mission: mission || null })
}

// POST : demander une nouvelle mission
export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const admin = createAdminClient()
  const { data: membre } = await admin.from('membres').select('*').eq('user_id', user.id).single()
  if (!membre?.actif) return NextResponse.json({ error: 'Compte inactif' }, { status: 403 })

  const { data } = await admin.rpc('assigner_mission', { p_membre_id: membre.id })

  if (data?.success) {
    await notifier.missionAssignée(membre.whatsapp, membre.prenom, data.fiche_url, data.expire_at)
  }

  return NextResponse.json(data)
}

// PATCH : soumettre le screenshot
export async function PATCH(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const admin = createAdminClient()
  const { data: membre } = await admin.from('membres').select('*').eq('user_id', user.id).single()
  if (!membre) return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 })

  const formData = await req.formData()
  const missionId = formData.get('mission_id') as string
  const file = formData.get('screenshot') as File

  if (!missionId || !file) return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })

  // Upload screenshot dans Supabase Storage
  const fileName = `${membre.id}/${missionId}-${Date.now()}.${file.name.split('.').pop()}`
  const { data: upload, error: uploadError } = await admin.storage
    .from('screenshots').upload(fileName, file, { contentType: file.type })

  if (uploadError) return NextResponse.json({ error: 'Erreur upload' }, { status: 500 })

  const { data: { publicUrl } } = admin.storage.from('screenshots').getPublicUrl(fileName)

  // Valider la mission
  const { data: result } = await admin.rpc('valider_mission', {
    p_mission_id: missionId,
    p_screenshot_url: publicUrl
  })

  if (result?.success) {
    // Notifier le membre qui a donné l'avis
    await notifier.creditGagné(membre.whatsapp, membre.prenom, result.credits_nouveau_solde)

    // Notifier le demandeur
    const { data: demandeur } = await admin.from('membres')
      .select('whatsapp, prenom').eq('id', result.demandeur_id).single()
    if (demandeur) await notifier.avisRecu(demandeur.whatsapp, demandeur.prenom)
  }

  return NextResponse.json(result)
}
