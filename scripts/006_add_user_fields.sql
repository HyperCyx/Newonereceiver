-- Add first_name, last_name, and balance columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS balance DECIMAL(18, 8) DEFAULT 0.00;

-- Update telegram_id to be NOT NULL if it isn't already
ALTER TABLE public.users 
ALTER COLUMN telegram_id SET NOT NULL;

-- Add comment
COMMENT ON COLUMN public.users.first_name IS 'User first name from Telegram';
COMMENT ON COLUMN public.users.last_name IS 'User last name from Telegram';
COMMENT ON COLUMN public.users.balance IS 'User wallet balance in USDT';
