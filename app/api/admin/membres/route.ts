import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { notifier } from '@/lib/whatsapp'

export async function POST(req: NextRequest) {
  try {
    const supabase = createAdminClient()
    const body = await req.json()
    const { nom, prenom, email, whatsapp, fiche_google_url, fiche_google_nom, credits_initiaux = 0 } = body

    if (!nom || !prenom || !email || !whatsapp || !fiche_google_url) {
      return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 })
    }

    const mdp = Math.random().toString(36).slice(-8) + 'A1!'

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: mdp,
      email_confirm: true,
      user_metadata: { nom, prenom }
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const today = new Date().toISOString().split('T')[0]
    const fin = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const { data: membre, error: membreError } = await supabase
      .from('membres')
      .insert({
        user_id: authData.user.id,
        nom,
        prenom,
        email,
        whatsapp,
        fiche_google_url,
        fiche_google_nom: fiche_google_nom || null,
        credits: Number(credits_initiaux),
        actif: true,
        date_debut_abonnement: today,
        date_fin_abonnement: fin
      })
      .select()
      .single()

    if (membreError) {
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: membreError.message }, { status: 400 })
    }

    if (Number(credits_initiaux) > 0) {
      await supabase.from('historique_credits').insert({
        membre_id: membre.id,
        type: 'credit_manuel',
        montant: Number(credits_initiaux),
        solde_avant: 0,
        solde_apres: Number(credits_initiaux),
        note: 'Crédits à la création du compte'
      })
    }

    try {
      await notifier.compteCreé(whatsapp, prenom, email, mdp)
    } catch (e) {}

    return NextResponse.json({ success: true, membre, mdp_temporaire: mdp })

  } catch (err: any) {
    console.error('Create membre error:', err)
    return NextResponse.json({ error: err.message || 'Erreur serveur' }, { status: 500 })
  }
}
