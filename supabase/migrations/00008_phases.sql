-- ============================================================
-- Phase Management System
-- - Add GOAL_SETTING to quarter_phase enum
-- - Create goal_checkins table for per-quarter progress
-- - Add current_phase and is_auto_mode to performance_cycles
-- ============================================================

-- 1. Add GOAL_SETTING to quarter_phase enum (run separately)
ALTER TYPE quarter_phase ADD VALUE IF NOT EXISTS 'GOAL_SETTING';

-- 2. Add columns to performance_cycles (use text to avoid enum issues)
ALTER TABLE performance_cycles
ADD COLUMN IF NOT EXISTS current_phase TEXT DEFAULT 'GOAL_SETTING',
ADD COLUMN IF NOT EXISTS is_auto_mode BOOLEAN DEFAULT false;

-- 3. Add missing is_active column if not exists
ALTER TABLE performance_cycles
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- 4. Set is_active = true for existing cycles
UPDATE performance_cycles SET is_active = true WHERE is_active IS NULL OR is_active = false;

-- 5. Create goal_checkins table
CREATE TABLE IF NOT EXISTS public.goal_checkins (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id             UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  quarter_phase       public.quarter_phase NOT NULL,
  actual_achievement  TEXT,
  progress_status     public.goal_progress,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (goal_id, quarter_phase)
);

-- 6. Index for goal_checkins
CREATE INDEX IF NOT EXISTS idx_goal_checkins_goal ON public.goal_checkins(goal_id);
CREATE INDEX IF NOT EXISTS idx_goal_checkins_phase ON public.goal_checkins(quarter_phase);

-- 7. Updated_at trigger for goal_checkins
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tg_goal_checkins_updated_at ON public.goal_checkins;
CREATE TRIGGER tg_goal_checkins_updated_at
  BEFORE UPDATE ON public.goal_checkins
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- 8. RLS for goal_checkins
ALTER TABLE public.goal_checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS goal_checkins_select_own ON public.goal_checkins;
CREATE POLICY goal_checkins_select_own ON public.goal_checkins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.goals g
      JOIN public.goal_sheets gs ON gs.id = g.goal_sheet_id
      WHERE g.id = goal_id AND gs.employee_id = auth.uid()
    )
    OR public.fn_get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'manager'
      AND EXISTS (
        SELECT 1 FROM public.goals g
        JOIN public.goal_sheets gs ON gs.id = g.goal_sheet_id
        WHERE g.id = goal_id AND gs.employee_id = p.id
      )
    )
  );

DROP POLICY IF EXISTS goal_checkins_insert_own ON public.goal_checkins;
CREATE POLICY goal_checkins_insert_own ON public.goal_checkins
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.goals g
      JOIN public.goal_sheets gs ON gs.id = g.goal_sheet_id
      WHERE g.id = goal_id AND gs.employee_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS goal_checkins_update_own ON public.goal_checkins;
CREATE POLICY goal_checkins_update_own ON public.goal_checkins
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.goals g
      JOIN public.goal_sheets gs ON gs.id = g.goal_sheet_id
      WHERE g.id = goal_id AND gs.employee_id = auth.uid()
    )
    OR public.fn_get_my_role() = 'admin'
  );

DROP POLICY IF EXISTS goal_checkins_delete_own ON public.goal_checkins;
CREATE POLICY goal_checkins_delete_own ON public.goal_checkins
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.goals g
      JOIN public.goal_sheets gs ON gs.id = g.goal_sheet_id
      WHERE g.id = goal_id AND gs.employee_id = auth.uid()
    )
    OR public.fn_get_my_role() = 'admin'
  );

-- 9. Helper function to get current phase
CREATE OR REPLACE FUNCTION public.fn_get_current_phase()
RETURNS public.quarter_phase AS $$
DECLARE
  cycle_record RECORD;
  today DATE := CURRENT_DATE;
BEGIN
  FOR cycle_record IN SELECT * FROM performance_cycles WHERE is_active = true LOOP
    IF cycle_record.is_auto_mode = false AND cycle_record.current_phase IS NOT NULL THEN
      RETURN cycle_record.current_phase::public.quarter_phase;
    END IF;

    IF today >= cycle_record.goal_setting_start AND today <= cycle_record.goal_setting_end THEN
      RETURN 'GOAL_SETTING'::public.quarter_phase;
    ELSIF today >= cycle_record.q1_start AND today <= cycle_record.q1_end THEN
      RETURN 'Q1'::public.quarter_phase;
    ELSIF today >= cycle_record.q2_start AND today <= cycle_record.q2_end THEN
      RETURN 'Q2'::public.quarter_phase;
    ELSIF today >= cycle_record.q3_start AND today <= cycle_record.q3_end THEN
      RETURN 'Q3'::public.quarter_phase;
    ELSIF today >= cycle_record.q4_start AND today <= cycle_record.q4_end THEN
      RETURN 'Q4_Annual'::public.quarter_phase;
    END IF;
  END LOOP;

  RETURN 'GOAL_SETTING'::public.quarter_phase;
END;
$$ LANGUAGE plpgsql STABLE;

-- 10. Update existing cycle with default values
UPDATE performance_cycles
SET current_phase = 'GOAL_SETTING',
    is_auto_mode = false
WHERE is_active = true;