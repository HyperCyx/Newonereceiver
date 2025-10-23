# Database Migration Required

## Issues Found in Terminal Output:

1. **Missing `referral_code` column** in users table
   - Error: "Could not find the 'referral_code' column of 'users' in the schema cache"

2. **Auth users already exist** but not in users table
   - Error: "A user with this email address has already been registered"

## Fixes Applied:

### 1. Code Fixes (Already Applied):
- ✅ Updated `/app/api/user/register/route.ts` to handle existing auth users
- ✅ Updated `/lib/telegram/referral.ts` to handle existing auth users
- ✅ Updated `/scripts/001_create_tables.sql` to include referral_code column

### 2. Database Migration Required (Manual Step):

You need to run this SQL in your Supabase SQL Editor:

```sql
-- Add referral_code column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON public.users(referral_code);

-- Add comment
COMMENT ON COLUMN public.users.referral_code IS 'Unique referral code for each user';
```

## Steps to Fix:

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Open your project**: cshhaiaildxrapqbtxqq
3. **Go to SQL Editor** (left sidebar)
4. **Copy and paste** the SQL above
5. **Click "Run"**

## After Running the Migration:

The following will work:
- ✅ Users can register via Telegram bot `/start` command
- ✅ Users can register by opening the web app
- ✅ Users will show in admin dashboard
- ✅ Referral links will work properly
- ✅ No more "referral_code column not found" errors
- ✅ No more "email already exists" errors (will reuse existing auth users)

## Test After Migration:

1. Send `/start` to your Telegram bot
2. Open the web app
3. Check if user appears in Admin Dashboard → Users tab
4. Check if referral link is generated properly

The migration file is saved in: `/workspaces/Newonereceiver/scripts/005_add_referral_code.sql`
