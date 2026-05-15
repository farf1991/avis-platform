'use client'
import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const supabase = createBrowserClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      toast.error('Email ou mot de passe incorrect')
      setLoading(false)
      return
    }
    const token = data.session?.access_token
    const res = await fetch('/api/auth/role', { headers: { Authorization: `Bearer ${token}` } })
    const { role } = await res.json()
    if (role === 'admin') router.push('/admin')
    else router.push('/membre')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(16,185,129,0.08) 0%, #07070B 60%)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 0 40px rgba(16,185,129,0.3)' }}>
            <span className="text-white text-2xl">⭐</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Top Avis</h1>
          <p className="text-white/40 text-sm mt-1">Connectez-vous à votre espace</p>
        </div>

        <div className="card">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={email}
                onChange={e => setEmail(e.target.value)} required placeholder="votre@email.com" />
            </div>
            <div>
              <label className="label">Mot de passe</label>
              <input type="password" className="input" value={password}
                onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-white/25 mt-6">
          Pas encore de compte ? Contactez l'administrateur.
        </p>
      </div>
    </div>
  )
}
