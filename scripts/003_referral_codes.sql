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
