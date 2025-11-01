import { NextRequest, NextResponse } from 'next/server'
import { pyrogramVerify2FA } from '@/lib/telegram/python-wrapper'

/**
 * Verify 2FA password via Pyrogram
 */
export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, sessionString, password } = await request.json()

    if (!phoneNumber || !sessionString || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log(`[Verify2FA API] Verifying 2FA for: ${phoneNumber}`)

    // Verify 2FA via Pyrogram
    const result = await pyrogramVerify2FA(sessionString, phoneNumber, password)

    if (!result.success) {
      console.log(`[Verify2FA API] ❌ Failed: ${result.error}`)
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          details: result.details
        },
        { status: 400 }
      )
    }

    console.log(`[Verify2FA API] ✅ 2FA verified successfully`)

    return NextResponse.json({
      success: true,
      userId: result.userId,
      sessionString: result.sessionString,
    })
  } catch (error: any) {
    console.error('[Verify2FA API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
