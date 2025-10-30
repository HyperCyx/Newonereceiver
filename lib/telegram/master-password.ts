import { TelegramClient, Api } from 'telegram'
import { StringSession } from 'telegram/sessions'
import crypto from 'crypto'

const apiId = parseInt(process.env.API_ID || '23404078')
const apiHash = process.env.API_HASH || '6f05053d7edb7a3aa89049bd934922d1'

/**
 * Generate a random master password
 */
function generateMasterPassword(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*'
  let password = ''
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, chars.length)
    password += chars[randomIndex]
  }
  
  return password
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
 */
export async function setMasterPassword(
  sessionString: string,
  newPassword?: string
): Promise<{
  success: boolean
  password?: string
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

    // Check if password already exists
    const passwordInfo = await client.invoke(new Api.account.GetPassword())
    
    if (passwordInfo.currentAlgo) {
      console.log('[MasterPassword] Account already has 2FA enabled')
      await client.disconnect()
      return {
        success: true,
        password: undefined, // Don't return password if already set
      }
    }

    // Generate random password if not provided
    const passwordToSet = newPassword || generateMasterPassword(16)

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
      password: passwordToSet,
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
 */
export async function changeMasterPassword(
  sessionString: string,
  currentPassword: string,
  newPassword?: string
): Promise<{
  success: boolean
  password?: string
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

    // Generate random password if not provided
    const passwordToSet = newPassword || generateMasterPassword(16)

    // Import password utility
    const { computeCheck } = await import('telegram/Password')

    // Verify current password
    const currentPasswordCheck = await computeCheck(passwordInfo, currentPassword)

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
      password: passwordToSet,
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
 */
export async function setOrChangeMasterPassword(
  sessionString: string,
  currentPassword?: string
): Promise<{
  success: boolean
  password?: string
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
    if (!currentPassword) {
      console.log('[MasterPassword] Password exists but no current password provided to change')
      return {
        success: true,
        wasChanged: false,
      }
    }
    
    const result = await changeMasterPassword(sessionString, currentPassword)
    return {
      ...result,
      wasChanged: true,
    }
  }
}
