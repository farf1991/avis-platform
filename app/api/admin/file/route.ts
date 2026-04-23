import { NextResponse }

export const dynamic = 'force-dynamic' from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createAdminClient()
  const [{ data: demandes }, { data: missions }] = await Promise.all([
    supabase.from('demandes').select('*, membres(nom, prenom)')
      .eq('statut', 'en_attente').order('created_at', { ascending: true }),
    supabase.from('missions').select('*, membres(nom, prenom), demandes(fiche_google_url)')
      .eq('statut', 'assignee').order('expire_at', { ascending: true })
  ])
  return NextResponse.json({
    demandes_en_attente: demandes || [],
    missions_en_cours: missions || []
  })
}
