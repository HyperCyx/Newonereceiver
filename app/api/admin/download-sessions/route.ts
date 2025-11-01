import { NextRequest, NextResponse } from 'next/server'
import { checkAdminByTelegramId } from '@/lib/mongodb/auth'
import * as fs from 'fs'
import * as path from 'path'
import archiver from 'archiver'
import { Readable } from 'stream'

const SESSIONS_DIR = path.join(process.cwd(), 'telegram_sessions')

/**
 * GET /api/admin/download-sessions
 * Download all session files as a zip archive
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const telegramId = searchParams.get('telegramId')

    if (!telegramId) {
      return NextResponse.json(
        { success: false, error: 'Telegram ID required' },
        { status: 400 }
      )
    }

    // Check admin
    const isAdmin = await checkAdminByTelegramId(telegramId)
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Check if sessions directory exists
    if (!fs.existsSync(SESSIONS_DIR)) {
      return NextResponse.json(
        { success: false, error: 'No sessions found' },
        { status: 404 }
      )
    }

    // Get all session files
    const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'))

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No session files found' },
        { status: 404 }
      )
    }

    console.log(`[DownloadSessions] Creating zip archive with ${files.length} session files`)

    // Create a zip archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    })

    // Add all session files to archive
    for (const file of files) {
      const filePath = path.join(SESSIONS_DIR, file)
      archive.file(filePath, { name: file })
    }

    // Finalize the archive
    archive.finalize()

    // Convert archive stream to buffer
    const chunks: Buffer[] = []
    for await (const chunk of archive) {
      chunks.push(Buffer.from(chunk))
    }
    const buffer = Buffer.concat(chunks)

    // Return as downloadable file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="telegram_sessions_${new Date().toISOString().split('T')[0]}.zip"`,
        'Content-Length': buffer.length.toString(),
      },
    })
  } catch (error: any) {
    console.error('[DownloadSessions] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create archive' },
      { status: 500 }
    )
  }
}
