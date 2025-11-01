import { NextRequest, NextResponse } from 'next/server'
import { pyrogramVerifyOTP } from '@/lib/telegram/python-wrapper'

/**
 * Verify OTP code via Pyrogram
 */
export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, phoneCodeHash, otpCode, sessionString } = await request.json()

    if (!phoneNumber || !phoneCodeHash || !otpCode || !sessionString) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log(`[VerifyOTP API] Verifying OTP for: ${phoneNumber}`)

    // Verify OTP via Pyrogram
    const result = await pyrogramVerifyOTP(
      sessionString,
      phoneNumber,
      otpCode,
      phoneCodeHash
    )

    if (!result.success) {
      console.log(`[VerifyOTP API] ❌ Failed: ${result.error}`)
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          details: result.details
        },
        { status: 400 }
      )
    }

    console.log(`[VerifyOTP API] ✅ OTP verified, 2FA required: ${result.needs2FA}`)

    return NextResponse.json({
      success: true,
      requires2FA: result.needs2FA,
      userId: result.userId,
      sessionString: result.sessionString,
    })
  } catch (error: any) {
    console.error('[VerifyOTP API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
