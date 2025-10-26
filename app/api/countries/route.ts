import { NextRequest, NextResponse } from 'next/server'
import { Collections, getCollection } from '@/lib/mongodb/client'
import { getAuthUser } from '@/lib/mongodb/auth'

// GET - Get available countries with capacity info (public access)
export async function GET(request: NextRequest) {
  try {
    // Fetch all active countries
    const countryCapacity = await getCollection(Collections.COUNTRY_CAPACITY)
    const countries = await countryCapacity
      .find({ is_active: true })
      .sort({ country_name: 1 })
      .toArray()

    // Calculate available capacity for each country
    const countriesWithAvailability = countries.map(country => ({
      ...country,
      available_capacity: country.max_capacity - country.used_capacity,
      has_capacity: (country.max_capacity - country.used_capacity) > 0
    }))

    return NextResponse.json({ 
      success: true, 
      countries: countriesWithAvailability 
    })
  } catch (error) {
    console.error('[Countries Public API] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Check and reserve capacity for a country
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { countryCode, action } = body

    if (!countryCode) {
      return NextResponse.json({ error: 'Country code is required' }, { status: 400 })
    }

    const countryCapacity = await getCollection(Collections.COUNTRY_CAPACITY)

    if (action === 'check') {
      // Check if country has capacity
      const country = await countryCapacity.findOne({
        country_code: countryCode,
        is_active: true
      })

      if (!country) {
        return NextResponse.json({ 
          success: false,
          hasCapacity: false,
          message: 'Country not found or not available'
        })
      }

      const availableCapacity = country.max_capacity - country.used_capacity
      const hasCapacity = availableCapacity > 0

      return NextResponse.json({ 
        success: true,
        hasCapacity,
        availableCapacity,
        maxCapacity: country.max_capacity,
        prizeAmount: country.prize_amount,
        message: hasCapacity 
          ? `${availableCapacity} accounts available for ${country.country_name}` 
          : `No capacity available for ${country.country_name}`
      })
    } 
    else if (action === 'reserve') {
      // Increment used_capacity when an account is purchased
      const user = await getAuthUser()
      
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Get current country data
      const country = await countryCapacity.findOne({
        country_code: countryCode,
        is_active: true
      })

      if (!country) {
        return NextResponse.json({ 
          success: false,
          error: 'Country not found or not available'
        }, { status: 404 })
      }

      // Check if capacity is available
      const availableCapacity = country.max_capacity - country.used_capacity
      if (availableCapacity <= 0) {
        return NextResponse.json({ 
          success: false,
          error: `No capacity available for ${country.country_name}`
        }, { status: 400 })
      }

      // Increment used capacity
      const updatedCountry = await countryCapacity.findOneAndUpdate(
        { _id: country._id },
        { 
          $inc: { used_capacity: 1 },
          $set: { updated_at: new Date() }
        },
        { returnDocument: 'after' }
      )

      if (!updatedCountry) {
        return NextResponse.json({ 
          success: false,
          error: 'Failed to reserve capacity'
        }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true,
        country: updatedCountry,
        message: 'Capacity reserved successfully',
        remainingCapacity: updatedCountry.max_capacity - updatedCountry.used_capacity
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[Countries Public API] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
