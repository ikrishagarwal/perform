-- ============================================================
-- Audit + RLS Verification Script (read-only assertions)
-- Run manually in Supabase SQL editor after migrations.
-- ============================================================

-- 1) Trigger exists for locked-sheet audit logging
DO $$
DECLARE
  trigger_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'goals'
      AND t.tgname = 'tg_audit_locked_mutations'
      AND NOT t.tgisinternal
  ) INTO trigger_exists;

  IF NOT trigger_exists THEN
    RAISE EXCEPTION 'Missing trigger: public.tg_audit_locked_mutations';
  END IF;
END $$;

-- 2) Audit function exists and is SECURITY DEFINER
DO $$
DECLARE
  fn_exists boolean;
  is_security_definer boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'fn_audit_locked_mutations'
  ) INTO fn_exists;

  IF NOT fn_exists THEN
    RAISE EXCEPTION 'Missing function: public.fn_audit_locked_mutations()';
  END IF;

  SELECT p.prosecdef
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'fn_audit_locked_mutations'
  LIMIT 1
  INTO is_security_definer;

  IF NOT COALESCE(is_security_definer, false) THEN
    RAISE EXCEPTION 'fn_audit_locked_mutations() must be SECURITY DEFINER';
  END IF;
END $$;

-- 3) Ensure hardened policies include WITH CHECK clauses
DO $$
DECLARE
  missing_count int;
BEGIN
  SELECT COUNT(*)
  INTO missing_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND policyname IN (
      'sheets_update',
      'goals_update_employee',
      'goals_update_manager',
      'goals_update_admin'
    )
    AND (with_check IS NULL OR with_check = '');

  IF missing_count > 0 THEN
    RAISE EXCEPTION 'One or more hardened update policies are missing WITH CHECK clauses';
  END IF;
END $$;

-- 4) Verify manager check-in insert policy references manager-of relationship
DO $$
DECLARE
  policy_def text;
BEGIN
  SELECT with_check
  INTO policy_def
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'checkin_comments'
    AND policyname = 'checkin_insert'
  LIMIT 1;

  IF policy_def IS NULL THEN
    RAISE EXCEPTION 'Missing policy: checkin_insert on public.checkin_comments';
  END IF;

  IF position('fn_is_manager_of' in policy_def) = 0 THEN
    RAISE EXCEPTION 'checkin_insert policy is not constrained to direct-report manager scope';
  END IF;
END $$;

-- 5) Optional operational checks
--    A. Lock a test sheet, mutate a goal on that sheet as authenticated user,
--       then confirm an audit row appears for that goal/sheet.
--    B. As manager, attempt check-in insert on non-direct-report sheet and
--       confirm permission denied.
--    C. As manager, attempt goal update that re-points goal_sheet_id outside
--       direct reports and confirm permission denied.
