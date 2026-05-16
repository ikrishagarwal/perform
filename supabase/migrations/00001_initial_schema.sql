-- ============================================================
-- AtomQuest: Goal Setting & Tracking Portal
-- Master Database Migration — Enums, Tables, Constraints,
-- Triggers, Functions, and Row-Level Security Policies
-- ============================================================

-- ─── 1. CUSTOM ENUM TYPES ───────────────────────────────────
CREATE TYPE public.app_role AS ENUM ('employee', 'manager', 'admin');
CREATE TYPE public.sheet_status AS ENUM ('draft', 'submitted', 'locked');
CREATE TYPE public.uom_type AS ENUM ('numeric_min', 'numeric_max', 'timeline', 'zero_based');
CREATE TYPE public.goal_progress AS ENUM ('not_started', 'on_track', 'completed');
CREATE TYPE public.quarter_phase AS ENUM ('Q1', 'Q2', 'Q3', 'Q4_Annual');

-- ─── 2. CORE TABLES ─────────────────────────────────────────

-- 2a. Profiles — extends Supabase auth.users
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT        NOT NULL,
  role        public.app_role NOT NULL DEFAULT 'employee',
  manager_id  UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  title       TEXT        NOT NULL DEFAULT '',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2b. Performance Cycles — defines annual calendar windows
CREATE TABLE public.performance_cycles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cycle_year      INT  NOT NULL UNIQUE,
  goal_setting_start DATE NOT NULL,
  goal_setting_end   DATE NOT NULL,
  q1_start        DATE NOT NULL,
  q1_end          DATE NOT NULL,
  q2_start        DATE NOT NULL,
  q2_end          DATE NOT NULL,
  q3_start        DATE NOT NULL,
  q3_end          DATE NOT NULL,
  q4_start        DATE NOT NULL,
  q4_end          DATE NOT NULL,
  is_active       BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2c. Goal Sheets — one per employee per cycle
CREATE TABLE public.goal_sheets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  cycle_id      UUID NOT NULL REFERENCES public.performance_cycles(id) ON DELETE CASCADE,
  status        public.sheet_status NOT NULL DEFAULT 'draft',
  submitted_at  TIMESTAMPTZ,
  approved_at   TIMESTAMPTZ,
  approved_by   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  rejection_feedback TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, cycle_id)
);

-- 2d. Goals — individual goal rows within a sheet
CREATE TABLE public.goals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_sheet_id     UUID NOT NULL REFERENCES public.goal_sheets(id) ON DELETE CASCADE,
  thrust_area       TEXT NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  uom               public.uom_type NOT NULL,
  target_value      TEXT NOT NULL,
  weightage         INT NOT NULL,
  actual_achievement TEXT,
  progress_status   public.goal_progress NOT NULL DEFAULT 'not_started',
  parent_goal_id    UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  sort_order        INT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Floor constraint: each goal must carry at least 10% weight
  CONSTRAINT chk_weightage_floor CHECK (weightage >= 10),
  -- Ceiling: weight cannot exceed 100%
  CONSTRAINT chk_weightage_ceiling CHECK (weightage <= 100)
);

-- 2e. Check-in Comments — manager feedback per quarter
CREATE TABLE public.checkin_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_sheet_id   UUID NOT NULL REFERENCES public.goal_sheets(id) ON DELETE CASCADE,
  manager_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  quarter_phase   public.quarter_phase NOT NULL,
  comment_text    TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (goal_sheet_id, manager_id, quarter_phase)
);

-- 2f. Audit Logs — immutable post-lock change ledger
CREATE TABLE public.audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id       UUID NOT NULL REFERENCES public.goals(id) ON DELETE CASCADE,
  goal_sheet_id UUID NOT NULL REFERENCES public.goal_sheets(id) ON DELETE CASCADE,
  modified_by   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  changed_fields JSONB NOT NULL DEFAULT '[]',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 3. INDEXES ─────────────────────────────────────────────
CREATE INDEX idx_profiles_manager   ON public.profiles(manager_id);
CREATE INDEX idx_profiles_role      ON public.profiles(role);
CREATE INDEX idx_goal_sheets_emp    ON public.goal_sheets(employee_id);
CREATE INDEX idx_goal_sheets_cycle  ON public.goal_sheets(cycle_id);
CREATE INDEX idx_goal_sheets_status ON public.goal_sheets(status);
CREATE INDEX idx_goals_sheet        ON public.goals(goal_sheet_id);
CREATE INDEX idx_goals_parent       ON public.goals(parent_goal_id);
CREATE INDEX idx_audit_goal         ON public.audit_logs(goal_id);
CREATE INDEX idx_audit_sheet        ON public.audit_logs(goal_sheet_id);

