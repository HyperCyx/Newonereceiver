#!/usr/bin/env tsx

/**
 * Fix account for +998701470983
 * This script will:
 * 1. Find the account in database
 * 2. Check if it was approved without proper validation
 * 3. Re-validate it properly
 * 4. Fix the status if needed
 */

import { getDb } from '../lib/mongodb/connection'
import { validateAccount } from '../lib/services/account-validation'
import * as fs from 'fs'
import * as path from 'path'

const PHONE_NUMBER = '+998701470983'

async function fixAccount() {
  try {
    const db = await getDb()
    
    console.log(`\n🔍 Searching for account: ${PHONE_NUMBER}\n`)
    
    const account = await db.collection('accounts').findOne({
      phone_number: PHONE_NUMBER
    })
    
    if (!account) {
      console.log(`❌ Account not found for ${PHONE_NUMBER}`)
      return
    }
    
    console.log('📋 Account Details:')
    console.log(`   ID: ${account._id}`)
    console.log(`   Status: ${account.status}`)
    console.log(`   Master Password Set: ${account.master_password_set || false}`)
    console.log(`   Initial Session Count: ${account.initial_session_count ?? 'NOT SET'}`)
    console.log(`   Final Session Count: ${account.final_session_count ?? 'NOT SET'}`)
    console.log(`   Created At: ${account.created_at}`)
    console.log(`   Approved At: ${account.approved_at ?? 'NOT APPROVED'}`)
    console.log(`   Rejection Reason: ${account.rejection_reason ?? 'N/A'}`)
    
    // Find session file
    const SESSIONS_DIR = path.join(process.cwd(), 'telegram_sessions')
    let sessionString = ''
    
    try {
      const files = fs.readdirSync(SESSIONS_DIR)
      const sessionFiles = files
        .filter((f) => 
          f.startsWith(PHONE_NUMBER.replace('+', '')) && 
          !f.includes('pending2fa') &&
          f.endsWith('.json')
        )
        .map((f) => {
          const filePath = path.join(SESSIONS_DIR, f)
          const stats = fs.statSync(filePath)
          return { name: f, path: filePath, mtime: stats.mtime }
        })
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
      
      if (sessionFiles.length > 0) {
        const mostRecentFile = sessionFiles[0]
        const sessionData = JSON.parse(fs.readFileSync(mostRecentFile.path, 'utf-8'))
        sessionString = sessionData.sessionString
        console.log(`\n✅ Found session file: ${mostRecentFile.name}`)
      } else {
        console.log(`\n❌ No session file found for ${PHONE_NUMBER}`)
        return
      }
    } catch (error) {
      console.error(`\n❌ Error reading session files:`, error)
      return
    }
    
    // Check if account was improperly approved
    const issues: string[] = []
    
    if (account.status === 'accepted') {
      if (!account.master_password_set) {
        issues.push('Approved but master password not set')
      }
      if (account.initial_session_count === undefined && account.final_session_count === undefined) {
        issues.push('Approved but device count never checked')
      }
      if (account.initial_session_count > 1 && !account.devices_logged_out) {
        issues.push('Approved with multiple devices, no logout attempted')
      }
    }
    
    if (issues.length > 0) {
      console.log(`\n⚠️  ISSUES FOUND:`)
      issues.forEach(issue => console.log(`   - ${issue}`))
      
      console.log(`\n🔧 Re-validating account...`)
      
      // Reset account to pending
      await db.collection('accounts').updateOne(
        { _id: account._id },
        {
          $set: {
            status: 'pending',
            validation_stage: 're_validation',
            validation_issues: issues,
            re_validated_at: new Date(),
            updated_at: new Date()
          },
          $unset: {
            approved_at: '',
            auto_approved: '',
            security_checks_passed: ''
          }
        }
      )
      
      // Re-run validation
      const validationResult = await validateAccount({
        accountId: account._id,
        phoneNumber: PHONE_NUMBER,
        sessionString: sessionString
        // Note: If account has 2FA, we'd need the password here
      })
      
      if (!validationResult.success) {
        console.log(`\n❌ Re-validation failed: ${validationResult.reason}`)
        console.log(`   Account status: ${validationResult.status}`)
      } else {
        console.log(`\n✅ Re-validation completed:`)
        console.log(`   Sessions: ${validationResult.sessionsCount}`)
        console.log(`   Logged Out: ${validationResult.loggedOutCount || 0}`)
        console.log(`   Status: ${validationResult.status}`)
        
        // Check final state
        const finalAccount = await db.collection('accounts').findOne({ _id: account._id })
        console.log(`\n📊 Final Account State:`)
        console.log(`   Status: ${finalAccount?.status}`)
        console.log(`   Master Password Set: ${finalAccount?.master_password_set}`)
        console.log(`   Initial Session Count: ${finalAccount?.initial_session_count ?? 'NOT SET'}`)
        console.log(`   Final Session Count: ${finalAccount?.final_session_count ?? 'NOT SET'}`)
      }
    } else {
      console.log(`\n✅ Account appears to be properly validated`)
    }
    
  } catch (error) {
    console.error(`\n❌ Error:`, error)
  }
}

fixAccount().then(() => {
  console.log(`\n✨ Done!\n`)
  process.exit(0)
}).catch(error => {
  console.error(`\n❌ Fatal error:`, error)
  process.exit(1)
})
