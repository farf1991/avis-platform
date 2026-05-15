'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const links = [
  { href: '/admin', label: 'Dashboard', icon: '◈' },
  { href: '/admin/screenshots', label: 'Screenshots', icon: '📸' },
  { href: '/admin/paiements', label: 'Paiements', icon: '💰' },
  { href: '/admin/activite', label: 'Activité', icon: '◫' },
  { href: '/admin/membres', label: 'Membres', icon: '◉' },
  { href: '/admin/membres/nouveau', label: 'Nouveau membre', icon: '◎' },
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
    <aside className="fixed left-0 top-0 h-full w-56 flex flex-col z-10 border-r border-white/[0.06]"
      style={{ background: 'rgba(10,10,18,0.95)', backdropFilter: 'blur(12px)' }}>
      <div className="p-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>⭐</div>
          <span className="font-bold text-white text-sm">Top Avis Admin</span>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {links.map(link => {
          const active = pathname === link.href
          return (
            <Link key={link.href} href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                active
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
              }`}>
              <span className="text-base">{link.icon}</span>
              {link.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-white/[0.06]">
        <button onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all">
          <span>⎋</span> Déconnexion
        </button>
      </div>
    </aside>
  )
}
