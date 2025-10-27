import { NextRequest, NextResponse } from 'next/server'
import { Collections, getCollection } from '@/lib/mongodb/client'
import { checkAdminByTelegramId } from '@/lib/mongodb/auth'

// GET - Fetch all withdrawals
export async function GET(request: NextRequest) {
  try {
    const withdrawals = await getCollection(Collections.WITHDRAWALS)
    const users = await getCollection(Collections.USERS)

    // Use aggregation to join withdrawals with users in a single query
    const withdrawalsWithUsers = await withdrawals.aggregate([
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'users'
        }
      },
      {
        $unwind: {
          path: '$users',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          _id: 1,
          user_id: 1,
          amount: 1,
          currency: 1,
          wallet_address: 1,
          status: 1,
          created_at: 1,
          updated_at: 1,
          confirmed_at: 1,
          'users.telegram_username': 1,
          'users.first_name': 1,
          'users.last_name': 1
        }
      },
      {
        $sort: { created_at: -1 }
      }
    ]).toArray()

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

      const withdrawalsWithUsers = await withdrawals.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'users'
          }
        },
        {
          $unwind: {
            path: '$users',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: 1,
            user_id: 1,
            amount: 1,
            currency: 1,
            wallet_address: 1,
            status: 1,
            created_at: 1,
            updated_at: 1,
            confirmed_at: 1,
            'users.telegram_username': 1,
            'users.first_name': 1,
            'users.last_name': 1
          }
        },
        {
          $sort: { created_at: -1 }
        }
      ]).toArray()

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
