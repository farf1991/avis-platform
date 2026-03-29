'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const links = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/membres', label: 'Membres', icon: '👥' },
  { href: '/admin/membres/nouveau', label: 'Nouveau membre', icon: '➕' },
  { href: '/admin/file', label: "File d'attente", icon: '📋' },
]

export default function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()

  const logout = async () => {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-white border-r border-gray-100 flex flex-col z-10">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xl">⭐</span>
          <span className="font-bold text-gray-900 text-sm">Admin Avis</span>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map(link => {
          const active = pathname === link.href
          return (
            <Link key={link.href} href={link.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active ? 'bg-teal-50 text-teal-800 font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`}>
              <span className="text-base">{link.icon}</span>
              {link.label}
            </Link>
          )
        })}
      </nav>
      <div className="p-3 border-t border-gray-100">
        <button onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 transition-colors">
          <span>🚪</span> Déconnexion
        </button>
      </div>
    </aside>
  )
}
