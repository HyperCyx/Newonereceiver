import { NextRequest, NextResponse } from 'next/server'
import { Collections, getCollection } from '@/lib/mongodb/client'
import { requireAdmin } from '@/lib/mongodb/auth'

// GET - Fetch all withdrawals
export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    await requireAdmin()

    const withdrawals = await getCollection(Collections.WITHDRAWALS)
    const users = await getCollection(Collections.USERS)

    // Fetch all withdrawals
    const allWithdrawals = await withdrawals
      .find({})
      .sort({ created_at: -1 })
      .toArray()

    // Populate user data
    const withdrawalsWithUsers = await Promise.all(
      allWithdrawals.map(async (withdrawal) => {
        const user = await users.findOne({ _id: withdrawal.user_id })
        return {
          ...withdrawal,
          users: user ? {
            telegram_username: user.telegram_username,
            first_name: user.first_name,
            last_name: user.last_name
          } : null
        }
      })
    )

    return NextResponse.json({
      success: true,
      withdrawals: withdrawalsWithUsers
    })
  } catch (error: any) {
    console.error('[AdminWithdrawals] GET error:', error)
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Approve or reject withdrawal
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    await requireAdmin()

    const body = await request.json()
    const { withdrawalId, action } = body

    if (!withdrawalId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const withdrawals = await getCollection(Collections.WITHDRAWALS)
    const users = await getCollection(Collections.USERS)

    const withdrawal = await withdrawals.findOne({ _id: withdrawalId })

    if (!withdrawal) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 })
    }

    if (action === 'approve') {
      // Update withdrawal status to confirmed
      await withdrawals.updateOne(
        { _id: withdrawalId },
        { 
          $set: { 
            status: 'confirmed',
            confirmed_at: new Date(),
            updated_at: new Date()
          } 
        }
      )

      return NextResponse.json({
        success: true,
        message: 'Withdrawal approved successfully'
      })
    } 
    else if (action === 'reject') {
      // Update withdrawal status to rejected
      await withdrawals.updateOne(
        { _id: withdrawalId },
        { 
          $set: { 
            status: 'rejected',
            updated_at: new Date()
          } 
        }
      )

      // Return the amount back to user's balance
      await users.updateOne(
        { _id: withdrawal.user_id },
        { $inc: { balance: withdrawal.amount } }
      )

      return NextResponse.json({
        success: true,
        message: 'Withdrawal rejected and amount returned to user'
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('[AdminWithdrawals] POST error:', error)
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
