/**
 * Step 4: Verify 2FA Password (Optional)
 * Corresponds to: J → K → L → M/N in flowchart
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCollection, Collections } from '@/lib/mongodb/client'
import { verify2FA } from '@/lib/telegram/auth'
import { ObjectId } from 'mongodb'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accountId, phoneNumber, password, sessionString } = body

    if (!accountId || !phoneNumber || !password || !sessionString) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log(`[Verify2FA] Verifying 2FA password for account: ${accountId}`)

    const accounts = await getCollection(Collections.ACCOUNTS)
    const account = await accounts.findOne({ _id: new ObjectId(accountId) })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Verify 2FA password via Telegram
    const verify2FAResult = await verify2FA(phoneNumber, sessionString, password)

    if (!verify2FAResult.success) {
      console.log(`[Verify2FA] ❌ Invalid 2FA password: ${verify2FAResult.error}`)
      return NextResponse.json({
        success: false,
        error: verify2FAResult.error || 'Invalid password',
      }, { status: 400 })
    }

    // 2FA verified successfully
    console.log(`[Verify2FA] ✅ 2FA password verified successfully`)
    
    await accounts.updateOne(
      { _id: new ObjectId(accountId) },
      {
        $set: {
          status: 'setting_password',
          two_fa_verified_at: new Date(),
          had_existing_password: true,
          telegram_user_id: verify2FAResult.userId,
          updated_at: new Date(),
        }
      }
    )

    return NextResponse.json({
      success: true,
      userId: verify2FAResult.userId,
      message: '2FA password verified successfully',
    })
  } catch (error: any) {
    console.error('[Verify2FA] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
