'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function NouveauMembrePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [mdpCree, setMdpCree] = useState<string | null>(null)
  const [membreCree, setMembreCree] = useState<any>(null)
  const [form, setForm] = useState({
    nom: '', prenom: '', email: '', whatsapp: '',
    fiche_google_url: '', fiche_google_nom: '', credits_initiaux: 0
  })

  const set = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/admin/membres', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, credits_initiaux: Number(form.credits_initiaux) })
    })
    const data = await res.json()
    if (data.success) {
      setMdpCree(data.mdp_temporaire)
      setMembreCree(data.membre)
    } else {
      toast.error(data.error || 'Erreur lors de la création')
      setLoading(false)
    }
  }

  if (mdpCree && membreCree) {
    return (
      <div className="max-w-xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Compte créé ✅</h1>
        <div className="card border-2 border-teal-200 bg-teal-50 mb-4">
          <div className="text-sm font-semibold text-teal-800 mb-4">Identifiants à communiquer au membre</div>
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-white rounded-lg p-3">
              <div>
                <div className="text-xs text-gray-500">Nom</div>
                <div className="font-medium text-gray-900">{membreCree.prenom} {membreCree.nom}</div>
              </div>
            </div>
            <div className="flex items-center justify-between bg-white rounded-lg p-3">
              <div>
                <div className="text-xs text-gray-500">Email</div>
                <div className="font-medium text-gray-900">{membreCree.email}</div>
              </div>
              <button onClick={() => navigator.clipboard.writeText(membreCree.email)}
                className="text-xs text-teal-600 hover:text-teal-800 font-medium">Copier</button>
            </div>
            <div className="flex items-center justify-between bg-white rounded-lg p-3 border-2 border-teal-300">
              <div>
                <div className="text-xs text-gray-500">Mot de passe temporaire</div>
                <div className="font-bold text-teal-800 text-lg font-mono">{mdpCree}</div>
              </div>
              <button onClick={() => {
                navigator.clipboard.writeText(mdpCree)
                toast.success('Mot de passe copié !')
              }} className="text-xs bg-teal-600 text-white px-3 py-1.5 rounded-lg hover:bg-teal-700">
                Copier
              </button>
            </div>
            <div className="flex items-center justify-between bg-white rounded-lg p-3">
              <div>
                <div className="text-xs text-gray-500">Crédits</div>
                <div className="font-medium text-gray-900">{membreCree.credits}</div>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
            <p className="text-xs text-amber-800">
              <strong>Important :</strong> Note ce mot de passe maintenant. Il ne sera plus affiché. 
              Communique-le au membre par WhatsApp.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => {
            setMdpCree(null)
            setMembreCree(null)
            setLoading(false)
            setForm({ nom: '', prenom: '', email: '', whatsapp: '', fiche_google_url: '', fiche_google_nom: '', credits_initiaux: 0 })
          }} className="btn-secondary flex-1">+ Créer un autre membre</button>
          <Link href="/admin/membres" className="btn-primary flex-1 text-center">Voir tous les membres</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/membres" className="text-gray-400 hover:text-gray-600">← Retour</Link>
        <h1 className="text-2xl font-bold text-gray-900">Nouveau membre</h1>
      </div>
      <div className="card">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Prénom</label>
              <input className="input" value={form.prenom} onChange={set('prenom')} required placeholder="Mohamed" />
            </div>
            <div>
              <label className="label">Nom</label>
              <input className="input" value={form.nom} onChange={set('nom')} required placeholder="Benali" />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email} onChange={set('email')} required placeholder="mohamed@email.com" />
          </div>
          <div>
            <label className="label">Numéro WhatsApp</label>
            <input className="input" value={form.whatsapp} onChange={set('whatsapp')} required placeholder="+212 6XX XXX XXX" />
          </div>
          <div>
            <label className="label">URL Fiche Google My Business</label>
            <input className="input" value={form.fiche_google_url} onChange={set('fiche_google_url')} required placeholder="https://maps.google.com/..." />
          </div>
          <div>
            <label className="label">Nom du commerce (optionnel)</label>
            <input className="input" value={form.fiche_google_nom} onChange={set('fiche_google_nom')} placeholder="Restaurant Al Baraka" />
          </div>
          <div>
            <label className="label">Crédits initiaux</label>
            <input type="number" min="0" max="100" className="input" value={form.credits_initiaux} onChange={set('credits_initiaux')} placeholder="0" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
            {loading ? 'Création en cours...' : 'Créer le compte'}
          </button>
        </form>
      </div>
    </div>
  )
}
