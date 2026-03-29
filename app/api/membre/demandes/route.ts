import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerClient } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const admin = createAdminClient()
  const { data: membre } = await admin.from('membres').select('id').eq('user_id', user.id).single()
  if (!membre) return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 })

  const { data } = await admin.rpc('soumettre_demande', { p_membre_id: membre.id })
  return NextResponse.json(data)
}

export async function GET(req: NextRequest) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const admin = createAdminClient()
  const { data: membre } = await admin.from('membres').select('id').eq('user_id', user.id).single()

  const { data: demandes } = await admin.from('demandes')
    .select('*').eq('membre_id', membre.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ demandes })
}
