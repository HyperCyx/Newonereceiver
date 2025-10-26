import { NextRequest, NextResponse } from 'next/server'
import { Collections, getCollection } from '@/lib/mongodb/client'
import { requireAdmin, getAuthUser } from '@/lib/mongodb/auth'

// GET - Get settings
export async function GET(request: NextRequest) {
  try {
    const settings = await getCollection(Collections.SETTINGS)
    
    const minWithdrawal = await settings.findOne({ setting_key: 'min_withdrawal_amount' })

    return NextResponse.json({
      success: true,
      settings: {
        min_withdrawal_amount: minWithdrawal?.setting_value || '5.00'
      }
    })
  } catch (error) {
    console.error('[Settings] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Update settings
export async function POST(request: NextRequest) {
  try {
    // Check if user is admin
    await requireAdmin()

    const body = await request.json()
    const { settingKey, settingValue } = body

    if (!settingKey || !settingValue) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const settings = await getCollection(Collections.SETTINGS)

    // Update or create setting
    await settings.updateOne(
      { setting_key: settingKey },
      { 
        $set: {
          setting_key: settingKey,
          setting_value: settingValue,
          updated_at: new Date()
        },
        $setOnInsert: {
          created_at: new Date()
        }
      },
      { upsert: true }
    )

    return NextResponse.json({
      success: true,
      message: 'Setting updated successfully'
    })
  } catch (error: any) {
    console.error('[Settings] POST error:', error)
    if (error.message === 'Unauthorized' || error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: error.message === 'Unauthorized' ? 401 : 403 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
