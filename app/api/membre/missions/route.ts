import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { notifier } from '@/lib/whatsapp'

async function getMembreFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const supabase = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return null
  const { data: membre } = await supabase.from('membres').select('*').eq('user_id', user.id).single()
  return membre
}

export async function GET(req: NextRequest) {
  const membre = await getMembreFromRequest(req)
  if (!membre) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const supabase = createAdminClient()
  const { data: mission } = await supabase.from('missions')
    .select('*, demandes(fiche_google_url)')
    .eq('membre_id', membre.id).eq('statut', 'assignee')
    .order('assignee_at', { ascending: false }).limit(1).single()
  return NextResponse.json({ mission: mission || null })
}

export async function POST(req: NextRequest) {
  const membre = await getMembreFromRequest(req)
  if (!membre?.actif) return NextResponse.json({ error: 'Compte inactif' }, { status: 403 })
  const supabase = createAdminClient()
  const { data } = await supabase.rpc('assigner_mission', { p_membre_id: membre.id })
  if (data?.success) {
    await notifier.missionAssignée(membre.whatsapp, membre.prenom, data.fiche_url, data.expire_at)
  }
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const membre = await getMembreFromRequest(req)
  if (!membre) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const supabase = createAdminClient()
  const formData = await req.formData()
  const missionId = formData.get('mission_id') as string
  const file = formData.get('screenshot') as File
  if (!missionId || !file) return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
  const fileName = `${membre.id}/${missionId}-${Date.now()}.${file.name.split('.').pop()}`
  const { error: uploadError } = await supabase.storage.from('screenshots').upload(fileName, file, { contentType: file.type })
  if (uploadError) return NextResponse.json({ error: 'Erreur upload' }, { status: 500 })
  const { data: { publicUrl } } = supabase.storage.from('screenshots').getPublicUrl(fileName)
  const { data: result } = await supabase.rpc('valider_mission', { p_mission_id: missionId, p_screenshot_url: publicUrl })
  if (result?.success) {
    await notifier.creditGagné(membre.whatsapp, membre.prenom, result.credits_nouveau_solde)
    const { data: demandeur } = await supabase.from('membres').select('whatsapp, prenom').eq('id', result.demandeur_id).single()
    if (demandeur) await notifier.avisRecu(demandeur.whatsapp, demandeur.prenom)
  }
  return NextResponse.json(result)
}
