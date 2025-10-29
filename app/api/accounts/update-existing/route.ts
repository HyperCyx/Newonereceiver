import { NextRequest, NextResponse } from 'next/server'
import { Collections, getCollection } from '@/lib/mongodb/client'

/**
 * POST /api/accounts/update-existing
 * Update existing pending accounts with prize amounts from countries
 * This is a utility endpoint to fix accounts created before prize system
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[UpdateExisting] Starting update of existing accounts...')
    
    const accounts = await getCollection(Collections.ACCOUNTS)
    const countryCapacity = await getCollection(Collections.COUNTRY_CAPACITY)
    const settings = await getCollection(Collections.SETTINGS)
    
    // Find all accounts with amount = 0
    const accountsToUpdate = await accounts
      .find({ amount: 0 })
      .toArray()
    
    console.log(`[UpdateExisting] Found ${accountsToUpdate.length} accounts with amount = 0`)
    
    let updatedCount = 0
    let skippedCount = 0
    
    for (const account of accountsToUpdate) {
      try {
        // Detect country from phone number
        const phoneDigits = account.phone_number.replace(/[^\d]/g, '')
        let prizeAmount = 0
        let countryFound = false
        let countryName = 'Unknown'
        
        console.log(`[UpdateExisting] Processing ${account.phone_number}, digits: ${phoneDigits}`)
        
        for (let i = 1; i <= Math.min(4, phoneDigits.length) && !countryFound; i++) {
          const possibleCode = phoneDigits.substring(0, i)
          console.log(`[UpdateExisting] Trying country code: ${possibleCode} and +${possibleCode}`)
          
          // Try both with and without + prefix
          const country = await countryCapacity.findOne({ 
            $or: [
              { country_code: possibleCode },
              { country_code: `+${possibleCode}` }
            ]
          })
          
          if (country) {
            prizeAmount = country.prize_amount || 0
            countryName = country.country_name
            console.log(`[UpdateExisting] ✅ Country found: ${countryName}, code: ${country.country_code}, prize: $${prizeAmount}`)
            countryFound = true
          }
        }
        
        if (!countryFound) {
          console.log(`[UpdateExisting] ❌ No country found for ${account.phone_number}, skipping (add country code first!)`)
          skippedCount++
          continue
        }
        
        // Update account with prize amount (even if 0, to mark it as processed)
        await accounts.updateOne(
          { _id: account._id },
          { 
            $set: { 
              amount: prizeAmount,
              updated_at: new Date()
            } 
          }
        )
        
        console.log(`[UpdateExisting] ✅ Updated ${account.phone_number} with prize: $${prizeAmount}`)
        updatedCount++
      } catch (error) {
        console.error(`[UpdateExisting] Error processing account ${account._id}:`, error)
      }
    }
    
    console.log(`[UpdateExisting] Summary: Updated=${updatedCount}, Skipped=${skippedCount}, Total=${accountsToUpdate.length}`)
    
    return NextResponse.json({
      success: true,
      message: `Updated ${updatedCount} accounts, skipped ${skippedCount} (country not found)`,
      updatedCount: updatedCount,
      skippedCount: skippedCount,
      totalChecked: accountsToUpdate.length
    })
  } catch (error: any) {
    console.error('[UpdateExisting] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}

// Allow GET for status check
export async function GET() {
  return NextResponse.json({ 
    success: true, 
    message: 'Update existing accounts endpoint is active. Use POST to update accounts.' 
  })
}
