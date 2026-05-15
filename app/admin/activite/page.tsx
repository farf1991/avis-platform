'use client'
import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function ActivitePage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/activite')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
  }, [])

  useEffect(() => { load() }, [load])

  const statutColor: Record<string, string> = {
    assignee: 'text-amber-400',
    completee: 'text-emerald-400',
    expiree: 'text-red-400',
    annulee: 'text-white/30',
    en_attente: 'text-amber-400',
  }
  const statutLabel: Record<string, string> = {
    assignee: 'En cours',
    completee: 'Complétée',
    expiree: 'Expirée',
    annulee: 'Annulée',
    en_attente: 'En attente',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Activité</h1>
        <button onClick={load} className="btn-secondary text-sm">↻ Rafraîchir</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Missions */}
          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-4">
              Missions récentes
              <span className="text-white/30 font-normal ml-2">({data?.missions?.length || 0})</span>
            </h2>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {!data?.missions?.length && <p className="text-xs text-white/30">Aucune mission</p>}
              {data?.missions?.map((m: any) => (
                <div key={m.id} className="flex items-center justify-between text-xs py-2 px-3 rounded-lg border border-white/[0.04] hover:bg-white/[0.02]">
                  <div className="flex items-center gap-3">
                    <span className={`font-medium ${statutColor[m.statut] || 'text-white/50'}`}>
                      {statutLabel[m.statut] || m.statut}
                    </span>
                    <span className="text-white/60">
                      {m.membres?.prenom} {m.membres?.nom}
                    </span>
                    <span className="text-white/20">→</span>
                    <span className="text-white/40 truncate max-w-[200px]">
                      {m.demandes?.membres?.fiche_google_nom || m.demandes?.fiche_google_url}
                    </span>
                  </div>
                  <span className="text-white/20 flex-shrink-0 ml-4">
                    {format(new Date(m.assignee_at), 'dd/MM HH:mm', { locale: fr })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Demandes en file */}
          <div className="card">
            <h2 className="text-sm font-semibold text-white mb-4">
              File d'attente
              <span className="text-white/30 font-normal ml-2">({data?.demandes?.length || 0})</span>
            </h2>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {!data?.demandes?.length && <p className="text-xs text-white/30">File vide</p>}
              {data?.demandes?.map((d: any, i: number) => (
                <div key={d.id} className="flex items-center justify-between text-xs py-2 px-3 rounded-lg border border-white/[0.04]">
                  <div className="flex items-center gap-3">
                    <span className="text-white/20 w-5">#{i + 1}</span>
                    <span className="text-white/60">{d.membres?.prenom} {d.membres?.nom}</span>
                    <span className="text-white/30 truncate max-w-[200px]">{d.membres?.fiche_google_nom || d.fiche_google_url}</span>
                  </div>
                  <span className="text-white/20">
                    {format(new Date(d.created_at), 'dd/MM HH:mm', { locale: fr })}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Alertes missions ratées */}
          {data?.alertes?.length > 0 && (
            <div className="card border-amber-500/20" style={{ background: 'rgba(245,158,11,0.04)' }}>
              <h2 className="text-sm font-semibold text-amber-400 mb-4">
                ⚠️ Membres avec missions ratées
              </h2>
              <div className="space-y-2">
                {data.alertes.map((a: any) => (
                  <div key={a.membre_id} className="flex items-center justify-between text-xs py-2 px-3 rounded-lg border border-amber-500/10">
                    <span className="text-white/70">{a.prenom} {a.nom}</span>
                    <span className="text-amber-400 font-medium">{a.missions_expirees} mission{a.missions_expirees > 1 ? 's' : ''} ratée{a.missions_expirees > 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
