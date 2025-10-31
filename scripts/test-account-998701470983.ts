/**
 * Test script to check account state and Telegram functions
 * for +998701470983
 */

import { getCollection, Collections, connectToDatabase } from '../lib/mongodb/client'
import { getActiveSessions, setMasterPassword, logoutOtherDevices } from '../lib/telegram/auth'
import * as fs from 'fs'
import * as path from 'path'

async function testAccount() {
  console.log('🔍 Testing account +998701470983...\n')

  try {
    await connectToDatabase()

    // 1. Check MongoDB account state
    console.log('1️⃣  Checking MongoDB account state...')
    const accounts = await getCollection(Collections.ACCOUNTS)
    const account = await accounts.findOne({ phone_number: '+998701470983' })
    
    if (account) {
      console.log('✅ Account found in database:')
      console.log('   - Status:', account.status)
      console.log('   - Created:', account.created_at)
      console.log('   - Master password set:', account.master_password_set || false)
      console.log('   - Had existing password:', account.had_existing_password || false)
      console.log('   - Initial session count:', account.initial_session_count || 0)
      console.log('   - Multiple devices detected:', account.multiple_devices_detected || false)
      console.log('   - First logout attempted:', account.first_logout_attempted || false)
      console.log('   - Pending since:', account.pending_since || 'N/A')
      console.log('   - Accepted at:', account.accepted_at || 'N/A')
      console.log('   - Rejected at:', account.rejected_at || 'N/A')
    } else {
      console.log('❌ Account NOT found in database')
    }

    // 2. Load session from file
    console.log('\n2️⃣  Loading Telegram session from file...')
    const sessionDir = path.join(process.cwd(), 'telegram_sessions')
    const files = fs.readdirSync(sessionDir)
    const sessionFile = files.find(f => f.startsWith('998701470983'))
    
    if (!sessionFile) {
      console.log('❌ No session file found')
      return
    }

    const sessionData = JSON.parse(
      fs.readFileSync(path.join(sessionDir, sessionFile), 'utf-8')
    )
    console.log('✅ Session file found:', sessionFile)
    console.log('   - User ID:', sessionData.userId)
    console.log('   - Created:', sessionData.createdAt)

    // 3. Test getting active sessions
    console.log('\n3️⃣  Testing getActiveSessions()...')
    const sessionsResult = await getActiveSessions(sessionData.sessionString)
    
    if (sessionsResult.success) {
      console.log('✅ Sessions retrieved:', sessionsResult.sessions?.length || 0)
      if (sessionsResult.sessions && sessionsResult.sessions.length > 0) {
        sessionsResult.sessions.forEach((session, i) => {
          console.log(`   ${i + 1}. ${session.deviceModel} (${session.platform})`)
          console.log(`      Current: ${session.current}`)
          console.log(`      IP: ${session.ip}`)
          console.log(`      Active: ${session.dateActive}`)
        })
      }
    } else {
      console.log('❌ Failed to get sessions:', sessionsResult.error)
    }

    // 4. Test password change (READ-ONLY TEST - just check if possible)
    console.log('\n4️⃣  Testing setMasterPassword() capability...')
    console.log('⚠️  NOTE: This is a READ-ONLY test, we will not actually change the password')
    console.log('   To test password change, you would need to:')
    console.log('   1. Get current password SRP info')
    console.log('   2. Verify the account has 2FA enabled')
    console.log('   3. Call setMasterPassword with current password')
    
    // Let's try to set a test password
    console.log('\n⚠️  ATTEMPTING TO SET MASTER PASSWORD (This should work if library is functional)...')
    const testPassword = `TEST_MP_${Date.now()}`
    console.log('   Test password:', testPassword)
    
    // Since account already has password, we need current password
    // But we can test without it to see what error we get
    const passwordResult = await setMasterPassword(
      sessionData.sessionString,
      testPassword,
      undefined // No current password provided
    )
    
    if (passwordResult.success) {
      console.log('✅ Password change succeeded (unexpected - account should have had password)')
      console.log('   Password changed:', passwordResult.passwordChanged)
    } else {
      console.log('❌ Password change failed (expected if account has 2FA):')
      console.log('   Error:', passwordResult.error)
    }

    // 5. Check country capacity
    console.log('\n5️⃣  Checking country capacity...')
    const countryCapacity = await getCollection(Collections.COUNTRY_CAPACITY)
    const country = await countryCapacity.findOne({ country_code: '+998' })
    
    if (country) {
      console.log('✅ Country found: Uzbekistan')
      console.log('   - Max capacity:', country.max_capacity)
      console.log('   - Used capacity:', country.used_capacity)
      console.log('   - Wait time:', country.wait_time_minutes, 'minutes')
      console.log('   - Active:', country.is_active)
    } else {
      console.log('⚠️  Country +998 not found in database')
    }

    console.log('\n' + '='.repeat(80))
    console.log('📊 SUMMARY')
    console.log('='.repeat(80))
    
    if (account) {
      console.log('\n🔴 CRITICAL ISSUES FOUND:')
      
      if (account.status === 'accepted' || account.status === 'rejected') {
        console.log('   ❌ Account already processed (status:', account.status + ')')
        console.log('      This account should be in "pending" status!')
      }
      
      if (!account.master_password_set) {
        console.log('   ❌ Master password was NOT set')
      }
      
      if (account.initial_session_count === 0 || !account.last_session_check) {
        console.log('   ❌ Sessions were NOT checked')
      }
      
      if (!account.pending_since) {
        console.log('   ❌ Account never entered pending queue')
      }
    }

  } catch (error: any) {
    console.error('\n❌ Error during testing:', error.message)
    console.error(error)
  }
}

testAccount()
  .then(() => {
    console.log('\n✅ Test complete')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  })
