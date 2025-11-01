/**
 * Step 7: Add to Pending Queue with Country Wait Time
 * Corresponds to: U/X → Y → Z in flowchart
 * - Add account to pending queue
 * - Apply country-specific wait time
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCollection, Collections } from '@/lib/mongodb/client'
import { ObjectId } from 'mongodb'

async function getWaitTimeForCountry(countryCode: string): Promise<number> {
  const countryCapacity = await getCollection(Collections.COUNTRY_CAPACITY)
  
  // Try to find country by code
  const country = await countryCapacity.findOne({
    $or: [
      { country_code: countryCode },
      { country_code: `+${countryCode.replace('+', '')}` }
    ]
  })

  if (country && country.wait_time_minutes) {
    return country.wait_time_minutes
  }

  // Fallback to global default
  const settings = await getCollection(Collections.SETTINGS)
  const defaultSetting = await settings.findOne({ setting_key: 'default_wait_time_minutes' })
  
  if (defaultSetting && defaultSetting.setting_value) {
    return parseInt(defaultSetting.setting_value)
  }

  // Ultimate fallback: 24 hours
  return 1440
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accountId } = body

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID is required' },
        { status: 400 }
      )
    }

    console.log(`[AddToPending] Adding account to pending queue: ${accountId}`)

    const accounts = await getCollection(Collections.ACCOUNTS)
    const account = await accounts.findOne({ _id: new ObjectId(accountId) })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Get wait time for this account's country
    const waitMinutes = await getWaitTimeForCountry(account.country_code)
    const pendingSince = new Date()
    const readyAt = new Date(pendingSince.getTime() + waitMinutes * 60 * 1000)

    console.log(`[AddToPending] Country: ${account.country_code}, Wait time: ${waitMinutes} minutes`)
    console.log(`[AddToPending] Ready at: ${readyAt.toISOString()}`)

    // Update account status
    await accounts.updateOne(
      { _id: new ObjectId(accountId) },
      {
        $set: {
          status: 'pending',
          pending_since: pendingSince,
          country_wait_minutes: waitMinutes,
          ready_for_final_validation: false,
          updated_at: new Date(),
        }
      }
    )

    console.log(`[AddToPending] ✅ Account added to pending queue`)

    return NextResponse.json({
      success: true,
      accountId,
      waitMinutes,
      pendingSince,
      readyAt,
      message: `Account in pending queue, will be ready for validation in ${waitMinutes} minutes`,
    })
  } catch (error: any) {
    console.error('[AddToPending] Error:', error)
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
        { error: 'Account ID is required' },
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

    if (account.status !== 'pending') {
      return NextResponse.json({
        accountId,
        status: account.status,
        message: `Account is ${account.status}`,
      })
    }

    const now = new Date()
    const pendingSince = account.pending_since || account.created_at
    const waitMinutes = account.country_wait_minutes || 1440
    const minutesPassed = (now.getTime() - pendingSince.getTime()) / (1000 * 60)
    const minutesRemaining = Math.max(0, waitMinutes - minutesPassed)
    const isReady = minutesPassed >= waitMinutes

    return NextResponse.json({
      accountId,
      status: account.status,
      waitMinutes,
      minutesPassed: Math.floor(minutesPassed),
      minutesRemaining: Math.ceil(minutesRemaining),
      isReady,
      readyAt: new Date(pendingSince.getTime() + waitMinutes * 60 * 1000),
      message: isReady ? 'Ready for final validation' : `${Math.ceil(minutesRemaining)} minutes remaining`,
    })
  } catch (error: any) {
    console.error('[AddToPending] GET Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
