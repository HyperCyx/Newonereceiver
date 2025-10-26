import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('[AdminWithdrawals] Fetching all withdrawals...')
    
    // Fetch all withdrawals with user information
    const { data: withdrawals, error } = await supabase
      .from('withdrawals')
      .select(`
        id,
        user_id,
        amount,
        currency,
        wallet_address,
        status,
        created_at,
        updated_at,
        users!inner(telegram_username, telegram_id, first_name, last_name)
      `)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('[AdminWithdrawals] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    console.log('[AdminWithdrawals] Found', withdrawals?.length || 0, 'withdrawals')
    
    return NextResponse.json({ 
      success: true,
      withdrawals: withdrawals || []
    })
  } catch (error) {
    console.error('[AdminWithdrawals] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { withdrawalId, action } = body
    
    if (!withdrawalId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const newStatus = action === 'approve' ? 'confirmed' : 'rejected'
    
    console.log('[AdminWithdrawals] Updating withdrawal', withdrawalId, 'to', newStatus)
    
    const { data, error } = await supabase
      .from('withdrawals')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', withdrawalId)
      .select()
      .single()
    
    if (error) {
      console.error('[AdminWithdrawals] Update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    console.log('[AdminWithdrawals] Successfully updated withdrawal')
    
    return NextResponse.json({ 
      success: true,
      withdrawal: data
    })
  } catch (error) {
    console.error('[AdminWithdrawals] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
