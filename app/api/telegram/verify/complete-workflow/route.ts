import { NextRequest, NextResponse } from 'next/server'
import { runCompleteVerificationWorkflow } from '@/lib/telegram/account-verification-workflow'

/**
 * POST /api/telegram/verify/complete-workflow
 * Run the complete verification workflow after OTP/2FA verification
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      phoneNumber, 
      telegramId, 
      otpCode, 
      phoneCodeHash, 
      sessionString,
      password 
    } = body

    if (!phoneNumber || !telegramId || !otpCode || !phoneCodeHash || !sessionString) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Phone number, Telegram ID, OTP code, phone code hash, and session string are required' 
        },
        { status: 400 }
      )
    }

    console.log(`[CompleteWorkflow] Starting complete workflow for ${phoneNumber}`)

    const result = await runCompleteVerificationWorkflow(
      phoneNumber,
      telegramId,
      otpCode,
      phoneCodeHash,
      sessionString,
      password
    )

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message: result.message,
          step: result.step,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      step: result.step,
      data: result.data,
    })
  } catch (error: any) {
    console.error('[CompleteWorkflow] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
