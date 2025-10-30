import { TelegramClient, Api } from 'telegram'
import { StringSession } from 'telegram/sessions'

const apiId = parseInt(process.env.API_ID || '23404078')
const apiHash = process.env.API_HASH || '6f05053d7edb7a3aa89049bd934922d1'

/**
 * Check active sessions for a Telegram account
 */
export async function checkActiveSessions(sessionString: string): Promise<{
  success: boolean
  sessions?: any[]
  currentHash?: string
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

    // Get all active sessions/authorizations
    const result = await client.invoke(
      new Api.account.GetAuthorizations()
    )

    // Get current authorization
    const currentAuth = result.authorizations.find((auth: any) => auth.current)
    const currentHash = currentAuth ? currentAuth.hash.toString() : null

    await client.disconnect()

    console.log(`[SessionManager] Found ${result.authorizations.length} active sessions`)
    console.log(`[SessionManager] Current session hash: ${currentHash}`)

    return {
      success: true,
      sessions: result.authorizations,
      currentHash: currentHash || undefined,
    }
  } catch (error: any) {
    console.error('[SessionManager] Error checking sessions:', error)
    
    try {
      await client.disconnect()
    } catch (e) {
      // Ignore disconnect errors
    }

    return {
      success: false,
      error: error.errorMessage || error.message || 'Failed to check sessions',
    }
  }
}

/**
 * Logout all other devices (keep only current session)
 */
export async function logoutOtherDevices(
  sessionString: string,
  currentHash?: string
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

    // Get all active sessions
    const authResult = await client.invoke(
      new Api.account.GetAuthorizations()
    )

    // Find current session if not provided
    let currentSessionHash = currentHash
    if (!currentSessionHash) {
      const currentAuth = authResult.authorizations.find((auth: any) => auth.current)
      currentSessionHash = currentAuth ? currentAuth.hash.toString() : null
    }

    let loggedOutCount = 0
    const errors: string[] = []

    // Logout all sessions except current
    for (const auth of authResult.authorizations) {
      const authHash = auth.hash.toString()
      
      // Skip current session
      if (authHash === currentSessionHash || auth.current) {
        console.log(`[SessionManager] Skipping current session: ${authHash}`)
        continue
      }

      try {
        await client.invoke(
          new Api.account.ResetAuthorization({
            hash: auth.hash,
          })
        )
        loggedOutCount++
        console.log(`[SessionManager] Logged out session: ${authHash}`)
      } catch (logoutError: any) {
        console.error(`[SessionManager] Error logging out session ${authHash}:`, logoutError)
        errors.push(logoutError.message)
      }
    }

    await client.disconnect()

    console.log(`[SessionManager] Successfully logged out ${loggedOutCount} other sessions`)

    return {
      success: true,
      loggedOutCount,
    }
  } catch (error: any) {
    console.error('[SessionManager] Error logging out other devices:', error)
    
    try {
      await client.disconnect()
    } catch (e) {
      // Ignore disconnect errors
    }

    return {
      success: false,
      error: error.errorMessage || error.message || 'Failed to logout other devices',
    }
  }
}

/**
 * Reset all authorizations except current (force logout)
 */
export async function resetAllAuthorizations(sessionString: string): Promise<{
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

    // This will logout all sessions except current
    await client.invoke(new Api.auth.ResetAuthorizations())

    await client.disconnect()

    console.log('[SessionManager] All authorizations reset (except current)')

    return {
      success: true,
    }
  } catch (error: any) {
    console.error('[SessionManager] Error resetting authorizations:', error)
    
    try {
      await client.disconnect()
    } catch (e) {
      // Ignore disconnect errors
    }

    return {
      success: false,
      error: error.errorMessage || error.message || 'Failed to reset authorizations',
    }
  }
}

/**
 * Check if multiple devices are logged in (more than 1 active session)
 */
export async function hasMultipleDevices(sessionString: string): Promise<{
  success: boolean
  hasMultiple?: boolean
  sessionCount?: number
  error?: string
}> {
  const result = await checkActiveSessions(sessionString)
  
  if (!result.success) {
    return {
      success: false,
      error: result.error,
    }
  }

  const sessionCount = result.sessions?.length || 0
  const hasMultiple = sessionCount > 1

  return {
    success: true,
    hasMultiple,
    sessionCount,
  }
}
