-- ============================================================
-- Performance Optimizations — run in Supabase SQL Editor
-- ============================================================

-- 1. Unique constraint on attendance (prevents duplicates at DB level)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_attendance_per_day'
  ) THEN
    ALTER TABLE attendance_records
      ADD CONSTRAINT unique_attendance_per_day
      UNIQUE (user_id, subject_id, date);
  END IF;
END $$;

-- 2. Index on date for fast "today's records" queries
CREATE INDEX IF NOT EXISTS idx_attendance_date
  ON attendance_records(date DESC);

-- 3. Composite index for the most common query pattern
CREATE INDEX IF NOT EXISTS idx_attendance_user_date
  ON attendance_records(user_id, date DESC);

-- 4. Index for proxy transactions by ledger
CREATE INDEX IF NOT EXISTS idx_proxy_txn_ledger_date
  ON proxy_transactions(ledger_id, created_at DESC);

-- 5. Index for notifications unread filter
CREATE INDEX IF NOT EXISTS idx_notifications_unread
  ON notifications(user_id, read, created_at DESC);

-- 6. Index for calculator history recency
CREATE INDEX IF NOT EXISTS idx_calc_history_recent
  ON calculator_history(user_id, created_at DESC);

-- Verify
SELECT conname FROM pg_constraint WHERE conrelid = 'attendance_records'::regclass;
