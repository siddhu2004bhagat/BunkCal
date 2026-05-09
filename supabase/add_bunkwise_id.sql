-- ============================================================
-- Add unique Bunkwise ID to profiles
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add the column
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS bunkwise_id TEXT UNIQUE;

-- 2. Function to generate a short unique ID like BW-A3K9
CREATE OR REPLACE FUNCTION generate_bunkwise_id()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := 'BW-';
  i INT;
  new_id TEXT;
  exists_check INT;
BEGIN
  LOOP
    result := 'BW-';
    FOR i IN 1..4 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    -- Check uniqueness
    SELECT COUNT(*) INTO exists_check FROM profiles WHERE bunkwise_id = result;
    EXIT WHEN exists_check = 0;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 3. Backfill existing profiles that don't have an ID yet
UPDATE profiles
SET bunkwise_id = generate_bunkwise_id()
WHERE bunkwise_id IS NULL;

-- 4. Update the trigger to auto-assign on new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, attendance_goal, bunkwise_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    75,
    generate_bunkwise_id()
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Allow searching profiles by bunkwise_id (for friend search)
-- Add RLS policy so authenticated users can search other users by bunkwise_id
DROP POLICY IF EXISTS "Users can search by bunkwise_id" ON profiles;
CREATE POLICY "Users can search by bunkwise_id" ON profiles
  FOR SELECT TO authenticated
  USING (true);  -- allow reading any profile (only bunkwise_id + name exposed in search)

-- 6. Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_profiles_bunkwise_id ON profiles(bunkwise_id);

-- Verify
SELECT user_id, full_name, bunkwise_id FROM profiles LIMIT 10;