-- ─── 4. FUNCTIONS & TRIGGERS ────────────────────────────────

-- 4a. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.fn_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'employee')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.fn_handle_new_user();

-- 4b. Updated_at auto-timestamp
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER tg_goal_sheets_updated_at
  BEFORE UPDATE ON public.goal_sheets
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE TRIGGER tg_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- 4c. Goal volume cap — max 8 goals per sheet
CREATE OR REPLACE FUNCTION public.fn_enforce_goal_volume_cap()
RETURNS TRIGGER AS $$
DECLARE
  current_count INT;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM public.goals
  WHERE goal_sheet_id = NEW.goal_sheet_id;

  IF current_count >= 8 THEN
    RAISE EXCEPTION 'Goal volume cap exceeded: maximum 8 goals per sheet.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_goal_volume_cap
  BEFORE INSERT ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.fn_enforce_goal_volume_cap();

-- 4d. Validate 100% weightage on submission
CREATE OR REPLACE FUNCTION public.fn_validate_goal_sheet_submission()
RETURNS TRIGGER AS $$
DECLARE
  total_weight INT;
BEGIN
  IF NEW.status = 'submitted' AND OLD.status = 'draft' THEN
    SELECT COALESCE(SUM(weightage), 0) INTO total_weight
    FROM public.goals
    WHERE goal_sheet_id = NEW.id;

    IF total_weight != 100 THEN
      RAISE EXCEPTION 'Weightage must total exactly 100%%. Current total: %', total_weight;
    END IF;

    NEW.submitted_at = now();
  END IF;

  IF NEW.status = 'locked' AND OLD.status = 'submitted' THEN
    NEW.approved_at = now();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_validate_sheet_submission
  BEFORE UPDATE ON public.goal_sheets
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_goal_sheet_submission();

-- 4e. Shared goal cascade — sync parent actuals to children
CREATE OR REPLACE FUNCTION public.fn_cascade_shared_goals()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_goal_id IS NULL
    AND (NEW.actual_achievement IS DISTINCT FROM OLD.actual_achievement
         OR NEW.progress_status IS DISTINCT FROM OLD.progress_status)
  THEN
    UPDATE public.goals
    SET actual_achievement = NEW.actual_achievement,
        progress_status    = NEW.progress_status
    WHERE parent_goal_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_cascade_shared_goals
  AFTER UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.fn_cascade_shared_goals();

-- 4f. Audit log — capture changes on locked sheets
CREATE OR REPLACE FUNCTION public.fn_audit_locked_mutations()
RETURNS TRIGGER AS $$
DECLARE
  sheet_status public.sheet_status;
  diff JSONB := '[]'::JSONB;
BEGIN
  SELECT gs.status INTO sheet_status
  FROM public.goal_sheets gs
  WHERE gs.id = NEW.goal_sheet_id;

  IF sheet_status = 'locked' THEN
    IF NEW.title IS DISTINCT FROM OLD.title THEN
      diff := diff || jsonb_build_array(jsonb_build_object(
        'field', 'title', 'old_value', OLD.title, 'new_value', NEW.title));
    END IF;
    IF NEW.target_value IS DISTINCT FROM OLD.target_value THEN
      diff := diff || jsonb_build_array(jsonb_build_object(
        'field', 'target_value', 'old_value', OLD.target_value, 'new_value', NEW.target_value));
    END IF;
    IF NEW.weightage IS DISTINCT FROM OLD.weightage THEN
      diff := diff || jsonb_build_array(jsonb_build_object(
        'field', 'weightage', 'old_value', OLD.weightage, 'new_value', NEW.weightage));
    END IF;
    IF NEW.actual_achievement IS DISTINCT FROM OLD.actual_achievement THEN
      diff := diff || jsonb_build_array(jsonb_build_object(
        'field', 'actual_achievement', 'old_value', OLD.actual_achievement, 'new_value', NEW.actual_achievement));
    END IF;
    IF NEW.progress_status IS DISTINCT FROM OLD.progress_status THEN
      diff := diff || jsonb_build_array(jsonb_build_object(
        'field', 'progress_status', 'old_value', OLD.progress_status::TEXT, 'new_value', NEW.progress_status::TEXT));
    END IF;

    IF jsonb_array_length(diff) > 0 THEN
      INSERT INTO public.audit_logs (goal_id, goal_sheet_id, modified_by, changed_fields)
      VALUES (NEW.id, NEW.goal_sheet_id, auth.uid(), diff);
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tg_audit_locked_mutations
  AFTER UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_locked_mutations();

