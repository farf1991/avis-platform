import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createAdminClient()

  const { data } = await supabase
    .from('screenshots')
    .select(`
      *,
      membres(prenom, nom, whatsapp, fiche_google_nom),
      missions(
        expire_at, assignee_at,
        demandes(fiche_google_url, membres(prenom, nom, fiche_google_nom))
      )
    `)
    .eq('statut', 'en_attente')
    .order('created_at', { ascending: true })

  return NextResponse.json({ screenshots: data || [] })
}

export const dynamic = 'force-dynamic'
