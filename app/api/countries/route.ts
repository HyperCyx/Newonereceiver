import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Get available countries with capacity info (public access)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Fetch all active countries
    const { data: countries, error } = await supabase
      .from('country_capacity')
      .select('id, country_code, country_name, max_capacity, used_capacity, prize_amount, is_active')
      .eq('is_active', true)
      .order('country_name', { ascending: true })

    if (error) {
      console.error('[Countries Public API] Error fetching countries:', error)
      return NextResponse.json({ error: 'Failed to fetch countries' }, { status: 500 })
    }

    // Calculate available capacity for each country
    const countriesWithAvailability = (countries || []).map(country => ({
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
    const supabase = await createClient()
    const body = await request.json()
    const { countryCode, action } = body

    if (!countryCode) {
      return NextResponse.json({ error: 'Country code is required' }, { status: 400 })
    }

    if (action === 'check') {
      // Check if country has capacity
      const { data: country, error } = await supabase
        .from('country_capacity')
        .select('*')
        .eq('country_code', countryCode)
        .eq('is_active', true)
        .single()

      if (error || !country) {
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
      // This should be called from the registration/purchase process
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Get current country data
      const { data: country, error: fetchError } = await supabase
        .from('country_capacity')
        .select('*')
        .eq('country_code', countryCode)
        .eq('is_active', true)
        .single()

      if (fetchError || !country) {
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
      const { data: updatedCountry, error: updateError } = await supabase
        .from('country_capacity')
        .update({ 
          used_capacity: country.used_capacity + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', country.id)
        .select()
        .single()

      if (updateError) {
        console.error('[Countries Public API] Error reserving capacity:', updateError)
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
