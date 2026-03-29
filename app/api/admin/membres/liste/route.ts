import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET() {
  const supabase = createAdminClient()
  const { data: membres } = await supabase
    .from('membres')
    .select('*')
    .order('created_at', { ascending: false })
  return NextResponse.json({ membres: membres || [] })
}
