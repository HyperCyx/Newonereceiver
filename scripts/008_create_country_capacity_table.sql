-- Create country_capacity table for managing country-specific account purchase settings
CREATE TABLE IF NOT EXISTS public.country_capacity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL UNIQUE,
  country_name TEXT NOT NULL,
  max_capacity INTEGER NOT NULL DEFAULT 0,
  used_capacity INTEGER NOT NULL DEFAULT 0,
  prize_amount DECIMAL(18, 8) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.country_capacity ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for country_capacity table
CREATE POLICY "Anyone can view active countries" ON public.country_capacity FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Admins can view all countries" ON public.country_capacity FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = TRUE)
);

CREATE POLICY "Admins can insert countries" ON public.country_capacity FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = TRUE)
);

CREATE POLICY "Admins can update countries" ON public.country_capacity FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = TRUE)
);

CREATE POLICY "Admins can delete countries" ON public.country_capacity FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = TRUE)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_country_capacity_code ON public.country_capacity(country_code);
CREATE INDEX IF NOT EXISTS idx_country_capacity_active ON public.country_capacity(is_active);

-- Add country_code to accounts table
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS country_code TEXT;

-- Create index for country_code in accounts
CREATE INDEX IF NOT EXISTS idx_accounts_country_code ON public.accounts(country_code);

-- Insert some initial country data (examples)
INSERT INTO public.country_capacity (country_code, country_name, max_capacity, prize_amount, is_active)
VALUES 
  ('US', 'United States', 100, 10.00, TRUE),
  ('GB', 'United Kingdom', 50, 8.00, TRUE),
  ('DE', 'Germany', 75, 9.00, TRUE),
  ('FR', 'France', 60, 8.50, TRUE),
  ('CA', 'Canada', 80, 9.50, TRUE),
  ('AU', 'Australia', 70, 9.00, TRUE)
ON CONFLICT (country_code) DO NOTHING;
