import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load environment variables
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function insertTestData() {
  console.log('🚀 Starting to insert test data...')

  try {
    // 1. Create test users in auth.users first (required for foreign key)
    console.log('\n📝 Creating auth users...')
    
    const testUsers = [
      {
        email: 'admin@test.com',
        password: 'admin123456',
        telegram_id: 123456789,
        telegram_username: 'admin_user',
        phone_number: '+1234567890',
        is_admin: true
      },
      {
        email: 'user1@test.com',
        password: 'user123456',
        telegram_id: 987654321,
        telegram_username: 'john_doe',
        phone_number: '+1987654321',
        is_admin: false
      },
      {
        email: 'user2@test.com',
        password: 'user123456',
        telegram_id: 555555555,
        telegram_username: 'jane_smith',
        phone_number: '+1555555555',
        is_admin: false
      }
    ]

    const userIds: { [key: string]: string } = {}

    for (const user of testUsers) {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true
      })

      if (authError) {
        console.error(`❌ Error creating auth user ${user.email}:`, authError.message)
        continue
      }

      console.log(`✅ Created auth user: ${user.email}`)

      // Store user ID for later use
      userIds[user.telegram_username] = authData.user.id

      // 2. Insert into public.users table
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          telegram_id: user.telegram_id,
          telegram_username: user.telegram_username,
          phone_number: user.phone_number,
          is_admin: user.is_admin
        })

      if (userError) {
        console.error(`❌ Error inserting user ${user.email}:`, userError.message)
      } else {
        console.log(`✅ Created user profile: ${user.telegram_username}`)
      }
    }

    // 3. Insert transactions
    console.log('\n💰 Creating transactions...')
    const { error: txError } = await supabase
      .from('transactions')
      .insert([
        {
          user_id: userIds['john_doe'],
          amount: 100.50,
          currency: 'USDT',
          status: 'completed',
          transaction_hash: '0x1234567890abcdef'
        },
        {
          user_id: userIds['john_doe'],
          amount: 250.00,
          currency: 'USDT',
          status: 'pending',
          transaction_hash: null
        },
        {
          user_id: userIds['jane_smith'],
          amount: 500.75,
          currency: 'USDT',
          status: 'completed',
          transaction_hash: '0xabcdef1234567890'
        }
      ])

    if (txError) {
      console.error('❌ Error inserting transactions:', txError.message)
    } else {
      console.log('✅ Created 3 transactions')
    }

    // 4. Insert withdrawals
    console.log('\n🏦 Creating withdrawals...')
    const { error: withdrawalError } = await supabase
      .from('withdrawals')
      .insert([
        {
          user_id: userIds['john_doe'],
          amount: 50.00,
          currency: 'USDT',
          wallet_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
          status: 'pending'
        },
        {
          user_id: userIds['jane_smith'],
          amount: 100.00,
          currency: 'USDT',
          wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
          status: 'completed',
          confirmed_at: new Date().toISOString(),
          paid_at: new Date().toISOString()
        },
        {
          user_id: userIds['jane_smith'],
          amount: 75.50,
          currency: 'USDT',
          wallet_address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          status: 'confirmed',
          confirmed_at: new Date().toISOString()
        }
      ])

    if (withdrawalError) {
      console.error('❌ Error inserting withdrawals:', withdrawalError.message)
    } else {
      console.log('✅ Created 3 withdrawals')
    }

    // 5. Insert payment requests
    console.log('\n💳 Creating payment requests...')
    const { error: paymentError } = await supabase
      .from('payment_requests')
      .insert([
        {
          user_id: userIds['john_doe'],
          amount: 200.00,
          wallet_address: '0x9876543210fedcba9876543210fedcba98765432',
          status: 'pending'
        },
        {
          user_id: userIds['jane_smith'],
          amount: 150.00,
          wallet_address: '0x1111222233334444555566667777888899990000',
          status: 'approved'
        },
        {
          user_id: userIds['jane_smith'],
          amount: 300.00,
          wallet_address: '0xaaabbbcccdddeeefff000111222333444555666',
          status: 'rejected',
          rejected_reason: 'Insufficient balance'
        }
      ])

    if (paymentError) {
      console.error('❌ Error inserting payment requests:', paymentError.message)
    } else {
      console.log('✅ Created 3 payment requests')
    }

    // 6. Insert referrals
    console.log('\n👥 Creating referrals...')
    const { error: referralError } = await supabase
      .from('referrals')
      .insert([
        {
          referrer_id: userIds['john_doe'],
          referred_user_id: userIds['jane_smith']
        }
      ])

    if (referralError) {
      console.error('❌ Error inserting referrals:', referralError.message)
    } else {
      console.log('✅ Created 1 referral')
    }

    // 7. Insert accounts
    console.log('\n📱 Creating accounts...')
    const { error: accountError } = await supabase
      .from('accounts')
      .insert([
        {
          user_id: userIds['john_doe'],
          phone_number: '+1234567890',
          amount: 1000.00,
          status: 'active'
        },
        {
          user_id: userIds['jane_smith'],
          phone_number: '+1555555555',
          amount: 2500.50,
          status: 'active'
        }
      ])

    if (accountError) {
      console.error('❌ Error inserting accounts:', accountError.message)
    } else {
      console.log('✅ Created 2 accounts')
    }

    console.log('\n✨ Test data insertion completed!')
    console.log('\n📊 Summary:')
    console.log('   - 3 users (1 admin, 2 regular)')
    console.log('   - 3 transactions')
    console.log('   - 3 withdrawals')
    console.log('   - 3 payment requests')
    console.log('   - 1 referral')
    console.log('   - 2 accounts')
    console.log('\n🔐 Login credentials:')
    console.log('   Admin: admin@test.com / admin123456')
    console.log('   User1: user1@test.com / user123456')
    console.log('   User2: user2@test.com / user123456')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

insertTestData()
