import { createAdminClient } from '@/lib/supabase'

const WATI_URL = process.env.WATI_API_URL
const WATI_TOKEN = process.env.WATI_API_TOKEN

// ─── Envoi WhatsApp via WATI ─────────────────────────────────────────────────

async function sendMsg(phone: string, text: string) {
  const clean = phone.replace(/[^0-9]/g, '')
  if (!WATI_URL || !WATI_TOKEN) {
    console.log('[BOT]', clean, '→', text)
    return
  }
  try {
    await fetch(`${WATI_URL}/api/v1/sendSessionMessage/${clean}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${WATI_TOKEN}` },
      body: JSON.stringify({ messageText: text })
    })
  } catch (e) {
    console.error('[BOT send error]', e)
  }
}

const MENU = `Voici ce que je peux faire pour vous :

👉 *avis* → demander un avis pour votre fiche
👉 *solde* → voir vos crédits
👉 *aide* → afficher ce menu`

// ─── Traitement message entrant ──────────────────────────────────────────────

export async function handleMessage(phone: string, text: string, mediaUrl?: string) {
  const supabase = createAdminClient()
  const cleanPhone = phone.replace(/[^0-9]/g, '')

  // Chercher le membre par numéro WhatsApp
  const { data: membre } = await supabase
    .from('membres')
    .select('*')
    .or(`whatsapp.eq.${cleanPhone},whatsapp.eq.+${cleanPhone}`)
    .single()

  if (!membre) {
    await sendMsg(phone, `Bonjour 👋\n\nVotre numéro n'est pas encore enregistré sur Topavis.\nContactez votre gestionnaire pour créer votre compte.`)
    return
  }

  if (!membre.actif) {
    await sendMsg(phone, `⚠️ Votre compte Topavis est suspendu.\nContactez votre gestionnaire pour régulariser votre situation.`)
    return
  }

  // Récupérer ou créer la session bot
  let { data: session } = await supabase
    .from('bot_sessions')
    .select('*')
    .eq('phone', cleanPhone)
    .single()

  if (!session) {
    const { data: newSession } = await supabase
      .from('bot_sessions')
      .insert({ phone: cleanPhone, membre_id: membre.id, state: 'await_gmail' })
      .select()
      .single()
    session = newSession
  }

  // ── État : en attente de Gmail OAuth ────────────────────────────────────────
  if (session.state === 'await_gmail') {
    const { data: token } = await supabase
      .from('gmail_tokens')
      .select('id')
      .eq('membre_id', membre.id)
      .single()

    if (token) {
      await supabase.from('bot_sessions').update({ state: 'idle' }).eq('id', session.id)
      await sendMsg(phone, `✅ Compte activé ! Bienvenue ${membre.prenom} 👋\n\nSolde actuel : ${membre.credits} crédit${membre.credits > 1 ? 's' : ''}\n\n${MENU}`)
    } else {
      const oauthUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/gmail?phone=${cleanPhone}`
      await sendMsg(phone, `Bonjour ${membre.prenom} 👋\n\nPour activer votre compte Topavis, connectez votre Gmail :\n\n🔗 ${oauthUrl}\n\nCette étape vérifie votre identité. Elle ne prend que 30 secondes.`)
    }
    return
  }

  // ── État : mission active (attend screenshot) ────────────────────────────────
  if (session.state === 'mission_active') {
    // Image reçue = screenshot
    if (mediaUrl) {
      const { data: mission } = await supabase
        .from('missions')
        .select('*, demandes(fiche_google_url)')
        .eq('membre_id', membre.id)
        .eq('statut', 'assignee')
        .single()

      if (!mission) {
        await supabase.from('bot_sessions').update({ state: 'idle' }).eq('id', session.id)
        await sendMsg(phone, `Votre mission a expiré. Tapez *aide* pour voir les commandes disponibles.`)
        return
      }

      // Enregistrer le screenshot
      await supabase.from('screenshots').upsert({
        mission_id: mission.id,
        membre_id: membre.id,
        wati_media_url: mediaUrl,
        statut: 'en_attente'
      }, { onConflict: 'mission_id' })

      await sendMsg(phone, `📸 Screenshot reçu ! Il sera vérifié par notre équipe sous peu.\n\nVous recevrez une notification dès validation de votre crédit.`)
      return
    }

    // Texte reçu pendant mission active
    const msg = text.toLowerCase().trim()
    if (msg === 'aide') {
      const { data: mission } = await supabase
        .from('missions')
        .select('*, demandes(fiche_google_url)')
        .eq('membre_id', membre.id)
        .eq('statut', 'assignee')
        .single()
      if (mission) {
        const expire = new Date((mission as any).expire_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        await sendMsg(phone, `📋 Mission en cours :\n\n🔗 ${(mission as any).demandes?.fiche_google_url}\n\n⏱ Expire à ${expire}\n\nPostez votre avis puis envoyez une capture d'écran ici.`)
      }
    } else {
      await sendMsg(phone, `Vous avez une mission en cours !\n\nPostez votre avis sur la fiche assignée et envoyez-moi une capture d'écran pour valider votre crédit.`)
    }
    return
  }

  // ── État : idle (commandes normales) ────────────────────────────────────────
  const msg = text.toLowerCase().trim()

  if (msg === 'solde' || msg === 'crédit' || msg === 'credit' || msg === 'crédits' || msg === 'credits') {
    const { data: demandePendante } = await supabase
      .from('demandes')
      .select('id')
      .eq('membre_id', membre.id)
      .in('statut', ['en_attente', 'assignee'])
      .single()

    await sendMsg(phone,
      `💰 Solde : *${membre.credits} crédit${membre.credits > 1 ? 's' : ''}*\n` +
      `📋 Demande en attente : ${demandePendante ? 'Oui' : 'Non'}\n\n${MENU}`
    )
    return
  }

  if (msg === 'avis' || msg === 'je veux un avis' || msg === 'avis google') {
    if (membre.credits < 1) {
      await sendMsg(phone, `⚠️ Vous n'avez pas de crédit.\n\nUne mission vous sera assignée dès possible pour vous en faire gagner un.\n\nRestez disponible ! 👋`)
      return
    }

    // Vérifier qu'il n'a pas déjà une demande en cours
    const { data: demandeExistante } = await supabase
      .from('demandes')
      .select('id')
      .eq('membre_id', membre.id)
      .in('statut', ['en_attente', 'assignee'])
      .single()

    if (demandeExistante) {
      await sendMsg(phone, `Vous avez déjà une demande en cours.\n\nVous serez notifié dès qu'un avis est déposé sur votre fiche. 👍`)
      return
    }

    // Créer la demande
    const { error } = await supabase.rpc('soumettre_demande', { p_membre_id: membre.id })
    if (error) {
      await sendMsg(phone, `Une erreur s'est produite. Réessayez dans quelques instants.`)
      return
    }

    await sendMsg(phone, `✅ Demande enregistrée ! -1 crédit\n\nVous serez notifié dès qu'un avis est déposé sur votre fiche Google. 👍`)

    // Tenter d'assigner des missions en attente
    await processQueue()
    return
  }

  // Commande inconnue
  await sendMsg(phone, `Je suis le bot Topavis 🤖\n\n${MENU}`)
}

