import { NextRequest, NextResponse } from 'next/server'
import { processQueue } from '@/lib/bot'

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await processQueue()
  return NextResponse.json({ ok: true, ts: new Date().toISOString() })
}

export const dynamic = 'force-dynamic'
