import { Collections, getCollection, generateId } from '@/lib/mongodb/client'

async function createTestReferral() {
  try {
    console.log('Creating test referral code...')
    
    const referralCodes = await getCollection(Collections.REFERRAL_CODES)
    
    // Create a test referral code
    const testCode = {
      _id: generateId(),
      code: 'WELCOME2024',
      name: 'Welcome Code',
      is_active: true,
      created_by: 'system',
      max_uses: 100,
      used_count: 0,
      created_at: new Date(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    }
    
    // Check if code already exists
    const existing = await referralCodes.findOne({ code: testCode.code })
    if (existing) {
      console.log('✅ Test referral code already exists:', testCode.code)
      return
    }
    
    await referralCodes.insertOne(testCode)
    console.log('✅ Test referral code created:', testCode.code)
    console.log('   Max uses:', testCode.max_uses)
    console.log('   Expires:', testCode.expires_at.toISOString())
    
    // Also create a second referral code for testing
    const testCode2 = {
      _id: generateId(),
      code: 'DEMO123',
      name: 'Demo Code',
      is_active: true,
      created_by: 'system',
      max_uses: 50,
      used_count: 0,
      created_at: new Date(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }
    
    const existing2 = await referralCodes.findOne({ code: testCode2.code })
    if (!existing2) {
      await referralCodes.insertOne(testCode2)
      console.log('✅ Second test referral code created:', testCode2.code)
    }
    
    console.log('\n📋 Available test referral codes:')
    console.log('   - WELCOME2024 (100 uses)')
    console.log('   - DEMO123 (50 uses)')
    console.log('\n🔗 Test URLs:')
    console.log(`   - https://t.me/YOUR_BOT?start=WELCOME2024`)
    console.log(`   - https://t.me/YOUR_BOT?start=DEMO123`)
    
  } catch (error) {
    console.error('❌ Error creating test referral:', error)
  }
}

createTestReferral()