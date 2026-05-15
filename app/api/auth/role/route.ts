import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ role: null })
  const supabase = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return NextResponse.json({ role: null })
  const { data: admin } = await supabase.from('admins').select('id').eq('user_id', user.id).single()
  return NextResponse.json({ role: admin ? 'admin' : 'membre' })
}
