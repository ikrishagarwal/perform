-- ============================================================
-- AtomQuest: Populate Mock Data
-- This script assigns an existing manager to up to 2 employees,
-- creates goal sheets for them in the active cycle, and adds mock goals.
--
-- Run this script manually in your Supabase SQL Editor.
-- ============================================================

DO $$
DECLARE
  v_manager_id UUID;
  v_employee_id1 UUID;
  v_employee_id2 UUID;
  v_cycle_id UUID;
  v_sheet_id1 UUID;
  v_sheet_id2 UUID;
BEGIN
  -- 1. Get the first active performance cycle
  SELECT id INTO v_cycle_id FROM public.performance_cycles WHERE is_active = true LIMIT 1;
  IF v_cycle_id IS NULL THEN
    RAISE NOTICE 'No active performance cycle found. Please ensure the initial migration has run.';
    RETURN;
  END IF;

  -- 2. Find a registered user with the 'manager' role
  SELECT id INTO v_manager_id FROM public.profiles WHERE role = 'manager' LIMIT 1;
  IF v_manager_id IS NULL THEN
    RAISE NOTICE 'No manager found in profiles. Please register at least one manager before running this script.';
    RETURN;
  END IF;

  -- 3. Find up to two registered users with the 'employee' role
  SELECT id INTO v_employee_id1 FROM public.profiles WHERE role = 'employee' LIMIT 1 OFFSET 0;
  SELECT id INTO v_employee_id2 FROM public.profiles WHERE role = 'employee' LIMIT 1 OFFSET 1;

  -- 4. Populate Data for Employee 1
  IF v_employee_id1 IS NOT NULL THEN
    -- Assign the manager
    UPDATE public.profiles SET manager_id = v_manager_id WHERE id = v_employee_id1;
    
    -- Clear any existing sheet for this employee/cycle (cascades to goals)
    DELETE FROM public.goal_sheets WHERE employee_id = v_employee_id1 AND cycle_id = v_cycle_id;

    -- Create a new goal sheet in 'submitted' state
    INSERT INTO public.goal_sheets (employee_id, cycle_id, status) 
    VALUES (v_employee_id1, v_cycle_id, 'submitted')
    RETURNING id INTO v_sheet_id1;

    -- Insert mock goals
    INSERT INTO public.goals (goal_sheet_id, thrust_area, title, description, uom, target_value, weightage, actual_achievement, progress_status)
    VALUES 
    (v_sheet_id1, 'Strategic', 'Implement AI Support Triage', 'Deploy ML-based ticket classification reducing manual routing by 80%.', 'numeric_min', '80', 30, '52', 'on_track'),
    (v_sheet_id1, 'Operational', 'Reduce Ticket Resolution Time', 'Drive average first-response time from 4h to under 2h.', 'numeric_max', '2', 25, '3.2', 'on_track'),
    (v_sheet_id1, 'Development', 'Complete Advanced Data Analytics Cert', 'Achieve Google Professional Data Analytics certification.', 'numeric_min', '100', 15, null, 'not_started'),
    (v_sheet_id1, 'Revenue Growth', 'Increase Enterprise ARR', 'Targeting new mid-market segments in EMEA.', 'numeric_min', '2500000', 30, '2100000', 'on_track');
  END IF;

  -- 5. Populate Data for Employee 2 (if exists)
  IF v_employee_id2 IS NOT NULL THEN
    -- Assign the manager
    UPDATE public.profiles SET manager_id = v_manager_id WHERE id = v_employee_id2;
    
    -- Clear any existing sheet for this employee/cycle
    DELETE FROM public.goal_sheets WHERE employee_id = v_employee_id2 AND cycle_id = v_cycle_id;

    -- Create a new goal sheet in 'locked' state
    INSERT INTO public.goal_sheets (employee_id, cycle_id, status) 
    VALUES (v_employee_id2, v_cycle_id, 'locked')
    RETURNING id INTO v_sheet_id2;

    -- Insert mock goals
    INSERT INTO public.goals (goal_sheet_id, thrust_area, title, description, uom, target_value, weightage, actual_achievement, progress_status)
    VALUES 
    (v_sheet_id2, 'Revenue Growth', 'Launch V2 Product Platform', 'Complete migration of legacy users to new infrastructure.', 'numeric_min', '100', 40, '65', 'on_track'),
    (v_sheet_id2, 'Operational Efficiency', 'Reduce Infrastructure Latency', 'Reduce infrastructure latency across primary databases.', 'numeric_max', '120', 35, '95', 'on_track'),
    (v_sheet_id2, 'Customer Success', 'Improve NPS Score', 'Boost NPS from 42 to 65 through proactive customer engagement.', 'numeric_min', '65', 25, '58', 'on_track');
  END IF;

  RAISE NOTICE 'Mock data population complete.';
END $$;