// ─── Assigner les missions en attente ────────────────────────────────────────

export async function processQueue() {
  const supabase = createAdminClient()

  // Expirer les missions dépassées
  await supabase.rpc('expire_missions_retard')

  // Récupérer les demandes en attente (FIFO)
  const { data: demandes } = await supabase
    .from('demandes')
    .select('*')
    .eq('statut', 'en_attente')
    .order('created_at', { ascending: true })

  if (!demandes?.length) return

  for (const demande of demandes) {
    const { data: noteur } = await supabase
      .rpc('get_noteur_for_demande', { p_demande_id: demande.id })
      .single() as { data: any }

    if (!noteur) continue

    // Créer la mission
    const { data: mission } = await supabase
      .rpc('creer_mission', { p_membre_id: noteur.id, p_demande_id: demande.id })
      .single() as { data: any }

    if (!mission) continue

    // Mettre à jour la session bot du noteur
    await supabase
      .from('bot_sessions')
      .update({ state: 'mission_active' })
      .eq('membre_id', noteur.id)

    // Envoyer WhatsApp au noteur
    const expire = new Date((mission as any).expire_at).toLocaleTimeString('fr-FR', {
      hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Casablanca'
    })
    await sendMsg(
      noteur.whatsapp,
      `📋 Nouvelle mission !\n\n` +
      `Rendez-vous sur cette fiche Google et laissez un avis ⭐ :\n\n` +
      `🔗 ${demande.fiche_google_url}\n\n` +
      `⏱ Vous avez jusqu'à *${expire}* (30 min)\n\n` +
      `Envoyez-moi une capture d'écran de votre avis posté pour valider votre crédit.`
    )
  }
}

// ─── Notifier après validation admin ─────────────────────────────────────────

export async function notifierValidation(noteurPhone: string, noteurPrenom: string, credits: number, demandeurPhone: string, demandeurPrenom: string) {
  await sendMsg(noteurPhone, `✅ Crédit validé ${noteurPrenom} !\n\n💰 Solde : ${credits} crédit${credits > 1 ? 's' : ''}`)
  await sendMsg(demandeurPhone, `⭐ Un nouvel avis vient d'être déposé sur votre fiche Google ${demandeurPrenom} !\n\nConsultez votre fiche pour le voir.`)
}

export async function notifierRejet(noteurPhone: string, noteurPrenom: string) {
  await sendMsg(noteurPhone, `❌ Votre screenshot n'a pas été validé ${noteurPrenom}.\n\nContactez votre gestionnaire si vous pensez qu'il s'agit d'une erreur.`)
}
