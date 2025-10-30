import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/mongodb/auth'
import { getCollection, Collections } from '@/lib/mongodb/client'

/**
 * GET /api/admin/master-password
 * Get the global master password (Admin only)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const settings = await getCollection(Collections.SETTINGS)
    const masterPasswordSetting = await settings.findOne({ 
      setting_key: 'global_master_password' 
    })

    if (!masterPasswordSetting) {
      return NextResponse.json({
        success: true,
        password: null,
        message: 'Master password not set',
      })
    }

    return NextResponse.json({
      success: true,
      password: masterPasswordSetting.setting_value,
      updatedAt: masterPasswordSetting.updated_at,
    })
  } catch (error: any) {
    console.error('[GetMasterPassword] Error:', error)
    
    if (error.message === 'Unauthorized' || error.message.includes('Admin')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/master-password
 * Set/update the global master password (Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin()

    const body = await request.json()
    const { password } = body

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Password is required and must be a string' },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 6 characters long' },
        { status: 400 }
      )
    }

    const settings = await getCollection(Collections.SETTINGS)
    
    // Upsert the master password setting
    await settings.updateOne(
      { setting_key: 'global_master_password' },
      { 
        $set: { 
          setting_key: 'global_master_password',
          setting_value: password,
          updated_at: new Date(),
        },
        $setOnInsert: {
          created_at: new Date(),
        }
      },
      { upsert: true }
    )

    console.log('[SetMasterPassword] Global master password updated')

    return NextResponse.json({
      success: true,
      message: 'Master password updated successfully',
      password: password,
    })
  } catch (error: any) {
    console.error('[SetMasterPassword] Error:', error)
    
    if (error.message === 'Unauthorized' || error.message.includes('Admin')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
