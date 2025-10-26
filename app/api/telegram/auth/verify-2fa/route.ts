import { NextRequest, NextResponse } from 'next/server'
import { verify2FA } from '@/lib/telegram/auth'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * POST /api/telegram/auth/verify-2fa
 * Verify 2FA password
 */
export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, sessionString, password, telegramId } = await request.json()

    if (!phoneNumber || !sessionString || !password) {
      return NextResponse.json(
        { success: false, error: 'Phone number, session string, and password are required' },
        { status: 400 }
      )
    }

    console.log(`[Verify2FA] Verifying 2FA for: ${phoneNumber}`)

    const result = await verify2FA(phoneNumber, sessionString, password)

    if (result.success) {
      // Create account record in database
      if (telegramId) {
        try {
          const supabase = createClient(supabaseUrl, supabaseServiceKey)
          
          // Get user from database
          const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('telegram_id', telegramId)
            .single()
          
          if (user) {
            // Insert account record with pending status
            const { error: accountError } = await supabase
              .from('accounts')
              .insert({
                user_id: user.id,
                phone_number: phoneNumber,
                amount: 0, // Default amount, can be updated later
                status: 'pending'
              })
            
            if (accountError) {
              console.error('[Verify2FA] Error creating account record:', accountError)
            } else {
              console.log(`[Verify2FA] Account record created for ${phoneNumber}`)
            }
          }
        } catch (dbError) {
          console.error('[Verify2FA] Database error:', dbError)
        }
      }
      
      return NextResponse.json({
        success: true,
        userId: result.userId,
        message: 'Login successful! Session created.',
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('[Verify2FA] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
