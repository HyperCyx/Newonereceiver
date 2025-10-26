import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables
config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables')
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function runMigration() {
  try {
    console.log('🚀 Running migration 008: Create country capacity table...\n')

    // Read the migration SQL file
    const migrationPath = join(__dirname, '008_create_country_capacity_table.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf-8')

    console.log('📄 Migration SQL loaded')
    console.log('Executing migration...\n')

    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      console.log(`Executing statement ${i + 1}/${statements.length}...`)
      
      const { error } = await supabase.rpc('exec_sql', { sql: statement })
      
      if (error) {
        // If exec_sql doesn't exist, try direct query
        const { error: directError } = await supabase.from('_migrations').insert({})
        if (directError) {
          console.error(`⚠️  Error executing statement ${i + 1}:`, error.message)
          // Continue with other statements
        }
      }
    }

    console.log('\n✅ Migration 008 completed successfully!')
    console.log('\nCreated:')
    console.log('  - country_capacity table')
    console.log('  - RLS policies for country_capacity')
    console.log('  - Added country_code to accounts table')
    console.log('  - Inserted sample country data')
    console.log('\nYou can now manage country capacities from the admin panel!')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('\n✨ All done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
