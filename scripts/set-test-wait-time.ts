/**
 * Set Test Wait Time
 * 
 * This script sets a short wait time (1 minute) for testing the workflow
 * So you don't have to wait 24 hours to see results
 */

import { connectToDatabase, Collections } from '../lib/mongodb/client'

async function setTestWaitTime() {
  try {
    console.log('Setting test wait time (1 minute)...')

    const { db } = await connectToDatabase()
    const countries = db.collection(Collections.COUNTRY_CAPACITY)

    // Update all countries to have 1-minute wait time for testing
    const result = await countries.updateMany(
      {},
      { 
        $set: { 
          auto_approve_minutes: 1, // 1 minute for testing
          updated_at: new Date()
        }
      }
    )

    console.log(`✅ Updated ${result.modifiedCount} countries to 1-minute wait time`)
    console.log('')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('NOW YOU CAN TEST:')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('1. Submit an account')
    console.log('2. Wait just 1 minute')
    console.log('3. Manually process: POST /api/telegram/pending/process')
    console.log('4. Account will be verified and accepted/rejected')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('')
    console.log('To revert to 24 hours:')
    console.log('npx tsx scripts/reset-wait-time.ts')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error setting wait time:', error)
    process.exit(1)
  }
}

setTestWaitTime()
