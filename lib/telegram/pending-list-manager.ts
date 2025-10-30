/**
 * Pending List Management System
 * 
 * Manages accounts in pending state, applies wait times, and processes final decisions
 */

import { getCollection, Collections } from '@/lib/mongodb/client'
import { finalSessionCheckAndDecision } from './account-verification-workflow'

export interface PendingAccount {
  _id: string
  user_id: string
  phone_number: string
  amount: number
  status: 'pending' | 'accepted' | 'rejected'
  session_string?: string
  telegram_user_id?: string
  wait_time_minutes: number
  country_code?: string
  country_name?: string
  created_at: Date
  updated_at: Date
  approved_at?: Date
  rejected_at?: Date
  rejection_reason?: string
  auto_approved?: boolean
}

/**
 * Get all pending accounts
 */
export async function getPendingAccounts(): Promise<PendingAccount[]> {
  try {
    const accounts = await getCollection(Collections.ACCOUNTS)
    const pendingAccounts = await accounts
      .find({ status: 'pending' })
      .sort({ created_at: -1 })
      .toArray()

    return pendingAccounts as any[]
  } catch (error) {
    console.error('[PendingList] Error getting pending accounts:', error)
    return []
  }
}

/**
 * Get pending accounts by user
 */
export async function getUserPendingAccounts(userId: string): Promise<PendingAccount[]> {
  try {
    const accounts = await getCollection(Collections.ACCOUNTS)
    const userAccounts = await accounts
      .find({ user_id: userId, status: 'pending' })
      .sort({ created_at: -1 })
      .toArray()

    return userAccounts as any[]
  } catch (error) {
    console.error('[PendingList] Error getting user pending accounts:', error)
    return []
  }
}

/**
 * Get accounts ready for auto-approval (wait time has passed)
 */
export async function getAccountsReadyForApproval(): Promise<PendingAccount[]> {
  try {
    const accounts = await getCollection(Collections.ACCOUNTS)
    const pendingAccounts = await getPendingAccounts()

    const readyAccounts: PendingAccount[] = []
    const now = new Date()

    for (const account of pendingAccounts) {
      const createdAt = new Date(account.created_at)
      const waitTimeMs = (account.wait_time_minutes || 1440) * 60 * 1000
      const timeElapsed = now.getTime() - createdAt.getTime()

      if (timeElapsed >= waitTimeMs) {
        readyAccounts.push(account as any)
      }
    }

    console.log(`[PendingList] Found ${readyAccounts.length} accounts ready for approval`)
    return readyAccounts
  } catch (error) {
    console.error('[PendingList] Error getting accounts ready for approval:', error)
    return []
  }
}

/**
 * Process pending accounts that are ready for approval
 */
export async function processPendingAccounts(): Promise<{
  processed: number
  accepted: number
  rejected: number
  failed: number
  results: any[]
}> {
  try {
    console.log('[PendingList] ========== PROCESSING PENDING ACCOUNTS ==========')
    
    const readyAccounts = await getAccountsReadyForApproval()
    
    if (readyAccounts.length === 0) {
      console.log('[PendingList] No accounts ready for processing')
      return {
        processed: 0,
        accepted: 0,
        rejected: 0,
        failed: 0,
        results: [],
      }
    }

    console.log(`[PendingList] Processing ${readyAccounts.length} accounts...`)

    let accepted = 0
    let rejected = 0
    let failed = 0
    const results: any[] = []

    for (const account of readyAccounts) {
      try {
        console.log(`[PendingList] Processing account: ${account.phone_number}`)

        if (!account.session_string) {
          console.log(`[PendingList] ⚠️  No session string for ${account.phone_number}, skipping`)
          failed++
          results.push({
            phoneNumber: account.phone_number,
            status: 'failed',
            reason: 'No session string',
          })
          continue
        }

        // Run final session check and decision
        const result = await finalSessionCheckAndDecision(
          account.phone_number,
          account.session_string
        )

        if (result.success && result.data?.decision === 'accepted') {
          accepted++
          console.log(`[PendingList] ✅ Account accepted: ${account.phone_number}`)
        } else {
          rejected++
          console.log(`[PendingList] ❌ Account rejected: ${account.phone_number}`)
        }

        results.push({
          phoneNumber: account.phone_number,
          status: result.success ? 'success' : 'failed',
          decision: result.data?.decision,
          message: result.message,
        })
      } catch (error: any) {
        console.error(`[PendingList] Error processing account ${account.phone_number}:`, error)
        failed++
        results.push({
          phoneNumber: account.phone_number,
          status: 'failed',
          error: error.message,
        })
      }
    }

    console.log('[PendingList] ========== PROCESSING COMPLETE ==========')
    console.log(`[PendingList] Total: ${readyAccounts.length}, Accepted: ${accepted}, Rejected: ${rejected}, Failed: ${failed}`)

    return {
      processed: readyAccounts.length,
      accepted,
      rejected,
      failed,
      results,
    }
  } catch (error) {
    console.error('[PendingList] Error processing pending accounts:', error)
    return {
      processed: 0,
      accepted: 0,
      rejected: 0,
      failed: 0,
      results: [],
    }
  }
}

