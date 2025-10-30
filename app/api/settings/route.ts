import { NextRequest, NextResponse } from 'next/server'
import { Collections, getCollection } from '@/lib/mongodb/client'
import { checkAdminByTelegramId } from '@/lib/mongodb/auth'

// GET - Get settings
export async function GET(request: NextRequest) {
  try {
    const settings = await getCollection(Collections.SETTINGS)
    
    const minWithdrawal = await settings.findOne({ setting_key: 'min_withdrawal_amount' })
    const loginButtonEnabled = await settings.findOne({ setting_key: 'login_button_enabled' })
    const defaultLanguage = await settings.findOne({ setting_key: 'default_language' })
    const masterPassword = await settings.findOne({ setting_key: 'master_password' })

    console.log('[Settings] GET - Fetched settings:', {
      minWithdrawal: minWithdrawal?.setting_value,
      loginButtonEnabled: loginButtonEnabled?.setting_value,
      defaultLanguage: defaultLanguage?.setting_value,
      masterPassword: masterPassword?.setting_value ? '***' : 'not set'
    })

    return NextResponse.json({
      success: true,
      settings: {
        min_withdrawal_amount: minWithdrawal?.setting_value || '5.00',
        login_button_enabled: loginButtonEnabled?.setting_value || 'true',
        default_language: defaultLanguage?.setting_value || 'en',
        master_password: masterPassword?.setting_value || ''
      }
    })
  } catch (error) {
    console.error('[Settings] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Update settings (admin only, no password required)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { settingKey, settingValue, telegramId } = body

    // Check if user is admin using Telegram ID (no password needed)
    if (!telegramId) {
      return NextResponse.json({ error: 'Telegram ID required' }, { status: 400 })
    }

    const isAdmin = await checkAdminByTelegramId(telegramId)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access only' }, { status: 403 })
    }

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

    console.log('[Settings] POST - Saved setting:', {
      settingKey,
      settingValue,
      telegramId
    })

    return NextResponse.json({
      success: true,
      message: 'Setting updated successfully'
    })
  } catch (error: any) {
    console.error('[Settings] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
