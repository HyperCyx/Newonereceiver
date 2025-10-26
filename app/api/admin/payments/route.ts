import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('[AdminPayments] Fetching all payment requests...')
    
    // Fetch all payment requests with user information
    const { data: payments, error } = await supabase
      .from('payment_requests')
      .select(`
        id,
        user_id,
        amount,
        wallet_address,
        status,
        created_at,
        updated_at,
        users!inner(telegram_username, telegram_id, first_name, last_name)
      `)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('[AdminPayments] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    console.log('[AdminPayments] Found', payments?.length || 0, 'payment requests')
    
    return NextResponse.json({ 
      success: true,
      payments: payments || []
    })
  } catch (error) {
    console.error('[AdminPayments] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { paymentId, action } = body
    
    if (!paymentId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    
    console.log('[AdminPayments] Updating payment request', paymentId, 'to', newStatus)
    
    const { data, error } = await supabase
      .from('payment_requests')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', paymentId)
      .select()
      .single()
    
    if (error) {
      console.error('[AdminPayments] Update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    console.log('[AdminPayments] Successfully updated payment request')
    
    return NextResponse.json({ 
      success: true,
      payment: data
    })
  } catch (error) {
    console.error('[AdminPayments] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
