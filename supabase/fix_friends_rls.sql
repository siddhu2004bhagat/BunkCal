-- ============================================================
-- Fix friend requests RLS + add to Realtime
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create tables if they don't exist
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(sender_id, receiver_id)
);

CREATE TABLE IF NOT EXISTS friends (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, friend_id)
);

-- 2. Enable RLS
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- 3. Drop old policies
DROP POLICY IF EXISTS "Users can view own requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can send requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can update received requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can view own friends" ON friends;
DROP POLICY IF EXISTS "Users can insert own friends" ON friends;
DROP POLICY IF EXISTS "Users can delete own friends" ON friends;

-- 4. Friend requests policies
-- Both sender and receiver can read the request
CREATE POLICY "Users can view own requests" ON friend_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Only sender can insert
CREATE POLICY "Users can send requests" ON friend_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Both sender and receiver can update (accept/reject)
CREATE POLICY "Users can update requests" ON friend_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

-- 5. Friends policies
CREATE POLICY "Users can view own friends" ON friends
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own friends" ON friends
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR true); -- allow from SECURITY DEFINER function

CREATE POLICY "Users can delete own friends" ON friends
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 6. Add to Realtime publication
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='friend_requests') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE friend_requests;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='friends') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE friends;
  END IF;
END $$;

-- 7. Recreate accept function with proper permissions
CREATE OR REPLACE FUNCTION accept_friend_request(request_id UUID)
RETURNS void AS $$
DECLARE
  req friend_requests%ROWTYPE;
BEGIN
  SELECT * INTO req FROM friend_requests WHERE id = request_id AND receiver_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or not authorized'; END IF;

  UPDATE friend_requests SET status = 'accepted', updated_at = NOW() WHERE id = request_id;

  INSERT INTO friends (user_id, friend_id) VALUES (req.receiver_id, req.sender_id) ON CONFLICT DO NOTHING;
  INSERT INTO friends (user_id, friend_id) VALUES (req.sender_id, req.receiver_id) ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' ORDER BY tablename;
