import { NextRequest, NextResponse } from 'next/server'
import { listSessions, deleteSession } from '@/lib/telegram/auth'

/**
 * GET /api/telegram/auth/sessions
 * List all saved sessions
 */
export async function GET() {
  try {
    const sessions = listSessions()
    return NextResponse.json({
      success: true,
      sessions: sessions.map((s) => ({
        phoneNumber: s.phoneNumber,
        userId: s.userId,
        createdAt: s.createdAt,
      })),
    })
  } catch (error: any) {
    console.error('[Sessions] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/telegram/auth/sessions
 * Delete a session
 */
export async function DELETE(request: NextRequest) {
  try {
    const { phoneNumber } = await request.json()

    if (!phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      )
    }

    const success = deleteSession(phoneNumber)

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Session deleted successfully',
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to delete session' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('[Sessions] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
