import { NextRequest, NextResponse } from 'next/server'
import { checkPhoneNumberEligibility } from '@/lib/telegram/account-verification-workflow'

/**
 * POST /api/telegram/verify/check-eligibility
 * Check if phone number is eligible for verification
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

    console.log(`[CheckEligibility] Checking eligibility for ${phoneNumber}`)

    const result = await checkPhoneNumberEligibility(phoneNumber, telegramId)

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
      data: result.data,
    })
  } catch (error: any) {
    console.error('[CheckEligibility] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
