-- ============================================================
-- Enable Supabase Realtime for all user tables
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add tables to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE subjects;
ALTER PUBLICATION supabase_realtime ADD TABLE attendance_records;
ALTER PUBLICATION supabase_realtime ADD TABLE proxy_ledger;
ALTER PUBLICATION supabase_realtime ADD TABLE proxy_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE timetable_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Verify
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
