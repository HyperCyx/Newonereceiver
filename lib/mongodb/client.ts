import { MongoClient, Db, Collection } from 'mongodb'

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://newone:mAnik123456@newone.iaspgks.mongodb.net/?appName=newone'
const DB_NAME = process.env.MONGODB_DB_NAME || 'telegram_accounts'

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable')
}

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

export async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb }
  }

  const client = await MongoClient.connect(MONGODB_URI, {
    maxPoolSize: 10,
    minPoolSize: 5,
  })

  const db = client.db(DB_NAME)

  cachedClient = client
  cachedDb = db

  return { client, db }
}

export async function getCollection<T = any>(collectionName: string): Promise<Collection<T>> {
  const { db } = await connectToDatabase()
  return db.collection<T>(collectionName)
}

// Collection names
export const Collections = {
  USERS: 'users',
  TRANSACTIONS: 'transactions',
  WITHDRAWALS: 'withdrawals',
  PAYMENT_REQUESTS: 'payment_requests',
  REFERRALS: 'referrals',
  REFERRAL_CODES: 'referral_codes',
  ACCOUNTS: 'accounts',
  SETTINGS: 'settings',
  COUNTRY_CAPACITY: 'country_capacity',
} as const

// Initialize collections with indexes
export async function initializeDatabase() {
  const { db } = await connectToDatabase()

  // Users collection
  const users = db.collection(Collections.USERS)
  await users.createIndex({ telegram_id: 1 }, { unique: true })
  await users.createIndex({ telegram_username: 1 })
  await users.createIndex({ referral_code: 1 }, { unique: true, sparse: true })
  await users.createIndex({ is_admin: 1 })

  // Transactions collection
  const transactions = db.collection(Collections.TRANSACTIONS)
  await transactions.createIndex({ user_id: 1 })
  await transactions.createIndex({ status: 1 })
  await transactions.createIndex({ created_at: -1 })

  // Withdrawals collection
  const withdrawals = db.collection(Collections.WITHDRAWALS)
  await withdrawals.createIndex({ user_id: 1 })
  await withdrawals.createIndex({ status: 1 })
  await withdrawals.createIndex({ created_at: -1 })

  // Payment requests collection
  const paymentRequests = db.collection(Collections.PAYMENT_REQUESTS)
  await paymentRequests.createIndex({ user_id: 1 })
  await paymentRequests.createIndex({ status: 1 })
  await paymentRequests.createIndex({ created_at: -1 })

  // Referrals collection
  const referrals = db.collection(Collections.REFERRALS)
  await referrals.createIndex({ referrer_id: 1 })
  await referrals.createIndex({ referred_user_id: 1 })

  // Referral codes collection
  const referralCodes = db.collection(Collections.REFERRAL_CODES)
  await referralCodes.createIndex({ code: 1 }, { unique: true })
  await referralCodes.createIndex({ is_active: 1 })
  await referralCodes.createIndex({ created_at: -1 })

  // Accounts collection
  const accounts = db.collection(Collections.ACCOUNTS)
  await accounts.createIndex({ user_id: 1 })
  await accounts.createIndex({ phone_number: 1 })
  await accounts.createIndex({ country_code: 1 })
  await accounts.createIndex({ status: 1 })

  // Settings collection
  const settings = db.collection(Collections.SETTINGS)
  await settings.createIndex({ setting_key: 1 }, { unique: true })

  // Country capacity collection
  const countryCapacity = db.collection(Collections.COUNTRY_CAPACITY)
  await countryCapacity.createIndex({ country_code: 1 }, { unique: true })
  await countryCapacity.createIndex({ is_active: 1 })

  console.log('✅ Database indexes created successfully')

  // Insert default settings if they don't exist
  await settings.updateOne(
    { setting_key: 'min_withdrawal_amount' },
    { $setOnInsert: { setting_key: 'min_withdrawal_amount', setting_value: '5.00', created_at: new Date() } },
    { upsert: true }
  )

  // Insert sample countries if they don't exist (using phone codes now)
  const sampleCountries = [
    { country_code: '+1', country_name: 'United States', max_capacity: 100, used_capacity: 0, prize_amount: 10.00, is_active: true },
    { country_code: '+44', country_name: 'United Kingdom', max_capacity: 50, used_capacity: 0, prize_amount: 8.00, is_active: true },
    { country_code: '+49', country_name: 'Germany', max_capacity: 75, used_capacity: 0, prize_amount: 9.00, is_active: true },
    { country_code: '+33', country_name: 'France', max_capacity: 60, used_capacity: 0, prize_amount: 8.50, is_active: true },
    { country_code: '+91', country_name: 'India', max_capacity: 200, used_capacity: 0, prize_amount: 10.00, is_active: true },
    { country_code: '+92', country_name: 'Pakistan', max_capacity: 150, used_capacity: 0, prize_amount: 10.00, is_active: true },
  ]

  for (const country of sampleCountries) {
    await countryCapacity.updateOne(
      { country_code: country.country_code },
      { 
        $setOnInsert: { 
          ...country, 
          created_at: new Date(), 
          updated_at: new Date() 
        } 
      },
      { upsert: true }
    )
  }

  console.log('✅ Default data inserted successfully')

  return db
}

// Helper to generate ObjectId-like string for compatibility
export function generateId(): string {
  return new Date().getTime().toString(36) + Math.random().toString(36).substr(2)
}
