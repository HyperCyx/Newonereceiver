/**
 * Step 8: Final Validation
 * Corresponds to: AA → BB → CC/DD → EE → FF → CC/GG → HH/II in flowchart
 * - Final check for multiple active devices
 * - Final logout attempt if needed
 * - Accept or reject account
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

    console.log(`[FinalValidate] Starting final validation for account: ${accountId}`)

    const accounts = await getCollection(Collections.ACCOUNTS)
    const account = await accounts.findOne({ _id: new ObjectId(accountId) })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Check if account is in pending status
    if (account.status !== 'pending') {
      return NextResponse.json({
        success: false,
        error: `Account is in ${account.status} status, not pending`,
      }, { status: 400 })
    }

    // Check if wait time has passed
    const now = new Date()
    const pendingSince = account.pending_since || account.created_at
    const waitMinutes = account.country_wait_minutes || 1440
    const minutesPassed = (now.getTime() - pendingSince.getTime()) / (1000 * 60)

    if (minutesPassed < waitMinutes) {
      return NextResponse.json({
        success: false,
        error: `Wait time not yet completed. ${Math.ceil(waitMinutes - minutesPassed)} minutes remaining`,
      }, { status: 400 })
    }

    // Update status to final_validation
    await accounts.updateOne(
      { _id: new ObjectId(accountId) },
      {
        $set: {
          status: 'final_validation',
          final_validation_at: new Date(),
          updated_at: new Date(),
        }
      }
    )

    console.log(`[FinalValidate] Step 1: Checking active sessions...`)

    // Step 1: Get active sessions
    const sessionsResult = await pyrogramGetSessions(sessionString, account.phone_number)

    if (!sessionsResult.success) {
      console.log(`[FinalValidate] ⚠️ Could not retrieve sessions`)
      
      // Can't verify sessions, but we'll accept anyway if wait time passed
      await accounts.updateOne(
        { _id: new ObjectId(accountId) },
        {
          $set: {
            status: 'accepted',
            accepted_at: new Date(),
            final_session_count: 0,
            updated_at: new Date(),
          }
        }
      )

      // Increment country capacity
      await incrementCountryCapacity(account.country_code)

      return NextResponse.json({
        success: true,
        status: 'accepted',
        sessionCount: 0,
        message: 'Could not verify sessions, but wait time passed - ACCEPTED',
      })
    }

    const sessionCount = sessionsResult.totalCount || 0
    const multipleDevices = sessionCount > 1

    console.log(`[FinalValidate] Found ${sessionCount} active session(s)`)

    // Step 2: If single device, accept immediately
    if (!multipleDevices) {
      console.log(`[FinalValidate] ✅ Single device detected - ACCEPTING`)
      
      await accounts.updateOne(
        { _id: new ObjectId(accountId) },
        {
          $set: {
            status: 'accepted',
            accepted_at: new Date(),
            final_session_count: sessionCount,
            updated_at: new Date(),
          }
        }
      )

      // Increment country capacity
      await incrementCountryCapacity(account.country_code)

      return NextResponse.json({
        success: true,
        status: 'accepted',
        sessionCount,
        multipleDevices: false,
        message: 'Single device detected - ACCEPTED ✅',
      })
    }

    // Step 3: Multiple devices still active - check if sessions died naturally
    console.log(`[FinalValidate] ⚠️ Multiple devices still detected (${sessionCount})`)

    // If first logout was successful and sessions are still multiple,
    // it means new sessions were created or sessions came back online
    const sessionsStillAlive = multipleDevices

    if (!sessionsStillAlive) {
      // Sessions died naturally
      console.log(`[FinalValidate] ✅ Sessions died naturally - ACCEPTING`)
      
      await accounts.updateOne(
        { _id: new ObjectId(accountId) },
        {
          $set: {
            status: 'accepted',
            accepted_at: new Date(),
            final_session_count: sessionCount,
            updated_at: new Date(),
          }
        }
      )

      // Increment country capacity
      await incrementCountryCapacity(account.country_code)

      return NextResponse.json({
        success: true,
        status: 'accepted',
        sessionCount,
        message: 'Sessions died naturally - ACCEPTED ✅',
      })
    }

    // Step 4: Sessions still alive - attempt final logout
    console.log(`[FinalValidate] Step 2: Attempting final logout...`)
    
    const finalLogoutResult = await pyrogramLogoutDevices(sessionString, account.phone_number)
    const finalLogoutSuccessful = finalLogoutResult.success && (finalLogoutResult.terminatedCount || 0) > 0

    if (finalLogoutSuccessful) {
      console.log(`[FinalValidate] ✅ Final logout successful (${finalLogoutResult.terminatedCount} devices) - ACCEPTING`)
      
      await accounts.updateOne(
        { _id: new ObjectId(accountId) },
        {
          $set: {
            status: 'accepted',
            accepted_at: new Date(),
            final_session_count: sessionCount,
            final_logout_attempted: true,
            final_logout_successful: true,
            final_logout_count: finalLogoutResult.terminatedCount,
            updated_at: new Date(),
          }
        }
      )

      // Increment country capacity
      await incrementCountryCapacity(account.country_code)

      return NextResponse.json({
        success: true,
        status: 'accepted',
        sessionCount,
        finalLogoutAttempted: true,
        finalLogoutSuccessful: true,
        loggedOutCount: finalLogoutResult.terminatedCount,
        message: `Final logout successful - ACCEPTED ✅`,
      })
    }

    // Step 5: Final logout failed - REJECT
    console.log(`[FinalValidate] ❌ Final logout failed - REJECTING`)
    
    await accounts.updateOne(
      { _id: new ObjectId(accountId) },
      {
        $set: {
          status: 'rejected',
          rejected_at: new Date(),
          rejection_reason: 'Multiple devices still active after final logout attempt',
          final_session_count: sessionCount,
          final_logout_attempted: true,
          final_logout_successful: false,
          updated_at: new Date(),
        }
      }
    )

    return NextResponse.json({
      success: true,
      status: 'rejected',
      sessionCount,
      finalLogoutAttempted: true,
      finalLogoutSuccessful: false,
      reason: 'Multiple devices still active after final logout attempt',
      message: 'Multiple devices still active - REJECTED ❌',
    })
  } catch (error: any) {
    console.error('[FinalValidate] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to increment country capacity
async function incrementCountryCapacity(countryCode: string) {
  try {
    const countryCapacity = await getCollection(Collections.COUNTRY_CAPACITY)
    
    const result = await countryCapacity.updateOne(
      {
        $or: [
          { country_code: countryCode },
          { country_code: `+${countryCode.replace('+', '')}` }
        ]
      },
      {
        $inc: { used_capacity: 1 },
        $set: { updated_at: new Date() }
      }
    )

    if (result.modifiedCount > 0) {
      console.log(`[FinalValidate] ✅ Incremented capacity for country: ${countryCode}`)
    }
  } catch (error) {
    console.error('[FinalValidate] Error incrementing country capacity:', error)
  }
}
