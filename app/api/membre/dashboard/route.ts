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

export async function GET(req: NextRequest) {
  const membre = await getMembre(req)
  if (!membre) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const supabase = createAdminClient()

  await supabase.rpc('expire_missions_retard')

  const [{ data: mission }, { data: demande }, { data: screenshot }] = await Promise.all([
    supabase.from('missions')
      .select('*, demandes(fiche_google_url, membres(fiche_google_nom))')
      .eq('membre_id', membre.id)
      .eq('statut', 'assignee')
      .order('assignee_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase.from('demandes')
      .select('id, statut, created_at')
      .eq('membre_id', membre.id)
      .in('statut', ['en_attente', 'assignee'])
      .maybeSingle(),

    supabase.from('screenshots')
      .select('id, statut, created_at')
      .eq('membre_id', membre.id)
      .eq('statut', 'en_attente')
      .maybeSingle()
  ])

  return NextResponse.json({ membre, mission, demande, screenshot_en_attente: !!screenshot })
}

export const dynamic = 'force-dynamic'
