/**
 * Telegram Authentication Functions
 * 
 * ?? DEPRECATED - All functions migrated to Pyrogram (Python)
 * 
 * All Telegram operations now use Pyrogram via python-wrapper.ts
 * The old gramJS implementation has been removed.
 * 
 * Use instead:
 * - pyrogramSendOTP()
 * - pyrogramVerifyOTP()
 * - pyrogramVerify2FA()
 * - pyrogramSetPassword()
 * - pyrogramGetSessions()
 * - pyrogramLogoutDevices()
 * 
 * See: /workspace/lib/telegram/python-wrapper.ts
 * See: /workspace/telegram_python/pyrogram_operations.py
 */

// This file is kept for backwards compatibility but contains no implementations.
// All telegram authentication is now handled by Pyrogram (Python).

export function sendOTP() {
  throw new Error('sendOTP() has been removed. Use pyrogramSendOTP() from python-wrapper.ts instead.')
}

export function verifyOTP() {
  throw new Error('verifyOTP() has been removed. Use pyrogramVerifyOTP() from python-wrapper.ts instead.')
}

export function verify2FA() {
  throw new Error('verify2FA() has been removed. Use pyrogramVerify2FA() from python-wrapper.ts instead.')
}

export function setMasterPassword() {
  throw new Error('setMasterPassword() has been removed. Use pyrogramSetPassword() from python-wrapper.ts instead.')
}

export function getActiveSessions() {
  throw new Error('getActiveSessions() has been removed. Use pyrogramGetSessions() from python-wrapper.ts instead.')
}

export function logoutOtherDevices() {
  throw new Error('logoutOtherDevices() has been removed. Use pyrogramLogoutDevices() from python-wrapper.ts instead.')
}

export function listSessions() {
  throw new Error('listSessions() has been removed. All session management is now via Pyrogram.')
}

export function deleteSession() {
  throw new Error('deleteSession() has been removed. All session management is now via Pyrogram.')
}

export function loadSession() {
  throw new Error('loadSession() has been removed. All session management is now via Pyrogram.')
}
