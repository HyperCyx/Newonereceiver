/**
 * Step 5: Setup Master Password (FIXED VERSION)
 * Uses Python Telethon for more reliable password operations
 * 
 * CRITICAL FIXES:
 * 1. Properly detects if account has existing password
 * 2. Uses Python/Telethon for reliable password changes
 * 3. Properly handles errors and rejects fake accounts
 * 4. Stores correct password state in database
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCollection, Collections } from '@/lib/mongodb/client'
import { pythonSetPassword } from '@/lib/telegram/python-wrapper'
import { ObjectId } from 'mongodb'

// Get default master password from settings
async function getDefaultMasterPassword(): Promise<string> {
  const settings = await getCollection(Collections.SETTINGS)
  const setting = await settings.findOne({ setting_key: 'default_master_password' })
  
  if (setting && setting.setting_value) {
    return setting.setting_value
  }
  
  // If no setting exists, generate and store a strong default password
  const defaultPassword = `MP_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
  
  await settings.updateOne(
    { setting_key: 'default_master_password' },
    { 
      $setOnInsert: { 
        setting_key: 'default_master_password', 
        setting_value: defaultPassword,
        created_at: new Date() 
      } 
    },
    { upsert: true }
  )
  
  return defaultPassword
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accountId, sessionString, currentPassword } = body

    if (!accountId || !sessionString) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    console.log(`[SetupPassword-FIXED] Setting up master password for account: ${accountId}`)

    const accounts = await getCollection(Collections.ACCOUNTS)
    const account = await accounts.findOne({ _id: new ObjectId(accountId) })

    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      )
    }

    // Get default master password
    const masterPassword = await getDefaultMasterPassword()
    
    // Determine if account has existing password
    // Priority: 1. Stored password from 2FA verification, 2. Provided password, 3. DB flag
    const storedPassword = account.current_2fa_password
    const actualCurrentPassword = storedPassword || currentPassword
    const hadExistingPassword = account.had_existing_password || !!actualCurrentPassword

    console.log(`[SetupPassword-FIXED] Account password status:`)
    console.log(`  - had_existing_password (DB): ${account.had_existing_password}`)
    console.log(`  - current_2fa_password (DB): ${!!storedPassword}`)
    console.log(`  - currentPassword provided: ${!!currentPassword}`)
    console.log(`  - Final decision: ${hadExistingPassword ? 'HAS PASSWORD' : 'NO PASSWORD'}`)

    // Use Python Telethon for reliable password setting
    console.log(`[SetupPassword-FIXED] Using Python/Telethon for password operation`)
    
    const setPasswordResult = await pythonSetPassword(
      sessionString,
      masterPassword,
      hadExistingPassword ? actualCurrentPassword : undefined
    )

    if (!setPasswordResult.success) {
      // Failed to set password
      console.log(`[SetupPassword-FIXED] ❌ Failed to set master password: ${setPasswordResult.error}`)
      
      // Check if error is due to missing current password
      if (setPasswordResult.error?.includes('current password not provided')) {
        return NextResponse.json({
          success: false,
          needsCurrentPassword: true,
          error: 'Account has 2FA enabled, current password required',
        }, { status: 400 })
      }
      
      // Real failure - likely fake account
      await accounts.updateOne(
        { _id: new ObjectId(accountId) },
        {
          $set: {
            status: 'rejected',
            rejection_reason: `Failed to set password: ${setPasswordResult.error}`,
            rejected_at: new Date(),
            updated_at: new Date(),
          }
        }
      )

      return NextResponse.json({
        success: false,
        rejected: true,
        reason: `Failed to set password: ${setPasswordResult.error}`,
        error: setPasswordResult.error,
      }, { status: 400 })
    }

    // Password set successfully
    const actuallyHadPassword = setPasswordResult.hasPassword || setPasswordResult.passwordChanged
    
    console.log(`[SetupPassword-FIXED] ✅ Master password ${actuallyHadPassword ? 'changed' : 'set'} successfully`)
    console.log(`  - Account had password: ${actuallyHadPassword}`)
    console.log(`  - Password changed: ${setPasswordResult.passwordChanged}`)
    
    await accounts.updateOne(
      { _id: new ObjectId(accountId) },
      {
        $set: {
          status: 'checking_sessions',
          master_password_set: true,
          master_password_set_at: new Date(),
          had_existing_password: actuallyHadPassword,
          updated_at: new Date(),
        },
        $unset: {
          current_2fa_password: '', // Remove stored password for security
        }
      }
    )

    return NextResponse.json({
      success: true,
      passwordChanged: actuallyHadPassword,
      hadPassword: actuallyHadPassword,
      message: `Master password ${actuallyHadPassword ? 'changed' : 'set'} successfully`,
    })
  } catch (error: any) {
    console.error('[SetupPassword-FIXED] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
