-- Add user_id to entries
ALTER TABLE entries 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Add user_id to topics
ALTER TABLE topics 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Enable RLS
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own entries
DROP POLICY IF EXISTS "Users can view own entries" ON entries;
CREATE POLICY "Users can view own entries" ON entries
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own entries" ON entries;
CREATE POLICY "Users can insert own entries" ON entries
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own entries" ON entries;
CREATE POLICY "Users can update own entries" ON entries
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own entries" ON entries;
CREATE POLICY "Users can delete own entries" ON entries
FOR DELETE USING (auth.uid() = user_id);

-- Policy for Topics
DROP POLICY IF EXISTS "Users can view own topics" ON topics;
CREATE POLICY "Users can view own topics" ON topics
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own topics" ON topics;
CREATE POLICY "Users can insert own topics" ON topics
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own topics" ON topics;
CREATE POLICY "Users can update own topics" ON topics
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own topics" ON topics;
CREATE POLICY "Users can delete own topics" ON topics
FOR DELETE USING (auth.uid() = user_id);
