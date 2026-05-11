-- ============================================================
-- BUNKWISE — Complete Fix Script
-- Run this ENTIRE file in Supabase SQL Editor
-- ============================================================

-- 1. Add bunkwise_id to profiles if missing
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bunkwise_id TEXT UNIQUE;

-- 2. Generate IDs for profiles that don't have one
CREATE OR REPLACE FUNCTION generate_bunkwise_id() RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT; i INT; n INT;
BEGIN
  LOOP
    result := 'BW-';
    FOR i IN 1..4 LOOP result := result || substr(chars, floor(random()*length(chars)+1)::int, 1); END LOOP;
    SELECT COUNT(*) INTO n FROM profiles WHERE bunkwise_id = result;
    EXIT WHEN n = 0;
  END LOOP;
  RETURN result;
END; $$ LANGUAGE plpgsql;

UPDATE profiles SET bunkwise_id = generate_bunkwise_id() WHERE bunkwise_id IS NULL;

-- 3. Fix profiles RLS — allow authenticated users to read any profile (needed for friend search)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can search by bunkwise_id" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can search profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;

CREATE POLICY "Authenticated users can view all profiles" ON profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. Create friend_requests table
CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(sender_id, receiver_id)
);

-- 5. Create friends table
CREATE TABLE IF NOT EXISTS friends (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, friend_id)
);

-- 6. Enable RLS on new tables
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- 7. Friend requests RLS
DROP POLICY IF EXISTS "Users can view own requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can send requests" ON friend_requests;
DROP POLICY IF EXISTS "Users can update requests" ON friend_requests;

CREATE POLICY "Users can view own requests" ON friend_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send requests" ON friend_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update requests" ON friend_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

-- 8. Friends RLS
DROP POLICY IF EXISTS "Users can view own friends" ON friends;
DROP POLICY IF EXISTS "Users can insert own friends" ON friends;
DROP POLICY IF EXISTS "Users can delete own friends" ON friends;

CREATE POLICY "Users can view own friends" ON friends
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own friends" ON friends
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Allow inserts from SECURITY DEFINER functions only
CREATE POLICY "Service can insert friends" ON friends
  FOR INSERT WITH CHECK (true);

-- 9. Fix notifications RLS — allow cross-user notification creation via SECURITY DEFINER
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
DROP POLICY IF EXISTS "Service can insert notifications" ON notifications;

-- Users can insert their own notifications
CREATE POLICY "Users can insert own notifications" ON notifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Allow service-role inserts (for cross-user notifications via functions)
CREATE POLICY "Service can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- 10. SECURITY DEFINER function to send friend request + create notification
CREATE OR REPLACE FUNCTION send_friend_request(p_sender_id UUID, p_receiver_id UUID)
RETURNS UUID AS $$
DECLARE
  req_id UUID;
  sender_name TEXT;
BEGIN
  -- Insert friend request
  INSERT INTO friend_requests (sender_id, receiver_id, status)
  VALUES (p_sender_id, p_receiver_id, 'pending')
  ON CONFLICT (sender_id, receiver_id) DO NOTHING
  RETURNING id INTO req_id;

  IF req_id IS NULL THEN
    RAISE EXCEPTION 'Friend request already exists';
  END IF;

  -- Get sender name
  SELECT COALESCE(full_name, bunkwise_id, 'Someone') INTO sender_name
  FROM profiles WHERE user_id = p_sender_id;

  -- Create notification for receiver (bypasses RLS)
  INSERT INTO notifications (user_id, title, message, type, read)
  VALUES (
    p_receiver_id,
    'New Friend Request 👋',
    sender_name || ' sent you a friend request. Open Friends to accept.',
    'info',
    false
  );

  RETURN req_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. SECURITY DEFINER function to accept friend request + create notification
CREATE OR REPLACE FUNCTION accept_friend_request(request_id UUID)
RETURNS void AS $$
DECLARE
  req friend_requests%ROWTYPE;
  receiver_name TEXT;
BEGIN
  SELECT * INTO req FROM friend_requests
  WHERE id = request_id AND receiver_id = auth.uid() AND status = 'pending';

  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found or not authorized'; END IF;

  UPDATE friend_requests SET status = 'accepted', updated_at = NOW() WHERE id = request_id;

  INSERT INTO friends (user_id, friend_id) VALUES (req.receiver_id, req.sender_id) ON CONFLICT DO NOTHING;
  INSERT INTO friends (user_id, friend_id) VALUES (req.sender_id, req.receiver_id) ON CONFLICT DO NOTHING;

  -- Notify sender
  SELECT COALESCE(full_name, bunkwise_id, 'Someone') INTO receiver_name
  FROM profiles WHERE user_id = req.receiver_id;

  INSERT INTO notifications (user_id, title, message, type, read)
  VALUES (
    req.sender_id,
    'Friend Request Accepted! 🎉',
    receiver_name || ' accepted your friend request. You are now friends!',
    'success',
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Add to Realtime publication
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['subjects','attendance_records','proxy_ledger','proxy_transactions',
    'timetable_entries','notifications','profiles','friend_requests','friends'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename=t) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
    END IF;
  END LOOP;
END $$;

-- 13. Update handle_new_user trigger to include bunkwise_id
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, attendance_goal, bunkwise_id)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', 75, generate_bunkwise_id())
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.settings (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify
SELECT 'friend_requests' as tbl, COUNT(*) FROM friend_requests
UNION ALL SELECT 'friends', COUNT(*) FROM friends
UNION ALL SELECT 'profiles with bunkwise_id', COUNT(*) FROM profiles WHERE bunkwise_id IS NOT NULL;
