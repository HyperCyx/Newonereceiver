import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/mongodb/auth'
import { Collections, getCollection } from '@/lib/mongodb/client'

// GET - List all countries with capacity info
export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    await requireAdmin()

    // Fetch all countries
    const countryCapacity = await getCollection(Collections.COUNTRY_CAPACITY)
    const countries = await countryCapacity
      .find({})
      .sort({ country_name: 1 })
      .toArray()

    return NextResponse.json({ 
      success: true, 
      countries: countries || [] 
    })
  } catch (error: any) {
    console.error('[Countries API] GET error:', error)
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create or update country capacity
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single()

    if (userError || !userData?.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { action, countryId, countryCode, countryName, maxCapacity, prizeAmount, isActive } = body

    // Handle different actions
    if (action === 'create') {
      // Create new country
      const { data, error } = await supabase
        .from('country_capacity')
        .insert({
          country_code: countryCode,
          country_name: countryName,
          max_capacity: maxCapacity || 0,
          prize_amount: prizeAmount || 0,
          is_active: isActive !== undefined ? isActive : true,
          used_capacity: 0
        })
        .select()
        .single()

      if (error) {
        console.error('[Countries API] Error creating country:', error)
        return NextResponse.json({ 
          error: error.message || 'Failed to create country',
          details: error
        }, { status: 400 })
      }

      return NextResponse.json({ 
        success: true, 
        country: data,
        message: 'Country created successfully'
      })
    } 
    else if (action === 'update') {
      // Update existing country
      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      if (countryName !== undefined) updateData.country_name = countryName
      if (maxCapacity !== undefined) updateData.max_capacity = maxCapacity
      if (prizeAmount !== undefined) updateData.prize_amount = prizeAmount
      if (isActive !== undefined) updateData.is_active = isActive

      const { data, error } = await supabase
        .from('country_capacity')
        .update(updateData)
        .eq('id', countryId)
        .select()
        .single()

      if (error) {
        console.error('[Countries API] Error updating country:', error)
        return NextResponse.json({ error: 'Failed to update country' }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        country: data,
        message: 'Country updated successfully'
      })
    }
    else if (action === 'delete') {
      // Delete country
      const { error } = await supabase
        .from('country_capacity')
        .delete()
        .eq('id', countryId)

      if (error) {
        console.error('[Countries API] Error deleting country:', error)
        return NextResponse.json({ error: 'Failed to delete country' }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true,
        message: 'Country deleted successfully'
      })
    }
    else if (action === 'reset_capacity') {
      // Reset used capacity to 0
      const { data, error } = await supabase
        .from('country_capacity')
        .update({ 
          used_capacity: 0,
          updated_at: new Date().toISOString()
        })
        .eq('id', countryId)
        .select()
        .single()

      if (error) {
        console.error('[Countries API] Error resetting capacity:', error)
        return NextResponse.json({ error: 'Failed to reset capacity' }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        country: data,
        message: 'Capacity reset successfully'
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('[Countries API] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
