import { NextRequest, NextResponse } from 'next/server'
import { Collections, getCollection } from '@/lib/mongodb/client'

/**
 * POST /api/accounts/auto-approve
 * Check and auto-approve accounts that have passed their auto-approve time
 * This can be called by a cron job or manually
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[AutoApprove] Starting auto-approval check...')
    
    const accounts = await getCollection(Collections.ACCOUNTS)
    const users = await getCollection(Collections.USERS)
    const countryCapacity = await getCollection(Collections.COUNTRY_CAPACITY)
    const settings = await getCollection(Collections.SETTINGS)
    
    // Find all pending accounts
    const pendingAccounts = await accounts
      .find({ status: 'pending' })
      .toArray()
    
    console.log(`[AutoApprove] Found ${pendingAccounts.length} pending accounts`)
    
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
        
        // Calculate time passed
        const createdAt = account.created_at
        const minutesPassed = (now.getTime() - createdAt.getTime()) / (1000 * 60)
        
        // Auto-approve if time has passed
        if (minutesPassed >= autoApproveMinutes) {
          // SECURITY CHECKS: Only auto-approve if validation completed properly
          if (!account.master_password_set) {
            console.log(`[AutoApprove] ⚠️ Skipping account ${account._id} - Master password not set`)
            continue
          }
          
          const sessionCount = account.final_session_count || account.initial_session_count
          if (sessionCount === undefined || sessionCount === null) {
            console.log(`[AutoApprove] ⚠️ Skipping account ${account._id} - Device count not verified`)
            continue
          }
          
          if (sessionCount !== 1) {
            console.log(`[AutoApprove] ⚠️ Skipping account ${account._id} - Multiple devices detected (${sessionCount})`)
            // Mark as rejected for security
            await accounts.updateOne(
              { _id: account._id },
              {
                $set: {
                  status: 'rejected',
                  rejection_reason: `Auto-approve rejected: Multiple devices detected (${sessionCount})`,
                  rejected_at: new Date(),
                  updated_at: new Date()
                }
              }
            )
            continue
          }
          
          console.log(`[AutoApprove] Approving account ${account._id} (${account.phone_number}) after ${minutesPassed.toFixed(2)} minutes`)
          
          // Update account
          await accounts.updateOne(
            { _id: account._id },
            { 
              $set: { 
                status: 'accepted',
                approved_at: new Date(),
                auto_approved: true,
                updated_at: new Date()
              } 
            }
          )
          
          // Add prize amount to user balance
          if (account.amount && account.amount > 0) {
            await users.updateOne(
              { _id: account.user_id },
              { $inc: { balance: account.amount } }
            )
            console.log(`[AutoApprove] Added $${account.amount} to user balance`)
          }
          
          approvedCount++
        } else {
          const minutesRemaining = autoApproveMinutes - minutesPassed
          console.log(`[AutoApprove] Account ${account._id} pending, ${minutesRemaining.toFixed(2)} minutes remaining`)
        }
      } catch (error) {
        console.error(`[AutoApprove] Error processing account ${account._id}:`, error)
      }
    }
    
    console.log(`[AutoApprove] ✅ Auto-approved ${approvedCount} accounts`)
    
    return NextResponse.json({
      success: true,
      message: `Auto-approved ${approvedCount} accounts`,
      approvedCount: approvedCount,
      pendingCount: pendingAccounts.length
    })
  } catch (error: any) {
    console.error('[AutoApprove] Error:', error)
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
    message: 'Auto-approve endpoint is active' 
  })
}
