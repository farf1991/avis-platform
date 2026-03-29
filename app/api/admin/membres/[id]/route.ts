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
      await notifier.compteBloqué(membre.whatsapp, membre.prenom)
      return NextResponse.json({ success: true })

    case 'renouveler':
      const nouvelleFin = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      await supabase.from('membres').update({
        actif: true,
        date_fin_abonnement: nouvelleFin
      }).eq('id', id)
      return NextResponse.json({ success: true })

    case 'crediter':
      if (!montant || montant <= 0) return NextResponse.json({ error: 'Montant invalide' }, { status: 400 })
      const { data } = await supabase.rpc('crediter_membre', { p_membre_id: id, p_montant: montant, p_note: note || null })
      await notifier.creditGagné(membre.whatsapp, membre.prenom, membre.credits + montant)
      return NextResponse.json(data)

    case 'rappel_renouvellement':
      await notifier.rappelRenouvellement(membre.whatsapp, membre.prenom, membre.date_fin_abonnement)
      return NextResponse.json({ success: true })

    default:
      return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createAdminClient()
  const { data: membre } = await supabase.from('membres').select('*').eq('id', params.id).single()
  const { data: historique } = await supabase.from('historique_credits')
    .select('*').eq('membre_id', params.id).order('created_at', { ascending: false }).limit(50)
  const { data: missions } = await supabase.from('missions')
    .select('*, demandes(fiche_google_url)').eq('membre_id', params.id)
    .order('created_at', { ascending: false }).limit(20)
  const { data: demandes } = await supabase.from('demandes')
    .select('*').eq('membre_id', params.id).order('created_at', { ascending: false }).limit(20)

  return NextResponse.json({ membre, historique, missions, demandes })
}
