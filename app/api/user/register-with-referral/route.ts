import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { telegramId, username, firstName, lastName, referralCode } = body
    
    if (!telegramId) {
      return NextResponse.json({ error: 'Telegram ID is required' }, { status: 400 })
    }
    
    if (!referralCode) {
      return NextResponse.json({ 
        error: 'Registration requires a valid referral code',
        requiresReferral: true 
      }, { status: 403 })
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Validate referral code
    const { data: refCode, error: refError } = await supabase
      .from('referral_codes')
      .select('*')
      .eq('code', referralCode)
      .eq('is_active', true)
      .single()
    
    if (refError || !refCode) {
      return NextResponse.json({ 
        error: 'Invalid or inactive referral code',
        requiresReferral: true 
      }, { status: 403 })
    }
    
    // Check if max uses reached
    if (refCode.max_uses && refCode.used_count >= refCode.max_uses) {
      return NextResponse.json({ 
        error: 'Referral code has reached maximum uses',
        requiresReferral: true 
      }, { status: 403 })
    }
    
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('telegram_id', telegramId)
      .single()
    
    if (existingUser) {
      return NextResponse.json({ 
        success: true,
        userId: existingUser.id,
        message: 'User already registered'
      })
    }
    
    // Create new user with referral code
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        telegram_id: telegramId,
        telegram_username: username,
        first_name: firstName,
        last_name: lastName,
        used_referral_code: referralCode,
        balance: 0,
        is_admin: false,
        email: `${telegramId}@telegram.user`
      })
      .select()
      .single()
    
    if (userError) {
      console.error('[RegisterWithReferral] User creation error:', userError)
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }
    
    // Increment referral code usage
    await supabase
      .from('referral_codes')
      .update({ used_count: (refCode.used_count || 0) + 1 })
      .eq('id', refCode.id)
    
    // Create referral record
    await supabase
      .from('referrals')
      .insert({
        referrer_id: refCode.id,
        referred_user_id: newUser.id,
        referral_code: referralCode
      })
    
    console.log('[RegisterWithReferral] User registered successfully with referral code')
    
    return NextResponse.json({
      success: true,
      userId: newUser.id,
      user: newUser
    })
  } catch (error) {
    console.error('[RegisterWithReferral] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
