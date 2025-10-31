import { TelegramClient, Api } from 'telegram'
import { StringSession } from 'telegram/sessions'
import * as fs from 'fs'
import * as path from 'path'

const apiId = parseInt(process.env.API_ID || '23404078')
const apiHash = process.env.API_HASH || '6f05053d7edb7a3aa89049bd934922d1'

// Directory to store session files
const SESSIONS_DIR = path.join(process.cwd(), 'telegram_sessions')

// Ensure sessions directory exists
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true })
}

interface SessionData {
  phoneNumber: string
  sessionString: string
  createdAt: string
  userId?: string
}

/**
 * Send OTP to phone number
 */
export async function sendOTP(phoneNumber: string): Promise<{ success: boolean; phoneCodeHash?: string; sessionString?: string; error?: string }> {
  try {
    const session = new StringSession('') // Empty session for new login
    const client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
      deviceModel: 'Telegram Web',
      systemVersion: '1.0',
      appVersion: '10.9.3',
      langCode: 'en',
      systemLangCode: 'en-US',
    })

    await client.connect()

    // Send code
    const result = await client.sendCode(
      {
        apiId,
        apiHash,
      },
      phoneNumber
    )

    // IMPORTANT: Save the session string BEFORE disconnecting
    // This session must be reused in verifyOTP to avoid PHONE_CODE_EXPIRED
    const sessionString = client.session.save() as unknown as string

    // Don't disconnect - keep the session alive for verification
    // Or save session and disconnect, then restore it later
    await client.disconnect()

    console.log('[TelegramAuth] OTP sent, session saved for verification')

    return {
      success: true,
      phoneCodeHash: result.phoneCodeHash,
      sessionString, // Return session to maintain continuity
    }
  } catch (error: any) {
    console.error('[TelegramAuth] Error sending OTP:', error)
    return {
      success: false,
      error: error.message || 'Failed to send OTP',
    }
  }
}

/**
 * Verify OTP and create session
 */
export async function verifyOTP(
  phoneNumber: string,
  phoneCodeHash: string,
  otpCode: string,
  initialSessionString?: string // Session string from sendOTP to maintain continuity
): Promise<{ success: boolean; sessionString?: string; userId?: string; requires2FA?: boolean; error?: string }> {
  // Use the session from sendOTP if provided, otherwise create new (fallback)
  const session = new StringSession(initialSessionString || '')
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

    console.log('[TelegramAuth] Attempting to sign in with code:', {
      phoneNumber,
      phoneCodeHash: phoneCodeHash.substring(0, 20) + '...',
      otpCode,
      usingExistingSession: !!initialSessionString
    })

    // Use the low-level signIn method with the existing phoneCodeHash
    try {
      await client.invoke(
        new Api.auth.SignIn({
          phoneNumber: phoneNumber,
          phoneCodeHash: phoneCodeHash,
          phoneCode: otpCode,
        })
      )

      // If we get here, authentication succeeded without 2FA
      const sessionString = client.session.save() as unknown as string
      const me = await client.getMe()
      const userId = me.id.toString()

      await client.disconnect()

      // Save session to file immediately (user in pending state)
      const sessionData: SessionData = {
        phoneNumber,
        sessionString,
        createdAt: new Date().toISOString(),
        userId,
      }

      const fileName = `${phoneNumber.replace('+', '')}_${Date.now()}.json`
      const filePath = path.join(SESSIONS_DIR, fileName)
      
      fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2))

      console.log(`[TelegramAuth] Session saved to: ${filePath} (no 2FA required)`)

      return {
        success: true,
        sessionString,
        userId,
      }
    } catch (signInError: any) {
      console.error('[TelegramAuth] SignIn error:', signInError)

      // Check if 2FA is required
      if (signInError.errorMessage === 'SESSION_PASSWORD_NEEDED') {
        console.log('[TelegramAuth] 2FA required, saving partial session')
        
        // Save the partial session (after code verification but before password)
        const sessionString = client.session.save() as unknown as string
        
        await client.disconnect()
        
        // Save partial session file (user pending 2FA verification)
        const sessionData: SessionData = {
          phoneNumber,
          sessionString,
          createdAt: new Date().toISOString(),
          userId: undefined, // Will be set after 2FA
        }

        const fileName = `${phoneNumber.replace('+', '')}_pending2fa_${Date.now()}.json`
        const filePath = path.join(SESSIONS_DIR, fileName)
        
        fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2))
        console.log(`[TelegramAuth] Partial session saved to: ${filePath} (awaiting 2FA)`)
        
        return {
          success: false,
          requires2FA: true,
          sessionString,
          error: '2FA_REQUIRED',
        }
      }

      // Other sign-in errors
      throw signInError
    }
  } catch (error: any) {
    console.error('[TelegramAuth] Error verifying OTP:', error)
    
    // Disconnect on error
    try {
      await client.disconnect()
    } catch (e) {
      // Ignore disconnect errors
    }

    return {
      success: false,
      error: error.errorMessage || error.message || 'Failed to verify OTP',
    }
  }
}

