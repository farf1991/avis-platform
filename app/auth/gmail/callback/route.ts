import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const phone = req.nextUrl.searchParams.get('state')

  if (!code || !phone) {
    return new NextResponse(errorPage('Paramètres manquants.'), { headers: { 'Content-Type': 'text/html' } })
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID!
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/auth/gmail/callback`

    // Échanger le code contre des tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' })
    })
    const tokens = await tokenRes.json()
    if (!tokens.access_token) throw new Error('Token invalide')

    // Récupérer l'email Google
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    })
    const profile = await profileRes.json()
    if (!profile.email) throw new Error('Email introuvable')

    const supabase = createAdminClient()

    // Trouver le membre par téléphone
    const { data: membre } = await supabase
      .from('membres')
      .select('id, prenom')
      .or(`whatsapp.eq.${phone},whatsapp.eq.+${phone}`)
      .single()

    if (!membre) throw new Error('Membre introuvable')

    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString()

    // Stocker le token Gmail
    await supabase.from('gmail_tokens').upsert({
      membre_id: membre.id,
      gmail_email: profile.email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || '',
      expires_at: expiresAt
    }, { onConflict: 'membre_id' })

    // Mettre à jour la session bot
    await supabase.from('bot_sessions').upsert({
      phone: phone.replace(/[^0-9]/g, ''),
      membre_id: membre.id,
      state: 'idle'
    }, { onConflict: 'phone' })

    return new NextResponse(successPage(membre.prenom, profile.email), { headers: { 'Content-Type': 'text/html' } })
  } catch (err: any) {
    console.error('[Gmail OAuth]', err)
    return new NextResponse(errorPage(err.message || 'Erreur inattendue.'), { headers: { 'Content-Type': 'text/html' } })
  }
}

function successPage(prenom: string, email: string) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Topavis — Compte activé</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a12;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:40px;max-width:380px;width:100%;text-align:center}.icon{font-size:56px;margin-bottom:20px}.title{font-size:22px;font-weight:700;margin-bottom:8px}.sub{color:rgba(255,255,255,0.4);font-size:14px;line-height:1.6}.email{color:#10b981;font-weight:600;margin-top:12px;font-size:13px}</style></head><body><div class="card"><div class="icon">✅</div><div class="title">Compte activé, ${prenom} !</div><div class="sub">Votre Gmail est maintenant connecté à Topavis.<br>Retournez sur WhatsApp pour commencer.</div><div class="email">${email}</div></div></body></html>`
}

function errorPage(msg: string) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Topavis — Erreur</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0a12;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}.card{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:40px;max-width:380px;width:100%;text-align:center}.icon{font-size:56px;margin-bottom:20px}.title{font-size:22px;font-weight:700;margin-bottom:8px}.sub{color:rgba(255,255,255,0.4);font-size:14px;line-height:1.6}</style></head><body><div class="card"><div class="icon">❌</div><div class="title">Une erreur s'est produite</div><div class="sub">${msg}<br><br>Contactez votre gestionnaire.</div></div></body></html>`
}
