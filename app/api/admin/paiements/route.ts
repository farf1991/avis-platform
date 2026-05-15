import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createAdminClient()

  const moisActuel = new Date().toISOString().slice(0, 7)

  // S'assurer que tous les membres actifs ont un enregistrement ce mois
  const { data: membres } = await supabase
    .from('membres')
    .select('id')
    .eq('actif', true)

  if (membres?.length) {
    const toInsert = membres.map(m => ({
      membre_id: m.id,
      mois: moisActuel,
      montant: 399,
      statut: 'en_attente'
    }))
    await supabase.from('paiements').upsert(toInsert, { onConflict: 'membre_id,mois', ignoreDuplicates: true })
  }

  // Récupérer paiements avec infos membres
  const { data } = await supabase
    .from('paiements')
    .select('*, membres(prenom, nom, whatsapp, fiche_google_nom, actif)')
    .eq('mois', moisActuel)
    .order('statut', { ascending: true })

  return NextResponse.json({ paiements: data || [], mois: moisActuel })
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const { membre_id, mois } = await req.json()

  const moisCible = mois || new Date().toISOString().slice(0, 7)

  const { error } = await supabase.from('paiements').upsert({
    membre_id,
    mois: moisCible,
    montant: 399,
    statut: 'en_attente'
  }, { onConflict: 'membre_id,mois' })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true })
}

export const dynamic = 'force-dynamic'
