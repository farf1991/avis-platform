'use client'
import { useEffect, useState, useCallback } from 'react'
import toast from 'react-hot-toast'

const MOIS_LABELS: Record<string, string> = {
  '01': 'Janvier', '02': 'Février', '03': 'Mars', '04': 'Avril',
  '05': 'Mai', '06': 'Juin', '07': 'Juillet', '08': 'Août',
  '09': 'Septembre', '10': 'Octobre', '11': 'Novembre', '12': 'Décembre'
}

export default function PaiementsPage() {
  const [paiements, setPaiements] = useState<any[]>([])
  const [mois, setMois] = useState('')
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/admin/paiements')
      .then(r => r.json())
      .then(d => { setPaiements(d.paiements || []); setMois(d.mois || ''); setLoading(false) })
  }, [])

  useEffect(() => { load() }, [load])

  const action = async (id: string, act: string) => {
    setActionId(id)
    const res = await fetch(`/api/admin/paiements/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: act })
    })
    const data = await res.json()
    if (data.success) {
      toast.success(act === 'marquer_paye' ? '✅ Paiement enregistré' : '⚠️ Marqué en retard + compte bloqué')
      load()
    } else {
      toast.error(data.error || 'Erreur')
    }
    setActionId(null)
  }

  const [annee, moisNum] = mois.split('-')
  const moisLabel = moisNum ? `${MOIS_LABELS[moisNum]} ${annee}` : ''

  const payes = paiements.filter(p => p.statut === 'paye')
  const enAttente = paiements.filter(p => p.statut === 'en_attente')
  const enRetard = paiements.filter(p => p.statut === 'en_retard')
  const totalEncaisse = payes.length * 399

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Paiements</h1>
          <p className="text-sm text-white/30 mt-1">{moisLabel}</p>
        </div>
        <button onClick={load} className="btn-secondary text-sm">↻ Rafraîchir</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Encaissé', value: `${totalEncaisse} DH`, color: 'text-emerald-400' },
          { label: 'Payés', value: payes.length, color: 'text-emerald-400' },
          { label: 'En attente', value: enAttente.length, color: 'text-amber-400' },
          { label: 'En retard', value: enRetard.length, color: 'text-red-400' },
        ].map(k => (
          <div key={k.label} className="card text-center">
            <div className={`text-2xl font-bold ${k.color}`}>{k.value}</div>
            <div className="text-xs text-white/40 mt-1">{k.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-4 py-3 text-xs text-white/40 font-medium uppercase tracking-wider">Membre</th>
                <th className="text-left px-4 py-3 text-xs text-white/40 font-medium uppercase tracking-wider">Commerce</th>
                <th className="text-center px-4 py-3 text-xs text-white/40 font-medium uppercase tracking-wider">Montant</th>
                <th className="text-center px-4 py-3 text-xs text-white/40 font-medium uppercase tracking-wider">Statut</th>
                <th className="text-center px-4 py-3 text-xs text-white/40 font-medium uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paiements.length === 0 && (
                <tr><td colSpan={5} className="text-center py-10 text-white/30">Aucun paiement ce mois</td></tr>
              )}
              {paiements.map((p: any) => (
                <tr key={p.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-4 py-3.5">
                    <div className="font-medium text-white">{p.membres?.prenom} {p.membres?.nom}</div>
                    <div className="text-xs text-white/30">{p.membres?.whatsapp}</div>
                  </td>
                  <td className="px-4 py-3.5 text-white/50 text-sm">{p.membres?.fiche_google_nom || '—'}</td>
                  <td className="px-4 py-3.5 text-center font-bold text-white">{p.montant} DH</td>
                  <td className="px-4 py-3.5 text-center">
                    {p.statut === 'paye' && <span className="badge-actif">Payé ✓</span>}
                    {p.statut === 'en_attente' && <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">En attente</span>}
                    {p.statut === 'en_retard' && <span className="text-xs px-2 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">En retard</span>}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {p.statut !== 'paye' && (
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => action(p.id, 'marquer_paye')}
                          disabled={actionId === p.id}
                          className="text-xs px-3 py-1.5 rounded-lg bg-emerald-500 text-black font-semibold hover:bg-emerald-400 transition-all disabled:opacity-50"
                        >
                          ✓ Payé
                        </button>
                        {p.statut !== 'en_retard' && (
                          <button
                            onClick={() => action(p.id, 'marquer_retard')}
                            disabled={actionId === p.id}
                            className="text-xs px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-50"
                          >
                            Retard
                          </button>
                        )}
                      </div>
                    )}
                    {p.statut === 'paye' && p.paye_at && (
                      <span className="text-xs text-white/20">
                        {new Date(p.paye_at).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
