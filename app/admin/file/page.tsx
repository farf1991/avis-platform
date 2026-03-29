'use client'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function FileAttentePage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/file').then(r => r.json()).then(d => { setData(d); setLoading(false) })
  }, [])

  if (loading) return <div className="text-center py-12 text-gray-400">Chargement...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">File d'attente</h1>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card text-center">
          <div className="text-3xl font-bold text-amber-600">{data?.demandes_en_attente?.length ?? 0}</div>
          <div className="text-xs text-gray-500 mt-1">Demandes en attente</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl font-bold text-blue-600">{data?.missions_en_cours?.length ?? 0}</div>
          <div className="text-xs text-gray-500 mt-1">Missions assignées</div>
        </div>
      </div>

      <div className="card mb-4">
        <h2 className="font-semibold text-gray-900 text-sm mb-3">Demandes en attente (FIFO)</h2>
        {!data?.demandes_en_attente?.length
          ? <p className="text-xs text-gray-400 text-center py-4">File vide</p>
          : <div className="space-y-2">
            {data.demandes_en_attente.map((d: any, i: number) => (
              <div key={d.id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-lg">
                <div className="w-7 h-7 rounded-full bg-amber-200 text-amber-800 text-xs font-bold flex items-center justify-center flex-shrink-0">#{i + 1}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">{d.membres?.prenom} {d.membres?.nom}</div>
                  <div className="text-xs text-gray-400 truncate">{d.fiche_google_url}</div>
                </div>
                <div className="text-xs text-gray-500 flex-shrink-0">{format(new Date(d.created_at), 'dd/MM HH:mm')}</div>
              </div>
            ))}
          </div>
        }
      </div>

      <div className="card">
        <h2 className="font-semibold text-gray-900 text-sm mb-3">Missions en cours</h2>
        {!data?.missions_en_cours?.length
          ? <p className="text-xs text-gray-400 text-center py-4">Aucune mission en cours</p>
          : <div className="space-y-2">
            {data.missions_en_cours.map((m: any) => {
              const expire = new Date(m.expire_at)
              const expired = expire < new Date()
              return (
                <div key={m.id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">{m.membres?.prenom} {m.membres?.nom}</div>
                    <div className="text-xs text-gray-400 truncate">{m.demandes?.fiche_google_url}</div>
                  </div>
                  <div className={`text-xs font-medium flex-shrink-0 ${expired ? 'text-red-600' : 'text-blue-700'}`}>
                    {expired ? 'Expirée' : `Expire ${format(expire, 'HH:mm')}`}
                  </div>
                </div>
              )
            })}
          </div>
        }
      </div>
    </div>
  )
}
