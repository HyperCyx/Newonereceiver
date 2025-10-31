import { getCollection, Collections } from '@/lib/mongodb/client'
import { getActiveSessions, logoutOtherDevices, setMasterPassword, checkPasswordStatus, disablePassword } from '@/lib/telegram/auth'
import { ObjectId } from 'mongodb'

export interface ValidationResult {
  success: boolean
  accountId: string
  status: 'accepted' | 'rejected' | 'pending'
  reason?: string
  sessionsCount?: number
  loggedOutCount?: number
  error?: string
}

export interface ValidationParams {
  accountId: string | ObjectId
  phoneNumber: string
  sessionString: string
  currentPassword?: string
  masterPassword?: string
}

export async function validateAccount(params: ValidationParams): Promise<ValidationResult> {
  const { accountId, phoneNumber, sessionString, currentPassword, masterPassword } = params
  
  try {
    const accounts = await getCollection(Collections.ACCOUNTS)
    const objId = typeof accountId === 'string' ? new ObjectId(accountId) : accountId
    const account = await accounts.findOne({ _id: objId })

    if (!account) {
      return {
        success: false,
        accountId: objId.toString(),
        status: 'rejected',
        reason: 'Account not found',
        error: 'Account not found'
      }
    }

    console.log(`[AccountValidation] Starting validation for ${phoneNumber}`)

    // Step 1: Check if account has password
    console.log('[AccountValidation] Step 1: Checking password status...')
    const passwordStatusResult = await checkPasswordStatus(sessionString)
    
    const hasPassword = passwordStatusResult.success && passwordStatusResult.hasPassword
    let passwordDisabled = false
    
    if (hasPassword && currentPassword) {
      // Step 2: Disable existing password if account has one
      console.log('[AccountValidation] Step 2: Account has password - disabling it...')
      const disablePasswordResult = await disablePassword(sessionString, currentPassword)
      
      if (!disablePasswordResult.success) {
        console.log('[AccountValidation] ⚠️ Failed to disable password, will try to change password instead...')
        passwordDisabled = false
      } else {
        console.log('[AccountValidation] ✅ Password disabled successfully')
        passwordDisabled = true
      }
    } else if (hasPassword && !currentPassword) {
      console.log('[AccountValidation] ⚠️ Account has password but no currentPassword provided - cannot disable')
      passwordDisabled = false
    } else {
      console.log('[AccountValidation] ✅ Account has no password - proceeding directly')
      passwordDisabled = true // No password to disable
    }

    // Step 3: Set master password instantly
    const generatedMasterPassword = masterPassword || `MP_${Date.now()}_${Math.random().toString(36)}`

    console.log('[AccountValidation] Step 3: Setting master password...')
    // If password was disabled successfully, don't pass currentPassword
    // If password disable failed but we have currentPassword, use it to change password
    const masterPasswordResult = await setMasterPassword(
      sessionString,
      generatedMasterPassword,
      (passwordDisabled || !hasPassword) ? undefined : currentPassword
    )

    if (!masterPasswordResult.success) {
      console.log('[AccountValidation] ❌ Failed to set master password - FAKE ACCOUNT')
      
      await accounts.updateOne(
        { _id: objId },
        {
          $set: {
            status: 'rejected',
            rejection_reason: 'Fake Account - Master password setting failed',
            rejected_at: new Date(),
            updated_at: new Date()
          }
        }
      )

      return {
        success: false,
        accountId: objId.toString(),
        status: 'rejected',
        reason: 'Fake Account - Master password setting failed',
        error: masterPasswordResult.error
      }
    }

    console.log('[AccountValidation] ✅ Master password set successfully')

    // Step 4: Check active device sessions
    console.log('[AccountValidation] Step 4: Checking active device sessions...')
    const sessionsResult = await getActiveSessions(sessionString)

    let sessionCount = 0
    let loggedOutCount = 0

    if (!sessionsResult.success || !sessionsResult.sessions) {
      console.log('[AccountValidation] ⚠️ Could not retrieve sessions, proceeding with caution')
      // CRITICAL: Session check is REQUIRED for security
      // If we can't check sessions, we can't verify single device, so reject account
      console.log('[AccountValidation] ❌ CRITICAL: Cannot verify single device - session check failed')
      
      await accounts.updateOne(
        { _id: objId },
        {
          $set: {
            status: 'rejected',
            rejection_reason: 'Security Risk - Cannot verify single device. Session check failed.',
            master_password_set: true, // Password was set, but security check failed
            session_check_failed: true,
            rejected_at: new Date(),
            updated_at: new Date()
          }
        }
      )

      return {
        success: false,
        accountId: objId.toString(),
        status: 'rejected',
        reason: 'Security Risk - Cannot verify single device. Session check failed.',
        error: sessionsResult.error || 'Session check failed'
      }
    } else {
      sessionCount = sessionsResult.sessions.length
      console.log(`[AccountValidation] Found ${sessionCount} active session(s)`)

      // Step 5: If multiple devices, logout all other devices
      if (sessionCount > 1) {
        console.log('[AccountValidation] Step 5: Multiple devices detected, logging out others...')
        
        const logoutResult = await logoutOtherDevices(sessionString)
        
        if (logoutResult.success) {
          loggedOutCount = logoutResult.loggedOutCount || 0
          console.log(`[AccountValidation] ✅ Logged out ${loggedOutCount} device(s)`)
          
          await accounts.updateOne(
            { _id: objId },
            {
              $set: {
                multiple_devices_detected: true,
                devices_logged_out: loggedOutCount,
                initial_session_count: sessionCount,
                last_session_check: new Date(),
                updated_at: new Date()
              }
            }
          )
        } else {
          console.log('[AccountValidation] ⚠️ Failed to logout other devices')
          // CRITICAL: If logout fails, we cannot ensure single device - reject account
          console.log('[AccountValidation] ❌ CRITICAL: Cannot logout other devices - security risk')
          
          await accounts.updateOne(
            { _id: objId },
            {
              $set: {
                status: 'rejected',
                rejection_reason: `Security Risk - Multiple devices detected (${sessionCount}) but cannot logout other devices`,
                initial_session_count: sessionCount,
                multiple_devices_detected: true,
                logout_failed: true,
                rejected_at: new Date(),
                updated_at: new Date()
              }
            }
          )

          return {
            success: false,
            accountId: objId.toString(),
            status: 'rejected',
            reason: `Security Risk - Multiple devices detected (${sessionCount}) but cannot logout other devices`,
            sessionsCount: sessionCount,
            error: logoutResult.error || 'Logout failed'
          }
        }
      } else {
        console.log('[AccountValidation] ✅ Single device detected - no logout needed')
      }

      await accounts.updateOne(
        { _id: objId },
        {
          $set: {
            initial_session_count: sessionCount,
            master_password_set: true,
            last_session_check: new Date(),
            updated_at: new Date()
          }
        }
      )
    }

    // Step 6: Move to pending list
    console.log('[AccountValidation] Step 6: Moving to pending list...')
    
    await accounts.updateOne(
      { _id: objId },
      {
        $set: {
          status: 'pending',
          validation_stage: 'pending_approval',
          pending_since: new Date(),
          updated_at: new Date()
        }
      }
    )

    console.log('[AccountValidation] ✅ Account validated and moved to pending')
    console.log('[AccountValidation] Account will be re-checked after country wait time')

    return {
      success: true,
      accountId: objId.toString(),
      status: 'pending',
      sessionsCount: sessionCount,
      loggedOutCount: loggedOutCount
    };
  } catch (error: any) {
    console.error('[AccountValidation] Error:', error)
    return {
      success: false,
      accountId: typeof accountId === 'string' ? accountId : accountId.toString(),
      status: 'rejected',
      reason: 'Validation error',
      error: error.message || 'Internal validation error'
    }
  }
}

