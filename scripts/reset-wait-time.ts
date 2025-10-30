/**
 * Reset Wait Time
 * 
 * Reset wait time back to 24 hours (1440 minutes) for production
 */

import { connectToDatabase, Collections } from '../lib/mongodb/client'

async function resetWaitTime() {
  try {
    console.log('Resetting wait time to 24 hours (1440 minutes)...')

    const { db } = await connectToDatabase()
    const countries = db.collection(Collections.COUNTRY_CAPACITY)

    // Update all countries to have 24-hour wait time
    const result = await countries.updateMany(
      {},
      { 
        $set: { 
          auto_approve_minutes: 1440, // 24 hours
          updated_at: new Date()
        }
      }
    )

    console.log(`✅ Updated ${result.modifiedCount} countries to 24-hour wait time`)
    console.log('Ready for production!')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error resetting wait time:', error)
    process.exit(1)
  }
}

resetWaitTime()
