'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'

const supabase = createBrowserClient()

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }
      const res = await fetch('/api/auth/role', {
        headers: { Authorization: `Bearer ${session.access_token}` }
      })
      const { role } = await res.json()
      if (role === 'admin') setOk(true)
      else router.replace('/login')
    }
    check()
  }, [router])

  if (!ok) return (
    <div className="flex items-center justify-center min-h-screen bg-[#07070B]">
      <div className="w-8 h-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
    </div>
  )

  return <>{children}</>
}
