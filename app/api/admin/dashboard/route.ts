import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { addDays, format } from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createAdminClient()
  const alerteDate = format(addDays(new Date(), 3), 'yyyy-MM-dd')
  const [
    { count: membres_actifs },
    { data: alertes },
    { data: credits_data },
    { count: missions_en_cours },
    { count: demandes_en_attente }
  ] = await Promise.all([
    supabase.from('membres').select('*', { count: 'exact', head: true }).eq('actif', true),
    supabase.from('membres').select('id, nom, prenom, whatsapp, date_fin_abonnement, credits, email')
      .eq('actif', true).lte('date_fin_abonnement', alerteDate).order('date_fin_abonnement'),
    supabase.from('membres').select('credits').eq('actif', true),
    supabase.from('missions').select('*', { count: 'exact', head: true }).eq('statut', 'assignee'),
    supabase.from('demandes').select('*', { count: 'exact', head: true }).eq('statut', 'en_attente')
  ])
  const credits_en_circulation = credits_data?.reduce((sum, m) => sum + (m.credits || 0), 0) ?? 0
  return NextResponse.json({
    membres_actifs: membres_actifs ?? 0,
    alertes_renouvellement: alertes?.length ?? 0,
    alertes_details: alertes ?? [],
    credits_en_circulation,
    missions_en_cours: missions_en_cours ?? 0,
    demandes_en_attente: demandes_en_attente ?? 0
  }, { headers: { 'Cache-Control': 'no-store' } })
}
// cache bust Jeu 23 avr 2026 10:15:07 +01
