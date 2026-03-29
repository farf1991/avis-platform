'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function HistoriquePage() {
  const [historique, setHistorique] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createBrowserClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('membres').select('id').eq('user_id', user.id).single().then(({ data: membre }) => {
        if (!membre) return
        supabase.from('historique_credits').select('*')
          .eq('membre_id', membre.id).order('created_at', { ascending: false }).limit(50)
          .then(({ data }) => { setHistorique(data || []); setLoading(false) })
      })
    })
  }, [])

  const typeInfo: any = {
    gain_avis: { label: 'Avis donné', icon: '✍️', color: 'text-teal-700', bg: 'bg-teal-50' },
    consommation_demande: { label: 'Demande d\'avis', icon: '⭐', color: 'text-purple-700', bg: 'bg-purple-50' },
    credit_manuel: { label: 'Crédit offert', icon: '🎁', color: 'text-blue-700', bg: 'bg-blue-50' },
    expiration: { label: 'Expiration', icon: '⏱', color: 'text-gray-500', bg: 'bg-gray-50' },
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Chargement...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Historique</h1>
      {historique.length === 0 ? (
        <div className="card text-center py-10 text-gray-400">
          <div className="text-3xl mb-2">📋</div>
          <div className="text-sm">Aucune activité pour le moment.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {historique.map((h: any) => {
            const info = typeInfo[h.type] || { label: h.type, icon: '•', color: 'text-gray-600', bg: 'bg-gray-50' }
            return (
              <div key={h.id} className={`card flex items-center justify-between py-3 px-4 ${info.bg}`}>
                <div className="flex items-center gap-3">
                  <span className="text-xl">{info.icon}</span>
                  <div>
                    <div className={`text-sm font-medium ${info.color}`}>{info.label}</div>
                    {h.note && <div className="text-xs text-gray-400">{h.note}</div>}
                    <div className="text-xs text-gray-400">{format(new Date(h.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${h.montant > 0 ? 'text-teal-700' : 'text-red-600'}`}>
                    {h.montant > 0 ? `+${h.montant}` : h.montant}
                  </div>
                  <div className="text-xs text-gray-400">→ {h.solde_apres} crédit{h.solde_apres > 1 ? 's' : ''}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