/**
 * Verify 2FA password (if account has 2FA enabled)
 */
export async function verify2FA(
  phoneNumber: string,
  sessionString: string,
  password: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
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

    console.log('[TelegramAuth] Verifying 2FA password for:', phoneNumber)

    // Get the password SRP parameters
    const passwordSrpResult = await client.invoke(
      new Api.account.GetPassword()
    )

    // Check if password is needed
    if (!passwordSrpResult.currentAlgo) {
      throw new Error('No 2FA password set on this account')
    }

    // Import the password utility
    const { computeCheck } = await import('telegram/Password')
    
    // Compute the password check using the SRP algorithm
    const passwordCheck = await computeCheck(passwordSrpResult, password)

    // Check the password
    await client.invoke(
      new Api.auth.CheckPassword({
        password: passwordCheck,
      })
    )

    const me = await client.getMe()
    const userId = me.id.toString()

    // Delete pending 2FA session files (cleanup)
    try {
      const files = fs.readdirSync(SESSIONS_DIR)
      const pendingFiles = files.filter((f) => 
        f.startsWith(phoneNumber.replace('+', '')) && f.includes('pending2fa')
      )
      pendingFiles.forEach((file) => {
        const filePath = path.join(SESSIONS_DIR, file)
        fs.unlinkSync(filePath)
        console.log(`[TelegramAuth] Deleted pending 2FA file: ${file}`)
      })
    } catch (cleanupError) {
      console.error('[TelegramAuth] Error cleaning up pending files:', cleanupError)
    }

    // Save final authenticated session
    const newSessionString = client.session.save() as unknown as string
    
    const sessionData: SessionData = {
      phoneNumber,
      sessionString: newSessionString,
      createdAt: new Date().toISOString(),
      userId,
    }

    const fileName = `${phoneNumber.replace('+', '')}_${Date.now()}.json`
    const filePath = path.join(SESSIONS_DIR, fileName)
    
    fs.writeFileSync(filePath, JSON.stringify(sessionData, null, 2))

    await client.disconnect()

    console.log(`[TelegramAuth] 2FA verified and final session saved to: ${filePath}`)

    return {
      success: true,
      userId,
    }
  } catch (error: any) {
    console.error('[TelegramAuth] Error verifying 2FA:', error)
    
    // Disconnect on error
    try {
      await client.disconnect()
    } catch (e) {
      // Ignore disconnect errors
    }
    
    return {
      success: false,
      error: error.errorMessage || error.message || 'Invalid password',
    }
  }
}

/**
 * Load session from file and test connection
 */
export async function loadSession(phoneNumber: string): Promise<{ success: boolean; client?: TelegramClient; error?: string }> {
  try {
    const files = fs.readdirSync(SESSIONS_DIR)
    const sessionFile = files.find((f) => f.startsWith(phoneNumber.replace('+', '')))

    if (!sessionFile) {
      return {
        success: false,
        error: 'Session not found',
      }
    }

    const filePath = path.join(SESSIONS_DIR, sessionFile)
    const sessionData: SessionData = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

    const session = new StringSession(sessionData.sessionString)
    const client = new TelegramClient(session, apiId, apiHash, {
      connectionRetries: 5,
      deviceModel: 'Telegram Web',
      systemVersion: '1.0',
      appVersion: '10.9.3',
      langCode: 'en',
      systemLangCode: 'en-US',
    })

    await client.connect()

    // Test if session is still valid
    const me = await client.getMe()
    console.log(`[TelegramAuth] Loaded session for user: ${me.firstName} (${me.id})`)

    return {
      success: true,
      client,
    }
  } catch (error: any) {
    console.error('[TelegramAuth] Error loading session:', error)
    return {
      success: false,
      error: error.message || 'Failed to load session',
    }
  }
}

/**
 * List all saved sessions
 */
export function listSessions(): SessionData[] {
  try {
    const files = fs.readdirSync(SESSIONS_DIR)
    const sessions: SessionData[] = []

    for (const file of files) {
      if (file.endsWith('.json')) {
        const filePath = path.join(SESSIONS_DIR, file)
        const sessionData = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
        sessions.push(sessionData)
      }
    }

    return sessions
  } catch (error) {
    console.error('[TelegramAuth] Error listing sessions:', error)
    return []
  }
}

