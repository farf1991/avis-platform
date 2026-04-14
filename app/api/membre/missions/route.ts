import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createSSRServerClient } from '@/lib/supabase'
import { notifier } from '@/lib/whatsapp'

async function getMembre(req: NextRequest) {
  try {
    const cookieHeader = req.headers.get('cookie') || ''
    const supabaseSSR = createSSRServerClient(cookieHeader)
    const { data: { user } } = await supabaseSSR.auth.getUser()
    if (!user) return null
    const supabase = createAdminClient()
    const { data: membre } = await supabase.from('membres').select('*').eq('user_id', user.id).single()
    return membre || null
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const membre = await getMembre(req)
  if (!membre) return NextResponse.json({ mission: null })
  const supabase = createAdminClient()
  const { data: mission } = await supabase.from('missions').select('*, demandes(fiche_google_url)').eq('membre_id', membre.id).eq('statut', 'assignee').order('assignee_at', { ascending: false }).limit(1).maybeSingle()
  return NextResponse.json({ mission: mission || null })
}

export async function POST(req: NextRequest) {
  const membre = await getMembre(req)
  if (!membre) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })
  if (!membre.actif) return NextResponse.json({ success: false, error: 'Compte inactif' }, { status: 403 })
  const supabase = createAdminClient()
  const { data } = await supabase.rpc('assigner_mission', { p_membre_id: membre.id })
  if (data?.success) {
    try { await notifier.missionAssignée(membre.whatsapp, membre.prenom, data.fiche_url, data.expire_at) } catch {}
  }
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  const membre = await getMembre(req)
  if (!membre) return NextResponse.json({ success: false, error: 'Non autorisé' }, { status: 401 })
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
    try { await notifier.creditGagné(membre.whatsapp, membre.prenom, result.credits_nouveau_solde) } catch {}
    try {
      const { data: demandeur } = await supabase.from('membres').select('whatsapp, prenom').eq('id', result.demandeur_id).single()
      if (demandeur) await notifier.avisRecu(demandeur.whatsapp, demandeur.prenom)
    } catch {}
  }
  return NextResponse.json(result)
}
