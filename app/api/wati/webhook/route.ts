import { NextRequest, NextResponse } from 'next/server'
import { handleMessage } from '@/lib/bot'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Ignorer les messages envoyés par nous-mêmes
    if (body.owner === true || body.isFromMe === true) {
      return NextResponse.json({ ok: true })
    }

    const phone: string = body.waId || body.senderName || ''
    const type: string = body.type || 'text'
    const text: string = body.text || body.caption || ''
    const mediaUrl: string | undefined = body.data?.url || body.media?.url || undefined

    if (!phone) return NextResponse.json({ ok: true })

    if (type === 'image' || type === 'document') {
      await handleMessage(phone, text, mediaUrl || `wati_media_${body.id}`)
    } else if (type === 'text' && text) {
      await handleMessage(phone, text)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[WATI webhook]', err)
    return NextResponse.json({ ok: true })
  }
}

export const dynamic = 'force-dynamic'
