'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function MembreHome() {
  const [membre, setMembre] = useState<any>(null)
  const [avisRecus, setAvisRecus] = useState<any[]>([])
  const supabase = createBrowserClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('membres').select('*').eq('user_id', user.id).single()
        .then(({ data }) => {
          setMembre(data)
          if (data) {
            supabase.from('historique_credits')
              .select('*')
              .eq('membre_id', data.id)
              .eq('type', 'avis_recu')
              .order('created_at', { ascending: false })
              .limit(5)
              .then(({ data: avis }) => setAvisRecus(avis || []))
          }
        })
    })
  }, [])

  if (!membre) return <div className="text-center py-12 text-gray-400">Chargement...</div>

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bonjour {membre.prenom} 👋</h1>
        <p className="text-gray-500 text-sm mt-1">{membre.fiche_google_nom || membre.fiche_google_url}</p>
      </div>

      {avisRecus.length > 0 && (
        <div className="mb-6 space-y-2">
          {avisRecus.map((avis: any) => (
            <div key={avis.id} className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
              <span className="text-2xl">🌟</span>
              <div>
                <div className="font-semibold text-green-800 text-sm">Votre demande d'avis a été traitée !</div>
                <div className="text-xs text-green-600 mt-0.5">
                  {format(new Date(avis.created_at), "dd MMM yyyy 'à' HH:mm", { locale: fr })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-gradient-to-r from-teal-600 to-teal-500 rounded-2xl p-6 text-white mb-6">
        <div className="text-sm opacity-80 mb-1">Votre solde</div>
        <div className="text-5xl font-bold">{membre.credits}</div>
        <div className="text-sm opacity-80 mt-1">crédit{membre.credits > 1 ? 's' : ''} disponible{membre.credits > 1 ? 's' : ''}</div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Link href="/membre/donner" className="card hover:border-teal-200 hover:bg-teal-50 transition-all cursor-pointer text-center group">
          <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">✍️</div>
          <div className="font-semibold text-gray-900 text-sm">Donner un avis</div>
          <div className="text-xs text-gray-500 mt-1">Gagner +1 crédit</div>
        </Link>
        <Link href="/membre/recevoir" className={`card text-center group transition-all cursor-pointer ${membre.credits > 0 ? 'hover:border-purple-200 hover:bg-purple-50' : 'opacity-60 cursor-not-allowed'}`}>
          <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">⭐</div>
          <div className="font-semibold text-gray-900 text-sm">Recevoir un avis</div>
          <div className="text-xs text-gray-500 mt-1">{membre.credits > 0 ? `Utiliser 1 crédit` : 'Pas assez de crédits'}</div>
        </Link>
      </div>

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
