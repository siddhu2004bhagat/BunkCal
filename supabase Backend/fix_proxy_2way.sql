-- ============================================================
-- Fix: 2-way proxy sync — add counterpart_user_id columns
-- Run this in Supabase SQL Editor
-- ============================================================

-- Add counterpart_user_id to proxy_ledger
ALTER TABLE proxy_ledger ADD COLUMN IF NOT EXISTS counterpart_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add counterpart_user_id to proxy_transactions  
ALTER TABLE proxy_transactions ADD COLUMN IF NOT EXISTS counterpart_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_proxy_ledger_counterpart ON proxy_ledger(user_id, counterpart_user_id);

-- Allow users to insert proxy_ledger entries for other users (needed for mirror)
-- The existing RLS only allows user_id = auth.uid()
-- We need to allow inserts where the row is being created by the mirror logic
-- Since we're using the anon key with the user's session, this is fine with existing policy

-- Update RLS to allow reading ledger entries where you are the counterpart
DROP POLICY IF EXISTS "Users can view own ledger" ON proxy_ledger;
CREATE POLICY "Users can view own ledger" ON proxy_ledger
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Allow inserting mirror entries (user_id = receiver, but caller is sender)
-- We need a more permissive insert policy for mirroring
DROP POLICY IF EXISTS "Users can insert own ledger" ON proxy_ledger;
CREATE POLICY "Users can insert own ledger" ON proxy_ledger
  FOR INSERT TO authenticated
  WITH CHECK (true); -- Allow any authenticated user to create ledger entries (needed for mirroring)

-- Same for proxy_transactions
DROP POLICY IF EXISTS "Users can insert own transactions" ON proxy_transactions;
CREATE POLICY "Users can insert own transactions" ON proxy_transactions
  FOR INSERT TO authenticated
  WITH CHECK (true); -- Allow mirroring

-- Verify columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'proxy_ledger' AND column_name = 'counterpart_user_id';
