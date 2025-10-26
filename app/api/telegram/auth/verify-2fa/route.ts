import { NextRequest, NextResponse } from 'next/server'
import { verify2FA } from '@/lib/telegram/auth'

/**
 * POST /api/telegram/auth/verify-2fa
 * Verify 2FA password
 */
export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, sessionString, password } = await request.json()

    if (!phoneNumber || !sessionString || !password) {
      return NextResponse.json(
        { success: false, error: 'Phone number, session string, and password are required' },
        { status: 400 }
      )
    }

    console.log(`[Verify2FA] Verifying 2FA for: ${phoneNumber}`)

    const result = await verify2FA(phoneNumber, sessionString, password)

    if (result.success) {
      return NextResponse.json({
        success: true,
        userId: result.userId,
        message: 'Login successful! Session created.',
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('[Verify2FA] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
