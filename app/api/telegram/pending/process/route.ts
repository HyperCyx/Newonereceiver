import { NextRequest, NextResponse } from 'next/server'
import { processPendingAccounts } from '@/lib/telegram/pending-list-manager'
import { requireAdmin } from '@/lib/mongodb/auth'

/**
 * POST /api/telegram/pending/process
 * Process all pending accounts that are ready for approval (Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    await requireAdmin()

    console.log('[ProcessPending] Starting to process pending accounts')

    const result = await processPendingAccounts()

    return NextResponse.json({
      success: true,
      message: `Processed ${result.processed} accounts`,
      ...result,
    })
  } catch (error: any) {
    console.error('[ProcessPending] Error:', error)
    
    // Check if it's an auth error
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
