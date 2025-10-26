import { NextRequest, NextResponse } from 'next/server'
import { Collections, getCollection } from '@/lib/mongodb/client'
import { checkAdminByTelegramId } from '@/lib/mongodb/auth'

// GET - Fetch all withdrawals
export async function GET(request: NextRequest) {
  try {
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Approve or reject withdrawal or fetch with auth
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { withdrawalId, action, telegramId } = body

    // If telegramId is provided, check admin and return data
    if (telegramId && !withdrawalId) {
      const isAdmin = await checkAdminByTelegramId(telegramId)
      
      if (!isAdmin) {
        return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
      }

      const withdrawals = await getCollection(Collections.WITHDRAWALS)
      const users = await getCollection(Collections.USERS)

      const allWithdrawals = await withdrawals
        .find({})
        .sort({ created_at: -1 })
        .toArray()

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
    }

    // Handle withdrawal actions
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
