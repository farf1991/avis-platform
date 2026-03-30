import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createAdminClient()
  const { data: membres } = await supabase
    .from('membres')
    .select('*')
    .order('created_at', { ascending: false })

  const response = NextResponse.json({ membres: membres || [] })
  response.headers.set('Cache-Control', 'no-store')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  return response
}

export const dynamic = 'force-dynamic'
export const revalidate = 0
