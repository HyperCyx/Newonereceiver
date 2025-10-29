import { NextRequest, NextResponse } from 'next/server'
import { Collections, getCollection } from '@/lib/mongodb/client'

/**
 * POST /api/accounts/check-auto-approve
 * Check all pending accounts and auto-approve those that have exceeded their auto-approve time
 * This endpoint can be called from the frontend when viewing pending accounts
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json().catch(() => ({}))
    
    console.log('[CheckAutoApprove] Checking auto-approvals...', userId ? `for user ${userId}` : 'for all users')
    
    const accounts = await getCollection(Collections.ACCOUNTS)
    const users = await getCollection(Collections.USERS)
    const countryCapacity = await getCollection(Collections.COUNTRY_CAPACITY)
    const settings = await getCollection(Collections.SETTINGS)
    
    // Find pending accounts (filter by userId if provided)
    const query: any = { status: 'pending' }
    if (userId) {
      query.user_id = userId
    }
    
    const pendingAccounts = await accounts.find(query).toArray()
    
    console.log(`[CheckAutoApprove] Found ${pendingAccounts.length} pending accounts`)
    
    let approvedCount = 0
    const now = new Date()
    
    for (const account of pendingAccounts) {
      try {
        // Detect country auto-approve time
        let autoApproveMinutes = 1440 // Default
        const phoneDigits = account.phone_number.replace(/[^\d]/g, '')
        let countryFound = false
        
        for (let i = 1; i <= Math.min(4, phoneDigits.length) && !countryFound; i++) {
          const possibleCode = phoneDigits.substring(0, i)
          const country = await countryCapacity.findOne({ country_code: possibleCode })
          
          if (country) {
            autoApproveMinutes = country.auto_approve_minutes ?? 1440
            countryFound = true
          }
        }
        
        if (!countryFound) {
          const globalSettings = await settings.findOne({ setting_key: 'auto_approve_minutes' })
          autoApproveMinutes = parseInt(globalSettings?.setting_value || '1440')
        }
        
        // Calculate time passed in minutes
        const createdAt = account.created_at
        const minutesPassed = (now.getTime() - createdAt.getTime()) / (1000 * 60)
        
        console.log(`[CheckAutoApprove] Account ${account.phone_number}: ${minutesPassed.toFixed(2)} minutes passed, auto-approve after ${autoApproveMinutes}`)
        
        // Auto-approve if time has passed
        if (minutesPassed >= autoApproveMinutes) {
          console.log(`[CheckAutoApprove] ✅ Auto-approving account ${account.phone_number}`)
          
          // If account has amount 0, try to get prize from country
          let finalAmount = account.amount || 0
          
          if (finalAmount === 0 && countryFound) {
            // Get the country again to get prize amount
            for (let i = 1; i <= Math.min(4, phoneDigits.length); i++) {
              const possibleCode = phoneDigits.substring(0, i)
              const country = await countryCapacity.findOne({ country_code: possibleCode })
              
              if (country) {
                finalAmount = country.prize_amount || 0
                console.log(`[CheckAutoApprove] Got prize from country: $${finalAmount}`)
                break
              }
            }
          }
          
          // Update account status and amount
          await accounts.updateOne(
            { _id: account._id },
            { 
              $set: { 
                status: 'accepted',
                amount: finalAmount,
                approved_at: new Date(),
                auto_approved: true,
                updated_at: new Date()
              } 
            }
          )
          
          // Add prize amount to user balance if amount > 0
          if (finalAmount > 0) {
            await users.updateOne(
              { _id: account.user_id },
              { $inc: { balance: finalAmount } }
            )
            console.log(`[CheckAutoApprove] ✅ Added $${finalAmount} to user balance`)
          } else {
            console.log(`[CheckAutoApprove] ⚠️ No prize amount found, account approved but no payment`)
          }
          
          approvedCount++
        } else {
          const minutesRemaining = autoApproveMinutes - minutesPassed
          console.log(`[CheckAutoApprove] Account ${account.phone_number} pending, ${minutesRemaining.toFixed(2)} minutes remaining`)
        }
      } catch (error) {
        console.error(`[CheckAutoApprove] Error processing account ${account._id}:`, error)
      }
    }
    
    console.log(`[CheckAutoApprove] ✅ Auto-approved ${approvedCount} accounts`)
    
    return NextResponse.json({
      success: true,
      message: `Checked ${pendingAccounts.length} accounts, auto-approved ${approvedCount}`,
      checkedCount: pendingAccounts.length,
      approvedCount: approvedCount
    })
  } catch (error: any) {
    console.error('[CheckAutoApprove] Error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}

// Allow GET for health check
export async function GET() {
  return NextResponse.json({ 
    success: true, 
    message: 'Check auto-approve endpoint is active. Use POST to check accounts.' 
  })
}