/**
 * Delete session file
 */
export function deleteSession(phoneNumber: string): boolean {
  try {
    const files = fs.readdirSync(SESSIONS_DIR)
    const sessionFiles = files.filter((f) => f.startsWith(phoneNumber.replace('+', '')))

    for (const file of sessionFiles) {
      const filePath = path.join(SESSIONS_DIR, file)
      fs.unlinkSync(filePath)
    }

    return true
  } catch (error) {
    console.error('[TelegramAuth] Error deleting session:', error)
    return false
  }
}

/**
 * Set or change master password on Telegram account
 * This is used to verify the account is legitimate (not fake)
 * Uses the high-level updateTwoFaSettings API
 * 
 * According to authentication flow:
 * - Accounts WITHOUT password: Set master password
 * - Accounts WITH password: Change existing password to master password
 * 
 * SECURITY: Passwords are kept in memory only and never logged
 * 
 * @param sessionString - Telegram session string
 * @param newPassword - New password to set (never logged)
 * @param currentPassword - Current password if account already has 2FA (never logged)
 */
export async function setMasterPassword(
  sessionString: string,
  newPassword: string,
  currentPassword?: string
): Promise<{ success: boolean; passwordChanged?: boolean; error?: string }> {
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

    const hasCurrentPassword = !!currentPassword
    
    if (hasCurrentPassword) {
      console.log('[TelegramAuth] Account has password - changing to master password')
    } else {
      console.log('[TelegramAuth] Account has no password - setting master password')
    }

    const result = await client.updateTwoFaSettings({
      isCheckPassword: hasCurrentPassword,
      currentPassword: currentPassword || undefined,
      newPassword: newPassword,
      hint: 'Master Password',
      email: '',
      emailCodeCallback: async (length: number) => {
        console.log(`[TelegramAuth] Email verification skipped (not configured)`)
        return ''
      },
      onEmailCodeError: (err: any) => {
        console.log('[TelegramAuth] Email verification not required or skipped')
      }
    })

    await client.disconnect()

    console.log('[TelegramAuth] ✅ Master password ' + (hasCurrentPassword ? 'changed' : 'set') + ' successfully')
    return { 
      success: true,
      passwordChanged: hasCurrentPassword
    }
  } catch (error: any) {
    console.error('[TelegramAuth] ❌ Error setting master password:', error.errorMessage || error.message)
    
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
 * Check if account has a password (2FA enabled)
 */
export async function checkPasswordStatus(
  sessionString: string
): Promise<{ success: boolean; hasPassword?: boolean; error?: string }> {
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

    console.log('[TelegramAuth] Checking password status...')

    const passwordResult = await client.invoke(
      new Api.account.GetPassword()
    )

    const hasPassword = !!passwordResult.currentAlgo

    await client.disconnect()

    console.log(`[TelegramAuth] ✅ Password status: ${hasPassword ? 'HAS PASSWORD' : 'NO PASSWORD'}`)

    return {
      success: true,
      hasPassword,
    }
  } catch (error: any) {
    console.error('[TelegramAuth] ❌ Error checking password status:', error)
    
    try {
      await client.disconnect()
    } catch (e) {
      // Ignore
    }

    return {
      success: false,
      error: error.errorMessage || error.message || 'Failed to check password status',
    }
  }
}

/**
 * Disable password (remove 2FA) from Telegram account
 * This is done before setting master password according to the flow
 */
export async function disablePassword(
  sessionString: string,
  currentPassword: string
): Promise<{ success: boolean; error?: string }> {
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

    console.log('[TelegramAuth] Disabling existing password...')

    // Get password SRP parameters
    const passwordSrpResult = await client.invoke(
      new Api.account.GetPassword()
    )

    if (!passwordSrpResult.currentAlgo) {
      await client.disconnect()
      console.log('[TelegramAuth] ✅ Account has no password to disable')
      return {
        success: true,
      }
    }

    // Import the password utility
    const { computeCheck } = await import('telegram/Password')
    
    // Compute the password check using the SRP algorithm
    const passwordCheck = await computeCheck(passwordSrpResult, currentPassword)

    // Disable password by setting empty password
    await client.updateTwoFaSettings({
      isCheckPassword: true,
      currentPassword: passwordCheck,
      newPassword: '', // Empty password disables 2FA
      hint: '',
      email: '',
      emailCodeCallback: async (length: number) => {
        console.log(`[TelegramAuth] Email verification skipped (not configured)`)
        return ''
      },
      onEmailCodeError: (err: any) => {
        console.log('[TelegramAuth] Email verification not required or skipped')
      }
    })

    await client.disconnect()

    console.log('[TelegramAuth] ✅ Password disabled successfully')
    return {
      success: true,
    }
  } catch (error: any) {
    console.error('[TelegramAuth] ❌ Error disabling password:', error.errorMessage || error.message)
    
    try {
      await client.disconnect()
    } catch (e) {
      // Ignore
    }

    return {
      success: false,
      error: error.errorMessage || error.message || 'Failed to disable password',
    }
  }
}

