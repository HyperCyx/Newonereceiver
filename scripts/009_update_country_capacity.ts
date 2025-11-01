/**
 * Migration: Add wait_time_minutes to country_capacity collection
 */

import { getCollection, Collections, connectToDatabase } from '../lib/mongodb/client'

async function updateCountryCapacity() {
  console.log('🔄 Updating country capacity with wait times...')

  try {
    await connectToDatabase()

    const countryCapacity = await getCollection(Collections.COUNTRY_CAPACITY)

    // Default wait times by country (in minutes)
    const countryWaitTimes: Record<string, number> = {
      '+1': 60,      // USA: 1 hour
      '+44': 120,    // UK: 2 hours
      '+49': 180,    // Germany: 3 hours
      '+33': 180,    // France: 3 hours
      '+91': 240,    // India: 4 hours
      '+92': 240,    // Pakistan: 4 hours
    }

    // Update all existing countries
    const countries = await countryCapacity.find({}).toArray()

    for (const country of countries) {
      const waitTime = countryWaitTimes[country.country_code] || 1440 // Default 24 hours

      await countryCapacity.updateOne(
        { _id: country._id },
        {
          $set: {
            wait_time_minutes: waitTime,
            updated_at: new Date(),
          }
        }
      )

      console.log(`✅ Updated ${country.country_name}: ${waitTime} minutes`)
    }

    // Add default wait time setting
    const settings = await getCollection(Collections.SETTINGS)
    
    await settings.updateOne(
      { setting_key: 'default_wait_time_minutes' },
      {
        $setOnInsert: {
          setting_key: 'default_wait_time_minutes',
          setting_value: '1440', // 24 hours
          created_at: new Date(),
        }
      },
      { upsert: true }
    )

    console.log('✅ Added default wait time setting: 1440 minutes (24 hours)')

    // Add default master password setting
    const defaultPassword = `MP_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    
    await settings.updateOne(
      { setting_key: 'default_master_password' },
      {
        $setOnInsert: {
          setting_key: 'default_master_password',
          setting_value: defaultPassword,
          created_at: new Date(),
        }
      },
      { upsert: true }
    )

    console.log('✅ Added default master password setting')

    console.log('✅ Migration completed successfully')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

// Run migration
updateCountryCapacity()
  .then(() => {
    console.log('✅ Done')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
