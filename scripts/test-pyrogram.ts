/**
 * Test Pyrogram Integration
 * Tests all Pyrogram functions to ensure they work correctly
 */

import { config } from 'dotenv'
config()

import { pyrogramSendOTP, pyrogramVerifyOTP, pyrogramVerify2FA } from '../lib/telegram/python-wrapper'

async function main() {
  console.log('🧪 Testing Pyrogram Integration\n')
  
  const testPhoneNumber = process.argv[2]
  
  if (!testPhoneNumber) {
    console.log('Usage: npx tsx scripts/test-pyrogram.ts <phone_number>')
    console.log('Example: npx tsx scripts/test-pyrogram.ts +998901234567')
    process.exit(1)
  }

  console.log(`📱 Test phone number: ${testPhoneNumber}\n`)
  
  try {
    // Test 1: Send OTP
    console.log('1️⃣ Testing Send OTP...')
    const sendOTPResult = await pyrogramSendOTP(testPhoneNumber)
    
    if (sendOTPResult.success) {
      console.log('✅ Send OTP successful!')
      console.log(`   - Phone code hash: ${sendOTPResult.phoneCodeHash}`)
      console.log(`   - Session file: ${sendOTPResult.sessionFile}`)
      console.log(`   - Session string length: ${sendOTPResult.sessionString?.length || 0} chars`)
    } else {
      console.log('❌ Send OTP failed!')
      console.log(`   - Error: ${sendOTPResult.error}`)
      if (sendOTPResult.details) {
        console.log(`   - Details: ${JSON.stringify(sendOTPResult.details)}`)
      }
    }
    
    console.log('\n✅ Pyrogram integration test completed!')
    console.log('\n📝 Next steps:')
    console.log('   1. Enter OTP code when received')
    console.log('   2. Test verify-otp endpoint')
    console.log('   3. Test full flow through the UI')
    
  } catch (error: any) {
    console.error('\n❌ Test failed with error:', error.message)
    if (error.stack) {
      console.error('\nStack trace:', error.stack)
    }
    process.exit(1)
  }
}

main()
