/**
 * Step 2: Send Telegram OTP
 * Corresponds to: D → E in flowchart
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCollection, Collections } from '@/lib/mongodb/client'
import { pyrogramSendOTP } from '@/lib/telegram/python-wrapper'
import { ObjectId } from 'mongodb'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { phoneNumber, countryCode, userId } = body

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      )
    }

    console.log(`[SendOTP] Sending OTP to: ${phoneNumber}`)

    // Send OTP via Pyrogram
    const otpResult = await pyrogramSendOTP(phoneNumber)

    if (!otpResult.success) {
      console.log(`[SendOTP] ❌ Failed to send OTP: ${otpResult.error}`)
      return NextResponse.json({
        success: false,
        error: otpResult.error || 'Failed to send OTP',
      }, { status: 400 })
    }

    console.log(`[SendOTP] ✅ OTP sent successfully`)

    // Create or update account record
    const accounts = await getCollection(Collections.ACCOUNTS)
    
    const accountData = {
      user_id: userId || 'pending',
      phone_number: phoneNumber,
      country_code: countryCode || phoneNumber.substring(0, 3),
      status: 'verifying_otp',
      otp_phone_code_hash: otpResult.phoneCodeHash,
      otp_session_string: otpResult.sessionString,
      requires_2fa: false,
      had_existing_password: false,
      master_password_set: false,
      initial_session_count: 0,
      multiple_devices_detected: false,
      first_logout_attempted: false,
      final_logout_attempted: false,
      country_wait_minutes: 1440, // Default 24 hours
      ready_for_final_validation: false,
      last_session_check: new Date(),
      updated_at: new Date(),
    }

    let accountId: string

    // Check if account already exists
    const existingAccount = await accounts.findOne({ phone_number: phoneNumber })
    
    if (existingAccount) {
      // Update existing account
      await accounts.updateOne(
        { _id: existingAccount._id },
        { $set: accountData }
      )
      accountId = existingAccount._id.toString()
      console.log(`[SendOTP] Updated existing account: ${accountId}`)
    } else {
      // Create new account
      const result = await accounts.insertOne({
        ...accountData,
        created_at: new Date(),
      } as any)
      accountId = result.insertedId.toString()
      console.log(`[SendOTP] Created new account: ${accountId}`)
    }

    return NextResponse.json({
      success: true,
      accountId,
      phoneCodeHash: otpResult.phoneCodeHash,
      sessionString: otpResult.sessionString,
      message: 'OTP sent successfully',
    })
  } catch (error: any) {
    console.error('[SendOTP] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
