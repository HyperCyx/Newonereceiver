import { NextRequest, NextResponse } from 'next/server'
import { Collections, getCollection } from '@/lib/mongodb/client'
import { requireAuth } from '@/lib/mongodb/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()

    const withdrawals = await getCollection(Collections.WITHDRAWALS)

    // Fetch user's withdrawals
    const userWithdrawals = await withdrawals
      .find({ user_id: user._id })
      .sort({ created_at: -1 })
      .toArray()

    return NextResponse.json({
      success: true,
      withdrawals: userWithdrawals
    })
  } catch (error: any) {
    console.error('[WithdrawalList] Error:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
