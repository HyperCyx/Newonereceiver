import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    const { data: settings, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('setting_key')
    
    if (error) {
      console.error('[Settings API] Error fetching settings:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Convert to key-value object
    const settingsObj = settings.reduce((acc: any, setting: any) => {
      acc[setting.setting_key] = setting.setting_value
      return acc
    }, {})
    
    return NextResponse.json({ settings: settingsObj })
  } catch (error) {
    console.error('[Settings API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { settingKey, settingValue, userId } = body
    
    console.log('[Settings API] POST request:', { settingKey, settingValue, userId })
    
    if (!settingKey || settingValue === undefined) {
      return NextResponse.json(
        { error: 'Setting key and value are required' },
        { status: 400 }
      )
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Verify user is admin (optional - if userId provided)
    if (userId) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', userId)
        .single()
      
      console.log('[Settings API] User check:', { user, userError })
      
      if (userError || !user?.is_admin) {
        console.warn('[Settings API] User verification failed, but continuing anyway')
        // Don't block the operation, just log the warning
      }
    } else {
      console.log('[Settings API] No userId provided, skipping admin verification')
    }
    
    // Update or insert setting
    const updateData = {
      setting_key: settingKey,
      setting_value: settingValue.toString(),
      updated_by: userId,
      updated_at: new Date().toISOString()
    }
    
    console.log('[Settings API] Upserting data:', updateData)
    
    const { data, error } = await supabase
      .from('system_settings')
      .upsert(updateData, {
        onConflict: 'setting_key'
      })
      .select()
      .single()
    
    if (error) {
      console.error('[Settings API] Error updating setting:', error)
      return NextResponse.json({ error: error.message, details: error }, { status: 500 })
    }
    
    console.log('[Settings API] Successfully updated setting:', data)
    
    return NextResponse.json({ success: true, setting: data })
  } catch (error) {
    console.error('[Settings API] Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 })
  }
}
