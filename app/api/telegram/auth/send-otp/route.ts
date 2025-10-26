import { NextRequest, NextResponse } from 'next/server'
import { sendOTP } from '@/lib/telegram/auth'

/**
 * POST /api/telegram/auth/send-otp
 * Send OTP to phone number
 */
export async function POST(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json()

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      )
    }

    console.log(`[SendOTP] Sending OTP to: ${phoneNumber}`)

    const result = await sendOTP(phoneNumber)

    if (result.success) {
      return NextResponse.json({
        success: true,
        phoneCodeHash: result.phoneCodeHash,
        sessionString: result.sessionString, // Return session for continuity
        message: 'OTP sent successfully. Check your Telegram app.',
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('[SendOTP] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
