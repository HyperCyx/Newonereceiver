import { NextRequest, NextResponse } from 'next/server'
import { pyrogramSendOTP } from '@/lib/telegram/python-wrapper'
import { connectToDatabase } from '@/lib/mongodb/client'

/**
 * POST /api/telegram/auth/send-otp
 * Send OTP to phone number via Pyrogram
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body with error handling
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('[SendOTP] Failed to parse request body:', parseError)
      return NextResponse.json(
        { success: false, error: 'Invalid request format' },
        { status: 400 }
      )
    }

    const { phoneNumber, countryCode, telegramId } = body

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Validate phone number format
    if (!phoneNumber.startsWith('+') || phoneNumber.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Phone number must include country code (e.g., +1234567890)' },
        { status: 400 }
      )
    }

    console.log(`[SendOTP] Checking if phone number ${phoneNumber} is available...`)

    // Check if phone number already exists in database
    if (telegramId) {
      try {
        const { db } = await connectToDatabase()
        const existingAccount = await db.collection('accounts').findOne({
          phone_number: phoneNumber
        })

        if (existingAccount) {
          // Get the user who owns this account
          const user = await db.collection('users').findOne({ telegram_id: telegramId })
          
          // Check if it belongs to a different user
          if (user && existingAccount.user_id !== user._id) {
            console.log(`[SendOTP] ❌ Phone number ${phoneNumber} already sold to another user`)
            return NextResponse.json({
              success: false,
              error: 'PHONE_ALREADY_SOLD',
              message: '❌ This phone number has already been submitted by another user. Each number can only be sold once.'
            }, { status: 400 })
          }

          // Check if it's the same user but already processed
          if (user && existingAccount.user_id === user._id) {
            if (existingAccount.status === 'accepted') {
              console.log(`[SendOTP] ℹ️  Phone number ${phoneNumber} already accepted by this user`)
              return NextResponse.json({
                success: false,
                error: 'PHONE_ALREADY_ACCEPTED',
                message: `✅ This phone number has already been accepted. You earned $${existingAccount.amount} USDT! Check your "Accepted" tab.`
              }, { status: 400 })
            } else if (existingAccount.status === 'rejected') {
              console.log(`[SendOTP] ℹ️  Phone number ${phoneNumber} was rejected for this user`)
              return NextResponse.json({
                success: false,
                error: 'PHONE_ALREADY_REJECTED',
                message: '❌ This phone number was previously rejected. You cannot submit it again.'
              }, { status: 400 })
            }
            // If pending, allow retry (user might be checking status or retrying login)
            console.log(`[SendOTP] ✅ Phone number ${phoneNumber} is pending, allowing retry`)
          }
        } else {
          console.log(`[SendOTP] ✅ Phone number ${phoneNumber} is available`)
          
          // Check if country capacity is full
          const phoneDigitsForCheck = phoneNumber.replace(/[^\d]/g, '')
          for (let i = 1; i <= Math.min(4, phoneDigitsForCheck.length); i++) {
            const possibleCode = phoneDigitsForCheck.substring(0, i)
            
            const country = await db.collection('country_capacity').findOne({ 
              $or: [
                { country_code: possibleCode },
                { country_code: `+${possibleCode}` }
              ]
            })
            
            if (country) {
              const usedCapacity = country.used_capacity || 0
              const maxCapacity = country.max_capacity || 0
              
              if (usedCapacity >= maxCapacity) {
                console.log(`[SendOTP] ❌ Capacity full for ${country.country_name}: ${usedCapacity}/${maxCapacity}`)
                return NextResponse.json({
                  success: false,
                  error: 'CAPACITY_FULL',
                  message: `❌ Sorry! The capacity for ${country.country_name} is full (${usedCapacity}/${maxCapacity}). No more accounts can be submitted for this country right now.`
                }, { status: 400 })
              }
              
              console.log(`[SendOTP] ✅ Capacity available for ${country.country_name}: ${usedCapacity}/${maxCapacity} used`)
              break
            }
          }
        }
      } catch (dbError) {
        console.error('[SendOTP] Database check error:', dbError)
        // Continue with OTP send even if DB check fails (don't block user)
      }
    }

    console.log(`[SendOTP] Sending OTP via Pyrogram to: ${phoneNumber} (Country: ${countryCode})`)

    // Send OTP via Pyrogram
    const result = await pyrogramSendOTP(phoneNumber)

    if (result.success) {
      console.log(`[SendOTP] ✅ OTP sent successfully via Pyrogram`)
      return NextResponse.json({
        success: true,
        phoneCodeHash: result.phoneCodeHash,
        sessionString: result.sessionString,
        sessionFile: result.sessionFile,
        message: 'OTP sent successfully. Check your Telegram app.',
      })
    } else {
      console.log(`[SendOTP] ❌ Failed to send OTP: ${result.error}`)
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Failed to send OTP',
          details: result.details
        },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('[SendOTP] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
