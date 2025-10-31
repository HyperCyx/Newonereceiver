/**
 * Step 1: Check Database Capacity & Not Sold
 * Corresponds to: A → B → C/D in flowchart
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCollection, Collections } from '@/lib/mongodb/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber } = body

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    console.log(`[CheckCapacity] Checking capacity for: ${phoneNumber}`)

    // Extract country code from phone number
    const phoneDigits = phoneNumber.replace(/[^\d]/g, '')
    let countryCode = ''
    let countryFound = false

    // Try to match country code (1-4 digits)
    const countryCapacity = await getCollection(Collections.COUNTRY_CAPACITY)
    
    for (let i = 1; i <= Math.min(4, phoneDigits.length) && !countryFound; i++) {
      const possibleCode = phoneDigits.substring(0, i)
      const country = await countryCapacity.findOne({
        $or: [
          { country_code: possibleCode },
          { country_code: `+${possibleCode}` }
        ]
      })

      if (country) {
        countryCode = country.country_code
        countryFound = true

        console.log(`[CheckCapacity] Found country: ${country.country_name} (${countryCode})`)

        // Check if country is active
        if (!country.is_active) {
          console.log(`[CheckCapacity] ❌ Country ${country.country_name} is not active`)
          return NextResponse.json({
            success: false,
            hasCapacity: false,
            reason: 'COUNTRY_INACTIVE',
            message: `${country.country_name} is currently not accepting new accounts`,
          })
        }

        // Check capacity
        if (country.used_capacity >= country.max_capacity) {
          console.log(`[CheckCapacity] ❌ No capacity: ${country.used_capacity}/${country.max_capacity}`)
          return NextResponse.json({
            success: false,
            hasCapacity: false,
            reason: 'NO_CAPACITY',
            message: `No capacity available for ${country.country_name}`,
            capacity: {
              used: country.used_capacity,
              max: country.max_capacity,
            },
          })
        }

        console.log(`[CheckCapacity] ✅ Capacity available: ${country.used_capacity}/${country.max_capacity}`)
      }
    }

    if (!countryFound) {
      console.log(`[CheckCapacity] ⚠️ Country not found for phone: ${phoneNumber}`)
      return NextResponse.json({
        success: false,
        hasCapacity: false,
        reason: 'COUNTRY_NOT_SUPPORTED',
        message: 'Country code not supported',
      })
    }

    // Check if account already exists and is sold
    const accounts = await getCollection(Collections.ACCOUNTS)
    const existingAccount = await accounts.findOne({ phone_number: phoneNumber })

    if (existingAccount) {
      if (existingAccount.status === 'accepted') {
        console.log(`[CheckCapacity] ❌ Account already sold`)
        return NextResponse.json({
          success: false,
          hasCapacity: false,
          reason: 'ALREADY_SOLD',
          message: 'This account has already been sold',
        })
      }

      // If account exists but not accepted, allow retry
      console.log(`[CheckCapacity] ⚠️ Account exists with status: ${existingAccount.status}`)
      return NextResponse.json({
        success: true,
        hasCapacity: true,
        countryCode,
        existingAccountId: existingAccount._id,
        message: 'Account exists, can retry',
      })
    }

    // All checks passed
    console.log(`[CheckCapacity] ✅ All checks passed, capacity available`)
    return NextResponse.json({
      success: true,
      hasCapacity: true,
      countryCode,
      message: 'Capacity available',
    })
  } catch (error: any) {
    console.error('[CheckCapacity] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
