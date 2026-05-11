-- ============================================================
-- Run this in Supabase SQL Editor to delete a stuck auth user
-- Replace the email below with your actual email
-- ============================================================

DELETE FROM auth.users WHERE email = 'siddhu200410@gmail.com';

-- After running this, go to /signup and create your account fresh
