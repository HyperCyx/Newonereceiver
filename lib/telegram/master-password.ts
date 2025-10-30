import { TelegramClient, Api } from 'telegram'
import { StringSession } from 'telegram/sessions'
import { getCollection, Collections } from '@/lib/mongodb/client'

const apiId = parseInt(process.env.API_ID || '23404078')
const apiHash = process.env.API_HASH || '6f05053d7edb7a3aa89049bd934922d1'

/**
 * Get the global master password from settings
 */
async function getGlobalMasterPassword(): Promise<string | null> {
  try {
    const settings = await getCollection(Collections.SETTINGS)
    const masterPasswordSetting = await settings.findOne({ 
      setting_key: 'global_master_password' 
    })
    
    if (!masterPasswordSetting || !masterPasswordSetting.setting_value) {
      console.warn('[MasterPassword] No global master password set in settings')
      return null
    }
    
    return masterPasswordSetting.setting_value as string
  } catch (error) {
    console.error('[MasterPassword] Error getting global master password:', error)
    return null
  }
}

/**
 * Check if account has 2FA/master password enabled
 */
export async function has2FAEnabled(sessionString: string): Promise<{
  success: boolean
  hasPassword?: boolean
  error?: string
}> {
  const session = new StringSession(sessionString)
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
    deviceModel: 'Telegram Web',
    systemVersion: '1.0',
    appVersion: '10.9.3',
    langCode: 'en',
    systemLangCode: 'en-US',
  })

  try {
    await client.connect()

    const passwordInfo = await client.invoke(new Api.account.GetPassword())
    
    await client.disconnect()

    const hasPassword = !!passwordInfo.currentAlgo

    return {
      success: true,
      hasPassword,
    }
  } catch (error: any) {
    console.error('[MasterPassword] Error checking 2FA status:', error)
    
    try {
      await client.disconnect()
    } catch (e) {
      // Ignore disconnect errors
    }

    return {
      success: false,
      error: error.errorMessage || error.message || 'Failed to check 2FA status',
    }
  }
}

/**
 * Set master password (2FA) for the account
 * Uses global master password from settings
 */
export async function setMasterPassword(
  sessionString: string
): Promise<{
  success: boolean
  error?: string
}> {
  const session = new StringSession(sessionString)
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
    deviceModel: 'Telegram Web',
    systemVersion: '1.0',
    appVersion: '10.9.3',
    langCode: 'en',
    systemLangCode: 'en-US',
  })

  try {
    await client.connect()

    // Get global master password from settings
    const globalPassword = await getGlobalMasterPassword()
    
    if (!globalPassword) {
      await client.disconnect()
      return {
        success: false,
        error: 'Global master password not configured. Please set it in admin panel.',
      }
    }

    // Check if password already exists
    const passwordInfo = await client.invoke(new Api.account.GetPassword())
    
    if (passwordInfo.currentAlgo) {
      console.log('[MasterPassword] Account already has 2FA enabled')
      await client.disconnect()
      return {
        success: true,
      }
    }

    const passwordToSet = globalPassword

    // Import password utility
    const { computeCheck } = await import('telegram/Password')

    // Get new password settings
    const newPasswordSettings = await client.invoke(
      new Api.account.GetPassword()
    )

    // Update password settings to enable 2FA
    const inputCheckPasswordSRP = await computeCheck(newPasswordSettings, passwordToSet)

    // Set the password
    await client.invoke(
      new Api.account.UpdatePasswordSettings({
        password: new Api.InputCheckPasswordEmpty(),
        newSettings: new Api.account.PasswordInputSettings({
          newAlgo: newPasswordSettings.newAlgo,
          newPasswordHash: inputCheckPasswordSRP.A,
          hint: 'Auto-generated',
          email: '',
        }),
      })
    )

    await client.disconnect()

    console.log('[MasterPassword] Successfully set master password')

    return {
      success: true,
    }
  } catch (error: any) {
    console.error('[MasterPassword] Error setting master password:', error)
    
    try {
      await client.disconnect()
    } catch (e) {
      // Ignore disconnect errors
    }

    return {
      success: false,
      error: error.errorMessage || error.message || 'Failed to set master password',
    }
  }
}

/**
 * Change existing master password (2FA)
 * Uses global master password from settings
 */
export async function changeMasterPassword(
  sessionString: string,
  currentPassword?: string
): Promise<{
  success: boolean
  error?: string
}> {
  const session = new StringSession(sessionString)
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
    deviceModel: 'Telegram Web',
    systemVersion: '1.0',
    appVersion: '10.9.3',
    langCode: 'en',
    systemLangCode: 'en-US',
  })

  try {
    await client.connect()

    // Get global master password from settings
    const globalPassword = await getGlobalMasterPassword()
    
    if (!globalPassword) {
      await client.disconnect()
      return {
        success: false,
        error: 'Global master password not configured. Please set it in admin panel.',
      }
    }

    // Get current password settings
    const passwordInfo = await client.invoke(new Api.account.GetPassword())
    
    if (!passwordInfo.currentAlgo) {
      console.log('[MasterPassword] No password currently set')
      await client.disconnect()
      return {
        success: false,
        error: 'No password currently set',
      }
    }

    const passwordToSet = globalPassword

    // Import password utility
    const { computeCheck } = await import('telegram/Password')

    // Verify current password if provided, otherwise skip verification (force change)
    let currentPasswordCheck
    if (currentPassword) {
      currentPasswordCheck = await computeCheck(passwordInfo, currentPassword)
    } else {
      // If no current password provided, we can't verify but we can still try to change
      // This might fail if Telegram requires the old password
      console.log('[MasterPassword] No current password provided, attempting force change')
      currentPasswordCheck = new Api.InputCheckPasswordEmpty()
    }

    // Set new password
    const newPasswordCheck = await computeCheck(passwordInfo, passwordToSet)

    await client.invoke(
      new Api.account.UpdatePasswordSettings({
        password: currentPasswordCheck,
        newSettings: new Api.account.PasswordInputSettings({
          newAlgo: passwordInfo.newAlgo,
          newPasswordHash: newPasswordCheck.A,
          hint: 'Auto-generated',
          email: '',
        }),
      })
    )

    await client.disconnect()

    console.log('[MasterPassword] Successfully changed master password')

    return {
      success: true,
    }
  } catch (error: any) {
    console.error('[MasterPassword] Error changing master password:', error)
    
    try {
      await client.disconnect()
    } catch (e) {
      // Ignore disconnect errors
    }

    return {
      success: false,
      error: error.errorMessage || error.message || 'Failed to change master password',
    }
  }
}

/**
 * Set or change master password in background (auto-detect)
 * Uses global master password from settings
 */
export async function setOrChangeMasterPassword(
  sessionString: string,
  currentPassword?: string
): Promise<{
  success: boolean
  wasChanged?: boolean
  error?: string
}> {
  // Check if password exists
  const checkResult = await has2FAEnabled(sessionString)
  
  if (!checkResult.success) {
    return {
      success: false,
      error: checkResult.error,
    }
  }

  if (!checkResult.hasPassword) {
    // No password set, set new one
    const result = await setMasterPassword(sessionString)
    return {
      ...result,
      wasChanged: false,
    }
  } else {
    // Password exists, change it
    const result = await changeMasterPassword(sessionString, currentPassword)
    return {
      ...result,
      wasChanged: true,
    }
  }
}
