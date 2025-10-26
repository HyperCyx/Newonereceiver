import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/mongodb/auth'
import { Collections, getCollection, generateId } from '@/lib/mongodb/client'

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
    // Check if user is admin
    await requireAdmin()

    const body = await request.json()
    const { action, countryId, countryCode, countryName, maxCapacity, prizeAmount, isActive } = body

    const countryCapacity = await getCollection(Collections.COUNTRY_CAPACITY)

    // Handle different actions
    if (action === 'create') {
      // Create new country
      const newCountry = {
        _id: generateId(),
        country_code: countryCode,
        country_name: countryName,
        max_capacity: maxCapacity || 0,
        prize_amount: prizeAmount || 0,
        is_active: isActive !== undefined ? isActive : true,
        used_capacity: 0,
        created_at: new Date(),
        updated_at: new Date()
      }

      await countryCapacity.insertOne(newCountry)

      return NextResponse.json({ 
        success: true, 
        country: newCountry,
        message: 'Country created successfully'
      })
    } 
    else if (action === 'update') {
      // Update existing country
      const updateData: any = {
        updated_at: new Date()
      }

      if (countryName !== undefined) updateData.country_name = countryName
      if (maxCapacity !== undefined) updateData.max_capacity = maxCapacity
      if (prizeAmount !== undefined) updateData.prize_amount = prizeAmount
      if (isActive !== undefined) updateData.is_active = isActive

      const result = await countryCapacity.findOneAndUpdate(
        { _id: countryId },
        { $set: updateData },
        { returnDocument: 'after' }
      )

      if (!result) {
        return NextResponse.json({ error: 'Country not found' }, { status: 404 })
      }

      return NextResponse.json({ 
        success: true, 
        country: result,
        message: 'Country updated successfully'
      })
    }
    else if (action === 'delete') {
      // Delete country
      await countryCapacity.deleteOne({ _id: countryId })

      return NextResponse.json({ 
        success: true,
        message: 'Country deleted successfully'
      })
    }
    else if (action === 'reset_capacity') {
      // Reset used capacity to 0
      const result = await countryCapacity.findOneAndUpdate(
        { _id: countryId },
        { $set: { used_capacity: 0, updated_at: new Date() } },
        { returnDocument: 'after' }
      )

      if (!result) {
        return NextResponse.json({ error: 'Country not found' }, { status: 404 })
      }

      return NextResponse.json({ 
        success: true, 
        country: result,
        message: 'Capacity reset successfully'
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('[Countries API] POST error:', error)
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
