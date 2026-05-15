import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createAdminClient()
  const { action, note } = await req.json()

  if (action === 'marquer_paye') {
    const { error } = await supabase
      .from('paiements')
      .update({ statut: 'paye', paye_at: new Date().toISOString(), note: note || null })
      .eq('id', params.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ success: true })
  }

  if (action === 'marquer_retard') {
    const { error } = await supabase
      .from('paiements')
      .update({ statut: 'en_retard' })
      .eq('id', params.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    // Bloquer le membre
    const { data: paiement } = await supabase.from('paiements').select('membre_id').eq('id', params.id).single()
    if (paiement) {
      await supabase.from('membres').update({ actif: false }).eq('id', paiement.membre_id)
    }

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
}
