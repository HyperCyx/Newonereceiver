/**
 * Script to validate 2FA on all pending accounts
 * This can be run manually or scheduled as a cron job
 */

import { Collections, getCollection, connectToDatabase } from '../lib/mongodb/client'
import { validate2FAPassword } from '../lib/telegram/auth'
import * as fs from 'fs'
import * as path from 'path'

const SESSIONS_DIR = path.join(process.cwd(), 'telegram_sessions')

async function validateAllAccounts() {
  console.log('[ValidateAll] Starting validation of all accounts...')
  
  try {
    await connectToDatabase()
    const accounts = await getCollection(Collections.ACCOUNTS)
    
    // Find all accounts that need validation
    const accountsToValidate = await accounts
      .find({
        $or: [
          { validation_status: 'pending' },
          { validation_status: { $exists: false } }
        ],
        has_2fa: true,
        twofa_password: { $exists: true }
      })
      .toArray()
    
    console.log(`[ValidateAll] Found ${accountsToValidate.length} accounts to validate`)
    
    let validated = 0
    let failed = 0
    let skipped = 0
    
    for (const account of accountsToValidate) {
      try {
        console.log(`[ValidateAll] Processing ${account.phone_number}...`)
        
        // Load session string from file
        const files = fs.readdirSync(SESSIONS_DIR)
        const sessionFile = files.find((f) => 
          f.startsWith(account.phone_number.replace('+', '')) && 
          !f.includes('pending2fa')
        )

        if (!sessionFile) {
          console.log(`[ValidateAll] ⚠️ No session file found for ${account.phone_number}, skipping`)
          skipped++
          continue
        }

        const filePath = path.join(SESSIONS_DIR, sessionFile)
        const sessionData = JSON.parse(fs.readFileSync(filePath, 'utf-8'))

        // Validate 2FA password
        const result = await validate2FAPassword(
          account.phone_number,
          sessionData.sessionString,
          account.twofa_password
        )

        if (result.success && result.passwordValid) {
          // Validation successful
          await accounts.updateOne(
            { _id: account._id },
            { 
              $set: { 
                validation_status: 'validated',
                validated_at: new Date(),
                acceptance_status: 'accepted',
                limit_status: 'free',
                updated_at: new Date()
              } 
            }
          )
          console.log(`[ValidateAll] ✅ ${account.phone_number} validated successfully`)
          validated++
        } else if (!result.has2FA) {
          // No 2FA - reject
          await accounts.updateOne(
            { _id: account._id },
            { 
              $set: { 
                validation_status: 'failed',
                acceptance_status: 'rejected',
                rejection_reason: 'No 2FA password set',
                limit_status: 'frozen',
                updated_at: new Date()
              } 
            }
          )
          console.log(`[ValidateAll] ❌ ${account.phone_number} has no 2FA - rejected`)
          failed++
        } else {
          // 2FA validation failed - reject
          await accounts.updateOne(
            { _id: account._id },
            { 
              $set: { 
                validation_status: 'failed',
                acceptance_status: 'rejected',
                rejection_reason: "The account's 2FA password has been changed and cannot be verified",
                limit_status: 'frozen',
                updated_at: new Date()
              } 
            }
          )
          console.log(`[ValidateAll] ❌ ${account.phone_number} 2FA validation failed - rejected`)
          failed++
        }
        
        // Wait a bit between validations to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error: any) {
        console.error(`[ValidateAll] Error processing ${account.phone_number}:`, error.message)
        skipped++
      }
    }
    
    console.log(`[ValidateAll] Summary:`)
    console.log(`  ✅ Validated: ${validated}`)
    console.log(`  ❌ Failed: ${failed}`)
    console.log(`  ⚠️ Skipped: ${skipped}`)
    console.log(`  📊 Total: ${accountsToValidate.length}`)
    
  } catch (error: any) {
    console.error('[ValidateAll] Error:', error)
  }
}

// Run the script
validateAllAccounts()
  .then(() => {
    console.log('[ValidateAll] Script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('[ValidateAll] Script failed:', error)
    process.exit(1)
  })
