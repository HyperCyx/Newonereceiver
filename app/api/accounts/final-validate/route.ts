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

    console.log(`[FinalValidate] Starting final validation for account ${accountId}`)

    const accounts = await getCollection(Collections.ACCOUNTS)
    const account = await accounts.findOne({ _id: new ObjectId(accountId) })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    if (account.status !== 'pending') {
      return NextResponse.json({
        success: false,
        message: `Account is already ${account.status}`,
        status: account.status
      })
    }

    // Final validation: Check sessions again after wait time
    console.log('[FinalValidate] Checking sessions after wait time...')
    
    const sessionsResult = await getActiveSessions(sessionString)

    if (!sessionsResult.success || !sessionsResult.sessions) {
      console.log('[FinalValidate] ⚠️ Could not retrieve sessions - keeping pending for manual review')
      
      // If we can't check sessions, keep pending for manual admin review (security)
      await accounts.updateOne(
        { _id: new ObjectId(accountId) },
        {
          $set: {
            status: 'pending',
            validation_note: 'Session check failed - requires manual review',
            session_check_failed: true,
            last_validation_attempt: new Date(),
            updated_at: new Date()
          }
        }
      )

      return NextResponse.json({
        success: false,
        status: 'pending',
        reason: 'Session check failed - requires manual admin review',
        requiresManualReview: true
      })
    }

    const currentSessionCount = sessionsResult.sessions.length
    console.log(`[FinalValidate] Current session count: ${currentSessionCount}`)

    // Check if multiple sessions still active
    if (currentSessionCount > 1) {
      console.log('[FinalValidate] Multiple devices still active, attempting force logout...')
      
      const forceLogoutResult = await logoutOtherDevices(sessionString)

      if (forceLogoutResult.success && forceLogoutResult.loggedOutCount && forceLogoutResult.loggedOutCount > 0) {
        // Successfully logged out other devices
        console.log(`[FinalValidate] ✅ Force logout successful - ${forceLogoutResult.loggedOutCount} devices removed`)
        
        await accounts.updateOne(
          { _id: new ObjectId(accountId) },
          {
            $set: {
              status: 'accepted',
              accepted_at: new Date(),
              acceptance_note: `Single device after force logout (${forceLogoutResult.loggedOutCount} devices removed)`,
              final_session_count: 1,
              force_logout_performed: true,
              updated_at: new Date()
            }
          }
        )

        // Add prize to user balance
        if (account.amount && account.amount > 0) {
          const users = await getCollection(Collections.USERS)
          await users.updateOne(
            { _id: account.user_id },
            { $inc: { balance: account.amount } }
          )
          console.log(`[FinalValidate] ✅ Added $${account.amount} to user balance`)
        }

        return NextResponse.json({
          success: true,
          status: 'accepted',
          reason: `Force logout successful - ${forceLogoutResult.loggedOutCount} devices removed`,
          amount: account.amount || 0
        })
      } else {
        // Failed to logout other devices = Security risk
        console.log('[FinalValidate] ❌ Force logout failed - SECURITY RISK')
        
        await accounts.updateOne(
          { _id: new ObjectId(accountId) },
          {
            $set: {
              status: 'rejected',
              rejection_reason: 'Security Risk - Multiple devices active, force logout failed',
              rejected_at: new Date(),
              final_session_count: currentSessionCount,
              force_logout_attempted: true,
              updated_at: new Date()
            }
          }
        )

        return NextResponse.json({
          success: false,
          status: 'rejected',
          reason: 'Security Risk - Multiple devices active, force logout failed',
          sessionCount: currentSessionCount
        })
      }
    } else {
      // Single device - Accept account
      console.log('[FinalValidate] ✅ Single device detected - ACCEPTED')
      
      await accounts.updateOne(
        { _id: new ObjectId(accountId) },
        {
          $set: {
            status: 'accepted',
            accepted_at: new Date(),
            acceptance_note: 'Single device detected',
            final_session_count: 1,
            updated_at: new Date()
          }
        }
      )

      // Add prize to user balance
      if (account.amount && account.amount > 0) {
        const users = await getCollection(Collections.USERS)
        await users.updateOne(
          { _id: account.user_id },
          { $inc: { balance: account.amount } }
        )
        console.log(`[FinalValidate] ✅ Added $${account.amount} to user balance`)
      }

      return NextResponse.json({
        success: true,
        status: 'accepted',
        reason: 'Single device detected',
        amount: account.amount || 0
      })
    }
  } catch (error: any) {
    console.error('[FinalValidate] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
