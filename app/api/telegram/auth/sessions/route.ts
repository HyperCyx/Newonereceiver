import { NextRequest, NextResponse } from 'next/server'
import { pyrogramGetSessions, pyrogramLogoutDevices } from '@/lib/telegram/python-wrapper'

/**
 * Get active sessions via Pyrogram
 */
export async function POST(request: NextRequest) {
  try {
    const { sessionString, phoneNumber, action } = await request.json()

    if (!sessionString || !phoneNumber) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (action === 'logout') {
      console.log(`[Sessions API] Logging out other devices for: ${phoneNumber}`)
      
      const result = await pyrogramLogoutDevices(sessionString, phoneNumber)
      
      if (!result.success) {
        console.log(`[Sessions API] ? Logout failed: ${result.error}`)
        return NextResponse.json(
          {
            success: false,
            error: result.error,
            details: result.details
          },
          { status: 400 }
        )
      }

      console.log(`[Sessions API] ? Logged out ${result.terminatedCount} device(s)`)

      return NextResponse.json({
        success: true,
        terminatedCount: result.terminatedCount,
        sessionsBefore: result.sessionsBefore,
        sessionsAfter: result.sessionsAfter,
      })
    }

    // Default: Get sessions
    console.log(`[Sessions API] Getting sessions for: ${phoneNumber}`)
    
    const result = await pyrogramGetSessions(sessionString, phoneNumber)

    if (!result.success) {
      console.log(`[Sessions API] ? Failed: ${result.error}`)
      return NextResponse.json(
        {
          success: false,
          error: result.error,
          details: result.details
        },
        { status: 400 }
      )
    }

    console.log(`[Sessions API] ? Found ${result.totalCount} session(s)`)

    return NextResponse.json({
      success: true,
      currentSession: result.currentSession,
      otherSessions: result.otherSessions,
      totalCount: result.totalCount,
    })
  } catch (error: any) {
    console.error('[Sessions API] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
