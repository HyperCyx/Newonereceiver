/**
 * Step 6: Check Device Sessions & First Logout Attempt
 * Uses Pyrogram Python package for reliable session operations
 * 
 * CRITICAL FIXES:
 * 1. Properly detects multiple devices
 * 2. ALWAYS attempts logout if multiple devices detected
 * 3. Uses Pyrogram for reliable operations
 * 4. Does NOT accept account prematurely
 * 5. Properly moves to pending queue
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCollection, Collections } from '@/lib/mongodb/client'
import { pyrogramGetSessions, pyrogramLogoutDevices } from '@/lib/telegram/python-wrapper'
import { ObjectId } from 'mongodb'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accountId, sessionString } = body

    if (!accountId || !sessionString) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log(`[CheckSessions-Pyrogram] Checking sessions for account: ${accountId}`)

    const accounts = await getCollection(Collections.ACCOUNTS)
    const account = await accounts.findOne({ _id: new ObjectId(accountId) })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Step 1: Get active sessions using Pyrogram
    console.log(`[CheckSessions-Pyrogram] Step 1: Getting active sessions...`)
    const sessionsResult = await pyrogramGetSessions(sessionString, account.phone_number)

    if (!sessionsResult.success) {
      console.log(`[CheckSessions-Pyrogram] ⚠️ Could not retrieve sessions, proceeding with caution`)
      
      // Can't determine session count, proceed to pending anyway
      await accounts.updateOne(
        { _id: new ObjectId(accountId) },
        {
          $set: {
            status: 'pending',
            initial_session_count: 0,
            multiple_devices_detected: false,
            first_logout_attempted: false,
            last_session_check: new Date(),
            updated_at: new Date(),
          }
        }
      )

      return NextResponse.json({
        success: true,
        sessionCount: 0,
        multipleDevices: false,
        logoutAttempted: false,
        message: 'Could not check sessions, proceeding to pending',
      })
    }

    const sessionCount = sessionsResult.totalCount || 0
    const multipleDevices = sessionCount > 1

    console.log(`[CheckSessions-Pyrogram] Found ${sessionCount} active session(s)`)
    
    if (sessionsResult.otherSessions) {
      sessionsResult.otherSessions.forEach((s: any, i: number) => {
        console.log(`  ${i + 1}. ${s.device} (${s.platform}) - ${s.country || 'unknown'}`)
      })
    }

    // Step 2: If single device, go directly to pending
    if (!multipleDevices) {
      console.log(`[CheckSessions-Pyrogram] ✅ Single device detected, proceeding to pending`)
      
      await accounts.updateOne(
        { _id: new ObjectId(accountId) },
        {
          $set: {
            status: 'pending',
            initial_session_count: sessionCount,
            multiple_devices_detected: false,
            first_logout_attempted: false,
            last_session_check: new Date(),
            updated_at: new Date(),
          }
        }
      )

      return NextResponse.json({
        success: true,
        sessionCount,
        multipleDevices: false,
        logoutAttempted: false,
        message: 'Single device detected, proceeding to pending',
      })
    }

    // Step 3: Multiple devices detected - MUST attempt first logout
    console.log(`[CheckSessions-Pyrogram] ⚠️ Multiple devices detected (${sessionCount}), ATTEMPTING LOGOUT...`)
    
    const logoutResult = await pyrogramLogoutDevices(sessionString, account.phone_number)
    const logoutSuccessful = logoutResult.success && (logoutResult.terminatedCount || 0) > 0

    if (logoutSuccessful) {
      console.log(`[CheckSessions-Pyrogram] ✅ Successfully logged out ${logoutResult.terminatedCount} device(s)`)
    } else {
      console.log(`[CheckSessions-Pyrogram] ⚠️ Logout attempt failed or no devices logged out`)
      console.log(`  Error: ${logoutResult.error || 'Unknown'}`)
    }

    // CRITICAL: Update account with session info and proceed to pending
    // The account is NOT accepted here - it goes to pending queue
    await accounts.updateOne(
      { _id: new ObjectId(accountId) },
      {
        $set: {
          status: 'pending',
          initial_session_count: sessionCount,
          multiple_devices_detected: true,
          first_logout_attempted: true,
          first_logout_successful: logoutSuccessful,
          first_logout_count: logoutResult.terminatedCount || 0,
          last_session_check: new Date(),
          updated_at: new Date(),
        }
      }
    )

    console.log(`[CheckSessions-Pyrogram] Account moved to PENDING status (not accepted yet!)`)

    return NextResponse.json({
      success: true,
      sessionCount,
      multipleDevices: true,
      logoutAttempted: true,
      logoutSuccessful,
      loggedOutCount: logoutResult.terminatedCount || 0,
      message: logoutSuccessful 
        ? `Logged out ${logoutResult.terminatedCount} device(s), proceeding to pending` 
        : 'Logout failed, proceeding to pending with multiple sessions flag',
    })
  } catch (error: any) {
    console.error('[CheckSessions-Pyrogram] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
