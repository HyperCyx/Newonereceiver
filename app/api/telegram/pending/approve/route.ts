import { NextRequest, NextResponse } from 'next/server'
import { manualApproveAccount } from '@/lib/telegram/pending-list-manager'
import { requireAdmin } from '@/lib/mongodb/auth'

/**
 * POST /api/telegram/pending/approve
 * Manually approve an account (Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const { phoneNumber } = body

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      )
    }

    console.log(`[ManualApprove] Manually approving account: ${phoneNumber}`)

    const result = await manualApproveAccount(phoneNumber)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message,
    })
  } catch (error: any) {
    console.error('[ManualApprove] Error:', error)
    
    if (error.message === 'Unauthorized' || error.message.includes('Admin')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
