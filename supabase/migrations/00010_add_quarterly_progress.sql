-- ============================================================
-- AtomQuest: Quarterly Progress Tracking Migration
-- Phase 2: Historical progress per quarter
-- ============================================================

-- 1. New quarterly progress table
CREATE TABLE public.goal_quarterly_progress (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id             UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  quarter_phase       public.quarter_phase NOT NULL,
  actual_achievement  TEXT NOT NULL,
  progress_status     public.goal_progress NOT NULL DEFAULT 'not_started',
  submitted_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_by        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  UNIQUE (goal_id, quarter_phase)
);

-- 2. Index for fast quarter lookups
CREATE INDEX idx_qp_goal_quarter ON public.goal_quarterly_progress(goal_id, quarter_phase);

-- 3. Index for querying by submitter
CREATE INDEX idx_qp_submitted_by ON public.goal_quarterly_progress(submitted_by);

-- 4. Make goals table progress fields nullable (will be populated by latest quarter)
ALTER TABLE public.goals
  ALTER COLUMN actual_achievement DROP NOT NULL;

-- 5. New trigger: sync latest quarter to goals.current fields
CREATE OR REPLACE FUNCTION public.fn_sync_latest_quarter_to_goals()
RETURNS TRIGGER AS $$
DECLARE
  latest_quarter public.quarter_phase;
  latest_record RECORD;
BEGIN
  -- Find the most recent quarter progress for this goal
  SELECT quarter_phase INTO latest_quarter
  FROM public.goal_quarterly_progress
  WHERE goal_id = NEW.goal_id
  ORDER BY
    CASE quarter_phase
      WHEN 'Q1' THEN 1
      WHEN 'Q2' THEN 2
      WHEN 'Q3' THEN 3
      WHEN 'Q4_Annual' THEN 4
    END DESC
  LIMIT 1;

  IF latest_quarter IS NOT NULL THEN
    SELECT actual_achievement, progress_status INTO latest_record
    FROM public.goal_quarterly_progress
    WHERE goal_id = NEW.goal_id AND quarter_phase = latest_quarter;

    UPDATE public.goals
    SET actual_achievement = latest_record.actual_achievement,
        progress_status = latest_record.progress_status,
        updated_at = now()
    WHERE id = NEW.goal_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tg_sync_latest_quarter ON public.goal_quarterly_progress;
CREATE TRIGGER tg_sync_latest_quarter
AFTER INSERT OR UPDATE ON public.goal_quarterly_progress
FOR EACH ROW EXECUTE FUNCTION public.fn_sync_latest_quarter_to_goals();

-- 6. Update cascade trigger to create quarterly records for children
CREATE OR REPLACE FUNCTION public.fn_cascade_shared_goals_with_quarter()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_goal_id IS NULL
    AND (NEW.actual_achievement IS DISTINCT FROM OLD.actual_achievement
         OR NEW.progress_status IS DISTINCT FROM OLD.progress_status)
  THEN
    -- Sync current state to children
    UPDATE public.goals
    SET actual_achievement = NEW.actual_achievement,
        progress_status = NEW.progress_status
    WHERE parent_goal_id = NEW.id;

    -- Auto-apply to quarterly progress for all quarters for child goals
    INSERT INTO public.goal_quarterly_progress (goal_id, quarter_phase, actual_achievement, progress_status, submitted_by)
    SELECT g.id, qp.quarter_phase, NEW.actual_achievement, NEW.progress_status, NEW.id
    FROM public.goals g
    CROSS JOIN (SELECT unnest(ARRAY['Q1', 'Q2', 'Q3', 'Q4_Annual']::public.quarter_phase[]) AS quarter_phase) qp
    WHERE g.parent_goal_id = NEW.id
    ON CONFLICT (goal_id, quarter_phase) DO UPDATE
    SET actual_achievement = EXCLUDED.actual_achievement,
        progress_status = EXCLUDED.progress_status,
        submitted_at = now(),
        submitted_by = EXCLUDED.submitted_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tg_cascade_shared_goals ON public.goals;
CREATE TRIGGER tg_cascade_shared_goals
AFTER UPDATE ON public.goals
FOR EACH ROW EXECUTE FUNCTION public.fn_cascade_shared_goals_with_quarter();

-- 7. RLS policies for quarterly progress table
ALTER TABLE public.goal_quarterly_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS qp_select ON public.goal_quarterly_progress;
CREATE POLICY qp_select ON public.goal_quarterly_progress
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.goals g
      JOIN public.goal_sheets gs ON gs.id = g.goal_sheet_id
      WHERE g.id = goal_id
        AND (gs.employee_id = auth.uid()
             OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND manager_id = gs.employee_id)
             OR (SELECT role FROM public.profiles WHERE id = auth.uid()) IN ('admin', 'manager'))
    )
  );

DROP POLICY IF EXISTS qp_insert ON public.goal_quarterly_progress;
CREATE POLICY qp_insert ON public.goal_quarterly_progress
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.goals g
      JOIN public.goal_sheets gs ON gs.id = g.goal_sheet_id
      WHERE g.id = goal_id AND gs.employee_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS qp_update ON public.goal_quarterly_progress;
CREATE POLICY qp_update ON public.goal_quarterly_progress
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.goals g
      JOIN public.goal_sheets gs ON gs.id = g.goal_sheet_id
      WHERE g.id = goal_id AND gs.employee_id = auth.uid()
    )
  );

-- 8. Helper function to check if prior quarter is locked
DROP FUNCTION IF EXISTS public.fn_can_submit_quarter(UUID, public.quarter_phase);

CREATE FUNCTION public.fn_can_submit_quarter(p_employee_id UUID, p_target_quarter public.quarter_phase)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_quarter_order INTEGER;
  v_prior_quarter public.quarter_phase;
  v_sheet_status public.sheet_status;
BEGIN
  CASE p_target_quarter
    WHEN 'Q1' THEN v_quarter_order := 1;
    WHEN 'Q2' THEN v_quarter_order := 2;
    WHEN 'Q3' THEN v_quarter_order := 3;
    WHEN 'Q4_Annual' THEN v_quarter_order := 4;
  END CASE;

  IF v_quarter_order = 1 THEN
    RETURN TRUE;
  END IF;

  CASE v_quarter_order - 1
    WHEN 1 THEN v_prior_quarter := 'Q1';
    WHEN 2 THEN v_prior_quarter := 'Q2';
    WHEN 3 THEN v_prior_quarter := 'Q3';
  END CASE;

  SELECT gs.status INTO v_sheet_status
  FROM public.goal_sheets gs
  JOIN public.performance_cycles pc ON pc.id = gs.cycle_id
  WHERE gs.employee_id = p_employee_id AND pc.is_active = true
  ORDER BY gs.created_at DESC
  LIMIT 1;

  RETURN v_sheet_status IN ('submitted', 'locked');
END;
$$;

-- 9. Helper view to get goal with latest quarterly data
CREATE OR REPLACE VIEW public.v_goals_with_quarterly_progress AS
SELECT
  g.*,
  qp.quarter_phase AS current_quarter,
  qp.actual_achievement AS current_actual,
  qp.progress_status AS current_progress
FROM public.goals g
LEFT JOIN LATERAL (
  SELECT quarter_phase, actual_achievement, progress_status
  FROM public.goal_quarterly_progress qp
  WHERE qp.goal_id = g.id
  ORDER BY
    CASE qp.quarter_phase
      WHEN 'Q1' THEN 1
      WHEN 'Q2' THEN 2
      WHEN 'Q3' THEN 3
      WHEN 'Q4_Annual' THEN 4
    END DESC
  LIMIT 1
) qp ON true;