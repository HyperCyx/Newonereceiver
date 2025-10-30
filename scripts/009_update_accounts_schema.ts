/**
 * Migration Script: Update Accounts Collection Schema
 * 
 * This script adds new fields to the accounts collection for the
 * comprehensive verification workflow:
 * - session_string: Telegram session string
 * - telegram_user_id: Telegram user ID
 * - wait_time_minutes: Country-specific wait time
 * - country_code: Country code (e.g., +1, +92)
 * - country_name: Country name (e.g., USA, Pakistan)
 * - approved_at: Timestamp when approved
 * - rejected_at: Timestamp when rejected
 * - rejection_reason: Reason for rejection
 * - auto_approved: Boolean indicating if auto-approved
 */

import { connectToDatabase, Collections } from '../lib/mongodb/client'

async function updateAccountsSchema() {
  try {
    console.log('Starting accounts schema update...')

    const { db } = await connectToDatabase()
    const accounts = db.collection(Collections.ACCOUNTS)

    // Create indexes for new fields
    console.log('Creating indexes...')

    await accounts.createIndex({ phone_number: 1 }, { unique: true })
    await accounts.createIndex({ user_id: 1 })
    await accounts.createIndex({ status: 1 })
    await accounts.createIndex({ country_code: 1 })
    await accounts.createIndex({ created_at: -1 })
    await accounts.createIndex({ approved_at: -1 })
    await accounts.createIndex({ rejected_at: -1 })

    console.log('✅ Indexes created successfully')

    // Update existing accounts to add new fields if they don't exist
    console.log('Updating existing accounts...')

    const updateResult = await accounts.updateMany(
      {},
      {
        $set: {
          updated_at: new Date(),
        },
        $setOnInsert: {
          wait_time_minutes: 1440, // Default 24 hours
          session_string: '',
          telegram_user_id: '',
          country_code: '',
          country_name: '',
          auto_approved: false,
        },
      }
    )

    console.log(`✅ Updated ${updateResult.modifiedCount} existing accounts`)

    // Update country_capacity collection to ensure it has auto_approve_minutes
    const countries = db.collection(Collections.COUNTRY_CAPACITY)

    const countryUpdateResult = await countries.updateMany(
      { auto_approve_minutes: { $exists: false } },
      {
        $set: {
          auto_approve_minutes: 1440, // Default 24 hours
          updated_at: new Date(),
        },
      }
    )

    console.log(`✅ Updated ${countryUpdateResult.modifiedCount} country capacity records`)

    console.log('========================================')
    console.log('✅ Accounts schema update completed!')
    console.log('========================================')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error updating accounts schema:', error)
    process.exit(1)
  }
}

// Run the migration
updateAccountsSchema()
