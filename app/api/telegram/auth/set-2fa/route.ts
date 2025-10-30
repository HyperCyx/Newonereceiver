import { NextRequest, NextResponse } from 'next/server'
import { set2FAPassword } from '@/lib/telegram/auth'
import { Collections, getCollection } from '@/lib/mongodb/client'
import * as fs from 'fs'
import * as path from 'path'

const SESSIONS_DIR = path.join(process.cwd(), 'telegram_sessions')

/**
 * POST /api/telegram/auth/set-2fa
 * Set or change 2FA password on Telegram account
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber, newPassword, currentPassword, telegramId } = body

    if (!phoneNumber || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Phone number and new password are required' },
        { status: 400 }
      )
    }

    console.log(`[Set2FA] Setting 2FA password for: ${phoneNumber}`)

    // Load session string from file
    const files = fs.readdirSync(SESSIONS_DIR)
    const sessionFile = files.find((f) => 
      f.startsWith(phoneNumber.replace('+', '')) && 
      !f.includes('pending2fa')
    )

    if (!sessionFile) {
      return NextResponse.json(
        { success: false, error: 'Session not found. Please login first.' },
        { status: 404 }
      )
    }

    const filePath = path.join(SESSIONS_DIR, sessionFile)
    const sessionData = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

    // Set/change the 2FA password
    const result = await set2FAPassword(
      phoneNumber,
      sessionData.sessionString,
      newPassword,
      currentPassword
    )

    if (result.success) {
      // Update account record with 2FA status
      if (telegramId) {
        try {
          const accounts = await getCollection(Collections.ACCOUNTS)
          const users = await getCollection(Collections.USERS)
          
          const user = await users.findOne({ telegram_id: telegramId })
          
          if (user) {
            const account = await accounts.findOne({
              user_id: user._id,
              phone_number: phoneNumber
            })

            if (account) {
              await accounts.updateOne(
                { _id: account._id },
                { 
                  $set: { 
                    has_2fa: true,
                    twofa_set_at: new Date(),
                    twofa_password: newPassword, // Store for validation
                    validation_status: 'pending',
                    updated_at: new Date()
                  } 
                }
              )
              console.log(`[Set2FA] ✅ Updated account record with 2FA status`)
            }
          }
        } catch (dbError) {
          console.error('[Set2FA] Database error:', dbError)
        }
      }

      return NextResponse.json({
        success: true,
        message: '2FA password set successfully',
      })
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      )
    }
  } catch (error: any) {
    console.error('[Set2FA] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
