import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

async function getMembreFromRequest(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return null
  const token = authHeader.replace('Bearer ', '')
  const supabase = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return null
  const { data: membre } = await supabase.from('membres').select('id').eq('user_id', user.id).single()
  return membre
}

export async function POST(req: NextRequest) {
  const membre = await getMembreFromRequest(req)
  if (!membre) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const supabase = createAdminClient()
  const { data } = await supabase.rpc('soumettre_demande', { p_membre_id: membre.id })
  return NextResponse.json(data)
}

export async function GET(req: NextRequest) {
  const membre = await getMembreFromRequest(req)
  if (!membre) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const supabase = createAdminClient()
  const { data: demandes } = await supabase.from('demandes').select('*').eq('membre_id', membre.id).order('created_at', { ascending: false })
  return NextResponse.json({ demandes })
}
