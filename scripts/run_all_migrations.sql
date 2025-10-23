-- =====================================================
-- RUN ALL MIGRATIONS - Complete Setup Script
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Add referral_code column (from 005_add_referral_code.sql)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

COMMENT ON COLUMN public.users.referral_code IS 'Unique referral code for the user';

-- 2. Add user fields (from 006_add_user_fields.sql)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS balance DECIMAL(18, 8) DEFAULT 0.00;

COMMENT ON COLUMN public.users.first_name IS 'User first name from Telegram';
COMMENT ON COLUMN public.users.last_name IS 'User last name from Telegram';
COMMENT ON COLUMN public.users.balance IS 'User wallet balance in USDT';

-- 3. Create system_settings table (from 007_create_settings_table.sql)
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid errors)
DROP POLICY IF EXISTS "Anyone can view settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can insert settings" ON public.system_settings;

-- Create RLS policies for system_settings
CREATE POLICY "Anyone can view settings" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "Admins can update settings" ON public.system_settings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = TRUE)
);
CREATE POLICY "Admins can insert settings" ON public.system_settings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = TRUE)
);

-- Insert default minimum withdrawal setting
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES ('min_withdrawal_amount', '5.00', 'Minimum withdrawal amount in USDT')
ON CONFLICT (setting_key) DO NOTHING;

-- 4. Verify the setup
SELECT 'Migration completed successfully!' AS status;

-- Show current user table structure
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'users'
ORDER BY ordinal_position;

-- Show system settings
SELECT * FROM public.system_settings;
