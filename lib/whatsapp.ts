const WATI_URL = process.env.WATI_API_URL
const WATI_TOKEN = process.env.WATI_API_TOKEN

async function sendWhatsApp(phone: string, message: string) {
  if (!WATI_URL || !WATI_TOKEN) {
    console.log('[WhatsApp DÉSACTIVÉ] →', phone, ':', message)
    return
  }
  const cleanPhone = phone.replace(/[^0-9]/g, '')
  try {
    await fetch(`${WATI_URL}/api/v1/sendSessionMessage/${cleanPhone}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WATI_TOKEN}`
      },
      body: JSON.stringify({ messageText: message })
    })
  } catch (e) {
    console.error('[WhatsApp Error]', e)
  }
}

export const notifier = {
  compteCreé: (phone: string, prenom: string, email: string, mdp: string) =>
    sendWhatsApp(phone,
      `Bonjour ${prenom} 👋\n\nVotre compte a été créé sur la plateforme d'échange d'avis.\n\n🔑 Email : ${email}\n🔑 Mot de passe : ${mdp}\n\n👉 Connectez-vous sur ${process.env.NEXT_PUBLIC_APP_URL}/login`
    ),

  creditGagné: (phone: string, prenom: string, solde: number) =>
    sendWhatsApp(phone,
      `Bonjour ${prenom} ✅\n\nVotre screenshot a été validé. +1 crédit ajouté à votre compte.\n\n💰 Solde actuel : ${solde} crédit${solde > 1 ? 's' : ''}`
    ),

  avisRecu: (phone: string, prenom: string) =>
    sendWhatsApp(phone,
      `Bonjour ${prenom} ⭐\n\nUn nouvel avis vient d'être déposé sur votre fiche Google.\n\nConsultez votre historique sur la plateforme.`
    ),

  missionAssignée: (phone: string, prenom: string, ficheUrl: string, expireAt: string) => {
    const date = new Date(expireAt).toLocaleString('fr-FR', { timeZone: 'Africa/Casablanca' })
    return sendWhatsApp(phone,
      `Bonjour ${prenom} 📋\n\nUne nouvelle fiche vous attend !\n\n🔗 ${ficheUrl}\n\n⏱ Vous avez jusqu'au ${date} pour laisser votre avis et soumettre le screenshot.\n\n👉 Connectez-vous pour valider votre mission.`
    )
  },

  rappelMission: (phone: string, prenom: string) =>
    sendWhatsApp(phone,
      `⚠️ Rappel ${prenom}\n\nVotre mission expire dans 2h !\n\nSoumettez votre screenshot maintenant pour valider votre crédit.\n\n👉 ${process.env.NEXT_PUBLIC_APP_URL}/membre/missions`
    ),

  compteBloqué: (phone: string, prenom: string) =>
    sendWhatsApp(phone,
      `Bonjour ${prenom}\n\nVotre abonnement a expiré. Votre compte a été suspendu.\n\nPour renouveler votre accès, effectuez un virement de 500 DH et contactez-nous.`
    ),

  rappelRenouvellement: (phone: string, prenom: string, dateExpiration: string) => {
    const date = new Date(dateExpiration).toLocaleDateString('fr-FR')
    return sendWhatsApp(phone,
      `Bonjour ${prenom} 🔔\n\nVotre abonnement expire le ${date}.\n\nPour continuer à bénéficier du service, effectuez votre virement de 500 DH en indiquant votre nom en référence.`
    )
  }
}
