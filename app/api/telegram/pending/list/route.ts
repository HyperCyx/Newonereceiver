import { NextRequest, NextResponse } from 'next/server'
import { getPendingAccounts, getUserPendingAccounts } from '@/lib/telegram/pending-list-manager'
import { requireAuth, requireAdmin } from '@/lib/mongodb/auth'

/**
 * GET /api/telegram/pending/list
 * Get all pending accounts (admin) or user's pending accounts
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const isAdmin = searchParams.get('admin') === 'true'

    if (isAdmin) {
      // Admin: Get all pending accounts
      await requireAdmin()
      const accounts = await getPendingAccounts()
      
      return NextResponse.json({
        success: true,
        accounts,
        count: accounts.length,
      })
    } else {
      // User: Get their own pending accounts
      const user = await requireAuth()
      const accounts = await getUserPendingAccounts(user._id)
      
      return NextResponse.json({
        success: true,
        accounts,
        count: accounts.length,
      })
    }
  } catch (error: any) {
    console.error('[PendingList] Error:', error)
    
    // Check if it's an auth error
    if (error.message === 'Unauthorized' || error.message.includes('Admin')) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
