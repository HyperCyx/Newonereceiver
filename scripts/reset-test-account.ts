/**
 * Reset test account to pending or remove it entirely
 * Usage: npx tsx reset-test-account.ts +998701470983 [--remove]
 */

import { getCollection, Collections, connectToDatabase } from '../lib/mongodb/client'

async function resetAccount(phoneNumber: string, remove: boolean = false) {
  console.log(`🔄 ${remove ? 'Removing' : 'Resetting'} account: ${phoneNumber}\n`)

  try {
    await connectToDatabase()

    const accounts = await getCollection(Collections.ACCOUNTS)
    const account = await accounts.findOne({ phone_number: phoneNumber })

    if (!account) {
      console.log(`❌ Account not found: ${phoneNumber}`)
      return
    }

    console.log(`Found account:`)
    console.log(`  - ID: ${account._id}`)
    console.log(`  - Status: ${account.status}`)
    console.log(`  - Created: ${account.created_at}`)
    console.log(`  - Master password set: ${account.master_password_set || false}`)
    console.log(`  - Sessions: ${account.initial_session_count || 0}`)
    console.log('')

    if (remove) {
      // Remove account completely
      await accounts.deleteOne({ _id: account._id })
      console.log(`✅ Account removed from database`)
      
      // Note: Session file remains for future use
      console.log(`ℹ️  Telegram session file kept for future testing`)
    } else {
      // Reset to initial state - back to just after OTP verification
      await accounts.updateOne(
        { _id: account._id },
        {
          $set: {
            status: 'verifying_otp',
            master_password_set: false,
            master_password_set_at: null,
            had_existing_password: false,
            initial_session_count: 0,
            multiple_devices_detected: false,
            first_logout_attempted: false,
            first_logout_successful: null,
            first_logout_count: null,
            pending_since: null,
            ready_for_final_validation: false,
            final_validation_at: null,
            final_session_count: null,
            final_logout_attempted: false,
            final_logout_successful: null,
            accepted_at: null,
            rejected_at: null,
            rejection_reason: null,
            updated_at: new Date(),
          },
          $unset: {
            current_2fa_password: '',
          }
        }
      )

      console.log(`✅ Account reset to 'verifying_otp' status`)
      console.log(`ℹ️  You can now test the complete flow again`)
    }

    // Also check country capacity
    const countryCapacity = await getCollection(Collections.COUNTRY_CAPACITY)
    const phoneDigits = phoneNumber.replace(/[^\d]/g, '')
    
    for (let i = 1; i <= Math.min(4, phoneDigits.length); i++) {
      const possibleCode = phoneDigits.substring(0, i)
      const country = await countryCapacity.findOne({
        $or: [
          { country_code: possibleCode },
          { country_code: `+${possibleCode}` }
        ]
      })

      if (country) {
        console.log(`\n📊 Country: ${country.country_name}`)
        console.log(`  - Capacity: ${country.used_capacity}/${country.max_capacity}`)
        console.log(`  - Wait time: ${country.wait_time_minutes} minutes`)
        
        if (remove && account.status === 'accepted') {
          // Decrement capacity if account was accepted
          await countryCapacity.updateOne(
            { _id: country._id },
            {
              $inc: { used_capacity: -1 },
              $set: { updated_at: new Date() }
            }
          )
          console.log(`  - Decremented capacity to: ${country.used_capacity - 1}/${country.max_capacity}`)
        }
        break
      }
    }

    console.log(`\n✅ Operation complete!`)

  } catch (error: any) {
    console.error(`\n❌ Error:`, error.message)
  }
}

// Parse command line arguments
const phoneNumber = process.argv[2]
const remove = process.argv.includes('--remove')

if (!phoneNumber) {
  console.log('Usage: npx tsx reset-test-account.ts <phone_number> [--remove]')
  console.log('')
  console.log('Examples:')
  console.log('  npx tsx reset-test-account.ts +998701470983           # Reset to initial state')
  console.log('  npx tsx reset-test-account.ts +998701470983 --remove  # Remove completely')
  process.exit(1)
}

resetAccount(phoneNumber, remove)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error)
    process.exit(1)
  })
