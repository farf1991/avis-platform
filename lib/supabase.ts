import { createClient } from '@supabase/supabase-js'
import { createServerClient as createSSRClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
export const createBrowserClient = () => createClient(supabaseUrl, supabaseAnonKey)
export const createServerClient = () => createClient(supabaseUrl, supabaseAnonKey)
export const createAdminClient = () =>
  createClient(
    supabaseUrl,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

export const createSSRServerClient = (cookieHeader: string) =>
  createSSRClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieHeader.split(';').map(c => {
            const [name, ...rest] = c.trim().split('=')
            return { name, value: rest.join('=') }
          })
        },
        setAll() {}
      }
    }
  )
