'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function MembresPage() {
  const [membres, setMembres] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtre, setFiltre] = useState<'tous' | 'actifs' | 'inactifs'>('tous')

  const load = () => {
    fetch('/api/admin/membres/liste').then(r => r.json()).then(d => {
      setMembres(d.membres || [])
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  const filtered = membres.filter(m => {
    const matchSearch = `${m.nom} ${m.prenom} ${m.email}`.toLowerCase().includes(search.toLowerCase())
    const matchFiltre = filtre === 'tous' || (filtre === 'actifs' ? m.actif : !m.actif)
    return matchSearch && matchFiltre
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Membres</h1>
        <Link href="/admin/membres/nouveau" className="btn-primary text-sm">+ Nouveau membre</Link>
      </div>

      <div className="card mb-4">
        <div className="flex gap-3 flex-wrap">
          <input type="text" placeholder="Rechercher..." className="input max-w-xs"
            value={search} onChange={e => setSearch(e.target.value)} />
          <div className="flex gap-1">
            {(['tous', 'actifs', 'inactifs'] as const).map(f => (
              <button key={f} onClick={() => setFiltre(f)}
                className={`px-3 py-2 rounded-lg text-sm capitalize transition-colors ${
                  filtre === f ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>{f}</button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="card text-center py-12 text-gray-400">Chargement...</div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Membre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">WhatsApp</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Crédits</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Fin abo</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Statut</th>
                <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">Aucun membre trouvé</td></tr>
              )}
              {filtered.map((m, i) => {
                const expireBientot = new Date(m.date_fin_abonnement) <= new Date(Date.now() + 3 * 86400000)
                return (
                  <tr key={m.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{m.prenom} {m.nom}</div>
                      <div className="text-xs text-gray-400">{m.email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{m.whatsapp}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-teal-700">{m.credits}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={expireBientot && m.actif ? 'text-amber-600 font-medium' : 'text-gray-600'}>
                        {format(new Date(m.date_fin_abonnement), 'dd MMM yyyy', { locale: fr })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {m.actif
                        ? <span className="badge-actif">Actif</span>
                        : <span className="badge-inactif">Inactif</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link href={`/admin/membres/${m.id}`}
                        className="text-teal-600 hover:text-teal-800 font-medium text-xs">
                        Gérer →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
