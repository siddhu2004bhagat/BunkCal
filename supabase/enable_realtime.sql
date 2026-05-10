-- ============================================================
-- Enable Realtime safely (skips tables already in publication)
-- Run this in Supabase SQL Editor
-- ============================================================

DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'subjects', 'attendance_records', 'proxy_ledger',
    'proxy_transactions', 'timetable_entries', 'notifications', 'profiles'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', t);
      RAISE NOTICE 'Added % to realtime', t;
    ELSE
      RAISE NOTICE '% already in realtime, skipping', t;
    END IF;
  END LOOP;
END $$;

-- Verify all tables
SELECT tablename FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
