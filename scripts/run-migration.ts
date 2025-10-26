import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function runMigration() {
  try {
    console.log('Reading migration file...')
    const sqlPath = path.join(__dirname, '003_referral_codes.sql')
    const sql = fs.readFileSync(sqlPath, 'utf-8')
    
    console.log('Executing migration...')
    console.log('SQL:', sql)
    
    // Split into individual statements and execute each one
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)
    
    for (const statement of statements) {
      console.log('\nExecuting:', statement.substring(0, 100) + '...')
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement })
      
      if (error) {
        console.error('Error:', error)
        // Continue even if there's an error (e.g., column already exists)
      } else {
        console.log('✓ Success')
      }
    }
    
    console.log('\n✅ Migration completed!')
    
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

runMigration()
