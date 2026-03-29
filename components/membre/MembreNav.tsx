'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function MembreNav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createBrowserClient()
  const [prenom, setPrenom] = useState('')
  const [credits, setCredits] = useState<number | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('membres').select('prenom, credits').eq('user_id', user.id).single()
        .then(({ data }) => { if (data) { setPrenom(data.prenom); setCredits(data.credits) } })
    })
  }, [pathname])

  const links = [
    { href: '/membre', label: 'Accueil', icon: '🏠' },
    { href: '/membre/donner', label: 'Donner un avis', icon: '✍️' },
    { href: '/membre/recevoir', label: 'Recevoir un avis', icon: '⭐' },
    { href: '/membre/historique', label: 'Historique', icon: '📋' },
  ]

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
      <div className="max-w-2xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-1">
            {links.map(l => (
              <Link key={l.href} href={l.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  pathname === l.href ? 'bg-teal-50 text-teal-800' : 'text-gray-500 hover:bg-gray-50'
                }`}>
                <span>{l.icon}</span>
                <span className="hidden sm:inline">{l.label}</span>
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {credits !== null && (
              <div className="bg-teal-50 border border-teal-100 rounded-full px-3 py-1 text-xs font-bold text-teal-800">
                {credits} crédit{credits > 1 ? 's' : ''}
              </div>
            )}
            <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
              className="text-xs text-gray-400 hover:text-gray-600">Sortir</button>
          </div>
        </div>
      </div>
    </header>
  )
}
