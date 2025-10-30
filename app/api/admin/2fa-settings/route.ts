import { NextRequest, NextResponse } from 'next/server'
import { Collections, getCollection } from '@/lib/mongodb/client'
import { checkAdminByTelegramId } from '@/lib/mongodb/auth'

/**
 * GET /api/admin/2fa-settings
 * Get the master 2FA password setting
 */
export async function GET(request: NextRequest) {
  try {
    const telegramId = request.headers.get('x-telegram-id')
    
    if (!telegramId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = await checkAdminByTelegramId(parseInt(telegramId))
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access only' }, { status: 403 })
    }

    const settings = await getCollection(Collections.SETTINGS)
    const masterPasswordSetting = await settings.findOne({ setting_key: 'master_2fa_password' })

    return NextResponse.json({
      success: true,
      master_password: masterPasswordSetting?.setting_value || '',
      last_updated: masterPasswordSetting?.updated_at || null
    })
  } catch (error: any) {
    console.error('[2FASettings] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/2fa-settings
 * Set the master 2FA password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { masterPassword, telegramId } = body

    if (!telegramId) {
      return NextResponse.json({ error: 'Telegram ID required' }, { status: 400 })
    }

    const isAdmin = await checkAdminByTelegramId(telegramId)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access only' }, { status: 403 })
    }

    if (!masterPassword || masterPassword.length < 4) {
      return NextResponse.json({ 
        error: 'Password must be at least 4 characters long' 
      }, { status: 400 })
    }

    const settings = await getCollection(Collections.SETTINGS)
    
    await settings.updateOne(
      { setting_key: 'master_2fa_password' },
      { 
        $set: { 
          setting_key: 'master_2fa_password',
          setting_value: masterPassword,
          updated_at: new Date(),
          updated_by: telegramId
        } 
      },
      { upsert: true }
    )

    console.log(`[2FASettings] ✅ Master 2FA password updated by admin ${telegramId}`)

    return NextResponse.json({
      success: true,
      message: 'Master 2FA password updated successfully'
    })
  } catch (error: any) {
    console.error('[2FASettings] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