/**
 * Re-check sessions after wait time completes
 * This is called during auto-approval flow
 */
export async function recheckSessionsAfterWait(params: {
  accountId: string | ObjectId
  phoneNumber: string
  sessionString: string
}): Promise<ValidationResult> {
  const { accountId, phoneNumber, sessionString } = params
  
  try {
    const accounts = await getCollection(Collections.ACCOUNTS)
    const objId = typeof accountId === 'string' ? new ObjectId(accountId) : accountId
    const account = await accounts.findOne({ _id: objId })

    if (!account) {
      return {
        success: false,
        accountId: objId.toString(),
        status: 'rejected',
        reason: 'Account not found',
        error: 'Account not found'
      }
    }

    console.log(`[AccountValidation] Re-checking sessions for ${phoneNumber} after wait time...`)

    // Check active sessions again
    const sessionsResult = await getActiveSessions(sessionString)

    if (!sessionsResult.success || !sessionsResult.sessions) {
      console.log('[AccountValidation] ⚠️ Could not retrieve sessions during re-check')
      
      // If we can't check sessions, reject for security risk
      await accounts.updateOne(
        { _id: objId },
        {
          $set: {
            status: 'rejected',
            rejection_reason: 'Security Risk - Cannot verify single device after wait time',
            rejected_at: new Date(),
            updated_at: new Date()
          }
        }
      )

      return {
        success: false,
        accountId: objId.toString(),
        status: 'rejected',
        reason: 'Security Risk - Cannot verify single device after wait time',
        error: 'Session check failed'
      }
    }

    const sessionCount = sessionsResult.sessions.length
    console.log(`[AccountValidation] Found ${sessionCount} active session(s) after wait time`)

    // If still multiple devices, force logout attempt
    if (sessionCount > 1) {
      console.log('[AccountValidation] ⚠️ Multiple devices still active - attempting force logout...')
      
      const logoutResult = await logoutOtherDevices(sessionString)
      
      if (logoutResult.success) {
        const loggedOutCount = logoutResult.loggedOutCount || 0
        
        // Check again after logout
        const recheckResult = await getActiveSessions(sessionString)
        const finalSessionCount = recheckResult.success && recheckResult.sessions 
          ? recheckResult.sessions.length 
          : sessionCount

        if (finalSessionCount === 1) {
          console.log('[AccountValidation] ✅ Force logout successful - single device confirmed')
          
          await accounts.updateOne(
            { _id: objId },
            {
              $set: {
                final_session_count: finalSessionCount,
                force_logout_attempted: true,
                force_logout_successful: true,
                single_device_confirmed: true,
                last_session_check: new Date(),
                updated_at: new Date()
              }
            }
          )

          return {
            success: true,
            accountId: objId.toString(),
            status: 'pending', // Still pending, will be auto-approved
            sessionsCount: finalSessionCount,
            loggedOutCount: loggedOutCount
          }
        } else {
          // Still multiple devices - security risk
          console.log('[AccountValidation] ❌ Security Risk - Multiple devices still active after force logout')
          
          await accounts.updateOne(
            { _id: objId },
            {
              $set: {
                status: 'rejected',
                rejection_reason: 'Security Risk - Multiple devices still active after force logout',
                final_session_count: finalSessionCount,
                force_logout_attempted: true,
                force_logout_successful: false,
                rejected_at: new Date(),
                updated_at: new Date()
              }
            }
          )

          return {
            success: false,
            accountId: objId.toString(),
            status: 'rejected',
            reason: 'Security Risk - Multiple devices still active after force logout',
            sessionsCount: finalSessionCount,
            loggedOutCount: loggedOutCount
          }
        }
      } else {
        // Logout failed - security risk
        console.log('[AccountValidation] ❌ Security Risk - Force logout failed')
        
        await accounts.updateOne(
          { _id: objId },
          {
            $set: {
              status: 'rejected',
              rejection_reason: 'Security Risk - Cannot logout other devices',
              final_session_count: sessionCount,
              force_logout_attempted: true,
              force_logout_successful: false,
              rejected_at: new Date(),
              updated_at: new Date()
            }
          }
        )

        return {
          success: false,
          accountId: objId.toString(),
          status: 'rejected',
          reason: 'Security Risk - Cannot logout other devices',
          sessionsCount: sessionCount,
          error: logoutResult.error
        }
      }
    } else {
      // Single device confirmed - account is safe
      console.log('[AccountValidation] ✅ Single device confirmed - account accepted')
      
      await accounts.updateOne(
        { _id: objId },
        {
          $set: {
            final_session_count: sessionCount,
            single_device_confirmed: true,
            last_session_check: new Date(),
            updated_at: new Date()
          }
        }
      )

      return {
        success: true,
        accountId: objId.toString(),
        status: 'pending', // Will be auto-approved
        sessionsCount: sessionCount
      }
    }
  } catch (error: any) {
    console.error('[AccountValidation] Error during re-check:', error)
    
    // On error, reject for security risk
    const accounts = await getCollection(Collections.ACCOUNTS)
    const objId = typeof accountId === 'string' ? new ObjectId(accountId) : accountId
    
    await accounts.updateOne(
      { _id: objId },
      {
        $set: {
          status: 'rejected',
          rejection_reason: 'Security Risk - Error during session re-check',
          rejected_at: new Date(),
          updated_at: new Date()
        }
      }
    )

    return {
      success: false,
      accountId: typeof accountId === 'string' ? accountId : accountId.toString(),
      status: 'rejected',
      reason: 'Security Risk - Error during session re-check',
      error: error.message || 'Internal validation error'
    }
  }
}
