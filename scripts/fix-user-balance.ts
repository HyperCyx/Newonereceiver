import { getDb } from '../lib/mongodb/connection'

/**
 * Fix users with missing or undefined balance
 * Sets balance to 0.00 for all users who don't have it
 */
async function fixUserBalance() {
  try {
    console.log('[FixBalance] Starting balance fix...')
    
    const db = await getDb()
    const users = db.collection('users')

    // Update all users with null/undefined balance to 0.00
    const result = await users.updateMany(
      {
        $or: [
          { balance: null },
          { balance: { $exists: false } }
        ]
      },
      {
        $set: { balance: 0.00 }
      }
    )

    console.log('[FixBalance] Updated', result.modifiedCount, 'users')

    // Also ensure admin is set correctly
    const adminTelegramId = process.env.ADMIN_TELEGRAM_ID ? parseInt(process.env.ADMIN_TELEGRAM_ID) : 1211362365
    
    // First get the admin user
    const adminUser = await users.findOne({ telegram_id: adminTelegramId })
    
    if (adminUser) {
      // Update admin user, preserve balance if exists
      const adminResult = await users.updateOne(
        { telegram_id: adminTelegramId },
        {
          $set: { 
            is_admin: true
          },
          $setOnInsert: {
            balance: 0.00
          }
        }
      )
      
      // If balance doesn't exist, set it
      if (adminUser.balance === null || adminUser.balance === undefined) {
        await users.updateOne(
          { telegram_id: adminTelegramId },
          { $set: { balance: 0.00 } }
        )
      }

      console.log('[FixBalance] Admin user updated')
      
      // Get updated admin user info
      const updatedAdmin = await users.findOne({ telegram_id: adminTelegramId })
      console.log('[FixBalance] Admin user:', {
        telegram_id: updatedAdmin?.telegram_id,
        username: updatedAdmin?.telegram_username,
        is_admin: updatedAdmin?.is_admin,
        balance: updatedAdmin?.balance
      })
    } else {
      console.log('[FixBalance] Admin user not found in database - will be created on first login')
    }

    // Set all other users to not admin
    await users.updateMany(
      { telegram_id: { $ne: adminTelegramId } },
      { $set: { is_admin: false } }
    )

    console.log('[FixBalance] Complete!')
    process.exit(0)
  } catch (error) {
    console.error('[FixBalance] Error:', error)
    process.exit(1)
  }
}

fixUserBalance()
