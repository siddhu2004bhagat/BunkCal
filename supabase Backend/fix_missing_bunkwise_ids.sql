-- ============================================================
-- Fix: Assign bunkwise_id to existing profiles that don't have one
-- Run this in Supabase SQL Editor
-- ============================================================

-- Make sure the column exists first
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bunkwise_id TEXT UNIQUE;

-- Make sure the generator function exists
CREATE OR REPLACE FUNCTION generate_bunkwise_id()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := 'BW-';
  i INT;
  exists_check INT;
BEGIN
  LOOP
    result := 'BW-';
    FOR i IN 1..4 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    SELECT COUNT(*) INTO exists_check FROM profiles WHERE bunkwise_id = result;
    EXIT WHEN exists_check = 0;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Assign IDs to ALL profiles that are missing one
UPDATE profiles
SET bunkwise_id = generate_bunkwise_id()
WHERE bunkwise_id IS NULL;

-- Verify
SELECT user_id, full_name, bunkwise_id FROM profiles;
