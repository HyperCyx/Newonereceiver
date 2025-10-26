import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create a new table for referral codes
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { codeName } = body
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Generate unique referral code
    const name = (codeName || 'REF').toUpperCase().replace(/[^A-Z0-9]/g, '')
    const code = `${name}${Date.now().toString().slice(-6)}${Math.random().toString(36).substr(2, 4).toUpperCase()}`
    
    console.log('[ReferralCodes] Creating referral code:', code)
    
    // Insert into referral_codes table (standalone, no user needed)
    const { data, error } = await supabase
      .from('referral_codes')
      .insert({
        code: code,
        name: codeName || 'Master Referral',
        is_active: true,
        created_by: 'admin'
      })
      .select()
      .single()
    
    if (error) {
      console.error('[ReferralCodes] Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    console.log('[ReferralCodes] Referral code created successfully')
    
    const botLink = `https://t.me/WhatsAppNumberRedBot?start=${code}`
    
    return NextResponse.json({
      success: true,
      code,
      link: botLink,
      data
    })
  } catch (error) {
    console.error('[ReferralCodes] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get all referral codes
export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data, error } = await supabase
      .from('referral_codes')
      .select('*, referrals(count)')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('[ReferralCodes] Fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, codes: data })
  } catch (error) {
    console.error('[ReferralCodes] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
