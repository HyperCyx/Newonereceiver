import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { telegramId, amount, walletAddress, currency = 'USDT' } = body
    
    if (!telegramId || !amount || !walletAddress) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, balance')
      .eq('telegram_id', telegramId)
      .single()
    
    if (userError || !user) {
      console.error('[Withdrawal API] User not found:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Check if user has sufficient balance
    const currentBalance = Number(user.balance || 0)
    const withdrawalAmount = Number(amount)
    
    if (currentBalance < withdrawalAmount) {
      return NextResponse.json(
        { error: 'Insufficient balance' },
        { status: 400 }
      )
    }
    
    // Create withdrawal request
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('withdrawals')
      .insert({
        user_id: user.id,
        amount: withdrawalAmount,
        currency: currency,
        wallet_address: walletAddress,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (withdrawalError) {
      console.error('[Withdrawal API] Error creating withdrawal:', withdrawalError)
      return NextResponse.json(
        { error: 'Failed to create withdrawal request', details: withdrawalError.message },
        { status: 500 }
      )
    }
    
    // Deduct balance from user account
    const newBalance = currentBalance - withdrawalAmount
    const { error: balanceError } = await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', user.id)
    
    if (balanceError) {
      console.error('[Withdrawal API] Error updating balance:', balanceError)
      // Rollback withdrawal if balance update fails
      await supabase
        .from('withdrawals')
        .delete()
        .eq('id', withdrawal.id)
      
      return NextResponse.json(
        { error: 'Failed to update balance' },
        { status: 500 }
      )
    }
    
    console.log('[Withdrawal API] Withdrawal created successfully:', withdrawal.id)
    
    return NextResponse.json({
      success: true,
      withdrawal: {
        id: withdrawal.id,
        amount: withdrawalAmount,
        status: 'pending',
        newBalance: newBalance
      }
    })
  } catch (error) {
    console.error('[Withdrawal API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
