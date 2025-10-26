import { NextRequest, NextResponse } from 'next/server'
import { Collections, getCollection } from '@/lib/mongodb/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegramId } = body

    if (!telegramId) {
      return NextResponse.json({ error: 'Telegram ID required' }, { status: 400 })
    }

    const users = await getCollection(Collections.USERS)
    const referrals = await getCollection(Collections.REFERRALS)

    // Get user data
    const user = await users.findOne({ telegram_id: telegramId })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Count referrals
    const referralCount = await referrals.countDocuments({ referrer_id: user._id })

    return NextResponse.json({
      success: true,
      user: {
        _id: user._id,
        telegram_id: user.telegram_id,
        telegram_username: user.telegram_username,
        first_name: user.first_name,
        last_name: user.last_name,
        balance: user.balance,
        referral_code: user.referral_code,
        is_admin: user.is_admin
      },
      referralCount
    })
  } catch (error) {
    console.error('[UserMe] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
