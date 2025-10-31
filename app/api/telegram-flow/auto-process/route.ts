/**
 * Auto-Process Pending Accounts
 * Background job to automatically validate all ready accounts
 * This should be run periodically (e.g., every 5-10 minutes)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCollection, Collections } from '@/lib/mongodb/client'
import { getActiveSessions, logoutOtherDevices } from '@/lib/telegram/auth'
import { ObjectId } from 'mongodb'

export async function POST(request: NextRequest) {
  try {
    console.log(`[AutoProcess] Starting auto-process job...`)

    const accounts = await getCollection(Collections.ACCOUNTS)
    
    // Find all pending accounts that are ready for validation
    const now = new Date()
    const pendingAccounts = await accounts
      .find({ status: 'pending' })
      .toArray()

    console.log(`[AutoProcess] Found ${pendingAccounts.length} pending account(s)`)

    // Filter accounts that are ready (wait time has passed)
    const readyAccounts = pendingAccounts.filter((account: any) => {
      const pendingSince = account.pending_since || account.created_at
      const waitMinutes = account.country_wait_minutes || 1440
      const minutesPassed = (now.getTime() - pendingSince.getTime()) / (1000 * 60)
      return minutesPassed >= waitMinutes
    })

    console.log(`[AutoProcess] ${readyAccounts.length} account(s) ready for validation`)

    if (readyAccounts.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        accepted: 0,
        rejected: 0,
        message: 'No accounts ready for validation',
      })
    }

    let acceptedCount = 0
    let rejectedCount = 0
    const results = []

    // Process each ready account
    for (const account of readyAccounts) {
      const accountId = account._id.toString()
      const sessionString = account.session_string

      if (!sessionString) {
        console.log(`[AutoProcess] ⚠️ Account ${accountId} has no session string, skipping`)
        continue
      }

      console.log(`[AutoProcess] Processing account: ${account.phone_number}`)

      try {
        // Update status to final_validation
        await accounts.updateOne(
          { _id: account._id },
          {
            $set: {
              status: 'final_validation',
              final_validation_at: new Date(),
              updated_at: new Date(),
            }
          }
        )

        // Get active sessions
        const sessionsResult = await getActiveSessions(sessionString)

        if (!sessionsResult.success || !sessionsResult.sessions) {
          // Can't verify sessions, accept anyway
          await accounts.updateOne(
            { _id: account._id },
            {
              $set: {
                status: 'accepted',
                accepted_at: new Date(),
                final_session_count: 0,
                updated_at: new Date(),
              }
            }
          )
          await incrementCountryCapacity(account.country_code)
          acceptedCount++
          results.push({ accountId, status: 'accepted', reason: 'session_check_failed' })
          console.log(`[AutoProcess] ✅ ${account.phone_number} - ACCEPTED (session check failed)`)
          continue
        }

        const sessionCount = sessionsResult.sessions.length
        const multipleDevices = sessionCount > 1

        // Single device - accept
        if (!multipleDevices) {
          await accounts.updateOne(
            { _id: account._id },
            {
              $set: {
                status: 'accepted',
                accepted_at: new Date(),
                final_session_count: sessionCount,
                updated_at: new Date(),
              }
            }
          )
          await incrementCountryCapacity(account.country_code)
          acceptedCount++
          results.push({ accountId, status: 'accepted', sessionCount })
          console.log(`[AutoProcess] ✅ ${account.phone_number} - ACCEPTED (single device)`)
          continue
        }

        // Multiple devices - attempt final logout
        console.log(`[AutoProcess] ⚠️ ${account.phone_number} - Multiple devices (${sessionCount}), attempting logout...`)
        
        const logoutResult = await logoutOtherDevices(sessionString)
        const logoutSuccessful = logoutResult.success && (logoutResult.loggedOutCount || 0) > 0

        if (logoutSuccessful) {
          // Logout successful - accept
          await accounts.updateOne(
            { _id: account._id },
            {
              $set: {
                status: 'accepted',
                accepted_at: new Date(),
                final_session_count: sessionCount,
                final_logout_attempted: true,
                final_logout_successful: true,
                final_logout_count: logoutResult.loggedOutCount,
                updated_at: new Date(),
              }
            }
          )
          await incrementCountryCapacity(account.country_code)
          acceptedCount++
          results.push({ 
            accountId, 
            status: 'accepted', 
            sessionCount, 
            loggedOutCount: logoutResult.loggedOutCount 
          })
          console.log(`[AutoProcess] ✅ ${account.phone_number} - ACCEPTED (logout successful)`)
        } else {
          // Logout failed - reject
          await accounts.updateOne(
            { _id: account._id },
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
          rejectedCount++
          results.push({ 
            accountId, 
            status: 'rejected', 
            reason: 'multiple_devices_active',
            sessionCount 
          })
          console.log(`[AutoProcess] ❌ ${account.phone_number} - REJECTED (multiple devices)`)
        }
      } catch (error: any) {
        console.error(`[AutoProcess] Error processing account ${accountId}:`, error)
        results.push({ 
          accountId, 
          status: 'error', 
          error: error.message 
        })
      }
    }

    console.log(`[AutoProcess] ✅ Job complete: ${acceptedCount} accepted, ${rejectedCount} rejected`)

    return NextResponse.json({
      success: true,
      processed: readyAccounts.length,
      accepted: acceptedCount,
      rejected: rejectedCount,
      results,
      message: `Processed ${readyAccounts.length} account(s): ${acceptedCount} accepted, ${rejectedCount} rejected`,
    })
  } catch (error: any) {
    console.error('[AutoProcess] Error:', error)
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
    
    await countryCapacity.updateOne(
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
  } catch (error) {
    console.error('[AutoProcess] Error incrementing country capacity:', error)
  }
}

// Cron job endpoint - can be called by external scheduler
export async function GET(request: NextRequest) {
  // Verify authorization (optional - add your auth logic)
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET || 'your-secret-key'

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Call POST handler
  return POST(request)
}
