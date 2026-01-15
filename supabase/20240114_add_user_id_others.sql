-- Add user_id to usage_logs
ALTER TABLE usage_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
CREATE INDEX IF NOT EXISTS usage_logs_user_id_idx ON usage_logs(user_id);
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only view their own usage logs" ON usage_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage logs" ON usage_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Add user_id to periodic_summaries
ALTER TABLE periodic_summaries ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
CREATE INDEX IF NOT EXISTS periodic_summaries_user_id_idx ON periodic_summaries(user_id);
ALTER TABLE periodic_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own periodic summaries" ON periodic_summaries
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own periodic summaries" ON periodic_summaries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own periodic summaries" ON periodic_summaries
  FOR DELETE USING (auth.uid() = user_id);

-- Add user_id to topic_relationships
ALTER TABLE topic_relationships ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
CREATE INDEX IF NOT EXISTS topic_relationships_user_id_idx ON topic_relationships(user_id);
ALTER TABLE topic_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own topic relationships" ON topic_relationships
  FOR SELECT USING (auth.uid() = user_id);


CREATE POLICY "Users can manage their own topic relationships" ON topic_relationships
  FOR ALL USING (auth.uid() = user_id);

-- Fix user_profiles user_id type and add RLS
-- Warning: This deletes the 'default_user' dummy data to verify types
DELETE FROM user_profiles WHERE user_id = 'default_user';

ALTER TABLE user_profiles
  ALTER COLUMN user_id TYPE UUID USING user_id::uuid;

ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

