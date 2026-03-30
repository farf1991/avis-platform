'use client'
import { useEffect, useState, useRef } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

type Mission = {
  id: string
  expire_at: string
  demandes: { fiche_google_url: string }
}

export default function DonnerAvisPage() {
  const [mission, setMission] = useState<Mission | null>(null)
  const [hasMission, setHasMission] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

 const getToken = async () => {
    const supabase = createBrowserClient()
    const { data } = await supabase.auth.getSession()
    console.log('Session:', data.session?.access_token?.substring(0, 20))
    return data.session?.access_token || ''
  }

  const loadMission = async () => {
    setLoading(true)
    const token = await getToken()
    const res = await fetch('/api/membre/missions', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    if (data.mission) {
      setMission(data.mission)
      setHasMission(true)
    } else {
      setMission(null)
      setHasMission(false)
    }
    setLoading(false)
  }

  useEffect(() => { loadMission() }, [])

  useEffect(() => {
    if (!mission) return
    const tick = () => {
      const diff = new Date(mission.expire_at).getTime() - Date.now()
      if (diff <= 0) { setTimeLeft('Expirée'); return }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setTimeLeft(`${h}h ${m}min restantes`)
    }
    tick()
    const id = setInterval(tick, 30000)
    return () => clearInterval(id)
  }, [mission])

  const demanderMission = async () => {
    setLoading(true)
    const token = await getToken()
    const res = await fetch('/api/membre/missions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    if (data.success) { loadMission() }
    else { toast.error(data.error || 'Aucune demande disponible pour le moment'); setLoading(false) }
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setScreenshot(f)
    setPreview(URL.createObjectURL(f))
  }

  const soumettre = async () => {
    if (!mission || !screenshot) return
    setSubmitting(true)
    const token = await getToken()
    const form = new FormData()
    form.append('mission_id', mission.id)
    form.append('screenshot', screenshot)
    const res = await fetch('/api/membre/missions', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: form
    })
    const data = await res.json()
    if (data.success) {
      toast.success(`Validé ! Nouveau solde : ${data.credits_nouveau_solde} crédit(s)`)
      setMission(null)
      setHasMission(false)
      setScreenshot(null)
      setPreview(null)
    } else {
      toast.error(data.error || 'Erreur lors de la validation')
    }
    setSubmitting(false)
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Chargement...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Donner un avis</h1>
      <p className="text-gray-500 text-sm mb-6">Laissez un avis sur la fiche proposée et gagnez 1 crédit.</p>

      {!hasMission && (
        <div className="card text-center py-10">
          <div className="text-4xl mb-3">✍️</div>
          <h2 className="font-semibold text-gray-900 mb-2">Prêt à gagner un crédit ?</h2>
          <p className="text-sm text-gray-500 mb-6">Cliquez ci-dessous pour recevoir une fiche Google à noter.</p>
          <button onClick={demanderMission} className="btn-primary px-8">
            Recevoir une fiche à noter
          </button>
        </div>
      )}

      {hasMission && mission && (
        <div className="space-y-4">
          <div className="card border-2 border-teal-200 bg-teal-50">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-xs font-medium text-teal-700 uppercase tracking-wide mb-1">Votre mission</div>
                <div className="font-semibold text-gray-900">Laissez un avis sur cette fiche</div>
              </div>
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 px-2 py-1 rounded-lg font-medium">
                {timeLeft}
              </div>
            </div>
            <a href={mission.demandes.fiche_google_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 p-3 bg-white rounded-lg border border-teal-100 hover:border-teal-300 transition-colors group">
              <span className="text-xl">📍</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-500">Fiche Google</div>
                <div className="text-sm text-teal-700 font-medium truncate group-hover:underline">
                  {mission.demandes.fiche_google_url}
                </div>
              </div>
              <span className="text-gray-400 text-xs">Ouvrir →</span>
            </a>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 text-sm mb-1">Comment faire ?</h3>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>Cliquez sur le lien ci-dessus pour ouvrir la fiche Google</li>
              <li>Laissez un avis honnête avec votre compte Google</li>
              <li>Faites une capture d'écran de votre avis publié</li>
              <li>Soumettez le screenshot ci-dessous</li>
            </ol>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 text-sm mb-3">Soumettre le screenshot</h3>
            {!preview ? (
              <button onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-teal-300 hover:bg-teal-50 transition-all">
                <div className="text-3xl mb-2">📸</div>
                <div className="text-sm font-medium text-gray-700">Cliquer pour sélectionner le screenshot</div>
                <div className="text-xs text-gray-400 mt-1">JPG, PNG — max 5 MB</div>
              </button>
            ) : (
              <div className="space-y-3">
                <img src={preview} alt="Screenshot" className="w-full rounded-lg border border-gray-100 max-h-64 object-contain" />
                <div className="flex gap-2">
                  <button onClick={() => { setScreenshot(null); setPreview(null) }}
                    className="btn-secondary text-sm flex-1">Changer</button>
                  <button onClick={soumettre} disabled={submitting}
                    className="btn-primary text-sm flex-1">
                    {submitting ? 'Validation...' : 'Valider et gagner +1 crédit'}
                  </button>
                </div>
              </div>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          </div>
        </div>
      )}
    </div>
  )
}
