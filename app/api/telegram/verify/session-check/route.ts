import { NextRequest, NextResponse } from 'next/server'
import { manageDeviceSessions } from '@/lib/telegram/account-verification-workflow'

/**
 * POST /api/telegram/verify/session-check
 * Check and manage device sessions
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionString, forceLogout } = body

    if (!sessionString) {
      return NextResponse.json(
        { success: false, error: 'Session string is required' },
        { status: 400 }
      )
    }

    console.log('[SessionCheck] Checking and managing device sessions')

    const result = await manageDeviceSessions(sessionString, forceLogout || false)

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          message: result.message,
          step: result.step,
          data: result.data,
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
    console.error('[SessionCheck] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
