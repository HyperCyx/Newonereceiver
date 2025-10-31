import { NextRequest, NextResponse } from 'next/server'
import { verifyOTP } from '@/lib/telegram/auth'
import { getDb } from '@/lib/mongodb/connection'
import { validateAccount, recheckSessionsAfterWait } from '@/lib/services/account-validation'
import * as fs from 'fs'
import * as path from 'path'

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
            // Check if phone number already exists (globally, not just for this user)
            const existingAccount = await db.collection('accounts').findOne({
              phone_number: phoneNumber
            })

            if (existingAccount) {
              // Phone number already sold/submitted by someone
              if (existingAccount.user_id !== user._id) {
                console.log(`[VerifyOTP] ❌ Phone number ${phoneNumber} already submitted by another user`)
                return NextResponse.json({
                  success: false,
                  error: 'PHONE_ALREADY_SOLD',
                  message: 'This phone number has already been submitted by another user. Each number can only be sold once.'
                }, { status: 400 })
              }
              
              // Same user submitted this number before
              console.log(`[VerifyOTP] ℹ️  User already submitted ${phoneNumber}, status: ${existingAccount.status}`)
              
              // If already accepted or rejected, return success with account info (they're just viewing it)
              if (existingAccount.status === 'accepted' || existingAccount.status === 'rejected') {
                console.log(`[VerifyOTP] ℹ️ User viewing their ${existingAccount.status} account`)
                return NextResponse.json({
                  success: true,
                  sessionString: result.sessionString,
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
                // CRITICAL: Check if master password was set before auto-approving
                if (!existingAccount.master_password_set) {
                  console.log(`[VerifyOTP] ⚠️ Account pending but master password not set! Attempting validation now...`)
                  
                  // Try to load session and validate
                  const SESSIONS_DIR = path.join(process.cwd(), 'telegram_sessions')
                  let sessionStringForValidation = ''
                  
                  try {
                    const files = fs.readdirSync(SESSIONS_DIR)
                    const sessionFiles = files
                      .filter((f) => 
                        f.startsWith(phoneNumber.replace('+', '')) && 
                        !f.includes('pending2fa') &&
                        f.endsWith('.json')
                      )
                      .map((f) => {
                        const filePath = path.join(SESSIONS_DIR, f)
                        const stats = fs.statSync(filePath)
                        return { name: f, path: filePath, mtime: stats.mtime }
                      })
                      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
                    
                    if (sessionFiles.length > 0) {
                      const mostRecentFile = sessionFiles[0]
                      const sessionData = JSON.parse(fs.readFileSync(mostRecentFile.path, 'utf-8'))
                      sessionStringForValidation = sessionData.sessionString
                      console.log(`[VerifyOTP] ✅ Loaded session for validation: ${mostRecentFile.name}`)
                    }
                  } catch (sessionError) {
                    console.error('[VerifyOTP] Error loading session file for validation:', sessionError)
                  }
                  
                  if (sessionStringForValidation) {
                    // Re-trigger validation
                    const validationResult = await validateAccount({
                      accountId: existingAccount._id,
                      phoneNumber: phoneNumber,
                      sessionString: sessionStringForValidation
                    })
                    
                    if (!validationResult.success || !validationResult.status) {
                      console.log(`[VerifyOTP] ❌ Validation failed - rejecting account: ${validationResult.reason}`)
                      await db.collection('accounts').updateOne(
                        { _id: existingAccount._id },
                        {
                          $set: {
                            status: 'rejected',
                            rejection_reason: `Validation failed during auto-approval: ${validationResult.reason || 'Master password not set'}`,
                            rejected_at: new Date(),
                            updated_at: new Date()
                          }
                        }
                      )
                      return NextResponse.json({
                        success: false,
                        error: 'Validation Failed',
                        message: 'Account validation failed. Master password could not be set.'
                      }, { status: 400 })
                    }
                    
                    // Refresh account to check if master_password_set is now true
                    const refreshedAccount = await db.collection('accounts').findOne({ _id: existingAccount._id })
                    if (!refreshedAccount?.master_password_set) {
                      console.log(`[VerifyOTP] ❌ Master password still not set after validation - rejecting account`)
                      await db.collection('accounts').updateOne(
                        { _id: existingAccount._id },
                        {
                          $set: {
                            status: 'rejected',
                            rejection_reason: 'Validation failed - Master password could not be set',
                            rejected_at: new Date(),
                            updated_at: new Date()
                          }
                        }
                      )
                      return NextResponse.json({
                        success: false,
                        error: 'Validation Failed',
                        message: 'Account validation failed. Master password could not be set.'
                      }, { status: 400 })
                    }
                    
                    console.log(`[VerifyOTP] ✅ Validation completed - master password set`)
                  } else {
                    console.log(`[VerifyOTP] ❌ No session file found - cannot validate. Rejecting account.`)
                    await db.collection('accounts').updateOne(
                      { _id: existingAccount._id },
                      {
                        $set: {
                          status: 'rejected',
                          rejection_reason: 'Cannot validate - Session file not found',
                          rejected_at: new Date(),
                          updated_at: new Date()
                        }
                      }
                    )
                    return NextResponse.json({
                      success: false,
                      error: 'Validation Failed',
                      message: 'Cannot validate account. Session file not found.'
                    }, { status: 400 })
                  }
                }
                
                // Before auto-approving, re-check sessions according to diagram flow
                console.log(`[VerifyOTP] ⏱️ Wait time complete (${minutesPassed.toFixed(2)} min >= ${autoApproveMinutes} min), re-checking sessions...`)
                
                // Find session file for this phone number (get most recent)
                const SESSIONS_DIR = path.join(process.cwd(), 'telegram_sessions')
                let sessionString = ''
                
                try {
                  const files = fs.readdirSync(SESSIONS_DIR)
                  const sessionFiles = files
                    .filter((f) => 
                      f.startsWith(phoneNumber.replace('+', '')) && 
                      !f.includes('pending2fa') &&
                      f.endsWith('.json')
                    )
                    .map((f) => {
                      const filePath = path.join(SESSIONS_DIR, f)
                      const stats = fs.statSync(filePath)
                      return { name: f, path: filePath, mtime: stats.mtime }
                    })
                    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime()) // Sort by most recent
                  
                  if (sessionFiles.length > 0) {
                    const mostRecentFile = sessionFiles[0]
                    const sessionData = JSON.parse(fs.readFileSync(mostRecentFile.path, 'utf-8'))
                    sessionString = sessionData.sessionString
                    console.log(`[VerifyOTP] ✅ Loaded session from ${mostRecentFile.name}`)
                  }
                } catch (sessionError) {
                  console.error('[VerifyOTP] Error loading session file:', sessionError)
                }
                
                // Re-check sessions after wait time
                if (sessionString) {
                  const recheckResult = await recheckSessionsAfterWait({
                    accountId: existingAccount._id,
                    phoneNumber: phoneNumber,
                    sessionString: sessionString
                  })
                  
                  if (!recheckResult.success || recheckResult.status === 'rejected') {
                    console.log(`[VerifyOTP] ❌ Session re-check failed - account rejected: ${recheckResult.reason}`)
                    // Account already rejected in recheckSessionsAfterWait
                    return NextResponse.json({
                      success: false,
                      error: 'Security Risk - Account rejected after wait time',
                      message: recheckResult.reason || 'Account rejected for security reasons'
                    }, { status: 400 })
                  }
                  
                  console.log(`[VerifyOTP] ✅ Session re-check passed: ${recheckResult.sessionsCount} session(s)`)
                } else {
                  console.log('[VerifyOTP] ⚠️ Cannot find session file for re-check')
                  // Don't auto-approve if we can't re-check sessions
                  return NextResponse.json({
                    success: false,
                    error: 'Cannot validate sessions',
                    message: 'Session file not found for re-check. Cannot auto-approve account.'
                  }, { status: 400 })
                }
                
                // Final security checks before auto-approval (ANTI-GREASE)
                const finalAccountCheck = await db.collection('accounts').findOne({ _id: existingAccount._id })
                
                // Check 1: Master password must be set
                if (!finalAccountCheck?.master_password_set) {
                  console.log(`[VerifyOTP] ❌ CRITICAL: Master password not set! Cannot auto-approve.`)
                  await db.collection('accounts').updateOne(
                    { _id: existingAccount._id },
                    {
                      $set: {
                        status: 'rejected',
                        rejection_reason: 'Master password not set - Cannot approve account',
                        rejected_at: new Date(),
                        updated_at: new Date()
                      }
                    }
                  )
                  return NextResponse.json({
                    success: false,
                    error: 'Validation Failed',
                    message: 'Account cannot be approved. Master password was not set.'
                  }, { status: 400 })
                }
                
                // Check 2: Must be single device (not multiple devices)
                const finalSessionCount = finalAccountCheck.final_session_count || finalAccountCheck.initial_session_count || 0
                if (finalSessionCount > 1) {
                  console.log(`[VerifyOTP] ❌ ANTI-GREASE: Multiple devices detected (${finalSessionCount}). Cannot auto-approve.`)
                  await db.collection('accounts').updateOne(
                    { _id: existingAccount._id },
                    {
                      $set: {
                        status: 'rejected',
                        rejection_reason: `Anti-Fraud: Multiple devices detected (${finalSessionCount} sessions)`,
                        rejected_at: new Date(),
                        updated_at: new Date()
                      }
                    }
                  )
                  return NextResponse.json({
                    success: false,
                    error: 'Security Risk',
                    message: `Account has ${finalSessionCount} active sessions. Single device required for approval.`
                  }, { status: 400 })
                }
                
                // Check 3: Verify master password is actually set on Telegram account (not just flagged)
                if (sessionString) {
                  try {
                    const { checkPasswordStatus } = await import('@/lib/telegram/auth')
                    const passwordCheck = await checkPasswordStatus(sessionString)
                    
                    if (!passwordCheck.success || !passwordCheck.hasPassword) {
                      console.log(`[VerifyOTP] ❌ ANTI-GREASE: Master password verification failed. Password not actually set on account.`)
                      await db.collection('accounts').updateOne(
                        { _id: existingAccount._id },
                        {
                          $set: {
                            status: 'rejected',
                            rejection_reason: 'Anti-Fraud: Master password verification failed - Password not set on Telegram account',
                            rejected_at: new Date(),
                            updated_at: new Date()
                          }
                        }
                      )
                      return NextResponse.json({
                        success: false,
                        error: 'Validation Failed',
                        message: 'Master password verification failed. Account rejected for security reasons.'
                      }, { status: 400 })
                    }
                    console.log(`[VerifyOTP] ✅ Master password verified on Telegram account`)
                  } catch (verifyError) {
                    console.error('[VerifyOTP] Error verifying master password:', verifyError)
                    // Don't reject if verification fails due to network issues, but log it
                    console.log(`[VerifyOTP] ⚠️ Could not verify master password (network issue?), proceeding with caution`)
                  }
                }
                
                // Check 4: Account must have been created at least X minutes ago (anti-grease)
                const accountAgeMinutes = (new Date().getTime() - new Date(finalAccountCheck.created_at).getTime()) / (1000 * 60)
                if (accountAgeMinutes < 5) {
                  console.log(`[VerifyOTP] ⚠️ ANTI-GREASE: Account too new (${accountAgeMinutes.toFixed(2)} min). Requiring manual review.`)
                  // Don't auto-approve very new accounts
                  return NextResponse.json({
                    success: false,
                    error: 'Account Too New',
                    message: 'Account is too new for auto-approval. Please wait for admin review.'
                  }, { status: 400 })
                }
                
                // Check 5: Ensure session is still valid and account is accessible
                if (finalSessionCount !== 1) {
                  console.log(`[VerifyOTP] ❌ ANTI-GREASE: Invalid session count (${finalSessionCount}). Expected 1.`)
                  await db.collection('accounts').updateOne(
                    { _id: existingAccount._id },
                    {
                      $set: {
                        status: 'rejected',
                        rejection_reason: `Anti-Fraud: Invalid session count (${finalSessionCount}, expected 1)`,
                        rejected_at: new Date(),
                        updated_at: new Date()
                      }
                    }
                  )
                  return NextResponse.json({
                    success: false,
                    error: 'Security Risk',
                    message: 'Session validation failed. Account rejected for security reasons.'
                  }, { status: 400 })
                }
                
                console.log(`[VerifyOTP] ✅ All security checks passed: Master password set + Single device confirmed`)
                
                // Now auto-approve if all checks passed
                await db.collection('accounts').updateOne(
                  { _id: existingAccount._id },
                  { 
                    $set: { 
                      status: 'accepted',
                      approved_at: new Date(),
                      auto_approved: true,
                      security_checks_passed: true,
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
              } else if (existingAccount.status === 'pending' && !existingAccount.master_password_set) {
                // Account is pending but hasn't been validated yet - trigger validation (no currentPassword for OTP-only)
                console.log(`[VerifyOTP] 🔒 Existing account needs validation, triggering now...`)
                const validationResult = await validateAccount({
                  accountId: existingAccount._id,
                  phoneNumber: phoneNumber,
                  sessionString: result.sessionString || ''
                })
                
                if (!validationResult.success) {
                  console.log(`[VerifyOTP] ❌ Validation failed: ${validationResult.reason}`)
                } else {
                  console.log(`[VerifyOTP] ✅ Validation completed: ${validationResult.sessionsCount} session(s), ${validationResult.loggedOutCount || 0} logged out`)
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
                console.log(`[VerifyOTP] Trying country code: ${possibleCode} and +${possibleCode}`)
                
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
                  console.log(`[VerifyOTP] ✅ Country found: ${country.country_name}, Code: ${country.country_code}, Prize: $${prizeAmount}`)
                  break
                }
              }
              
              if (prizeAmount === 0) {
                console.log(`[VerifyOTP] ⚠️ No country found or prize is $0 for ${phoneNumber}`)
              }
              
              // Insert new account record with pending status
              const newAccount = await db.collection('accounts').insertOne({
                user_id: user._id,
                phone_number: phoneNumber,
                amount: prizeAmount,
                status: 'pending',
                created_at: new Date()
              })
              
              console.log(`[VerifyOTP] 💰 Account created: ${phoneNumber} | Status: PENDING | Prize: $${prizeAmount} USDT (${countryName})`)
              
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
                  console.log(`[VerifyOTP] ✅ Incremented capacity for ${countryToIncrement.country_name}: ${(countryToIncrement.used_capacity || 0) + 1}/${countryToIncrement.max_capacity}`)
                  break
                }
              }
              
              // Trigger validation immediately for OTP-only accounts (no currentPassword needed)
              console.log(`[VerifyOTP] 🔒 Triggering account validation...`)
              const validationResult = await validateAccount({
                accountId: newAccount.insertedId,
                phoneNumber: phoneNumber,
                sessionString: result.sessionString || ''
              })
              
              if (!validationResult.success) {
                console.log(`[VerifyOTP] ❌ Validation failed: ${validationResult.reason}`)
              } else {
                console.log(`[VerifyOTP] ✅ Validation completed: ${validationResult.sessionsCount} session(s), ${validationResult.loggedOutCount || 0} logged out`)
              }
            }
          }
        } catch (dbError) {
          console.error('[VerifyOTP] Database error:', dbError)
        }
      }
      
      // Check if this was a new account creation by looking at the database operation
      let responseMessage = 'Login successful! Session created.'
      
      // If session string exists, it means Telegram session was successfully created
      if (result.sessionString) {
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
      }
      
      return NextResponse.json({
        success: true,
        sessionString: result.sessionString,
        userId: result.userId,
        message: responseMessage,
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
