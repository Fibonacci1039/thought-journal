-- Add user_id to usage_logs (Idempotent)
ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
CREATE INDEX IF NOT EXISTS usage_logs_user_id_idx ON usage_logs(user_id);
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'usage_logs' AND policyname = 'Users can only view their own usage logs') THEN
        CREATE POLICY "Users can only view their own usage logs" ON usage_logs FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'usage_logs' AND policyname = 'Users can insert their own usage logs') THEN
        CREATE POLICY "Users can insert their own usage logs" ON usage_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Add user_id to periodic_summaries (Idempotent)
ALTER TABLE periodic_summaries ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
CREATE INDEX IF NOT EXISTS periodic_summaries_user_id_idx ON periodic_summaries(user_id);
ALTER TABLE periodic_summaries ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'periodic_summaries' AND policyname = 'Users can view their own periodic summaries') THEN
        CREATE POLICY "Users can view their own periodic summaries" ON periodic_summaries FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'periodic_summaries' AND policyname = 'Users can insert their own periodic summaries') THEN
        CREATE POLICY "Users can insert their own periodic summaries" ON periodic_summaries FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'periodic_summaries' AND policyname = 'Users can delete their own periodic summaries') THEN
        CREATE POLICY "Users can delete their own periodic summaries" ON periodic_summaries FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- Add user_id to topic_relationships (Idempotent)
ALTER TABLE topic_relationships ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
CREATE INDEX IF NOT EXISTS topic_relationships_user_id_idx ON topic_relationships(user_id);
ALTER TABLE topic_relationships ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'topic_relationships' AND policyname = 'Users can view their own topic relationships') THEN
        CREATE POLICY "Users can view their own topic relationships" ON topic_relationships FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'topic_relationships' AND policyname = 'Users can manage their own topic relationships') THEN
        CREATE POLICY "Users can manage their own topic relationships" ON topic_relationships FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;

-- Fix user_profiles user_id type and add RLS
-- Warning: This deletes the 'default_user' dummy data to verify types
DELETE FROM user_profiles WHERE user_id = 'default_user';

-- Drop default if exists to prevent casting error
ALTER TABLE user_profiles ALTER COLUMN user_id DROP DEFAULT;

-- Change type with casting
ALTER TABLE user_profiles
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

-- Add Foreign Key if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_profiles_user_id_fkey') THEN
        ALTER TABLE user_profiles
          ADD CONSTRAINT user_profiles_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES auth.users(id);
    END IF;
END $$;

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can view their own profile') THEN
        CREATE POLICY "Users can view their own profile" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can update their own profile') THEN
        CREATE POLICY "Users can update their own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can insert their own profile') THEN
        CREATE POLICY "Users can insert their own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
