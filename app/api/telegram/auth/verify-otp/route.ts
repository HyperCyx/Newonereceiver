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
              
              // Get auto-approve hours setting
              const settings = await db.collection('settings').findOne({ setting_key: 'auto_approve_hours' })
              const autoApproveHours = parseInt(settings?.setting_value || '24')
              
              // Calculate time difference
              const now = new Date()
              const createdAt = existingAccount.created_at
              const hoursPassed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
              
              console.log(`[VerifyOTP] Hours since creation: ${hoursPassed.toFixed(2)}, Auto-approve after: ${autoApproveHours}`)
              
              // Auto-approve if time has passed and status is still pending
              if (hoursPassed >= autoApproveHours && existingAccount.status === 'pending') {
                await db.collection('accounts').updateOne(
                  { _id: existingAccount._id },
                  { 
                    $set: { 
                      status: 'accepted',
                      approved_at: new Date(),
                      auto_approved: true
                    }
                  }
                )
                console.log(`[VerifyOTP] ✅ Account auto-approved after ${hoursPassed.toFixed(2)} hours`)
              }
            } else {
              // Insert new account record with pending status
              await db.collection('accounts').insertOne({
                user_id: user._id,
                phone_number: phoneNumber,
                amount: 0, // Default amount, can be updated later
                status: 'pending',
                created_at: new Date()
              })
              
              console.log(`[VerifyOTP] Account record created for ${phoneNumber}`)
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
