import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { notifier } from '@/lib/whatsapp'
import { createClient } from '@supabase/supabase-js'

async function getMembre(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    
    // Essayer le token Bearer d'abord
    const auth = req.headers.get('authorization') || ''
    const token = auth.replace('Bearer ', '').trim()
    
    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) {
        const { data: membre } = await supabase
          .from('membres')
          .select('*')
          .eq('user_id', user.id)
          .single()
        if (membre) return membre
      }
    }

    // Essayer le cookie Supabase
    const cookies = req.headers.get('cookie') || ''
    const tokenMatch = cookies.match(/sb-[^-]+-auth-token=([^;]+)/)
    if (tokenMatch) {
      try {
        const tokenData = JSON.parse(decodeURIComponent(tokenMatch[1]))
        const accessToken = tokenData[0] || tokenData.access_token
        if (accessToken) {
          const { data: { user } } = await supabase.auth.getUser(accessToken)
          if (user) {
            const { data: membre } = await supabase
              .from('membres')
              .select('*')
              .eq('user_id', user.id)
              .single()
            if (membre) return membre
          }
        }
      } catch {}
    }

    return null
  } catch {
    return null
  }
}

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
