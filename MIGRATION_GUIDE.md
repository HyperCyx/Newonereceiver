# Referral System Migration Guide

## ✅ Completed Steps

1. **Created Database Schema** (`scripts/003_referral_codes.sql`)
   - New `referral_codes` table for standalone referral codes
   - Added `used_referral_code` column to `users` table
   - Set up RLS policies
   - Created indexes for performance

2. **Created API Endpoints**
   - `POST /api/referral-codes` - Create new referral codes
   - `GET /api/referral-codes` - Fetch all referral codes with usage stats
   - `POST /api/user/register-with-referral` - Register user with mandatory referral code validation

3. **Updated Admin Dashboard UI**
   - Changed interface from `ReferralUser` to `ReferralCode`
   - Updated fetch logic to use `/api/referral-codes` endpoint
   - Redesigned table to display:
     - Code Name
     - Referral Code
     - Used Count
     - Max Uses (shows ∞ if unlimited)
     - Status (Active/Inactive)
     - Created Date
     - Bot Link (with Copy button)
   - Updated statistics cards to show real referral code metrics

---

## 🔄 Next Steps

### 1. **RUN THE DATABASE MIGRATION** (CRITICAL)

The Supabase SQL Editor has been opened in your browser at:
https://supabase.com/dashboard/project/cshhaiaildxrapqbtxqq/sql/new

**Copy and paste this SQL:**

```sql
-- Create referral_codes table for standalone referral codes
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by TEXT,
  max_uses INTEGER,
  used_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE
);

-- Create index on code for fast lookups
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_active ON referral_codes(is_active);

-- Add referral_code column to users table if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS used_referral_code TEXT;

-- Create index on used_referral_code
CREATE INDEX IF NOT EXISTS idx_users_used_referral_code ON users(used_referral_code);

-- Enable RLS
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

-- Create policies for referral_codes
CREATE POLICY "Allow public to read active referral codes"
  ON referral_codes FOR SELECT
  USING (is_active = true);

CREATE POLICY "Allow service role full access to referral codes"
  ON referral_codes FOR ALL
  USING (true)
  WITH CHECK (true);
```

Then click **RUN** in the SQL Editor.

---

### 2. **Test Referral Code Creation**

After running the migration:

1. Go to Admin Dashboard → Referrals tab
2. Enter a code name (e.g., "MASTER")
3. Click "Generate Referral Code"
4. You should see:
   - Success message: "Referral code created! Users MUST register using this link"
   - The new code appears in the table below
   - Bot link in format: `https://t.me/WhatsAppNumberRedBot?start=MASTER...`

---

### 3. **Integrate with Telegram Bot**

Update your Telegram bot code in `/lib/telegram/bot.ts` to:

1. **Extract referral code from start parameter:**
   ```typescript
   // When user clicks bot link: https://t.me/BOT?start=CODE123
   const startPayload = message.text.split(' ')[1] // "CODE123"
   ```

2. **Pass code to registration:**
   ```typescript
   const response = await fetch('/api/user/register-with-referral', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       telegram_id: user.id,
       telegram_username: user.username,
       first_name: user.first_name,
       referral_code: startPayload // REQUIRED!
     })
   })
   ```

3. **Handle errors:**
   ```typescript
   if (!response.ok) {
     const error = await response.json()
     if (error.requiresReferral) {
       // Show message: "You need a valid referral link to register"
     }
   }
   ```

---

### 4. **Delete Old Endpoint**

Remove the obsolete file:
```bash
rm /workspaces/Newonereceiver/app/api/admin/referrals/route.ts
```

This prevents confusion between the old user-based system and new code-based system.

---

### 5. **Test Complete Flow**

**Admin Side:**
1. ✅ Create code "TEST" in admin panel
2. ✅ Copy bot link: `https://t.me/WhatsAppNumberRedBot?start=TEST...`
3. ✅ Verify code appears in referral table

**User Side:**
1. ⏳ Click bot link (opens Telegram)
2. ⏳ Bot extracts "TEST..." from start parameter
3. ⏳ Bot calls `/api/user/register-with-referral` with code
4. ⏳ User registered successfully
5. ⏳ Admin sees `used_count` increment from 0 → 1

**Failure Cases to Test:**
- ❌ User tries to register without code → 403 error
- ❌ User tries invalid/expired code → 403 error
- ❌ Code reaches `max_uses` limit → 403 error

---

## 📊 Database Verification

After migration, verify in Supabase SQL Editor:

```sql
-- Check table exists
SELECT * FROM referral_codes;

-- Check column added to users
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'used_referral_code';

-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'referral_codes';
```

---

## 🎯 Current System Architecture

**OLD (Deprecated):**
- Referral codes tied to users in `users.referral_code`
- Admin had to create user first, then assign code
- No validation during registration

**NEW (Active):**
- Standalone `referral_codes` table
- Admin creates codes independently (no user needed)
- Registration **REQUIRES** valid referral code
- Codes track usage count and can have limits
- Users store which code they used in `users.used_referral_code`

---

## 🔧 API Endpoints Summary

### Create Referral Code
```typescript
POST /api/referral-codes
Body: { name?: string, max_uses?: number, expires_at?: string }
Response: { success: true, code: "CODE123", link: "https://t.me/..." }
```

### Get All Codes
```typescript
GET /api/referral-codes
Response: { success: true, codes: [{ id, code, name, used_count, ... }] }
```

### Register with Code (Required)
```typescript
POST /api/user/register-with-referral
Body: { telegram_id, username, referral_code } // referral_code is REQUIRED
Response: { success: true, user: {...} } OR { success: false, requiresReferral: true }
```

---

## 🐛 Troubleshooting

**"Could not find the 'email' column" error:**
- This was from the old `/api/admin/referrals` endpoint
- You're now using `/api/referral-codes` - error should be gone
- If persists, delete old endpoint file

**Table doesn't exist:**
- Run the migration SQL in Step 1

**RLS blocking inserts:**
- Ensure using Service Role Key in API endpoints
- Check: `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`

**Referral codes not showing in admin:**
- Check browser console for fetch errors
- Verify `/api/referral-codes` GET endpoint works
- Check Network tab: should see `{ success: true, codes: [...] }`

---

## 📝 Files Changed

1. `/scripts/003_referral_codes.sql` - NEW
2. `/app/api/referral-codes/route.ts` - NEW
3. `/app/api/user/register-with-referral/route.ts` - NEW
4. `/components/admin-dashboard.tsx` - UPDATED
5. `/lib/telegram/bot.ts` - NEEDS UPDATE (see Step 3)

---

**Status:** Migration script created and ready. Run SQL in Supabase dashboard to proceed! 🚀
