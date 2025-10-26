import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { codeName } = body
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Generate unique referral code
    const name = codeName || 'MASTER'
    const code = `${name.toUpperCase().replace(/[^A-Z0-9]/g, '')}${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`
    
    console.log('[AdminReferrals] Creating referral code:', code)
    
    // Check if code already exists
    const { data: existingCode } = await supabase
      .from('users')
      .select('referral_code')
      .eq('referral_code', code)
      .single()
    
    if (existingCode) {
      return NextResponse.json({ error: 'Code already exists' }, { status: 400 })
    }
    
    // Create a system user for this referral code
    const randomTelegramId = Math.floor(Math.random() * 1000000000)
    
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        telegram_id: randomTelegramId,
        telegram_username: `referral_${code}`,
        referral_code: code,
        is_admin: false,
        balance: 0,
        email: `${code.toLowerCase()}@referral.system`
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('[AdminReferrals] Insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
    
    console.log('[AdminReferrals] Referral code created successfully')
    
    const botLink = `https://t.me/WhatsAppNumberRedBot?start=${code}`
    
    return NextResponse.json({
      success: true,
      code,
      link: botLink,
      user: newUser
    })
  } catch (error) {
    console.error('[AdminReferrals] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