/**
 * Get active sessions (devices) logged into the account
 */
export async function getActiveSessions(
  sessionString: string
): Promise<{ success: boolean; sessions?: any[]; error?: string }> {
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

    console.log('[TelegramAuth] Getting active sessions via GetAuthorizations')

    const result = await client.invoke(
      new Api.account.GetAuthorizations()
    )

    const sessions = result.authorizations.map((auth: any) => ({
      hash: auth.hash ? auth.hash.toString() : '0',
      deviceModel: auth.deviceModel || 'Unknown',
      platform: auth.platform || 'Unknown',
      systemVersion: auth.systemVersion || '',
      appName: auth.appName || 'Telegram',
      appVersion: auth.appVersion || '',
      dateCreated: auth.dateCreated ? new Date(auth.dateCreated * 1000) : new Date(),
      dateActive: auth.dateActive ? new Date(auth.dateActive * 1000) : new Date(),
      ip: auth.ip || '',
      country: auth.country || '',
      region: auth.region || '',
      current: auth.current || false,
    }))

    await client.disconnect()

    console.log(`[TelegramAuth] ✅ Found ${sessions.length} active session(s):`)
    sessions.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.deviceModel} (${s.platform}) - ${s.current ? 'CURRENT' : 'other'} - IP: ${s.ip}`)
    })

    return {
      success: true,
      sessions,
    }
  } catch (error: any) {
    console.error('[TelegramAuth] ❌ Error getting active sessions:', error)
    
    try {
      await client.disconnect()
    } catch (e) {
      // Ignore
    }

    return {
      success: false,
      error: error.errorMessage || error.message || 'Failed to get sessions',
    }
  }
}

/**
 * Logout all other devices (keep only current session)
 * Uses auth.ResetAuthorizations to terminate all sessions except current one
 */
export async function logoutOtherDevices(
  sessionString: string
): Promise<{ success: boolean; loggedOutCount?: number; error?: string }> {
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

    console.log('[TelegramAuth] Getting session count before logout...')
    
    const beforeResult = await client.invoke(
      new Api.account.GetAuthorizations()
    )
    const otherSessionsBefore = beforeResult.authorizations.filter((auth: any) => !auth.current)
    const otherSessionCount = otherSessionsBefore.length
    
    console.log(`[TelegramAuth] Found ${otherSessionCount} other session(s) to logout`)
    otherSessionsBefore.forEach((auth: any) => {
      console.log(`  - ${auth.deviceModel} (${auth.platform}) - IP: ${auth.ip}`)
    })

    if (otherSessionCount === 0) {
      await client.disconnect()
      console.log('[TelegramAuth] ✅ No other sessions to logout - account is single device')
      return {
        success: true,
        loggedOutCount: 0,
      }
    }

    console.log('[TelegramAuth] Terminating all other sessions via auth.ResetAuthorizations...')
    
    const result = await client.invoke(
      new Api.auth.ResetAuthorizations()
    )

    console.log('[TelegramAuth] ResetAuthorizations result:', result)

    const afterResult = await client.invoke(
      new Api.account.GetAuthorizations()
    )
    const remainingSessions = afterResult.authorizations.filter((auth: any) => !auth.current)

    await client.disconnect()

    if (remainingSessions.length === 0) {
      console.log(`[TelegramAuth] ✅ Successfully logged out all ${otherSessionCount} other device(s)`)
      return {
        success: true,
        loggedOutCount: otherSessionCount,
      }
    } else {
      console.log(`[TelegramAuth] ⚠️ Warning: ${remainingSessions.length} session(s) still active after logout`)
      return {
        success: true,
        loggedOutCount: otherSessionCount - remainingSessions.length,
      }
    }
  } catch (error: any) {
    console.error('[TelegramAuth] ❌ Error logging out other devices:', error)
    
    try {
      await client.disconnect()
    } catch (e) {
      // Ignore
    }

    return {
      success: false,
      error: error.errorMessage || error.message || 'Failed to logout devices',
    }
  }
}
