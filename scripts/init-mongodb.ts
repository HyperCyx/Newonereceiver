import { initializeDatabase } from '@/lib/mongodb/client'

async function main() {
  console.log('🚀 Initializing MongoDB database...\n')

  try {
    await initializeDatabase()
    console.log('\n✨ Database initialization complete!')
    console.log('\nCreated collections:')
    console.log('  - users')
    console.log('  - transactions')
    console.log('  - withdrawals')
    console.log('  - payment_requests')
    console.log('  - referrals')
    console.log('  - referral_codes')
    console.log('  - accounts')
    console.log('  - settings')
    console.log('  - country_capacity')
    console.log('\nIndexes and default data have been set up!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    process.exit(1)
  }
}

main()
