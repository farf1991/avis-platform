'use client'
import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

const statutLabel: any = {
  en_attente: { label: 'En file', color: 'bg-amber-100 text-amber-800' },
  assignee: { label: 'En cours', color: 'bg-blue-100 text-blue-800' },
  completee: { label: 'Reçu ✓', color: 'bg-teal-100 text-teal-800' },
  annulee: { label: 'Annulée', color: 'bg-gray-100 text-gray-500' },
}

export default function RecevoirAvisPage() {
  const [credits, setCredits] = useState<number>(0)
  const [demandes, setDemandes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const supabase = createBrowserClient()

  const getToken = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || ''
  }

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: membre } = await supabase.from('membres').select('credits').eq('user_id', user.id).single()
    setCredits(membre?.credits ?? 0)
    const token = await getToken()
    const res = await fetch('/api/membre/demandes', {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    setDemandes(data.demandes || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const soumettreDemande = async () => {
    if (credits < 1) return toast.error('Solde insuffisant')
    setSubmitting(true)
    const token = await getToken()
    const res = await fetch('/api/membre/demandes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = await res.json()
    if (data.success) {
      toast.success('Demande soumise ! Votre fiche est en file d\'attente.')
      setCredits(data.nouveau_solde)
      load()
    } else {
      toast.error(data.error || 'Erreur')
    }
    setSubmitting(false)
  }

  if (loading) return <div className="text-center py-12 text-gray-400">Chargement...</div>

  const actives = demandes.filter(d => ['en_attente', 'assignee'].includes(d.statut))
  const terminees = demandes.filter(d => ['completee', 'annulee'].includes(d.statut))

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Recevoir un avis</h1>
      <p className="text-gray-500 text-sm mb-6">Chaque demande coûte 1 crédit. Votre fiche entre dans la file d'attente.</p>

      <div className="card mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">Crédits disponibles</div>
            <div className="text-3xl font-bold text-teal-700">{credits}</div>
          </div>
          <button onClick={soumettreDemande} disabled={submitting || credits < 1}
            className="btn-primary px-6">
            {submitting ? 'En cours...' : '+ Demander un avis'}
          </button>
        </div>
        {credits < 1 && (
          <div className="mt-3 p-3 bg-amber-50 rounded-lg text-xs text-amber-800">
            Vous n'avez pas assez de crédits. Donnez d'abord un avis pour en gagner.
          </div>
        )}
      </div>

      {actives.length > 0 && (
        <div className="card mb-4">
          <h2 className="font-semibold text-gray-900 text-sm mb-3">En cours ({actives.length})</h2>
          <div className="space-y-2">
            {actives.map((d: any) => (
              <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="text-xs text-gray-500">Demande du {format(new Date(d.created_at), 'dd MMM yyyy à HH:mm', { locale: fr })}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statutLabel[d.statut].color}`}>
                  {statutLabel[d.statut].label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {terminees.length > 0 && (
        <div className="card">
          <h2 className="font-semibold text-gray-900 text-sm mb-3">Historique</h2>
          <div className="space-y-2">
            {terminees.slice(0, 10).map((d: any) => (
              <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500">{format(new Date(d.created_at), 'dd MMM yyyy', { locale: fr })}</div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${statutLabel[d.statut].color}`}>
                  {statutLabel[d.statut].label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {demandes.length === 0 && (
        <div className="card text-center py-10 text-gray-400">
          <div className="text-3xl mb-2">⭐</div>
          <div className="text-sm">Aucune demande encore. Cliquez sur "Demander un avis" pour commencer.</div>
        </div>
      )}
    </div>
  )
}
