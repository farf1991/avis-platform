'use client'
import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

type DashboardData = {
  membre: any
  mission: any | null
  demande: any | null
  screenshot_en_attente: boolean
}

const supabase = createBrowserClient()

export default function MembrePage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || ''
  }

  const load = async () => {
    const token = await getToken()
    if (!token) { router.push('/login'); return }
    const res = await fetch('/api/membre/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (!res.ok) { router.push('/login'); return }
    setData(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!data?.mission) return
    const tick = () => {
      const diff = new Date(data.mission.expire_at).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('00:00'); setIsUrgent(true); load(); return }
      const m = Math.floor(diff / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
      setIsUrgent(diff < 5 * 60 * 1000)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [data?.mission?.id])

  const donnerAvis = async () => {
    setActionLoading(true)
    const token = await getToken()
    const res = await fetch('/api/membre/missions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    const json = await res.json()
    if (json.success) {
      await load()
    } else {
      toast.error(json.error || 'Aucune fiche disponible pour le moment')
    }
    setActionLoading(false)
  }

  const recevoirAvis = async () => {
    setActionLoading(true)
    const token = await getToken()
    const res = await fetch('/api/membre/demandes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    const json = await res.json()
    if (json?.error) {
      toast.error(json.error)
    } else {
      toast.success('Demande envoyée ! Un avis sera déposé sur votre fiche.')
      await load()
    }
    setActionLoading(false)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setScreenshot(f)
    setPreview(URL.createObjectURL(f))
  }

  const soumettre = async () => {
    if (!data?.mission || !screenshot) return
    setUploading(true)
    const token = await getToken()
    const form = new FormData()
    form.append('mission_id', data.mission.id)
    form.append('screenshot', screenshot)
    const res = await fetch('/api/membre/missions', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: form
    })
    const json = await res.json()
    if (json.success) {
      toast.success('Screenshot envoyé ! Validation en cours...')
      setScreenshot(null)
      setPreview(null)
      await load()
    } else {
      toast.error(json.error || 'Erreur lors de l\'envoi')
    }
    setUploading(false)
  }

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-dvh bg-[#0a0a12]">
      <div className="w-10 h-10 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
    </div>
  )

  const { membre, mission, demande, screenshot_en_attente } = data!
  const ficheUrl = mission?.demandes?.fiche_google_url

  return (
    <div className="min-h-dvh flex flex-col max-w-md mx-auto select-none">

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-5">
        <div>
          <div className="text-[10px] font-bold text-white/25 uppercase tracking-[0.2em]">Topavis</div>
          <div className="text-xl font-semibold text-white mt-0.5">Bonjour, {membre.prenom} 👋</div>
        </div>
        <button
          onClick={logout}
          className="w-10 h-10 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center text-white/30 active:text-white/60 active:bg-white/[0.1] transition-colors"
          aria-label="Déconnexion"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 px-5 pb-10 space-y-4">

        {/* ── MISSION ACTIVE ───────────────────────────────────── */}
        {mission && (
          <>
            {/* Countdown */}
            <div className={`rounded-3xl p-7 text-center transition-colors ${
              isUrgent
                ? 'bg-red-500/10 border border-red-500/30'
                : 'bg-emerald-500/8 border border-emerald-500/20'
            }`}>
              <div className={`text-[11px] font-bold uppercase tracking-[0.15em] mb-3 ${isUrgent ? 'text-red-400' : 'text-emerald-400/70'}`}>
                {isUrgent ? '⚠️ Dépêchez-vous !' : '✅ Mission en cours'}
              </div>
              <div className={`text-[5.5rem] font-black tabular-nums leading-none tracking-tight ${isUrgent ? 'text-red-400' : 'text-white'}`}>
                {timeLeft}
              </div>
              <div className="text-xs text-white/25 mt-3">minutes : secondes</div>
            </div>

            {/* Open Google button */}
            <a
              href={ficheUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full py-5 rounded-2xl font-bold text-lg text-white transition-colors"
              style={{ background: 'linear-gradient(135deg, #1a73e8 0%, #0f4fa8 100%)' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.383 0 0 5.383 0 12s5.383 12 12 12 12-5.383 12-12S18.617 0 12 0zm0 2.118c2.7 0 5.157 1.04 7.01 2.73L16.12 7.74A7.872 7.872 0 0012 6.353 7.872 7.872 0 004.353 12H2.118A9.882 9.882 0 0112 2.118zM4.353 12a7.872 7.872 0 007.647 7.882v2.235A9.882 9.882 0 012.118 12h2.235zm7.647 7.882A7.872 7.872 0 0019.647 12h2.235A9.882 9.882 0 0112 21.882v-2.235z" />
              </svg>
              <span>Ouvrir sur Google</span>
              <span className="opacity-60">↗</span>
            </a>

            {/* Steps */}
            <div className="rounded-2xl p-5 bg-white/[0.03] border border-white/[0.06]">
              <div className="text-xs text-white/30 font-semibold uppercase tracking-wider mb-4">Étapes</div>
              <div className="space-y-3">
                {[
                  'Ouvrir la fiche Google ci-dessus',
                  'Laisser un avis 4-5 étoiles',
                  'Faire un screenshot de votre avis',
                  'Envoyer le screenshot ici bas'
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-white/[0.07] flex items-center justify-center text-xs text-white/40 font-bold flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="text-sm text-white/55">{step}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Screenshot upload */}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />

            {!preview ? (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full py-8 rounded-2xl border-2 border-dashed border-white/[0.1] flex flex-col items-center gap-3 active:bg-white/[0.03] transition-colors"
              >
                <div className="text-5xl">📸</div>
                <div className="text-base font-semibold text-white/50">Envoyer le screenshot</div>
                <div className="text-xs text-white/25">Appuyer pour ouvrir la caméra</div>
              </button>
            ) : (
              <div className="space-y-3">
                <img
                  src={preview}
                  alt="Screenshot"
                  className="w-full rounded-2xl border border-white/[0.08] max-h-80 object-contain bg-black/30"
                />
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { setScreenshot(null); setPreview(null) }}
                    className="py-4 rounded-2xl bg-white/[0.06] border border-white/[0.1] text-white/70 font-semibold active:bg-white/[0.1] transition-colors"
                  >
                    Changer
                  </button>
                  <button
                    onClick={soumettre}
                    disabled={uploading}
                    className="py-4 rounded-2xl bg-emerald-500 text-black font-bold active:bg-emerald-600 disabled:opacity-40 transition-colors"
                  >
                    {uploading ? 'Envoi...' : 'Valider ✓'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── PAS DE MISSION ───────────────────────────────────── */}
        {!mission && (
          <>
            {/* Credits */}
            <div
              className="rounded-3xl p-8 text-center relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #064e3b 0%, #0c4a6e 100%)' }}
            >
              <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 75% 15%, rgba(255,255,255,0.07) 0%, transparent 55%)' }} />
              <div className="relative">
                <div className="text-sm text-white/50 mb-1">Vos crédits</div>
                <div className="text-9xl font-black text-white leading-none tracking-tight">{membre.credits}</div>
                <div className="text-sm text-white/40 mt-2">
                  crédit{membre.credits !== 1 ? 's' : ''} disponible{membre.credits !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            {/* Status badges */}
            {screenshot_en_attente && (
              <div className="flex items-center gap-3 rounded-2xl p-4 bg-amber-500/8 border border-amber-500/20">
                <div className="text-2xl">⏳</div>
                <div>
                  <div className="text-sm font-semibold text-amber-400">Screenshot en validation</div>
                  <div className="text-xs text-amber-400/50 mt-0.5">Notre équipe vérifie votre avis</div>
                </div>
              </div>
            )}

            {demande && (
              <div className="flex items-center gap-3 rounded-2xl p-4 bg-blue-500/8 border border-blue-500/20">
                <div className="text-2xl">⭐</div>
                <div>
                  <div className="text-sm font-semibold text-blue-400">Avis en attente</div>
                  <div className="text-xs text-blue-400/50 mt-0.5">Un avis va arriver sur votre fiche</div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-3 pt-1">
              <button
                onClick={donnerAvis}
                disabled={actionLoading}
                className="w-full rounded-2xl bg-emerald-500 active:bg-emerald-600 disabled:opacity-40 transition-colors"
              >
                <div className="flex items-center gap-4 p-5">
                  <div className="w-12 h-12 rounded-xl bg-black/20 flex items-center justify-center text-2xl flex-shrink-0">✍️</div>
                  <div className="text-left">
                    <div className="text-base font-bold text-black">Donner un avis</div>
                    <div className="text-sm text-black/60 font-medium">Gagnez +1 crédit</div>
                  </div>
                  <div className="ml-auto text-black/40 text-xl">›</div>
                </div>
              </button>

              {membre.credits > 0 && !demande ? (
                <button
                  onClick={recevoirAvis}
                  disabled={actionLoading}
                  className="w-full rounded-2xl bg-white/[0.05] border border-white/[0.1] active:bg-white/[0.09] disabled:opacity-40 transition-colors"
                >
                  <div className="flex items-center gap-4 p-5">
                    <div className="w-12 h-12 rounded-xl bg-white/[0.07] flex items-center justify-center text-2xl flex-shrink-0">⭐</div>
                    <div className="text-left">
                      <div className="text-base font-bold text-white">Recevoir un avis</div>
                      <div className="text-sm text-white/40 font-medium">Utilise 1 crédit</div>
                    </div>
                    <div className="ml-auto text-white/20 text-xl">›</div>
                  </div>
                </button>
              ) : membre.credits === 0 && !demande ? (
                <div className="rounded-2xl p-5 bg-white/[0.02] border border-white/[0.06] text-center">
                  <div className="text-sm text-white/25 leading-relaxed">
                    Donnez un avis pour gagner des crédits,<br />puis demandez un avis sur votre fiche.
                  </div>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
