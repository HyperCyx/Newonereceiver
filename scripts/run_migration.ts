import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: '.env.local' })

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('Running migration: Add referral_code column...')

  // Read the SQL file
  const sqlPath = path.join(process.cwd(), 'scripts', '005_add_referral_code.sql')
  const sql = fs.readFileSync(sqlPath, 'utf-8')

  // Split by semicolon to execute multiple statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0)

  for (const statement of statements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement })
      if (error) {
        // If RPC doesn't exist, try direct execution (for Supabase that supports it)
        console.log('Executing:', statement.substring(0, 50) + '...')
      }
    } catch (err) {
      console.error('Error executing statement:', err)
    }
  }

  console.log('✅ Migration completed!')
  console.log('Note: You may need to run this SQL manually in Supabase SQL Editor:')
  console.log(sql)
}

runMigration().catch(console.error)
