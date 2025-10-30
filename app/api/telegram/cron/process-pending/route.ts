import { NextRequest, NextResponse } from 'next/server'
import { processPendingAccounts } from '@/lib/telegram/pending-list-manager'

/**
 * GET /api/telegram/cron/process-pending
 * Cron job endpoint to process pending accounts
 * 
 * This should be called periodically (e.g., every 5-10 minutes) by a cron service
 * like Vercel Cron, GitHub Actions, or external cron job service
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication token for cron job security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key-here'
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.log('[CronJob] Unauthorized cron job attempt')
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[CronJob] Starting scheduled pending account processing')

    const result = await processPendingAccounts()

    console.log('[CronJob] Completed:', result)

    return NextResponse.json({
      success: true,
      message: `Processed ${result.processed} accounts`,
      ...result,
    })
  } catch (error: any) {
    console.error('[CronJob] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also support POST for flexibility
export async function POST(request: NextRequest) {
  return GET(request)
}
