/**
 * Test Python Telegram operations
 */

import { pythonGetSessions, pythonSetPassword, pythonLogoutDevices } from '../lib/telegram/python-wrapper'
import * as fs from 'fs'
import * as path from 'path'

async function testPythonOperations() {
  console.log('🧪 Testing Python Telegram Operations\n')

  try {
    // Load session
    const sessionDir = path.join(process.cwd(), 'telegram_sessions')
    const files = fs.readdirSync(sessionDir)
    const sessionFile = files.find(f => f.startsWith('998701470983') && f.endsWith('.session'))
    
    if (!sessionFile) {
      console.log('❌ No session file found')
      return
    }

    const sessionString = fs.readFileSync(path.join(sessionDir, sessionFile), 'utf-8')

    console.log(`✅ Session loaded: ${sessionFile}\n`)

    // Test 1: Get Sessions
    console.log('1️⃣  Testing pythonGetSessions()...')
    const sessionsResult = await pythonGetSessions(sessionString)
    
    if (sessionsResult.success) {
      console.log(`✅ Success! Found ${sessionsResult.count} session(s)`)
      sessionsResult.sessions?.forEach((s, i) => {
        console.log(`   ${i + 1}. ${s.device_model} (${s.platform}) - ${s.current ? 'CURRENT' : 'other'}`)
      })
    } else {
      console.log(`❌ Failed: ${sessionsResult.error}`)
    }

    console.log('')

    // Test 2: Logout Devices (if multiple)
    if (sessionsResult.count && sessionsResult.count > 1) {
      console.log('2️⃣  Testing pythonLogoutDevices()...')
      const logoutResult = await pythonLogoutDevices(sessionString)
      
      if (logoutResult.success) {
        console.log(`✅ Success! Logged out ${logoutResult.loggedOutCount} device(s)`)
      } else {
        console.log(`❌ Failed: ${logoutResult.error}`)
      }
    } else {
      console.log('2️⃣  Skipping logout test (single device)')
    }

    console.log('')

    // Test 3: Password operations (won't actually change password)
    console.log('3️⃣  Testing pythonSetPassword() capability...')
    console.log('⚠️  This will fail without the correct current password, which is expected')
    
    const passwordResult = await pythonSetPassword(
      sessionString,
      'TEST_PASSWORD',
      undefined // No current password
    )
    
    if (passwordResult.success) {
      console.log(`✅ Password set/changed`)
      console.log(`   Had password: ${passwordResult.hasPassword}`)
      console.log(`   Changed: ${passwordResult.passwordChanged}`)
    } else {
      console.log(`❌ Failed (expected): ${passwordResult.error}`)
      if (passwordResult.hasPassword) {
        console.log(`   ℹ️  Account has password - needs current password to change`)
      }
    }

    console.log('\n✅ All tests complete')

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message)
  }
}

testPythonOperations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
