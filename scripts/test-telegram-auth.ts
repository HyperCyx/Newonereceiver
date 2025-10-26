/**
 * Test script for Telegram Authentication
 * 
 * Run: npx tsx scripts/test-telegram-auth.ts
 */

import { sendOTP, verifyOTP, listSessions } from '../lib/telegram/auth'
import * as readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve))
}

async function main() {
  console.log('🔐 Telegram Authentication Test\n')
  
  try {
    // Step 1: Get phone number
    const phoneNumber = await question('Enter phone number (with country code, e.g., +1234567890): ')
    
    if (!phoneNumber.startsWith('+')) {
      console.log('❌ Phone number must include country code (e.g., +1)')
      process.exit(1)
    }
    
    // Step 2: Send OTP
    console.log('\n📤 Sending OTP...')
    const sendResult = await sendOTP(phoneNumber)
    
    if (!sendResult.success) {
      console.log('❌ Failed to send OTP:', sendResult.error)
      process.exit(1)
    }
    
    console.log('✅ OTP sent! Check your Telegram app.')
    console.log('📱 Code hash:', sendResult.phoneCodeHash?.substring(0, 20) + '...')
    
    // Step 3: Get OTP from user
    const otpCode = await question('\nEnter the 5-digit OTP from Telegram: ')
    
    if (otpCode.length !== 5) {
      console.log('❌ OTP must be 5 digits')
      process.exit(1)
    }
    
    // Step 4: Verify OTP
    console.log('\n🔍 Verifying OTP...')
    const verifyResult = await verifyOTP(phoneNumber, sendResult.phoneCodeHash!, otpCode)
    
    if (verifyResult.success) {
      console.log('✅ Login successful!')
      console.log('👤 User ID:', verifyResult.userId)
      console.log('🔑 Session string (first 30 chars):', verifyResult.sessionString?.substring(0, 30) + '...')
      console.log('\n📁 Session file saved in telegram_sessions/ directory')
      
      // List sessions
      console.log('\n📋 All saved sessions:')
      const sessions = listSessions()
      sessions.forEach((session, index) => {
        console.log(`  ${index + 1}. ${session.phoneNumber} (User: ${session.userId})`)
      })
      
    } else if (verifyResult.error === '2FA_REQUIRED') {
      console.log('🔐 Two-factor authentication required')
      const password = await question('Enter your Telegram password: ')
      
      // Note: Would need to implement 2FA verification here
      console.log('⚠️  2FA verification not implemented in this test script')
      console.log('Use the web UI to complete 2FA authentication')
      
    } else {
      console.log('❌ Verification failed:', verifyResult.error)
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  } finally {
    rl.close()
  }
}

main()
