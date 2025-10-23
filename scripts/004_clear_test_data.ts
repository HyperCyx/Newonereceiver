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

async function clearTestData() {
  console.log('🧹 Starting to clear test data...')

  try {
    // Delete in reverse order due to foreign key constraints
    
    console.log('\n📱 Deleting accounts...')
    const { error: accountError } = await supabase
      .from('accounts')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

    if (accountError) {
      console.error('❌ Error deleting accounts:', accountError.message)
    } else {
      console.log('✅ Deleted accounts')
    }

    console.log('\n👥 Deleting referrals...')
    const { error: referralError } = await supabase
      .from('referrals')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (referralError) {
      console.error('❌ Error deleting referrals:', referralError.message)
    } else {
      console.log('✅ Deleted referrals')
    }

    console.log('\n💳 Deleting payment requests...')
    const { error: paymentError } = await supabase
      .from('payment_requests')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (paymentError) {
      console.error('❌ Error deleting payment requests:', paymentError.message)
    } else {
      console.log('✅ Deleted payment requests')
    }

    console.log('\n🏦 Deleting withdrawals...')
    const { error: withdrawalError } = await supabase
      .from('withdrawals')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (withdrawalError) {
      console.error('❌ Error deleting withdrawals:', withdrawalError.message)
    } else {
      console.log('✅ Deleted withdrawals')
    }

    console.log('\n💰 Deleting transactions...')
    const { error: txError } = await supabase
      .from('transactions')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (txError) {
      console.error('❌ Error deleting transactions:', txError.message)
    } else {
      console.log('✅ Deleted transactions')
    }

    console.log('\n📝 Deleting users...')
    const { data: users, error: fetchError } = await supabase
      .from('users')
      .select('id')

    if (fetchError) {
      console.error('❌ Error fetching users:', fetchError.message)
    } else if (users) {
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000')

      if (userError) {
        console.error('❌ Error deleting users:', userError.message)
      } else {
        console.log('✅ Deleted user profiles')
      }

      // Delete auth users
      console.log('\n🔐 Deleting auth users...')
      for (const user of users) {
        const { error: authError } = await supabase.auth.admin.deleteUser(user.id)
        if (authError) {
          console.error(`❌ Error deleting auth user ${user.id}:`, authError.message)
        }
      }
      console.log('✅ Deleted auth users')
    }

    console.log('\n✨ Test data cleanup completed!')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

clearTestData()
