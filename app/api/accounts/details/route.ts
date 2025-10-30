import { NextRequest, NextResponse } from 'next/server'
import { Collections, getCollection } from '@/lib/mongodb/client'

/**
 * POST /api/accounts/details
 * Get detailed account information including validation and acceptance status
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber, telegramId } = body

    if (!phoneNumber || !telegramId) {
      return NextResponse.json(
        { success: false, error: 'Phone number and Telegram ID are required' },
        { status: 400 }
      )
    }

    console.log(`[AccountDetails] Getting details for: ${phoneNumber}`)

    const accounts = await getCollection(Collections.ACCOUNTS)
    const users = await getCollection(Collections.USERS)
    
    const user = await users.findOne({ telegram_id: telegramId })
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    const account = await accounts.findOne({
      user_id: user._id,
      phone_number: phoneNumber
    }) as any

    if (!account) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      )
    }

    // Build response with account details
    const details = {
      phone_number: account.phone_number,
      balance: account.amount || 0,
      
      // Acceptance Status
      acceptance_status: account.acceptance_status || account.status || 'pending',
      acceptance_message: getAcceptanceMessage(account.acceptance_status || account.status),
      
      // Limit Status
      limit_status: account.limit_status || 'free',
      limit_message: getLimitMessage(account.limit_status || 'free'),
      
      // Validation Status
      validation_status: account.validation_status || 'pending',
      validation_message: getValidationMessage(account),
      
      // Timestamps
      created_at: account.created_at,
      validated_at: account.validated_at,
      approved_at: account.approved_at,
    }

    return NextResponse.json({
      success: true,
      account: details
    })
  } catch (error: any) {
    console.error('[AccountDetails] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

function getAcceptanceMessage(status: string): string {
  switch (status) {
    case 'accepted':
      return 'Account has been accepted and verified'
    case 'rejected':
      return 'Unfortunately, the account has been rejected'
    case 'pending':
      return 'Account is pending admin review'
    default:
      return 'Status unknown'
  }
}

function getLimitMessage(status: string): string {
  switch (status) {
    case 'free':
      return 'The account is temporary limited and will not cause any price discount'
    case 'frozen':
      return 'Account is frozen due to validation failure'
    case 'unlimited':
      return 'No limits applied to this account'
    default:
      return 'Status unknown'
  }
}

function getValidationMessage(account: any): string {
  const validationStatus = account.validation_status || 'pending'
  
  switch (validationStatus) {
    case 'validated':
      return 'Account 2FA has been verified successfully'
    case 'failed':
      return account.rejection_reason || "The account's 2FA password has been changed and cannot be verified"
    case 'pending':
      return 'Account validation is pending'
    default:
      return 'Validation status unknown'
  }
}