/**
 * Get account status and remaining wait time
 */
export async function getAccountStatus(phoneNumber: string): Promise<{
  found: boolean
  status?: string
  waitTimeRemaining?: number
  totalWaitTime?: number
  amount?: number
  countryName?: string
  createdAt?: Date
  approvedAt?: Date
  rejectedAt?: Date
  rejectionReason?: string
}> {
  try {
    const accounts = await getCollection(Collections.ACCOUNTS)
    const account = await accounts.findOne({ phone_number: phoneNumber })

    if (!account) {
      return { found: false }
    }

    const now = new Date()
    const createdAt = new Date(account.created_at)
    const waitTimeMs = (account.wait_time_minutes || 1440) * 60 * 1000
    const timeElapsed = now.getTime() - createdAt.getTime()
    const waitTimeRemaining = Math.max(0, waitTimeMs - timeElapsed)

    return {
      found: true,
      status: account.status,
      waitTimeRemaining: Math.ceil(waitTimeRemaining / 60000), // Convert to minutes
      totalWaitTime: account.wait_time_minutes || 1440,
      amount: account.amount,
      countryName: account.country_name,
      createdAt: account.created_at,
      approvedAt: account.approved_at,
      rejectedAt: account.rejected_at,
      rejectionReason: account.rejection_reason,
    }
  } catch (error) {
    console.error('[PendingList] Error getting account status:', error)
    return { found: false }
  }
}

/**
 * Manually approve an account (admin action)
 */
export async function manualApproveAccount(phoneNumber: string): Promise<{
  success: boolean
  message: string
}> {
  try {
    const accounts = await getCollection(Collections.ACCOUNTS)
    const account = await accounts.findOne({ phone_number: phoneNumber })

    if (!account) {
      return {
        success: false,
        message: 'Account not found',
      }
    }

    if (account.status !== 'pending') {
      return {
        success: false,
        message: `Account is already ${account.status}`,
      }
    }

    // Update account status
    await accounts.updateOne(
      { _id: account._id },
      { 
        $set: { 
          status: 'accepted',
          approved_at: new Date(),
          auto_approved: false,
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
      console.log(`[PendingList] Added $${account.amount} to user balance`)
    }

    return {
      success: true,
      message: `Account approved successfully. Added $${account.amount} to balance`,
    }
  } catch (error: any) {
    console.error('[PendingList] Error manually approving account:', error)
    return {
      success: false,
      message: error.message,
    }
  }
}

/**
 * Manually reject an account (admin action)
 */
export async function manualRejectAccount(
  phoneNumber: string,
  reason: string
): Promise<{
  success: boolean
  message: string
}> {
  try {
    const accounts = await getCollection(Collections.ACCOUNTS)
    const account = await accounts.findOne({ phone_number: phoneNumber })

    if (!account) {
      return {
        success: false,
        message: 'Account not found',
      }
    }

    if (account.status !== 'pending') {
      return {
        success: false,
        message: `Account is already ${account.status}`,
      }
    }

    // Update account status
    await accounts.updateOne(
      { _id: account._id },
      { 
        $set: { 
          status: 'rejected',
          rejected_at: new Date(),
          rejection_reason: reason,
          updated_at: new Date(),
        }
      }
    )

    return {
      success: true,
      message: 'Account rejected successfully',
    }
  } catch (error: any) {
    console.error('[PendingList] Error manually rejecting account:', error)
    return {
      success: false,
      message: error.message,
    }
  }
}

/**
 * Remove account from pending list (admin cleanup)
 */
export async function removeFromPendingList(phoneNumber: string): Promise<{
  success: boolean
  message: string
}> {
  try {
    const accounts = await getCollection(Collections.ACCOUNTS)
    const result = await accounts.deleteOne({ phone_number: phoneNumber })

    if (result.deletedCount === 0) {
      return {
        success: false,
        message: 'Account not found',
      }
    }

    return {
      success: true,
      message: 'Account removed from pending list',
    }
  } catch (error: any) {
    console.error('[PendingList] Error removing account:', error)
    return {
      success: false,
      message: error.message,
    }
  }
}
