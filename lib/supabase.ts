import { createClient } from '@supabase/supabase-js'
import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// Client côté navigateur (pages membres)
export const createBrowserClient = () =>
  createClientComponentClient()

// Client côté serveur (API routes, Server Components)
export const createServerClient = () =>
  createServerComponentClient({ cookies })

// Client admin avec service_role (API routes admin uniquement)
export const createAdminClient = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
