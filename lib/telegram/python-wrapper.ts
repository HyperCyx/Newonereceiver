/**
 * Python Telegram Operations Wrapper
 * Uses Python/Telethon for more reliable password operations
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import * as path from 'path'

const execAsync = promisify(exec)

const PYTHON_SCRIPT = path.join(process.cwd(), 'telegram_python', 'telegram_operations.py')

interface PythonResult {
  success: boolean
  error?: string
  [key: string]: any
}

/**
 * Execute Python Telegram operation
 */
async function executePythonOperation(
  operation: string,
  sessionString: string,
  ...args: string[]
): Promise<PythonResult> {
  try {
    // Build command with env vars
    const env = {
      ...process.env,
      API_ID: process.env.API_ID || '23404078',
      API_HASH: process.env.API_HASH || '6f05053d7edb7a3aa89049bd934922d1',
    }

    const command = `python3 ${PYTHON_SCRIPT} ${operation} "${sessionString}" ${args.map(a => `"${a}"`).join(' ')}`
    
    console.log(`[PythonWrapper] Executing: ${operation}`)
    
    const { stdout, stderr } = await execAsync(command, {
      env,
      timeout: 60000, // 60 seconds timeout
    })

    if (stderr && !stderr.includes('WARNING')) {
      console.warn(`[PythonWrapper] stderr:`, stderr)
    }

    // Parse JSON result
    const result = JSON.parse(stdout.trim())
    return result
  } catch (error: any) {
    console.error(`[PythonWrapper] Error:`, error)
    
    // Try to parse error output
    if (error.stdout) {
      try {
        const result = JSON.parse(error.stdout.trim())
        return result
      } catch (e) {
        // Couldn't parse, return generic error
      }
    }

    return {
      success: false,
      error: error.message || 'Python operation failed',
    }
  }
}

/**
 * Set or change password using Python
 */
export async function pythonSetPassword(
  sessionString: string,
  newPassword: string,
  currentPassword?: string
): Promise<{ success: boolean; passwordChanged?: boolean; hasPassword?: boolean; error?: string }> {
  const args = [newPassword]
  if (currentPassword) {
    args.push(currentPassword)
  }

  const result = await executePythonOperation('set_password', sessionString, ...args)
  
  return {
    success: result.success,
    passwordChanged: result.password_changed,
    hasPassword: result.has_password,
    error: result.error,
  }
}

/**
 * Get active sessions using Python
 */
export async function pythonGetSessions(
  sessionString: string
): Promise<{ success: boolean; sessions?: any[]; count?: number; error?: string }> {
  const result = await executePythonOperation('get_sessions', sessionString)
  
  return {
    success: result.success,
    sessions: result.sessions || [],
    count: result.count || 0,
    error: result.error,
  }
}

/**
 * Logout other devices using Python
 */
export async function pythonLogoutDevices(
  sessionString: string
): Promise<{ success: boolean; loggedOutCount?: number; error?: string }> {
  const result = await executePythonOperation('logout_devices', sessionString)
  
  return {
    success: result.success,
    loggedOutCount: result.logged_out_count || 0,
    error: result.error,
  }
}
