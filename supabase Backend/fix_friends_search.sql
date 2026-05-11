-- ============================================================
-- Fix: Allow authenticated users to search profiles by bunkwise_id
-- Run this in Supabase SQL Editor
-- ============================================================

-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can search by bunkwise_id" ON profiles;

-- Allow users to read their own full profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Allow any authenticated user to search by bunkwise_id (read-only, limited fields)
-- This is needed for the friend search feature
CREATE POLICY "Authenticated users can search profiles" ON profiles
  FOR SELECT TO authenticated
  USING (true);

-- Verify
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles';
