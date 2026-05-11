-- ============================================================
-- Enable Supabase Realtime for all tables
-- Run this in Supabase SQL Editor
-- ============================================================

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'subjects',
    'attendance_records', 
    'proxy_ledger',
    'proxy_transactions',
    'timetable_entries',
    'notifications',
    'profiles',
    'friend_requests',
    'friends'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
      RAISE NOTICE 'Added % to realtime', t;
    ELSE
      RAISE NOTICE '% already in realtime', t;
    END IF;
  END LOOP;
END $$;

-- Verify
SELECT tablename FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
ORDER BY tablename;
