import { NextRequest, NextResponse } from 'next/server'
import { manualRejectAccount } from '@/lib/telegram/pending-list-manager'
import { requireAdmin } from '@/lib/mongodb/auth'

/**
 * POST /api/telegram/pending/reject
 * Manually reject an account (Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const { phoneNumber, reason } = body

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      )
    }

    if (!reason) {
      return NextResponse.json(
        { success: false, error: 'Rejection reason is required' },
        { status: 400 }
      )
    }

    console.log(`[ManualReject] Manually rejecting account: ${phoneNumber}`)

    const result = await manualRejectAccount(phoneNumber, reason)

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
    console.error('[ManualReject] Error:', error)
    
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
