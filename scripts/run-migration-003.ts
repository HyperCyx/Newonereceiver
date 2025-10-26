import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function runMigration() {
  try {
    console.log('📖 Reading migration file...')
    const sqlPath = path.join(process.cwd(), 'scripts', '003_referral_codes.sql')
    const sql = fs.readFileSync(sqlPath, 'utf-8')
    
    console.log('🔗 Connecting to Supabase...')
    console.log('URL:', supabaseUrl)
    
    // Use Supabase REST API to execute SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({ query: sql })
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('❌ Migration failed:', error)
      
      // Try alternative: execute via direct connection
      console.log('\n⚠️  Supabase exec_sql not available.')
      console.log('📋 Please run this SQL manually in your Supabase SQL Editor:')
      console.log('Dashboard URL: https://supabase.com/dashboard/project/cshhaiaildxrapqbtxqq/sql')
      console.log('\n' + '='.repeat(80))
      console.log(sql)
      console.log('='.repeat(80))
      
      process.exit(1)
    }
    
    const result = await response.json()
    console.log('✅ Migration completed successfully!')
    console.log('Result:', result)
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    console.log('\n📋 Please run the SQL manually in your Supabase SQL Editor:')
    console.log('Dashboard URL: https://supabase.com/dashboard/project/cshhaiaildxrapqbtxqq/sql')
    
    const sqlPath = path.join(process.cwd(), 'scripts', '003_referral_codes.sql')
    const sql = fs.readFileSync(sqlPath, 'utf-8')
    console.log('\n' + '='.repeat(80))
    console.log(sql)
    console.log('='.repeat(80))
    
    process.exit(1)
  }
}

runMigration()
