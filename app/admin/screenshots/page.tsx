'use client'
import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function ScreenshotsPage() {
  const [screenshots, setScreenshots] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/screenshots')
      .then(r => r.json())
      .then(d => { setScreenshots(d.screenshots || []); setLoading(false) })
  }, [])

  useEffect(() => { load() }, [load])

  const action = async (id: string, act: 'valider' | 'rejeter') => {
    setActionId(id)
    const res = await fetch(`/api/admin/screenshots/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: act })
    })
    const data = await res.json()
    if (data.success) {
      toast.success(act === 'valider' ? '✅ Crédit attribué' : '❌ Screenshot rejeté')
      load()
    } else {
      toast.error(data.error || 'Erreur')
    }
    setActionId(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">
          Screenshots <span className="text-white/30">({screenshots.length})</span>
        </h1>
        <button onClick={load} className="btn-secondary text-sm">↻ Rafraîchir</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
        </div>
      ) : screenshots.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-3xl mb-3">📸</div>
          <div className="text-white/40 text-sm">Aucun screenshot en attente de validation</div>
        </div>
      ) : (
        <div className="space-y-4">
          {screenshots.map((s: any) => {
            const noteur = s.membres
            const mission = s.missions
            const demande = mission?.demandes
            const demandeur = demande?.membres
            const isProcessing = actionId === s.id

            return (
              <div key={s.id} className="card">
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Screenshot image */}
                  <div className="flex-shrink-0">
                    {s.wati_media_url ? (
                      <a href={s.wati_media_url} target="_blank" rel="noopener noreferrer">
                        <img
                          src={s.wati_media_url}
                          alt="Screenshot avis"
                          className="w-48 h-48 object-cover rounded-xl border border-white/[0.08] hover:opacity-80 transition-opacity cursor-zoom-in"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      </a>
                    ) : (
                      <div className="w-48 h-48 rounded-xl border border-white/[0.08] flex items-center justify-center bg-white/[0.03]">
                        <span className="text-white/20 text-sm">Pas d'image</span>
                      </div>
                    )}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                        <div className="text-xs text-white/30 mb-1">Noteur (a donné l'avis)</div>
                        <div className="font-semibold text-white">{noteur?.prenom} {noteur?.nom}</div>
                        <div className="text-xs text-white/40">{noteur?.whatsapp}</div>
                      </div>
                      <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                        <div className="text-xs text-white/30 mb-1">Bénéficiaire (reçoit l'avis)</div>
                        <div className="font-semibold text-white">{demandeur?.prenom} {demandeur?.nom}</div>
                        <div className="text-xs text-emerald-400 truncate">{demandeur?.fiche_google_nom || '—'}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-white/30">
                        Reçu le {format(new Date(s.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}
                      </div>
                      {demande?.fiche_google_url && (
                        <a href={demande.fiche_google_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                          Voir fiche Google →
                        </a>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => action(s.id, 'rejeter')}
                        disabled={isProcessing}
                        className="btn-danger text-sm flex-1"
                      >
                        {isProcessing ? '...' : '❌ Rejeter'}
                      </button>
                      <button
                        onClick={() => action(s.id, 'valider')}
                        disabled={isProcessing}
                        className="btn-primary text-sm flex-1"
                      >
                        {isProcessing ? '...' : '✅ Valider — Créditer'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
