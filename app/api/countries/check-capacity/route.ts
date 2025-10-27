import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/mongodb/connection'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { countryCode } = body

    if (!countryCode) {
      return NextResponse.json(
        { success: false, error: 'Country code is required' },
        { status: 400 }
      )
    }

    const db = await getDb()

    // Get country capacity info
    const country = await db.collection('country_capacity').findOne({
      country_code: countryCode.toUpperCase(),
      is_active: true
    })

    if (!country) {
      return NextResponse.json(
        { success: false, error: 'Country not found or not active' },
        { status: 404 }
      )
    }

    // Check if capacity is available
    const available = (country.used_capacity || 0) < country.max_capacity

    return NextResponse.json({
      success: true,
      available,
      country: {
        code: country.country_code,
        name: country.country_name,
        max_capacity: country.max_capacity,
        used_capacity: country.used_capacity || 0,
        remaining: country.max_capacity - (country.used_capacity || 0)
      }
    })
  } catch (error: any) {
    console.error('[CheckCapacity] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
