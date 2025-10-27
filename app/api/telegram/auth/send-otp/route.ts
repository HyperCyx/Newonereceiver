import { NextRequest, NextResponse } from 'next/server'
import { sendOTP } from '@/lib/telegram/auth'

/**
 * POST /api/telegram/auth/send-otp
 * Send OTP to phone number
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request body with error handling
    let body
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('[SendOTP] Failed to parse request body:', parseError)
      return NextResponse.json(
        { success: false, error: 'Invalid request format' },
        { status: 400 }
      )
    }

    const { phoneNumber } = body

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Validate phone number format
    if (!phoneNumber.startsWith('+') || phoneNumber.length < 10) {
      return NextResponse.json(
        { success: false, error: 'Phone number must include country code (e.g., +1234567890)' },
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
        { success: false, error: result.error || 'Failed to send OTP' },
        { status: 400 }
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
