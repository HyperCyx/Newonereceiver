import { NextRequest, NextResponse } from 'next/server'
import { Collections, getCollection } from '@/lib/mongodb/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { status, userId } = body

    const accounts = await getCollection(Collections.ACCOUNTS)
    const countryCapacity = await getCollection(Collections.COUNTRY_CAPACITY)
    const settings = await getCollection(Collections.SETTINGS)
    
    const query: any = {}
    if (status) query.status = status
    if (userId) query.user_id = userId
    
    const accountsList = await accounts
      .find(query)
      .sort({ created_at: -1 })
      .toArray()

    // Add auto_approve_minutes to each account
    const enrichedAccounts = await Promise.all(
      accountsList.map(async (acc) => {
        let autoApproveMinutes = 1440 // Default
        
        // Try to detect country from phone number
        const phoneDigits = acc.phone_number.replace(/[^\d]/g, '')
        let countryFound = false
        
        console.log(`[AccountsList] Detecting country for ${acc.phone_number}, digits: ${phoneDigits}`)
        
        for (let i = 1; i <= Math.min(4, phoneDigits.length) && !countryFound; i++) {
          const possibleCode = phoneDigits.substring(0, i)
          const country = await countryCapacity.findOne({ country_code: possibleCode })
          
          if (country) {
            autoApproveMinutes = country.auto_approve_minutes ?? 1440
            console.log(`[AccountsList] ✅ Country found: ${country.country_name}, code: ${possibleCode}, auto-approve: ${autoApproveMinutes} minutes`)
            countryFound = true
          }
        }
        
        if (!countryFound) {
          // Fallback to global setting
          const globalSettings = await settings.findOne({ setting_key: 'auto_approve_minutes' })
          autoApproveMinutes = parseInt(globalSettings?.setting_value || '1440')
          console.log(`[AccountsList] No country found for ${acc.phone_number}, using global: ${autoApproveMinutes} minutes`)
        }
        
        return {
          ...acc,
          auto_approve_minutes: autoApproveMinutes
        }
      })
    )

    return NextResponse.json({
      success: true,
      accounts: enrichedAccounts
    })
  } catch (error) {
    console.error('[AccountsList] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
