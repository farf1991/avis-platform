'use client'
import { useEffect, useState, useCallback } from 'react'
import { differenceInDays, format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    fetch(`/api/admin/dashboard?t=${Date.now()}`)
      .then(r => r.json())
      .then(d => { setStats(d); setLoading(false) })
  }, [])

  useEffect(() => { load() }, [load])

  const action = async (id: string, act: string) => {
    const res = await fetch(`/api/admin/membres/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: act })
    })
    const data = await res.json()
    if (data.success || data.success !== false) {
      toast.success(act === 'rappel_renouvellement' ? 'Rappel WhatsApp envoyé' : 'Abonnement renouvelé')
      load()
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Chargement...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <button onClick={load} className="btn-secondary text-sm">↻ Rafraîchir</button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[
          { label: 'Membres actifs', value: stats?.membres_actifs, icon: '👥' },
          { label: 'Alertes renouvellement', value: stats?.alertes_renouvellement, icon: '🔔' },
          { label: 'Crédits en circulation', value: stats?.credits_en_circulation, icon: '💰' },
          { label: 'Missions en cours', value: stats?.missions_en_cours, icon: '📋' },
          { label: "File d'attente", value: stats?.demandes_en_attente, icon: '⏳' },
        ].map(kpi => (
          <div key={kpi.label} className="card text-center">
            <div className="text-2xl mb-1">{kpi.icon}</div>
            <div className="text-3xl font-bold text-gray-900">{kpi.value ?? 0}</div>
            <div className="text-xs text-gray-500 mt-1">{kpi.label}</div>
          </div>
        ))}
      </div>

      {stats?.alertes_details && stats.alertes_details.length > 0 && (
        <div className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            🔔 Renouvellements à traiter ({stats.alertes_details.length})
          </h2>
          <div className="space-y-3">
            {stats.alertes_details.map((m: any) => {
              const jours = differenceInDays(new Date(m.date_fin_abonnement), new Date())
              return (
                <div key={m.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                  <div>
                    <div className="font-medium text-gray-900 text-sm">{m.prenom} {m.nom}</div>
                    <div className="text-xs text-gray-500">{m.whatsapp} · {m.credits} crédits</div>
                    <div className={`text-xs font-medium mt-0.5 ${jours <= 0 ? 'text-red-600' : 'text-amber-700'}`}>
                      {jours <= 0 ? 'Expiré !' : `Expire dans ${jours} jour${jours > 1 ? 's' : ''}`}
                      {' · '}{format(new Date(m.date_fin_abonnement), 'dd MMM yyyy', { locale: fr })}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => action(m.id, 'rappel_renouvellement')}
                      className="text-xs px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors">
                      📱 Rappel
                    </button>
                    <button onClick={() => action(m.id, 'renouveler')}
                      className="text-xs px-3 py-1.5 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors">
                      ✓ Renouvelé
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {(!stats?.alertes_details || stats.alertes_details.length === 0) && (
        <div className="card text-center py-8 text-gray-400">
          <div className="text-3xl mb-2">✅</div>
          <div className="text-sm">Aucun renouvellement urgent dans les 3 prochains jours</div>
        </div>
      )}
    </div>
  )
}
