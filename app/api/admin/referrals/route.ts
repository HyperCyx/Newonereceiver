import { NextRequest, NextResponse } from 'next/server'
import { Collections, getCollection } from '@/lib/mongodb/client'
import { requireAdmin } from '@/lib/mongodb/auth'

export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    await requireAdmin()

    const referrals = await getCollection(Collections.REFERRALS)
    const users = await getCollection(Collections.USERS)

    // Fetch all referrals
    const allReferrals = await referrals
      .find({})
      .sort({ created_at: -1 })
      .toArray()

    // Populate user data
    const referralsWithUsers = await Promise.all(
      allReferrals.map(async (referral) => {
        const referrer = await users.findOne({ _id: referral.referrer_id })
        const referred = await users.findOne({ _id: referral.referred_user_id })
        
        return {
          ...referral,
          referrer: referrer ? {
            telegram_username: referrer.telegram_username,
            first_name: referrer.first_name,
            last_name: referrer.last_name
          } : null,
          referred_user: referred ? {
            telegram_username: referred.telegram_username,
            first_name: referred.first_name,
            last_name: referred.last_name
          } : null
        }
      })
    )

    return NextResponse.json({
      success: true,
      referrals: referralsWithUsers
    })
  } catch (error: any) {
    console.error('[AdminReferrals] GET error:', error)
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
