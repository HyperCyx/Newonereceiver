/**
 * Pyrogram Telegram Operations Wrapper
 * All Telegram operations now use Pyrogram Python package
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'

const execAsync = promisify(exec)

const PYTHON_SCRIPT = path.join(process.cwd(), 'telegram_python', 'pyrogram_operations.py')

interface PyrogramResult {
  success: boolean
  error?: string
  details?: any
  [key: string]: any
}

/**
 * Execute Pyrogram operation via Python
 */
async function executePyrogramOperation(
  operation: string,
  ...args: string[]
): Promise<PyrogramResult> {
  try {
    // Build command with env vars
    const env = {
      ...process.env,
      TELEGRAM_API_ID: process.env.TELEGRAM_API_ID || process.env.API_ID || '23404078',
      TELEGRAM_API_HASH: process.env.TELEGRAM_API_HASH || process.env.API_HASH || '6f05053d7edb7a3aa89049bd934922d1',
      TELEGRAM_SESSIONS_DIR: path.join(process.cwd(), 'telegram_sessions'),
    }

    // Escape arguments properly for shell
    const escapedArgs = args.map(a => `"${a.replace(/"/g, '\\"')}"`).join(' ')
    const command = `python3 ${PYTHON_SCRIPT} ${operation} ${escapedArgs}`
    
    console.log(`[Pyrogram] Executing: ${operation}`)
    
    const { stdout, stderr } = await execAsync(command, {
      env,
      timeout: 120000, // 2 minutes timeout for Telegram operations
    })

    if (stderr && !stderr.includes('WARNING') && !stderr.includes('INFO')) {
      console.warn(`[Pyrogram] stderr:`, stderr)
    }

    // Parse JSON result
    const result = JSON.parse(stdout.trim())
    return result
  } catch (error: any) {
    console.error(`[Pyrogram] Error executing ${operation}:`, error)
    
    // Try to parse error output
    if (error.stdout) {
      try {
        const result = JSON.parse(error.stdout.trim())
        return result
      } catch (e) {
        console.error(`[Pyrogram] Could not parse stdout:`, error.stdout)
      }
    }

    return {
      success: false,
      error: error.message || 'Pyrogram operation failed',
      details: { stderr: error.stderr, stdout: error.stdout }
    }
  }
}

/**
 * Send OTP code to phone number
 */
export async function pyrogramSendOTP(
  phoneNumber: string
): Promise<{ 
  success: boolean
  phoneCodeHash?: string
  sessionString?: string
  sessionFile?: string
  error?: string
  details?: any
}> {
  const result = await executePyrogramOperation('send_otp', phoneNumber)
  
  return {
    success: result.success,
    phoneCodeHash: result.phone_code_hash,
    sessionString: result.session_string,
    sessionFile: result.session_file,
    error: result.error,
    details: result.details,
  }
}

/**
 * Verify OTP code
 */
export async function pyrogramVerifyOTP(
  sessionString: string,
  phoneNumber: string,
  code: string,
  phoneCodeHash: string
): Promise<{
  success: boolean
  needs2FA?: boolean
  userId?: number
  sessionString?: string
  error?: string
  details?: any
}> {
  const result = await executePyrogramOperation(
    'verify_otp',
    sessionString,
    phoneNumber,
    code,
    phoneCodeHash
  )
  
  return {
    success: result.success,
    needs2FA: result.needs_2fa,
    userId: result.user_id,
    sessionString: result.session_string,
    error: result.error,
    details: result.details,
  }
}

/**
 * Verify 2FA password
 */
export async function pyrogramVerify2FA(
  sessionString: string,
  phoneNumber: string,
  password: string
): Promise<{
  success: boolean
  userId?: number
  sessionString?: string
  error?: string
  details?: any
}> {
  const result = await executePyrogramOperation(
    'verify_2fa',
    sessionString,
    phoneNumber,
    password
  )
  
  return {
    success: result.success,
    userId: result.user_id,
    sessionString: result.session_string,
    error: result.error,
    details: result.details,
  }
}

/**
 * Set or change password using Pyrogram
 */
export async function pyrogramSetPassword(
  sessionString: string,
  phoneNumber: string,
  newPassword: string,
  currentPassword?: string
): Promise<{ 
  success: boolean
  hasPassword?: boolean
  sessionString?: string
  error?: string
  details?: any
}> {
  const args = [sessionString, phoneNumber, newPassword]
  if (currentPassword) {
    args.push(currentPassword)
  }

  const result = await executePyrogramOperation('set_password', ...args)
  
  return {
    success: result.success,
    hasPassword: result.has_password,
    sessionString: result.session_string,
    error: result.error,
    details: result.details,
  }
}

/**
 * Get active sessions using Pyrogram
 */
export async function pyrogramGetSessions(
  sessionString: string,
  phoneNumber: string
): Promise<{ 
  success: boolean
  currentSession?: any
  otherSessions?: any[]
  totalCount?: number
  error?: string
  details?: any
}> {
  const result = await executePyrogramOperation('get_sessions', sessionString, phoneNumber)
  
  return {
    success: result.success,
    currentSession: result.current_session,
    otherSessions: result.other_sessions || [],
    totalCount: result.total_count || 0,
    error: result.error,
    details: result.details,
  }
}

/**
 * Logout other devices using Pyrogram
 */
export async function pyrogramLogoutDevices(
  sessionString: string,
  phoneNumber: string
): Promise<{ 
  success: boolean
  terminatedCount?: number
  sessionsBefore?: number
  sessionsAfter?: number
  error?: string
  details?: any
}> {
  const result = await executePyrogramOperation('logout_devices', sessionString, phoneNumber)
  
  return {
    success: result.success,
    terminatedCount: result.terminated_count || 0,
    sessionsBefore: result.sessions_before,
    sessionsAfter: result.sessions_after,
    error: result.error,
    details: result.details,
  }
}
