-- Add referral_code column to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON public.users(referral_code);

-- Add comment
COMMENT ON COLUMN public.users.referral_code IS 'Unique referral code for each user';
