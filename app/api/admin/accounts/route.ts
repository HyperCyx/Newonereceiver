import { NextRequest, NextResponse } from 'next/server'
import { Collections, getCollection } from '@/lib/mongodb/client'
import { checkAdminByTelegramId } from '@/lib/mongodb/auth'

// GET - Fetch all accounts for admin
export async function GET(request: NextRequest) {
  try {
    const accounts = await getCollection(Collections.ACCOUNTS)
    const users = await getCollection(Collections.USERS)

    const allAccounts = await accounts
      .find({})
      .sort({ created_at: -1 })
      .toArray()

    // Populate user data
    const accountsWithUsers = await Promise.all(
      allAccounts.map(async (account) => {
        const user = await users.findOne({ _id: account.user_id })
        return {
          ...account,
          user: user ? {
            telegram_id: user.telegram_id,
            telegram_username: user.telegram_username,
            first_name: user.first_name,
            last_name: user.last_name,
            balance: user.balance
          } : null
        }
      })
    )

    return NextResponse.json({
      success: true,
      accounts: accountsWithUsers
    })
  } catch (error: any) {
    console.error('[AdminAccounts] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Approve or reject account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accountId, action, telegramId } = body

    console.log('[AdminAccounts] POST:', { accountId, action, telegramId })

    // Check if user is admin
    if (!telegramId) {
      return NextResponse.json({ error: 'Telegram ID required' }, { status: 400 })
    }

    const isAdmin = await checkAdminByTelegramId(telegramId)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access only' }, { status: 403 })
    }

    if (!accountId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const accounts = await getCollection(Collections.ACCOUNTS)
    const users = await getCollection(Collections.USERS)
    const countryCapacity = await getCollection(Collections.COUNTRY_CAPACITY)

    const account = await accounts.findOne({ _id: accountId })

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    }

    if (action === 'approve') {
      console.log('[AdminAccounts] Approving account:', accountId)
      
      // Get country prize amount from phone number
      const phoneDigits = account.phone_number.replace(/[^\d]/g, '')
      let prizeAmount = 0
      let countryFound = false
      
      console.log('[AdminAccounts] Detecting country for phone:', account.phone_number, 'digits:', phoneDigits)
      
      // Try to match country code (1-4 digits)
      for (let i = 1; i <= Math.min(4, phoneDigits.length) && !countryFound; i++) {
        const possibleCode = phoneDigits.substring(0, i)
        console.log('[AdminAccounts] Trying code:', possibleCode)
        const country = await countryCapacity.findOne({ country_code: possibleCode })
        
        if (country) {
          prizeAmount = country.prize_amount || 0
          console.log('[AdminAccounts] ✅ Country found:', country.country_name, 'Code:', possibleCode, 'Prize:', prizeAmount)
          
          // Increment used capacity
          await countryCapacity.updateOne(
            { _id: country._id },
            { $inc: { used_capacity: 1 } }
          )
          
          countryFound = true
        }
      }
      
      if (!countryFound) {
        console.log('[AdminAccounts] ❌ No country found for phone:', account.phone_number, '(digits:', phoneDigits, '), using 0 prize')
        console.log('[AdminAccounts] 💡 Tip: Add country code to Country Management in admin panel')
      }

      // Update account status
      const updateResult = await accounts.updateOne(
        { _id: accountId },
        { 
          $set: { 
            status: 'accepted',
            amount: prizeAmount,
            approved_at: new Date(),
            updated_at: new Date()
          } 
        }
      )

      console.log('[AdminAccounts] ✅ Account updated:', {
        accountId,
        phone: account.phone_number,
        prizeAmount,
        updateResult: updateResult.modifiedCount
      })

      // Add prize amount to user's balance
      if (prizeAmount > 0) {
        const balanceUpdate = await users.updateOne(
          { _id: account.user_id },
          { $inc: { balance: prizeAmount } }
        )
        console.log('[AdminAccounts] ✅ Added $', prizeAmount, 'to user balance, modified:', balanceUpdate.modifiedCount)
      } else {
        console.log('[AdminAccounts] ⚠️ Prize amount is 0, no balance added')
      }

      return NextResponse.json({
        success: true,
        message: 'Account approved successfully',
        prizeAmount: prizeAmount
      })
    } 
    else if (action === 'reject') {
      console.log('[AdminAccounts] Rejecting account:', accountId)
      
      await accounts.updateOne(
        { _id: accountId },
        { 
          $set: { 
            status: 'rejected',
            updated_at: new Date()
          } 
        }
      )

      return NextResponse.json({
        success: true,
        message: 'Account rejected'
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('[AdminAccounts] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
