-- ============================================================
-- Run this in Supabase SQL Editor to fix profile issues
-- ============================================================

-- 1. Create profile rows for any auth users that don't have one
INSERT INTO public.profiles (user_id, email, full_name, attendance_goal)
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'full_name',
  75
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 2. Create settings rows for any users that don't have one
INSERT INTO public.settings (user_id)
SELECT u.id
FROM auth.users u
LEFT JOIN public.settings s ON s.user_id = u.id
WHERE s.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 3. Verify profiles exist
SELECT p.user_id, p.email, p.full_name, p.attendance_goal
FROM public.profiles p;
