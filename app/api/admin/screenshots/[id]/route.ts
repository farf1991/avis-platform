import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { notifierValidation, notifierRejet, processQueue } from '@/lib/bot'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createAdminClient()
  const { action, note } = await req.json()

  if (action === 'valider') {
    const { data, error } = await supabase.rpc('valider_screenshot', {
      p_screenshot_id: params.id,
      p_note: note || null
    })

    if (error || !data?.success) {
      return NextResponse.json({ error: data?.error || error?.message }, { status: 400 })
    }

    // Récupérer infos noteur et demandeur pour notifier
    const { data: noteur } = await supabase
      .from('membres')
      .select('whatsapp, prenom')
      .eq('id', data.noteur_id)
      .single()

    const { data: demandeur } = await supabase
      .from('membres')
      .select('whatsapp, prenom')
      .eq('id', data.demandeur_id)
      .single()

    if (noteur && demandeur) {
      await notifierValidation(noteur.whatsapp, noteur.prenom, data.credits_nouveau_solde, demandeur.whatsapp, demandeur.prenom)
    }

    // Mettre à jour la session bot du noteur (retour à idle)
    await supabase.from('bot_sessions').update({ state: 'idle' }).eq('membre_id', data.noteur_id)

    // Relancer la file d'attente
    await processQueue()

    return NextResponse.json({ success: true })
  }

  if (action === 'rejeter') {
    const { data, error } = await supabase.rpc('rejeter_screenshot', {
      p_screenshot_id: params.id,
      p_note: note || null
    })

    if (error || !data?.success) {
      return NextResponse.json({ error: data?.error || error?.message }, { status: 400 })
    }

    const { data: noteur } = await supabase
      .from('membres')
      .select('whatsapp, prenom')
      .eq('id', data.noteur_id)
      .single()

    if (noteur) {
      await notifierRejet(noteur.whatsapp, noteur.prenom)
    }

    // Remettre la session bot à idle
    await supabase.from('bot_sessions').update({ state: 'idle' }).eq('membre_id', data.noteur_id)

    // Relancer la file
    await processQueue()

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
}
