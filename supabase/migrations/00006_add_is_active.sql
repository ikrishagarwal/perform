-- ============================================================
-- Migration 00006: Add is_active flag to profiles
-- Purpose: Allow admins to disable employee accounts
-- ============================================================

-- 1. Add is_active column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 2. Set existing profiles to active
UPDATE public.profiles
SET is_active = true
WHERE is_active IS NULL;

-- 3. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON public.profiles(is_active);

-- 4. Update trigger to set is_active = true on new user creation
-- Drop existing trigger first
DROP TRIGGER IF EXISTS tg_on_auth_user_created ON auth.users;

-- Recreate the trigger function with is_active
CREATE OR REPLACE FUNCTION public.fn_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'employee'),
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER tg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.fn_handle_new_user();

-- 5. Add RLS policy to block inactive profiles
-- NOTE: Removed due to infinite recursion issue
-- The is_active check is handled in login/actions.ts instead
-- Keeping existing profiles_select policy which allows everyone to read