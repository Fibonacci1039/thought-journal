-- Subscriptions table for tracking Pro users
-- Run this after usage_migration.sql

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'incomplete')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_email ON subscriptions(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);

-- RLS Policy (if needed)
-- ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all for now" ON subscriptions FOR ALL USING (true);

-- Helper function to check if user is Pro
CREATE OR REPLACE FUNCTION is_pro(user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions 
    WHERE email = user_email 
    AND plan = 'pro' 
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql;
