'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function NouveauMembrePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
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
      toast.success(`Compte créé ! Mot de passe temporaire : ${data.mdp_temporaire}`)
      setTimeout(() => router.push('/admin/membres'), 2000)
    } else {
      toast.error(data.error || 'Erreur lors de la création')
      setLoading(false)
    }
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
            <input type="number" min="0" max="100" className="input" value={form.credits_initiaux}
              onChange={set('credits_initiaux')} placeholder="0" />
            <p className="text-xs text-gray-400 mt-1">Laisser 0 si le membre doit d'abord donner un avis</p>
          </div>

          <div className="pt-2 flex gap-3">
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? 'Création en cours...' : 'Créer le compte'}
            </button>
            <Link href="/admin/membres" className="btn-secondary">Annuler</Link>
          </div>
        </form>
      </div>

      <div className="mt-4 p-4 bg-teal-50 rounded-lg border border-teal-100">
        <p className="text-xs text-teal-800">
          <strong>À la création :</strong> le membre recevra ses identifiants par WhatsApp automatiquement.
          Le mot de passe temporaire lui sera communiqué dans le message.
        </p>
      </div>
    </div>
  )
}
