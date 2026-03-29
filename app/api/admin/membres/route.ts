import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'
import { notifier } from '@/lib/whatsapp'

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const body = await req.json()
  const { nom, prenom, email, whatsapp, fiche_google_url, fiche_google_nom, credits_initiaux = 0 } = body

  // Générer un mot de passe temporaire
  const mdp = Math.random().toString(36).slice(-8) + 'A1!'

  // Créer le compte Auth Supabase
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email, password: mdp, email_confirm: true
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Créer le profil membre
  const { data: membre, error: membreError } = await supabase.from('membres').insert({
    user_id: authData.user.id,
    nom, prenom, email, whatsapp,
    fiche_google_url, fiche_google_nom,
    credits: credits_initiaux,
    date_debut_abonnement: new Date().toISOString().split('T')[0],
    date_fin_abonnement: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  }).select().single()

  if (membreError) {
    await supabase.auth.admin.deleteUser(authData.user.id)
    return NextResponse.json({ error: membreError.message }, { status: 400 })
  }

  // Historique si crédits initiaux
  if (credits_initiaux > 0) {
    await supabase.from('historique_credits').insert({
      membre_id: membre.id, type: 'credit_manuel',
      montant: credits_initiaux, solde_avant: 0, solde_apres: credits_initiaux,
      note: 'Crédits à la création du compte'
    })
  }

  // Notifier par WhatsApp
  await notifier.compteCreé(whatsapp, prenom, email, mdp)

  return NextResponse.json({ success: true, membre, mdp_temporaire: mdp })
}
