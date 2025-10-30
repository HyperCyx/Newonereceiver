/**
 * Test Telegram OTP Sending
 * 
 * This script tests the Telegram OTP functionality directly
 */

import { sendOTP } from '../lib/telegram/auth'

async function testOTP() {
  try {
    console.log('====================================')
    console.log('TESTING TELEGRAM OTP SENDING')
    console.log('====================================\n')

    // Get phone number from command line
    const phoneNumber = process.argv[2]

    if (!phoneNumber) {
      console.error('❌ Error: Please provide a phone number')
      console.error('Usage: npx tsx scripts/test-telegram-otp.ts +1234567890')
      process.exit(1)
    }

    // Validate phone number
    if (!phoneNumber.startsWith('+')) {
      console.error('❌ Error: Phone number must start with + (e.g., +1234567890)')
      process.exit(1)
    }

    console.log('Phone number:', phoneNumber)
    console.log('\nAttempting to send OTP...\n')

    const result = await sendOTP(phoneNumber)

    console.log('\n====================================')
    console.log('RESULT:')
    console.log('====================================')
    console.log('Success:', result.success)
    
    if (result.success) {
      console.log('✅ OTP sent successfully!')
      console.log('\nDetails:')
      console.log('- Code type:', result.codeType || 'SMS')
      console.log('- Phone code hash:', result.phoneCodeHash?.substring(0, 30) + '...')
      console.log('- Session string length:', result.sessionString?.length)
      console.log('\n📱 Check your Telegram app for the verification code!')
    } else {
      console.log('❌ Failed to send OTP')
      console.log('\nError:', result.error)
      
      console.log('\nPossible causes:')
      console.log('1. Invalid phone number format')
      console.log('2. Phone number banned from Telegram')
      console.log('3. Too many attempts (rate limited)')
      console.log('4. Invalid API credentials')
      console.log('5. Network connection issues')
    }

    console.log('\n====================================\n')

    process.exit(result.success ? 0 : 1)
  } catch (error: any) {
    console.error('\n❌ Unexpected error:', error.message)
    console.error(error)
    process.exit(1)
  }
}

// Run the test
testOTP()
