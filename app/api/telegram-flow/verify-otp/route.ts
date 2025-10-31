/**
 * Step 3: Verify OTP
 * Corresponds to: F → G/H in flowchart
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCollection, Collections } from '@/lib/mongodb/client'
import { verifyOTP } from '@/lib/telegram/auth'
import { ObjectId } from 'mongodb'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accountId, phoneNumber, phoneCodeHash, otpCode, sessionString } = body

    if (!accountId || !phoneNumber || !phoneCodeHash || !otpCode) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log(`[VerifyOTP] Verifying OTP for account: ${accountId}`)

    const accounts = await getCollection(Collections.ACCOUNTS)
    const account = await accounts.findOne({ _id: new ObjectId(accountId) })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Verify OTP via Telegram
    const verifyResult = await verifyOTP(
      phoneNumber,
      phoneCodeHash,
      otpCode,
      sessionString
    )

    if (!verifyResult.success) {
      // Check if 2FA is required
      if (verifyResult.requires2FA) {
        console.log(`[VerifyOTP] ⚠️ 2FA required for this account`)
        
        // Update account status
        await accounts.updateOne(
          { _id: new ObjectId(accountId) },
          {
            $set: {
              status: 'verifying_2fa',
              requires_2fa: true,
              otp_verified_at: new Date(),
              otp_session_string: verifyResult.sessionString,
              updated_at: new Date(),
            }
          }
        )

        return NextResponse.json({
          success: true,
          requires2FA: true,
          sessionString: verifyResult.sessionString,
          message: '2FA password required',
        })
      }

      // OTP verification failed
      console.log(`[VerifyOTP] ❌ Invalid OTP: ${verifyResult.error}`)
      return NextResponse.json({
        success: false,
        error: verifyResult.error || 'Invalid OTP',
      }, { status: 400 })
    }

    // OTP verified successfully (no 2FA required)
    console.log(`[VerifyOTP] ✅ OTP verified successfully, no 2FA required`)
    
    await accounts.updateOne(
      { _id: new ObjectId(accountId) },
      {
        $set: {
          status: 'setting_password',
          requires_2fa: false,
          otp_verified_at: new Date(),
          telegram_user_id: verifyResult.userId,
          session_string: verifyResult.sessionString,
          updated_at: new Date(),
        }
      }
    )

    return NextResponse.json({
      success: true,
      requires2FA: false,
      userId: verifyResult.userId,
      sessionString: verifyResult.sessionString,
      message: 'OTP verified successfully',
    })
  } catch (error: any) {
    console.error('[VerifyOTP] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
