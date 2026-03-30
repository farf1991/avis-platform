'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function MembreFichePage() {
  const { id } = useParams()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [creditMontant, setCreditMontant] = useState('')
  const [creditNote, setCreditNote] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const load = () => {
    fetch(`/api/admin/membres/${id}`).then(r => r.json()).then(d => {
      setData(d); setLoading(false)
    })
  }

  useEffect(() => { load() }, [id])

  const action = async (act: string, extra: any = {}) => {
    setActionLoading(true)
    const res = await fetch(`/api/admin/membres/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: act, ...extra })
    })
    const result = await res.json()
    if (result.success || result.nouveau_solde !== undefined) {
      const msgs: any = {
        activer: 'Compte activé',
        bloquer: 'Compte bloqué',
        renouveler: 'Abonnement renouvelé',
        crediter: `+${extra.montant} crédits ajoutés`,
        rappel_renouvellement: 'Rappel WhatsApp envoyé'
      }
      toast.success(msgs[act] || 'Action effectuée')
      load()
    } else {
      toast.error(result.error || 'Erreur')
    }
    setActionLoading(false)
  }

  if (loading) return <div className="card text-center py-12 text-gray-400">Chargement...</div>
  if (!data?.membre) return <div className="card text-center py-12 text-gray-400">Membre introuvable</div>

  const { membre, historique, stats_membre } = data
  const expireBientot = new Date(membre.date_fin_abonnement) <= new Date(Date.now() + 3 * 86400000)

  const typeLabel: any = {
    gain_avis: '+ Avis donné',
    consommation_demande: "- Demande d'avis",
    credit_manuel: '+ Crédit manuel',
    expiration: '- Expiration'
  }
  const typeColor: any = {
    gain_avis: 'text-teal-700',
    consommation_demande: 'text-red-600',
    credit_manuel: 'text-purple-700',
    expiration: 'text-gray-500'
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/membres" className="text-gray-400 hover:text-gray-600 text-sm">← Membres</Link>
        <h1 className="text-2xl font-bold text-gray-900">{membre.prenom} {membre.nom}</h1>
        {membre.actif ? <span className="badge-actif">Actif</span> : <span className="badge-inactif">Inactif</span>}
      </div>

      <div className="grid grid-cols-5 gap-3 mb-6">
        <div className="card text-center">
          <div className="text-2xl font-bold text-teal-700">{membre.credits}</div>
          <div className="text-xs text-gray-500 mt-1">Crédits</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-900">{stats_membre?.avis_deposes ?? 0}</div>
          <div className="text-xs text-gray-500 mt-1">Avis déposés</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-900">{stats_membre?.avis_recus ?? 0}</div>
          <div className="text-xs text-gray-500 mt-1">Avis reçus</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-gray-900">{stats_membre?.demandes_total ?? 0}</div>
          <div className="text-xs text-gray-500 mt-1">Demandes total</div>
        </div>
        <div className="card text-center">
          <div className={`text-2xl font-bold ${expireBientot ? 'text-amber-600' : 'text-gray-900'}`}>
            {format(new Date(membre.date_fin_abonnement), 'dd MMM', { locale: fr })}
          </div>
          <div className="text-xs text-gray-500 mt-1">Fin abo</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-900 text-sm">Informations</h2>
          {[
            ['Email', membre.email],
            ['WhatsApp', membre.whatsapp],
            ['Commerce', membre.fiche_google_nom || '—'],
            ['Inscrit le', format(new Date(membre.created_at), 'dd MMM yyyy', { locale: fr })],
            ['Taux complétion', `${membre.taux_completion ?? 100}%`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm">
              <span className="text-gray-500">{k}</span>
              <span className="text-gray-900 font-medium truncate ml-2 max-w-[180px]">{v}</span>
            </div>
          ))}
          <div className="text-xs">
            <a href={membre.fiche_google_url} target="_blank" rel="noopener noreferrer"
              className="text-teal-600 hover:underline">Voir fiche Google →</a>
          </div>
        </div>

        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-900 text-sm">Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            {membre.actif
              ? <button onClick={() => action('bloquer')} disabled={actionLoading} className="btn-danger text-xs py-1.5">Bloquer</button>
              : <button onClick={() => action('activer')} disabled={actionLoading} className="btn-primary text-xs py-1.5">Activer</button>
            }
            <button onClick={() => action('renouveler')} disabled={actionLoading} className="btn-secondary text-xs py-1.5">Renouveler +30j</button>
            <button onClick={() => action('rappel_renouvellement')} disabled={actionLoading} className="btn-secondary text-xs py-1.5 col-span-2">📱 Envoyer rappel WhatsApp</button>
          </div>
          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-2">Créditer manuellement</p>
            <div className="flex gap-2">
              <input type="number" min="1" max="100" placeholder="Nb crédits"
                className="input text-sm flex-1" value={creditMontant}
                onChange={e => setCreditMontant(e.target.value)} />
              <button onClick={() => {
                if (!creditMontant || Number(creditMontant) <= 0) return toast.error('Montant invalide')
                action('crediter', { montant: Number(creditMontant), note: creditNote || null })
                setCreditMontant(''); setCreditNote('')
              }} disabled={actionLoading} className="btn-primary text-xs px-3">Créditer</button>
            </div>
            <input type="text" placeholder="Note (optionnel)" className="input text-xs mt-2"
              value={creditNote} onChange={e => setCreditNote(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <h2 className="font-semibold text-gray-900 text-sm mb-3">Historique crédits</h2>
        {!historique?.length ? <p className="text-xs text-gray-400">Aucun mouvement</p> : (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {historique.map((h: any) => (
              <div key={h.id} className="flex items-center justify-between text-xs py-1.5 border-b border-gray-50">
                <div>
                  <span className={`font-medium ${typeColor[h.type]}`}>{typeLabel[h.type]}</span>
                  {h.note && <span className="text-gray-400 ml-2">· {h.note}</span>}
                </div>
                <div className="flex items-center gap-3 text-gray-500">
                  <span>{h.solde_avant} → <strong className="text-gray-800">{h.solde_apres}</strong></span>
                  <span>{format(new Date(h.created_at), 'dd/MM HH:mm')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
