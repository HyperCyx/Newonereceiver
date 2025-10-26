import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { telegramId } = body
    
    if (!telegramId) {
      return NextResponse.json(
        { error: 'Missing telegram ID' },
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
      console.error('[Withdrawal List API] User not found:', userError)
      return NextResponse.json({ 
        success: true,
        withdrawals: [],
        balance: '0.00'
      })
    }
    
    // Fetch withdrawals for this user (bypasses RLS with Service Role Key)
    const { data: withdrawals, error: withdrawalError } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    
    if (withdrawalError) {
      console.error('[Withdrawal List API] Error fetching withdrawals:', withdrawalError)
      return NextResponse.json(
        { error: 'Failed to fetch withdrawals' },
        { status: 500 }
      )
    }
    
    console.log('[Withdrawal List API] Found', withdrawals?.length || 0, 'withdrawals for user', user.id)
    
    return NextResponse.json({
      success: true,
      withdrawals: withdrawals || [],
      balance: user.balance,
      userId: user.id
    })
  } catch (error) {
    console.error('[Withdrawal List API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
