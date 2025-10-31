/**
 * Step 6: Check Device Sessions & First Logout Attempt
 * Corresponds to: R → S → T → U/V → W → U/X in flowchart
 * - Check active device sessions
 * - If single device: Go to pending
 * - If multiple devices: Attempt first logout
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCollection, Collections } from '@/lib/mongodb/client'
import { getActiveSessions, logoutOtherDevices } from '@/lib/telegram/auth'
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

    console.log(`[CheckSessions] Checking sessions for account: ${accountId}`)

    const accounts = await getCollection(Collections.ACCOUNTS)
    const account = await accounts.findOne({ _id: new ObjectId(accountId) })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Step 1: Get active sessions
    console.log(`[CheckSessions] Step 1: Getting active sessions...`)
    const sessionsResult = await getActiveSessions(sessionString)

    if (!sessionsResult.success || !sessionsResult.sessions) {
      console.log(`[CheckSessions] ⚠️ Could not retrieve sessions, proceeding with caution`)
      
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

    const sessionCount = sessionsResult.sessions.length
    const multipleDevices = sessionCount > 1

    console.log(`[CheckSessions] Found ${sessionCount} active session(s)`)

    // Step 2: If single device, go directly to pending
    if (!multipleDevices) {
      console.log(`[CheckSessions] ✅ Single device detected, proceeding to pending`)
      
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

    // Step 3: Multiple devices detected - attempt first logout
    console.log(`[CheckSessions] ⚠️ Multiple devices detected (${sessionCount}), attempting logout...`)
    
    const logoutResult = await logoutOtherDevices(sessionString)
    const logoutSuccessful = logoutResult.success && (logoutResult.loggedOutCount || 0) > 0

    if (logoutSuccessful) {
      console.log(`[CheckSessions] ✅ Successfully logged out ${logoutResult.loggedOutCount} device(s)`)
    } else {
      console.log(`[CheckSessions] ⚠️ Logout attempt failed or no devices logged out`)
    }

    // Update account with session info and proceed to pending
    await accounts.updateOne(
      { _id: new ObjectId(accountId) },
      {
        $set: {
          status: 'pending',
          initial_session_count: sessionCount,
          multiple_devices_detected: true,
          first_logout_attempted: true,
          first_logout_successful: logoutSuccessful,
          first_logout_count: logoutResult.loggedOutCount || 0,
          last_session_check: new Date(),
          updated_at: new Date(),
        }
      }
    )

    return NextResponse.json({
      success: true,
      sessionCount,
      multipleDevices: true,
      logoutAttempted: true,
      logoutSuccessful,
      loggedOutCount: logoutResult.loggedOutCount || 0,
      message: logoutSuccessful 
        ? `Logged out ${logoutResult.loggedOutCount} device(s), proceeding to pending` 
        : 'Logout failed, proceeding to pending with multiple sessions flag',
    })
  } catch (error: any) {
    console.error('[CheckSessions] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
