import { NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb/connection'

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
    
    const db = await getDb()
    
    // Validate referral code
    const refCode = await db.collection('referral_codes').findOne({
      code: referralCode,
      is_active: true
    })
    
    if (!refCode) {
      return NextResponse.json({ 
        error: 'Invalid or inactive referral code',
        requiresReferral: true 
      }, { status: 403 })
    }
    
    // Check if max uses reached
    if (refCode.max_uses && (refCode.used_count || 0) >= refCode.max_uses) {
      return NextResponse.json({ 
        error: 'Referral code has reached maximum uses',
        requiresReferral: true 
      }, { status: 403 })
    }
    
    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ telegram_id: telegramId })
    
    if (existingUser) {
      return NextResponse.json({ 
        success: true,
        userId: existingUser._id.toString(),
        message: 'User already registered'
      })
    }
    
    // Create new user with referral code
    const newUserResult = await db.collection('users').insertOne({
      telegram_id: telegramId,
      telegram_username: username,
      first_name: firstName,
      last_name: lastName,
      used_referral_code: referralCode,
      balance: 0,
      is_admin: false,
      email: `${telegramId}@telegram.user`,
      created_at: new Date()
    })
    
    const newUser = await db.collection('users').findOne({ _id: newUserResult.insertedId })
    
    if (!newUser) {
      console.error('[RegisterWithReferral] User creation error')
      return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
    }
    
    // Increment referral code usage
    await db.collection('referral_codes').updateOne(
      { _id: refCode._id },
      { $inc: { used_count: 1 } }
    )
    
    // Create referral record
    await db.collection('referrals').insertOne({
      referrer_id: refCode._id,
      referred_user_id: newUser._id,
      referral_code: referralCode,
      created_at: new Date()
    })
    
    console.log('[RegisterWithReferral] User registered successfully with referral code')
    
    return NextResponse.json({
      success: true,
      userId: newUser._id.toString(),
      user: { ...newUser, id: newUser._id.toString() }
    })
  } catch (error) {
    console.error('[RegisterWithReferral] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
