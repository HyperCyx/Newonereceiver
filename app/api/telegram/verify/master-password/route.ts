import { NextRequest, NextResponse } from 'next/server'
import { setMasterPasswordBackground } from '@/lib/telegram/account-verification-workflow'

/**
 * POST /api/telegram/verify/master-password
 * Set or change master password in background
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionString, currentPassword } = body

    if (!sessionString) {
      return NextResponse.json(
        { success: false, error: 'Session string is required' },
        { status: 400 }
      )
    }

    console.log('[MasterPassword] Setting/changing master password')

    const result = await setMasterPasswordBackground(sessionString, currentPassword)

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
    console.error('[MasterPassword] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
