'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import Link from 'next/link'

export default function MembreHome() {
  const [membre, setMembre] = useState<any>(null)
  const supabase = createBrowserClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('membres').select('*').eq('user_id', user.id).single()
        .then(({ data }) => setMembre(data))
    })
  }, [])

  if (!membre) return <div className="text-center py-12 text-gray-400">Chargement...</div>

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bonjour {membre.prenom} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">{membre.fiche_google_nom || membre.fiche_google_url}</p>
      </div>

      {/* Solde crédit */}
      <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-2xl p-6 text-white mb-6">
        <div className="text-sm opacity-80 mb-1">Votre solde</div>
        <div className="text-5xl font-bold">{membre.credits}</div>
        <div className="text-sm opacity-80 mt-1">crédit{membre.credits > 1 ? 's' : ''} disponible{membre.credits > 1 ? 's' : ''}</div>
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Link href="/membre/donner"
          className="card hover:border-teal-200 hover:bg-teal-50 transition-all cursor-pointer text-center group">
          <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">✍️</div>
          <div className="font-semibold text-gray-900 text-sm">Donner un avis</div>
          <div className="text-xs text-gray-500 mt-1">Gagner +1 crédit</div>
        </Link>
        <Link href="/membre/recevoir"
          className={`card text-center group transition-all cursor-pointer ${
            membre.credits > 0
              ? 'hover:border-purple-200 hover:bg-purple-50'
              : 'opacity-60 cursor-not-allowed'
          }`}>
          <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">⭐</div>
          <div className="font-semibold text-gray-900 text-sm">Recevoir un avis</div>
          <div className="text-xs text-gray-500 mt-1">
            {membre.credits > 0 ? `Utiliser 1 crédit` : 'Pas assez de crédits'}
          </div>
        </Link>
      </div>

      {/* Stats */}
      <div className="card">
        <h2 className="font-semibold text-gray-900 text-sm mb-3">Mes statistiques</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{membre.missions_completees || 0}</div>
            <div className="text-xs text-gray-500">Avis donnés</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{membre.taux_completion ?? 100}%</div>
            <div className="text-xs text-gray-500">Taux complétion</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">{membre.credits}</div>
            <div className="text-xs text-gray-500">Crédits restants</div>
          </div>
        </div>
      </div>
    </div>
  )
}
