-- ============================================================
-- RLS Hardening Migration
-- - Add WITH CHECK guards to UPDATE policies
-- - Restrict manager check-in inserts to direct reports only
-- ============================================================

-- Goal Sheets: enforce post-update row validity
DROP POLICY IF EXISTS sheets_update ON public.goal_sheets;

CREATE POLICY sheets_update ON public.goal_sheets
  FOR UPDATE
  USING (
    (employee_id = auth.uid() AND status = 'draft')
    OR public.fn_is_manager_of(employee_id)
    OR public.fn_get_my_role() = 'admin'
  )
  WITH CHECK (
    (employee_id = auth.uid() AND status = 'draft')
    OR public.fn_is_manager_of(employee_id)
    OR public.fn_get_my_role() = 'admin'
  );

-- Goals: enforce post-update row validity
DROP POLICY IF EXISTS goals_update_employee ON public.goals;
DROP POLICY IF EXISTS goals_update_manager ON public.goals;
DROP POLICY IF EXISTS goals_update_admin ON public.goals;

CREATE POLICY goals_update_employee ON public.goals
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.goal_sheets gs
      WHERE gs.id = goal_sheet_id
        AND gs.employee_id = auth.uid()
        AND gs.status IN ('draft', 'locked', 'submitted')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.goal_sheets gs
      WHERE gs.id = goal_sheet_id
        AND gs.employee_id = auth.uid()
        AND gs.status IN ('draft', 'locked', 'submitted')
    )
  );

CREATE POLICY goals_update_manager ON public.goals
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.goal_sheets gs
      WHERE gs.id = goal_sheet_id
        AND public.fn_is_manager_of(gs.employee_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.goal_sheets gs
      WHERE gs.id = goal_sheet_id
        AND public.fn_is_manager_of(gs.employee_id)
    )
  );

CREATE POLICY goals_update_admin ON public.goals
  FOR UPDATE
  USING (public.fn_get_my_role() = 'admin')
  WITH CHECK (public.fn_get_my_role() = 'admin');

-- Check-in comments: manager can comment only direct reports
DROP POLICY IF EXISTS checkin_insert ON public.checkin_comments;

CREATE POLICY checkin_insert ON public.checkin_comments
  FOR INSERT
  WITH CHECK (
    manager_id = auth.uid()
    AND (
      -- Admin can comment on any sheet
      public.fn_get_my_role() = 'admin'
      OR (
        -- Manager can only comment for direct reports
        public.fn_get_my_role() = 'manager'
        AND EXISTS (
          SELECT 1
          FROM public.goal_sheets gs
          WHERE gs.id = goal_sheet_id
            AND public.fn_is_manager_of(gs.employee_id)
        )
      )
    )
  );
