import { NextRequest, NextResponse } from 'next/server'
import { validate2FAPassword } from '@/lib/telegram/auth'
import { Collections, getCollection } from '@/lib/mongodb/client'
import * as fs from 'fs'
import * as path from 'path'

const SESSIONS_DIR = path.join(process.cwd(), 'telegram_sessions')

/**
 * POST /api/accounts/validate
 * Validate 2FA password on account and update validation status
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber, password, telegramId } = body

    if (!phoneNumber || !password) {
      return NextResponse.json(
        { success: false, error: 'Phone number and password are required' },
        { status: 400 }
      )
    }

    console.log(`[ValidateAccount] Validating 2FA for: ${phoneNumber}`)

    // Load session string from file
    const files = fs.readdirSync(SESSIONS_DIR)
    const sessionFile = files.find((f) => 
      f.startsWith(phoneNumber.replace('+', '')) && 
      !f.includes('pending2fa')
    )

    if (!sessionFile) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      )
    }

    const filePath = path.join(SESSIONS_DIR, sessionFile)
    const sessionData = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

    // Validate the 2FA password
    const result = await validate2FAPassword(
      phoneNumber,
      sessionData.sessionString,
      password
    )

    const accounts = await getCollection(Collections.ACCOUNTS)
    const users = await getCollection(Collections.USERS)
    
    if (telegramId) {
      const user = await users.findOne({ telegram_id: telegramId })
      
      if (user) {
        const account = await accounts.findOne({
          user_id: user._id,
          phone_number: phoneNumber
        })

        if (account) {
          if (result.success && result.passwordValid) {
            // Validation successful
            await accounts.updateOne(
              { _id: account._id },
              { 
                $set: { 
                  validation_status: 'validated',
                  validated_at: new Date(),
                  acceptance_status: 'accepted', // Auto-accept on successful validation
                  updated_at: new Date()
                } 
              }
            )
            console.log(`[ValidateAccount] ✅ Account validated successfully`)
            
            return NextResponse.json({
              success: true,
              message: 'Account validated successfully',
              validation_status: 'validated',
              acceptance_status: 'accepted'
            })
          } else if (!result.has2FA) {
            // No 2FA set - reject as frozen
            await accounts.updateOne(
              { _id: account._id },
              { 
                $set: { 
                  validation_status: 'failed',
                  acceptance_status: 'rejected',
                  rejection_reason: 'No 2FA password set',
                  limit_status: 'frozen',
                  updated_at: new Date()
                } 
              }
            )
            console.log(`[ValidateAccount] ❌ No 2FA set - account rejected as frozen`)
            
            return NextResponse.json({
              success: false,
              message: 'Account rejected - No 2FA password set',
              validation_status: 'failed',
              acceptance_status: 'rejected',
              error: 'NO_2FA_SET'
            })
          } else if (!result.passwordValid) {
            // 2FA password changed/invalid - reject as frozen
            await accounts.updateOne(
              { _id: account._id },
              { 
                $set: { 
                  validation_status: 'failed',
                  acceptance_status: 'rejected',
                  rejection_reason: "The account's 2FA password has been changed and cannot be verified",
                  limit_status: 'frozen',
                  updated_at: new Date()
                } 
              }
            )
            console.log(`[ValidateAccount] ❌ 2FA password invalid - account rejected as frozen`)
            
            return NextResponse.json({
              success: false,
              message: 'Account rejected - 2FA password cannot be verified',
              validation_status: 'failed',
              acceptance_status: 'rejected',
              error: '2FA_PASSWORD_CHANGED'
            })
          }
        }
      }
    }

    return NextResponse.json(
      { success: false, error: 'Account not found' },
      { status: 404 }
    )
  } catch (error: any) {
    console.error('[ValidateAccount] Error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
