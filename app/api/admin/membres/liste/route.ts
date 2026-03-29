import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase'

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data: membres, error } = await supabase
      .from('membres')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching membres:', error)
      return NextResponse.json({ membres: [], error: error.message })
    }
    
    return NextResponse.json({ membres: membres || [] })
  } catch (err) {
    console.error('Catch error:', err)
    return NextResponse.json({ membres: [] })
  }
}
