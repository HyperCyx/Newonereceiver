import { NextRequest, NextResponse } from 'next/server'
import { checkAdminByTelegramId } from '@/lib/mongodb/auth'
import * as fs from 'fs'
import * as path from 'path'

const SESSIONS_DIR = path.join(process.cwd(), 'telegram_sessions')

/**
 * DELETE /api/admin/sessions/delete
 * Delete a specific session file or all session files
 * Body: { telegramId, fileName?: string, deleteAll?: boolean }
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegramId, fileName, deleteAll } = body

    if (!telegramId) {
      return NextResponse.json(
        { success: false, error: 'Telegram ID required' },
        { status: 400 }
      )
    }

    // Check admin
    const isAdmin = await checkAdminByTelegramId(Number(telegramId))
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Check if sessions directory exists
    if (!fs.existsSync(SESSIONS_DIR)) {
      return NextResponse.json(
        { success: false, error: 'No sessions directory found' },
        { status: 404 }
      )
    }

    if (deleteAll) {
      // Delete all session files
      const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'))
      
      let deletedCount = 0
      for (const file of files) {
        const filePath = path.join(SESSIONS_DIR, file)
        try {
          fs.unlinkSync(filePath)
          deletedCount++
        } catch (err) {
          console.error(`[DeleteSessions] Error deleting ${file}:`, err)
        }
      }

      console.log(`[DeleteSessions] Deleted ${deletedCount} session files`)
      
      return NextResponse.json({
        success: true,
        message: `Deleted ${deletedCount} session file(s)`,
        deletedCount
      })
    } else if (fileName) {
      // Delete specific file
      const filePath = path.join(SESSIONS_DIR, fileName)

      if (!fs.existsSync(filePath)) {
        return NextResponse.json(
          { success: false, error: 'Session file not found' },
          { status: 404 }
        )
      }

      // Security check - ensure file is in sessions directory
      const normalizedPath = path.normalize(filePath)
      if (!normalizedPath.startsWith(SESSIONS_DIR)) {
        return NextResponse.json(
          { success: false, error: 'Invalid file path' },
          { status: 400 }
        )
      }

      fs.unlinkSync(filePath)
      console.log(`[DeleteSessions] Deleted session file: ${fileName}`)

      return NextResponse.json({
        success: true,
        message: `Deleted session file: ${fileName}`,
        fileName
      })
    } else {
      return NextResponse.json(
        { success: false, error: 'Either fileName or deleteAll must be specified' },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('[DeleteSessions] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete session file(s)' },
      { status: 500 }
    )
  }
}
