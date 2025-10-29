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

    console.log(`[AccountsList] Found ${accountsList.length} accounts with query:`, query)
    console.log(`[AccountsList] Raw accounts:`, accountsList.map(a => ({
      id: a._id,
      phone: a.phone_number,
      amount: a.amount,
      status: a.status,
      created_at: a.created_at
    })))
    
    // Log any accounts with undefined or 0 amount
    const zeroAmountAccounts = accountsList.filter(a => !a.amount || a.amount === 0)
    if (zeroAmountAccounts.length > 0) {
      console.log(`[AccountsList] ⚠️ Found ${zeroAmountAccounts.length} accounts with 0 or undefined amount:`, 
        zeroAmountAccounts.map(a => ({ phone: a.phone_number, amount: a.amount, status: a.status }))
      )
    }

    // Add auto_approve_minutes to each account
    const enrichedAccounts = await Promise.all(
      accountsList.map(async (acc) => {
        let autoApproveMinutes = 1440 // Default
        
        // Try to detect country from phone number
        const phoneDigits = acc.phone_number.replace(/[^\d]/g, '')
        let countryFound = false
        let detectedCountry = null
        
        console.log(`[AccountsList] Detecting country for ${acc.phone_number}, digits: ${phoneDigits}`)
        
        for (let i = 1; i <= Math.min(4, phoneDigits.length) && !countryFound; i++) {
          const possibleCode = phoneDigits.substring(0, i)
          
          // Try both with and without + prefix
          const country = await countryCapacity.findOne({ 
            $or: [
              { country_code: possibleCode },
              { country_code: `+${possibleCode}` }
            ]
          })
          
          console.log(`[AccountsList] Trying code: ${possibleCode} and +${possibleCode}, found:`, country ? `${country.country_name}` : 'none')
          
          if (country) {
            autoApproveMinutes = country.auto_approve_minutes ?? 1440
            detectedCountry = country
            console.log(`[AccountsList] ✅ Country found: ${country.country_name}, code: ${country.country_code}, auto-approve: ${autoApproveMinutes} minutes, prize: ${country.prize_amount}`)
            countryFound = true
          }
        }
        
        if (!countryFound) {
          // Fallback to global setting
          const globalSettings = await settings.findOne({ setting_key: 'auto_approve_minutes' })
          autoApproveMinutes = parseInt(globalSettings?.setting_value || '1440')
          console.log(`[AccountsList] ❌ No country found for ${acc.phone_number}, using global: ${autoApproveMinutes} minutes`)
        }
        
        const enriched = {
          ...acc,
          auto_approve_minutes: autoApproveMinutes,
          detected_country: detectedCountry ? detectedCountry.country_name : null
        }
        
        console.log(`[AccountsList] Enriched account:`, {
          phone: enriched.phone_number,
          amount: enriched.amount,
          auto_approve_minutes: enriched.auto_approve_minutes,
          detected_country: enriched.detected_country
        })
        
        return enriched
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
