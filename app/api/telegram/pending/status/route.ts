import { NextRequest, NextResponse } from 'next/server'
import { getAccountStatus } from '@/lib/telegram/pending-list-manager'

/**
 * GET /api/telegram/pending/status?phoneNumber=...
 * Get account status and remaining wait time
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phoneNumber = searchParams.get('phoneNumber')

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      )
    }

    const status = await getAccountStatus(phoneNumber)

    if (!status.found) {
      return NextResponse.json(
        { success: false, error: 'Account not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      ...status,
    })
  } catch (error: any) {
    console.error('[PendingStatus] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
