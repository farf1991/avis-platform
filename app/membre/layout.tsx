import { createServerClient } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import MembreNav from '@/components/membre/MembreNav'

export default async function MembreLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return (
    <div className="min-h-screen bg-gray-50">
      <MembreNav />
      <main className="max-w-2xl mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
