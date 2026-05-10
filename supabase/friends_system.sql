-- ============================================================
-- Friends System
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Friend requests table
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(sender_id, receiver_id)
);

-- 2. Friends table (accepted connections)
CREATE TABLE IF NOT EXISTS friends (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, friend_id)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON friend_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_friends_user_id ON friends(user_id);

-- 4. RLS
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- Friend requests policies
DROP POLICY IF EXISTS "Users can view own requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can send requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can update received requests" ON friend_requests;

CREATE POLICY "Users can view own requests" ON friend_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send requests" ON friend_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update received requests" ON friend_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

-- Friends policies
DROP POLICY IF EXISTS "Users can view own friends" ON friends;
DROP POLICY IF EXISTS "Users can insert own friends" ON friends;
DROP POLICY IF EXISTS "Users can delete own friends" ON friends;

CREATE POLICY "Users can view own friends" ON friends
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own friends" ON friends
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own friends" ON friends
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5. Function: accept friend request (creates both sides of friendship)
CREATE OR REPLACE FUNCTION accept_friend_request(request_id UUID)
RETURNS void AS $$
DECLARE
  req friend_requests%ROWTYPE;
BEGIN
  SELECT * INTO req FROM friend_requests WHERE id = request_id AND receiver_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;

  -- Update request status
  UPDATE friend_requests SET status = 'accepted', updated_at = NOW() WHERE id = request_id;

  -- Create friendship both ways
  INSERT INTO friends (user_id, friend_id) VALUES (req.receiver_id, req.sender_id) ON CONFLICT DO NOTHING;
  INSERT INTO friends (user_id, friend_id) VALUES (req.sender_id, req.receiver_id) ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('friend_requests', 'friends');
