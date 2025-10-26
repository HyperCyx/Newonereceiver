import { connectToDatabase, Collections } from '@/lib/mongodb/client'

async function setAdmin() {
  console.log('🔧 Setting admin user...\n')

  try {
    const { db } = await connectToDatabase()
    const users = db.collection(Collections.USERS)

    // Find user by Telegram ID
    const user = await users.findOne({ telegram_id: 1211362365 })

    if (!user) {
      console.error('❌ User with Telegram ID 1211362365 not found!')
      console.log('Please register this user first by opening the app with this Telegram account.')
      process.exit(1)
    }

    console.log('Found user:', user.telegram_username || user.first_name)

    // Update to admin
    const result = await users.updateOne(
      { telegram_id: 1211362365 },
      { $set: { is_admin: true } }
    )

    if (result.modifiedCount > 0) {
      console.log('✅ User is now an admin!')
    } else {
      console.log('ℹ️  User was already an admin')
    }

    // Verify
    const updatedUser = await users.findOne({ telegram_id: 1211362365 })
    console.log('\nCurrent status:')
    console.log('- Telegram ID:', updatedUser?.telegram_id)
    console.log('- Username:', updatedUser?.telegram_username)
    console.log('- Admin:', updatedUser?.is_admin ? '✅ YES' : '❌ NO')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

setAdmin()
