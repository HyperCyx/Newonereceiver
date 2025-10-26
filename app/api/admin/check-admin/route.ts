import { NextRequest, NextResponse } from 'next/server'
import { checkAdminByTelegramId } from '@/lib/mongodb/auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegramId } = body

    if (!telegramId) {
      return NextResponse.json({ error: 'Telegram ID required' }, { status: 400 })
    }

    const isAdmin = await checkAdminByTelegramId(telegramId)

    return NextResponse.json({
      success: true,
      isAdmin
    })
  } catch (error) {
    console.error('[CheckAdmin] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
