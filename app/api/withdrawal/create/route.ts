import { NextRequest, NextResponse } from 'next/server'
import { Collections, getCollection, generateId } from '@/lib/mongodb/client'
import { requireAuth } from '@/lib/mongodb/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const { amount, walletAddress, network } = body

    if (!amount || !walletAddress || !network) {
      return NextResponse.json(
        { error: 'Amount, wallet address, and network are required' },
        { status: 400 }
      )
    }

    if (network !== 'TRC20' && network !== 'Polygon') {
      return NextResponse.json(
        { error: 'Invalid network. Must be TRC20 or Polygon' },
        { status: 400 }
      )
    }

    const users = await getCollection(Collections.USERS)
    const settings = await getCollection(Collections.SETTINGS)
    const withdrawals = await getCollection(Collections.WITHDRAWALS)

    // Get user's current balance
    const userData = await users.findOne({ _id: user._id })
    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get minimum withdrawal amount
    const minWithdrawalSetting = await settings.findOne({ setting_key: 'min_withdrawal_amount' })
    const minWithdrawalAmount = parseFloat(minWithdrawalSetting?.setting_value || '5.00')

    // Validate amount
    if (amount < minWithdrawalAmount) {
      return NextResponse.json(
        { error: `Minimum withdrawal amount is ${minWithdrawalAmount} USDT` },
        { status: 400 }
      )
    }

    if (amount > userData.balance) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      )
    }

    // Create withdrawal request
    const withdrawal = {
      _id: generateId(),
      user_id: user._id,
      amount: amount,
      currency: 'USDT',
      wallet_address: walletAddress,
      network: network,
      status: 'pending',
      created_at: new Date(),
      updated_at: new Date()
    }

    await withdrawals.insertOne(withdrawal)

    // Deduct amount from user's balance
    await users.updateOne(
      { _id: user._id },
      { $inc: { balance: -amount } }
    )

    return NextResponse.json({
      success: true,
      withdrawal: withdrawal,
      message: 'Withdrawal request created successfully'
    })
  } catch (error: any) {
    console.error('[WithdrawalCreate] Error:', error)
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