-- ─── 5. ROW-LEVEL SECURITY ─────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_cycles ENABLE ROW LEVEL SECURITY;

-- Helper: get current user role
CREATE OR REPLACE FUNCTION public.fn_get_my_role()
RETURNS public.app_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if user manages a given employee
CREATE OR REPLACE FUNCTION public.fn_is_manager_of(emp_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = emp_id AND manager_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 5a. Profiles policies
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT USING (true);  -- everyone can read profiles

CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE USING (id = auth.uid());

-- 5b. Performance cycles — everyone reads, admin writes
CREATE POLICY cycles_select ON public.performance_cycles
  FOR SELECT USING (true);

CREATE POLICY cycles_admin_all ON public.performance_cycles
  FOR ALL USING (public.fn_get_my_role() = 'admin');

-- 5c. Goal sheets policies
CREATE POLICY sheets_select_own ON public.goal_sheets
  FOR SELECT USING (
    employee_id = auth.uid()
    OR public.fn_is_manager_of(employee_id)
    OR public.fn_get_my_role() = 'admin'
  );

CREATE POLICY sheets_insert_own ON public.goal_sheets
  FOR INSERT WITH CHECK (employee_id = auth.uid());

CREATE POLICY sheets_update ON public.goal_sheets
  FOR UPDATE USING (
    (employee_id = auth.uid() AND status = 'draft')
    OR public.fn_is_manager_of(employee_id)
    OR public.fn_get_my_role() = 'admin'
  );

-- 5d. Goals policies
CREATE POLICY goals_select ON public.goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.goal_sheets gs
      WHERE gs.id = goal_sheet_id
        AND (gs.employee_id = auth.uid()
             OR public.fn_is_manager_of(gs.employee_id)
             OR public.fn_get_my_role() = 'admin')
    )
  );

CREATE POLICY goals_insert ON public.goals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.goal_sheets gs
      WHERE gs.id = goal_sheet_id
        AND gs.employee_id = auth.uid()
        AND gs.status = 'draft'
    )
  );

CREATE POLICY goals_update_employee ON public.goals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.goal_sheets gs
      WHERE gs.id = goal_sheet_id
        AND gs.employee_id = auth.uid()
        AND gs.status IN ('draft', 'locked')
    )
  );

CREATE POLICY goals_update_manager ON public.goals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.goal_sheets gs
      WHERE gs.id = goal_sheet_id
        AND public.fn_is_manager_of(gs.employee_id)
    )
  );

CREATE POLICY goals_update_admin ON public.goals
  FOR UPDATE USING (public.fn_get_my_role() = 'admin');

CREATE POLICY goals_delete ON public.goals
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.goal_sheets gs
      WHERE gs.id = goal_sheet_id
        AND gs.employee_id = auth.uid()
        AND gs.status = 'draft'
    )
  );

-- 5e. Checkin comments
CREATE POLICY checkin_select ON public.checkin_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.goal_sheets gs
      WHERE gs.id = goal_sheet_id
        AND (gs.employee_id = auth.uid()
             OR public.fn_is_manager_of(gs.employee_id)
             OR public.fn_get_my_role() = 'admin')
    )
  );

CREATE POLICY checkin_insert ON public.checkin_comments
  FOR INSERT WITH CHECK (
    manager_id = auth.uid()
    AND (public.fn_get_my_role() = 'manager' OR public.fn_get_my_role() = 'admin')
  );

-- 5f. Audit logs — read-only for admin
CREATE POLICY audit_select ON public.audit_logs
  FOR SELECT USING (public.fn_get_my_role() = 'admin');

-- ─── 6. SEED: DEFAULT PERFORMANCE CYCLE ─────────────────────
INSERT INTO public.performance_cycles
  (cycle_year, goal_setting_start, goal_setting_end,
   q1_start, q1_end, q2_start, q2_end,
   q3_start, q3_end, q4_start, q4_end, is_active)
VALUES
  (2026, '2026-05-01', '2026-05-31',
   '2026-07-01', '2026-07-31',
   '2026-10-01', '2026-10-31',
   '2027-01-01', '2027-01-31',
   '2027-03-01', '2027-04-30',
   true);
