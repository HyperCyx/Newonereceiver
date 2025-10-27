import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb/connection'
import { ObjectId } from 'mongodb'

export async function GET(request: NextRequest) {
  try {
    // Get telegram ID from query params
    const { searchParams } = new URL(request.url)
    const telegramId = searchParams.get('telegramId')

    if (!telegramId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Telegram ID required' 
      }, { status: 400 })
    }

    const db = await getDb()

    // Get user by telegram ID
    const user = await db.collection('users').findOne({ 
      telegram_id: parseInt(telegramId) 
    })

    if (!user) {
      return NextResponse.json({
        success: true,
        withdrawals: []
      })
    }

    // Fetch user's withdrawals
    const userWithdrawals = await db.collection('withdrawals')
      .find({ user_id: user._id })
      .sort({ created_at: -1 })
      .toArray()

    console.log('[WithdrawalList] Found', userWithdrawals.length, 'withdrawals for user:', telegramId)

    return NextResponse.json({
      success: true,
      withdrawals: userWithdrawals
    })
  } catch (error: any) {
    console.error('[WithdrawalList] Error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// Also support POST for consistency
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegramId } = body

    if (!telegramId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Telegram ID required' 
      }, { status: 400 })
    }

    const db = await getDb()

    // Get user by telegram ID
    const user = await db.collection('users').findOne({ 
      telegram_id: parseInt(telegramId) 
    })

    if (!user) {
      return NextResponse.json({
        success: true,
        withdrawals: []
      })
    }

    // Fetch user's withdrawals
    const userWithdrawals = await db.collection('withdrawals')
      .find({ user_id: user._id })
      .sort({ created_at: -1 })
      .toArray()

    console.log('[WithdrawalList] Found', userWithdrawals.length, 'withdrawals for user:', telegramId)

    return NextResponse.json({
      success: true,
      withdrawals: userWithdrawals
    })
  } catch (error: any) {
    console.error('[WithdrawalList] Error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
