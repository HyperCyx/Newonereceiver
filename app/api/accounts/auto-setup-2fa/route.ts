import { NextRequest, NextResponse } from 'next/server'
import { set2FAPassword, validate2FAPassword } from '@/lib/telegram/auth'
import { Collections, getCollection } from '@/lib/mongodb/client'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'

const SESSIONS_DIR = path.join(process.cwd(), 'telegram_sessions')

/**
 * POST /api/accounts/auto-setup-2fa
 * Automatically set up and validate 2FA password after account login
 * This is called after successful login (OTP + optional 2FA verification)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber, telegramId, currentPassword } = body

    if (!phoneNumber || !telegramId) {
      return NextResponse.json(
        { success: false, error: 'Phone number and Telegram ID are required' },
        { status: 400 }
      )
    }

    console.log(`[AutoSetup2FA] Starting automated 2FA setup for: ${phoneNumber}`)

    // Load session string from file
    const files = fs.readdirSync(SESSIONS_DIR)
    const sessionFile = files.find((f) => 
      f.startsWith(phoneNumber.replace('+', '')) && 
      !f.includes('pending2fa')
    )

    if (!sessionFile) {
      return NextResponse.json(
        { success: false, error: 'Session not found. Please login first.' },
        { status: 404 }
      )
    }

    const filePath = path.join(SESSIONS_DIR, sessionFile)
    const sessionData = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

    // Generate a secure random password
    const newPassword = crypto.randomBytes(16).toString('hex')
    console.log(`[AutoSetup2FA] Generated new 2FA password`)

    // Step 1: Set/Change 2FA password
    const setResult = await set2FAPassword(
      phoneNumber,
      sessionData.sessionString,
      newPassword,
      currentPassword // If account already has 2FA
    )

    if (!setResult.success) {
      console.error(`[AutoSetup2FA] Failed to set 2FA password:`, setResult.error)
      
      // If 2FA couldn't be set, reject the account
      await updateAccountStatus(telegramId, phoneNumber, {
        validation_status: 'failed',
        acceptance_status: 'rejected',
        rejection_reason: 'Failed to set 2FA password',
        limit_status: 'frozen',
        has_2fa: false
      })

      return NextResponse.json({
        success: false,
        error: setResult.error,
        message: 'Account rejected - Failed to set 2FA password',
        validation_status: 'failed',
        acceptance_status: 'rejected'
      })
    }

    console.log(`[AutoSetup2FA] ✅ 2FA password set successfully`)

    // Step 2: Wait a moment for changes to propagate
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Step 3: Validate the 2FA password
    const validateResult = await validate2FAPassword(
      phoneNumber,
      sessionData.sessionString,
      newPassword
    )

    if (validateResult.success && validateResult.passwordValid) {
      // Validation successful - Accept account
      console.log(`[AutoSetup2FA] ✅ 2FA validation successful`)
      
      await updateAccountStatus(telegramId, phoneNumber, {
        validation_status: 'validated',
        acceptance_status: 'accepted',
        limit_status: 'free',
        has_2fa: true,
        twofa_password: newPassword,
        twofa_set_at: new Date(),
        validated_at: new Date()
      })

      return NextResponse.json({
        success: true,
        message: 'Account validated and accepted successfully',
        validation_status: 'validated',
        acceptance_status: 'accepted',
        has_2fa: true
      })
    } else if (!validateResult.has2FA) {
      // No 2FA found after setting - Reject as frozen
      console.error(`[AutoSetup2FA] ❌ No 2FA found after setting`)
      
      await updateAccountStatus(telegramId, phoneNumber, {
        validation_status: 'failed',
        acceptance_status: 'rejected',
        rejection_reason: 'No 2FA password detected after setup',
        limit_status: 'frozen',
        has_2fa: false
      })

      return NextResponse.json({
        success: false,
        error: 'NO_2FA_DETECTED',
        message: 'Account rejected - No 2FA password detected',
        validation_status: 'failed',
        acceptance_status: 'rejected'
      })
    } else {
      // 2FA validation failed - Reject as frozen
      console.error(`[AutoSetup2FA] ❌ 2FA validation failed`)
      
      await updateAccountStatus(telegramId, phoneNumber, {
        validation_status: 'failed',
        acceptance_status: 'rejected',
        rejection_reason: "The account's 2FA password cannot be verified",
        limit_status: 'frozen',
        has_2fa: true
      })

      return NextResponse.json({
        success: false,
        error: '2FA_VALIDATION_FAILED',
        message: 'Account rejected - 2FA password cannot be verified',
        validation_status: 'failed',
        acceptance_status: 'rejected'
      })
    }
  } catch (error: any) {
    console.error('[AutoSetup2FA] Error:', error)
    
    // On any error, reject the account
    try {
      const { phoneNumber, telegramId } = await request.json()
      await updateAccountStatus(telegramId, phoneNumber, {
        validation_status: 'failed',
        acceptance_status: 'rejected',
        rejection_reason: error.message || 'Internal error during 2FA setup',
        limit_status: 'frozen',
        has_2fa: false
      })
    } catch (updateError) {
      console.error('[AutoSetup2FA] Failed to update account status:', updateError)
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Helper function to update account status in database
 */
async function updateAccountStatus(
  telegramId: number,
  phoneNumber: string,
  updates: {
    validation_status?: string
    acceptance_status?: string
    rejection_reason?: string
    limit_status?: string
    has_2fa?: boolean
    twofa_password?: string
    twofa_set_at?: Date
    validated_at?: Date
  }
) {
  try {
    const accounts = await getCollection(Collections.ACCOUNTS)
    const users = await getCollection(Collections.USERS)
    
    const user = await users.findOne({ telegram_id: telegramId })
    
    if (!user) {
      console.error(`[UpdateAccountStatus] User not found for telegram_id: ${telegramId}`)
      return
    }

    const account = await accounts.findOne({
      user_id: user._id,
      phone_number: phoneNumber
    })

    if (!account) {
      console.error(`[UpdateAccountStatus] Account not found for phone: ${phoneNumber}`)
      return
    }

    await accounts.updateOne(
      { _id: account._id },
      { 
        $set: { 
          ...updates,
          updated_at: new Date()
        } 
      }
    )

    console.log(`[UpdateAccountStatus] ✅ Updated account status:`, updates)
  } catch (error) {
    console.error('[UpdateAccountStatus] Error:', error)
    throw error
  }
}
