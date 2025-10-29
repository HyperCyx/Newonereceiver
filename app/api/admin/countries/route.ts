import { NextRequest, NextResponse } from 'next/server'
import { ObjectId } from 'mongodb'
import { checkAdminByTelegramId } from '@/lib/mongodb/auth'
import { Collections, getCollection, generateId } from '@/lib/mongodb/client'

// GET - List all countries with capacity info
export async function GET(request: NextRequest) {
  try {
    // For GET, allow access (public endpoint for users to see countries)
    // Admin check will be done on POST/DELETE operations
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Create or update country capacity
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, countryId, countryCode, countryName, maxCapacity, prizeAmount, autoApproveMinutes, isActive, telegramId } = body

    console.log('[Countries API] POST request:', { action, countryId, telegramId })

    // Check if user is admin using Telegram ID
    if (!telegramId) {
      console.log('[Countries API] No telegram ID provided')
      return NextResponse.json({ error: 'Telegram ID required' }, { status: 400 })
    }

    const isAdmin = await checkAdminByTelegramId(telegramId)
    console.log('[Countries API] Admin check:', { telegramId, isAdmin })
    
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

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
        auto_approve_minutes: autoApproveMinutes !== undefined ? autoApproveMinutes : 1440,
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
      console.log('[Countries API] Update - countryId:', countryId, 'type:', typeof countryId)
      
      // Convert string ID to ObjectId if needed
      let queryId: any = countryId
      try {
        if (typeof countryId === 'string' && ObjectId.isValid(countryId)) {
          queryId = new ObjectId(countryId)
          console.log('[Countries API] Converted to ObjectId')
        }
      } catch (e) {
        console.log('[Countries API] Keeping as string')
      }
      
      const updateData: any = {
        updated_at: new Date()
      }

      if (countryName !== undefined) updateData.country_name = countryName
      if (maxCapacity !== undefined) updateData.max_capacity = maxCapacity
      if (prizeAmount !== undefined) updateData.prize_amount = prizeAmount
      if (autoApproveMinutes !== undefined) updateData.auto_approve_minutes = autoApproveMinutes
      if (isActive !== undefined) updateData.is_active = isActive

      console.log('[Countries API] Update data:', updateData)

      // Check if country exists first
      const existing = await countryCapacity.findOne({ _id: queryId })
      console.log('[Countries API] Existing country:', existing ? 'Found' : 'Not found', existing?._id)

      if (!existing) {
        return NextResponse.json({ error: 'Country not found', countryId }, { status: 404 })
      }

      const result = await countryCapacity.findOneAndUpdate(
        { _id: queryId },
        { $set: updateData },
        { returnDocument: 'after' }
      )

      console.log('[Countries API] Update result:', result ? 'Success' : 'Failed')

      return NextResponse.json({ 
        success: true, 
        country: result,
        message: 'Country updated successfully'
      })
    }
    else if (action === 'delete') {
      // Delete country
      console.log('[Countries API] Delete - countryId:', countryId)
      
      // Convert string ID to ObjectId if needed
      let queryId: any = countryId
      try {
        if (typeof countryId === 'string' && ObjectId.isValid(countryId)) {
          queryId = new ObjectId(countryId)
        }
      } catch (e) {
        // Keep as string if conversion fails
      }
      
      // Check if exists first
      const existing = await countryCapacity.findOne({ _id: queryId })
      console.log('[Countries API] Country exists:', existing ? 'Yes' : 'No')
      
      if (!existing) {
        return NextResponse.json({ error: 'Country not found', countryId }, { status: 404 })
      }

      const deleteResult = await countryCapacity.deleteOne({ _id: queryId })
      console.log('[Countries API] Delete result:', deleteResult.deletedCount, 'deleted')

      return NextResponse.json({ 
        success: true,
        message: 'Country deleted successfully'
      })
    }
    else if (action === 'reset_capacity') {
      // Reset used capacity to 0
      console.log('[Countries API] Reset - countryId:', countryId, 'type:', typeof countryId)
      
      // Convert string ID to ObjectId if needed
      let queryId: any = countryId
      try {
        if (typeof countryId === 'string' && ObjectId.isValid(countryId)) {
          queryId = new ObjectId(countryId)
          console.log('[Countries API] Converted to ObjectId')
        }
      } catch (e) {
        console.log('[Countries API] Keeping as string')
      }
      
      // Check if exists first
      const existing = await countryCapacity.findOne({ _id: queryId })
      console.log('[Countries API] Query result:', existing ? `Found: ${existing._id}` : 'Not found')
      
      if (!existing) {
        return NextResponse.json({ error: 'Country not found', countryId }, { status: 404 })
      }

      const result = await countryCapacity.findOneAndUpdate(
        { _id: queryId },
        { $set: { used_capacity: 0, updated_at: new Date() } },
        { returnDocument: 'after' }
      )

      console.log('[Countries API] Reset result:', result ? 'Success' : 'Failed')

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
