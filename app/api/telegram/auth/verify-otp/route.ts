import { NextRequest, NextResponse } from 'next/server'
import { verifyOTP } from '@/lib/telegram/auth'

/**
 * POST /api/telegram/auth/verify-otp
 * Verify OTP and create session
 */
export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, phoneCodeHash, otpCode, sessionString } = await request.json()

    if (!phoneNumber || !phoneCodeHash || !otpCode) {
      return NextResponse.json(
        { success: false, error: 'Phone number, code hash, and OTP are required' },
        { status: 400 }
      )
    }

    console.log(`[VerifyOTP] Verifying OTP for: ${phoneNumber}`)

    const result = await verifyOTP(phoneNumber, phoneCodeHash, otpCode, sessionString)

    if (result.success) {
      return NextResponse.json({
        success: true,
        sessionString: result.sessionString,
        userId: result.userId,
        message: 'Login successful! Session created.',
      })
    } else if (result.requires2FA || result.error === '2FA_REQUIRED') {
      return NextResponse.json({
        success: false,
        requires2FA: true,
        sessionString: result.sessionString, // Pass partial session for 2FA step
        error: 'Two-factor authentication required',
        message: 'Please enter your 2FA password',
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('[VerifyOTP] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
