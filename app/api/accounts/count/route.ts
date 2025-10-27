import { NextRequest, NextResponse } from 'next/server'
import { Collections, getCollection } from '@/lib/mongodb/client'

// Cache for account counts (5 second cache)
let countCache: { [key: string]: { count: number; timestamp: number } } = {}
const CACHE_DURATION = 5000 // 5 seconds

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { status } = body

    const cacheKey = status || 'all'
    const now = Date.now()

    // Check cache first
    if (countCache[cacheKey] && (now - countCache[cacheKey].timestamp) < CACHE_DURATION) {
      console.log('[AccountsCount] ⚡ Returning cached count for:', cacheKey)
      return NextResponse.json({
        success: true,
        count: countCache[cacheKey].count,
        cached: true
      })
    }

    // Fetch from database
    const accounts = await getCollection(Collections.ACCOUNTS)
    const query = status ? { status } : {}
    const count = await accounts.countDocuments(query)

    // Update cache
    countCache[cacheKey] = { count, timestamp: now }

    console.log('[AccountsCount] 💾 Cached count for:', cacheKey, '=', count)

    return NextResponse.json({
      success: true,
      count
    })
  } catch (error) {
    console.error('[AccountsCount] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
