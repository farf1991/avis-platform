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
                className="text-xs text-teal-600 hover:text-teal-800 font-medium">Copier
