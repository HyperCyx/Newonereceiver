/**
 * Get Pending Accounts List
 * List all accounts in pending status with their wait time information
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCollection, Collections } from '@/lib/mongodb/client'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const readyOnly = searchParams.get('ready') === 'true'

    console.log(`[PendingList] Getting pending accounts${readyOnly ? ' (ready only)' : ''}`)

    const accounts = await getCollection(Collections.ACCOUNTS)
    
    // Find all pending accounts
    const pendingAccounts = await accounts
      .find({ status: 'pending' })
      .sort({ pending_since: 1 })
      .toArray()

    const now = new Date()
    const accountsWithStatus = pendingAccounts.map((account: any) => {
      const pendingSince = account.pending_since || account.created_at
      const waitMinutes = account.country_wait_minutes || 1440
      const minutesPassed = (now.getTime() - pendingSince.getTime()) / (1000 * 60)
      const minutesRemaining = Math.max(0, waitMinutes - minutesPassed)
      const isReady = minutesPassed >= waitMinutes

      return {
        _id: account._id.toString(),
        phone_number: account.phone_number,
        country_code: account.country_code,
        status: account.status,
        pending_since: pendingSince,
        wait_minutes: waitMinutes,
        minutes_passed: Math.floor(minutesPassed),
        minutes_remaining: Math.ceil(minutesRemaining),
        is_ready: isReady,
        ready_at: new Date(pendingSince.getTime() + waitMinutes * 60 * 1000),
        multiple_devices_detected: account.multiple_devices_detected || false,
        initial_session_count: account.initial_session_count || 0,
        first_logout_successful: account.first_logout_successful || false,
      }
    })

    // Filter ready accounts if requested
    const filteredAccounts = readyOnly 
      ? accountsWithStatus.filter(acc => acc.is_ready)
      : accountsWithStatus

    console.log(`[PendingList] Found ${filteredAccounts.length} pending account(s)${readyOnly ? ' ready for validation' : ''}`)

    return NextResponse.json({
      success: true,
      total: filteredAccounts.length,
      accounts: filteredAccounts,
    })
  } catch (error: any) {
    console.error('[PendingList] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
