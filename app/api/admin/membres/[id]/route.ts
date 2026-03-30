import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { notifier } from '@/lib/whatsapp'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createAdminClient()
  const { action, montant, note } = await req.json()
  const id = params.id

  const { data: membre } = await supabase.from('membres').select('*').eq('id', id).single()
  if (!membre) return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 })

  switch (action) {
    case 'activer':
      await supabase.from('membres').update({ actif: true }).eq('id', id)
      return NextResponse.json({ success: true })

    case 'bloquer':
      await supabase.from('membres').update({ actif: false }).eq('id', id)
      try { await notifier.compteBloqué(membre.whatsapp, membre.prenom) } catch {}
      return NextResponse.json({ success: true })

    case 'renouveler':
      const nouvelleFin = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      await supabase.from('membres').update({ actif: true, date_fin_abonnement: nouvelleFin }).eq('id', id)
      return NextResponse.json({ success: true })

    case 'crediter':
      if (!montant || montant <= 0) return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
      const { data } = await supabase.rpc('crediter_membre', { p_membre_id: id, p_montant: montant, p_note: note || null })
      try { await notifier.creditGagné(membre.whatsapp, membre.prenom, membre.credits + montant) } catch {}
      return NextResponse.json(data)

    case 'rappel_renouvellement':
      try { await notifier.rappelRenouvellement(membre.whatsapp, membre.prenom, membre.date_fin_abonnement) } catch {}
      return NextResponse.json({ success: true })

    default:
      return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createAdminClient()

  const [
    { data: membre },
    { data: historique },
    { count: avis_deposes },
    { count: avis_recus },
    { count: demandes_total }
  ] = await Promise.all([
    supabase.from('membres').select('*').eq('id', params.id).single(),
    supabase.from('historique_credits').select('*').eq('membre_id', params.id).order('created_at', { ascending: false }).limit(50),
    supabase.from('missions').select('*', { count: 'exact', head: true }).eq('membre_id', params.id).eq('statut', 'completee'),
    supabase.from('demandes').select('*', { count: 'exact', head: true }).eq('membre_id', params.id).eq('statut', 'completee'),
    supabase.from('demandes').select('*', { count: 'exact', head: true }).eq('membre_id', params.id)
  ])

  return NextResponse.json({
    membre,
    historique,
    stats_membre: {
      avis_deposes: avis_deposes ?? 0,
      avis_recus: avis_recus ?? 0,
      demandes_total: demandes_total ?? 0
    }
  })
}
