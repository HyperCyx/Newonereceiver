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

    // Get user data (optimized with projection to only fetch needed fields)
    const user = await users.findOne(
      { telegram_id: telegramId },
      { 
        projection: { 
          _id: 1, 
          telegram_id: 1, 
          telegram_username: 1, 
          first_name: 1, 
          last_name: 1, 
          balance: 1, 
          referral_code: 1, 
          is_admin: 1 
        } 
      }
    )

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Count referrals - run in parallel with user lookup
    const referrals = await getCollection(Collections.REFERRALS)
    const referralCount = await referrals.countDocuments({ referrer_id: user._id })

    // Ensure is_admin is a boolean
    const isAdminBoolean = user.is_admin === true

    console.log('[UserMe] User found:', {
      telegram_id: user.telegram_id,
      is_admin_raw: user.is_admin,
      is_admin_type: typeof user.is_admin,
      is_admin_boolean: isAdminBoolean
    })

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
        is_admin: isAdminBoolean  // Always return boolean
      },
      referralCount
    })
  } catch (error) {
    console.error('[UserMe] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
