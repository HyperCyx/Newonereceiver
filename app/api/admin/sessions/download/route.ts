import { NextRequest, NextResponse } from 'next/server'
import { checkAdminByTelegramId } from '@/lib/mongodb/auth'
import { connectToDatabase } from '@/lib/mongodb/client'
import * as fs from 'fs'
import * as path from 'path'
import archiver from 'archiver'

const SESSIONS_DIR = path.join(process.cwd(), 'telegram_sessions')

/**
 * POST /api/admin/sessions/download
 * Download sessions based on filter
 * Body: { telegramId, filter: 'latest' | 'country' | 'all', country?: string, limit?: number }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { telegramId, filter, country, limit = 10 } = body

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

    const { db } = await connectToDatabase()
    const accounts = db.collection('accounts')
    const countries = db.collection('country_capacity')

    // Get all accounts
    const accountsList = await accounts.find({}).sort({ created_at: -1 }).toArray()

    // Get session files to include
    const filesToInclude: string[] = []

    if (filter === 'latest') {
      // Get latest N sessions
      let count = 0
      for (const account of accountsList) {
        if (count >= limit) break
        
        const phoneNumber = account.phone_number
        const fileName = `${phoneNumber.replace(/[^\d]/g, '')}.json`
        const filePath = path.join(SESSIONS_DIR, fileName)

        if (fs.existsSync(filePath)) {
          filesToInclude.push(fileName)
          count++
        }
      }
    } else if (filter === 'country' && country) {
      // Get sessions for specific country
      for (const account of accountsList) {
        const phoneNumber = account.phone_number
        const phoneDigits = phoneNumber.replace(/[^\d]/g, '')

        // Detect country
        let matchesCountry = false
        for (let i = 1; i <= Math.min(4, phoneDigits.length); i++) {
          const possibleCode = phoneDigits.substring(0, i)
          const countryDoc = await countries.findOne({
            $or: [
              { country_code: possibleCode },
              { country_code: `+${possibleCode}` }
            ]
          })

          if (countryDoc && countryDoc.country_name === country) {
            matchesCountry = true
            break
          }
        }

        if (matchesCountry) {
          const fileName = `${phoneNumber.replace(/[^\d]/g, '')}.json`
          const filePath = path.join(SESSIONS_DIR, fileName)

          if (fs.existsSync(filePath)) {
            filesToInclude.push(fileName)
          }
        }
      }
    } else if (filter === 'all') {
      // Get all sessions
      for (const account of accountsList) {
        const phoneNumber = account.phone_number
        const fileName = `${phoneNumber.replace(/[^\d]/g, '')}.json`
        const filePath = path.join(SESSIONS_DIR, fileName)

        if (fs.existsSync(filePath)) {
          filesToInclude.push(fileName)
        }
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid filter type' },
        { status: 400 }
      )
    }

    if (filesToInclude.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No session files found matching criteria' },
        { status: 404 }
      )
    }

    console.log(`[DownloadSessions] Creating zip with ${filesToInclude.length} files (filter: ${filter})`)

    // Create a zip archive
    const archive = archiver('zip', {
      zlib: { level: 9 }
    })

    // Add selected session files to archive
    for (const file of filesToInclude) {
      const filePath = path.join(SESSIONS_DIR, file)
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: file })
      }
    }

    // Finalize the archive
    archive.finalize()

    // Convert archive stream to buffer
    const chunks: Buffer[] = []
    for await (const chunk of archive) {
      chunks.push(Buffer.from(chunk))
    }
    const buffer = Buffer.concat(chunks)

    // Generate filename based on filter
    let filename = 'telegram_sessions'
    if (filter === 'latest') {
      filename += `_latest_${limit}`
    } else if (filter === 'country' && country) {
      filename += `_${country.replace(/[^\w]/g, '_')}`
    } else if (filter === 'all') {
      filename += '_all'
    }
    filename += `_${new Date().toISOString().split('T')[0]}.zip`

    // Return as downloadable file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
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
