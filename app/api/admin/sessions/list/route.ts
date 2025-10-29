import { NextRequest, NextResponse } from 'next/server'
import { checkAdminByTelegramId } from '@/lib/mongodb/auth'
import { connectToDatabase } from '@/lib/mongodb/client'
import * as fs from 'fs'
import * as path from 'path'

const SESSIONS_DIR = path.join(process.cwd(), 'telegram_sessions')

interface SessionInfo {
  phone: string
  country: string
  countryCode: string
  fileName: string
  size: number
  createdAt: Date
  status: string
}

/**
 * GET /api/admin/sessions/list
 * List all sessions grouped by country
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
    const isAdmin = await checkAdminByTelegramId(Number(telegramId))
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { db } = await connectToDatabase()
    const accounts = db.collection('accounts')
    const countries = db.collection('country_capacity')

    // Get all accounts with sessions
    const accountsList = await accounts.find({}).sort({ created_at: -1 }).toArray()

    // Check if sessions directory exists
    const sessionsExist = fs.existsSync(SESSIONS_DIR)
    const sessionFiles = sessionsExist ? fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json')) : []

    const sessions: SessionInfo[] = []
    const sessionsByCountry: { [key: string]: SessionInfo[] } = {}

    // Process session files and match with accounts
    for (const fileName of sessionFiles) {
      const filePath = path.join(SESSIONS_DIR, fileName)
      const stats = fs.statSync(filePath)
      
      // Extract phone number from filename (supports both formats: 998701470983.json and 998701470983_timestamp.json)
      const phoneMatch = fileName.match(/^(\d+)/)
      if (!phoneMatch) continue
      
      const phoneDigits = phoneMatch[1]
      
      // Try to find matching account
      const account = await accounts.findOne({
        $or: [
          { phone_number: phoneDigits },
          { phone_number: `+${phoneDigits}` }
        ]
      })

      const phoneNumber = account ? account.phone_number : `+${phoneDigits}`
      const accountStatus = account ? account.status : 'unknown'
      
      // Detect country from phone number
      let countryName = 'Unknown'
      let countryCode = phoneNumber.substring(0, Math.min(5, phoneNumber.length))

      for (let i = 1; i <= Math.min(4, phoneDigits.length); i++) {
        const possibleCode = phoneDigits.substring(0, i)
        const country = await countries.findOne({
          $or: [
            { country_code: possibleCode },
            { country_code: `+${possibleCode}` }
          ]
        })

        if (country) {
          countryName = country.country_name
          countryCode = country.country_code
          break
        }
      }

      const sessionInfo: SessionInfo = {
        phone: phoneNumber,
        country: countryName,
        countryCode: countryCode,
        fileName: fileName,
        size: stats.size,
        createdAt: stats.mtime,
        status: accountStatus
      }

      sessions.push(sessionInfo)

      if (!sessionsByCountry[countryName]) {
        sessionsByCountry[countryName] = []
      }
      sessionsByCountry[countryName].push(sessionInfo)
    }

    // Sort sessions by date (newest first)
    sessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    // Sort each country's sessions
    Object.keys(sessionsByCountry).forEach(country => {
      sessionsByCountry[country].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    })

    // Get country statistics
    const countryStats = Object.keys(sessionsByCountry).map(country => ({
      name: country,
      code: sessionsByCountry[country][0]?.countryCode || '',
      count: sessionsByCountry[country].length,
      totalSize: sessionsByCountry[country].reduce((sum, s) => sum + s.size, 0)
    })).sort((a, b) => b.count - a.count)

    return NextResponse.json({
      success: true,
      totalSessions: sessions.length,
      latestSessions: sessions.slice(0, 10),
      sessionsByCountry,
      countryStats,
      allSessions: sessions
    })
  } catch (error: any) {
    console.error('[SessionsList] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
