---

## description: Database Schema and API Design Skill File for Antigravity Coding Agent

# Antigravity Skill: Database Architecture & API Contract Specification

**Domain:** In-House Goal Setting & Tracking Portal

**Stack:** Next.js App Router (TypeScript) + Supabase (PostgreSQL)

**UI:** Bold Typography / Editorial Data Edition

This file defines the immutable schemas, validation layers, and constraints to prevent code drift and ensure functional compliance.

---

## 1. Relational Database Architecture (Supabase / PostgreSQL)

### 1.1 Database Schema Script (`supabase/migrations/20260516000000_initial_schema.sql`)

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE public.app_role AS ENUM ('employee', 'manager', 'admin');
CREATE TYPE public.sheet_status AS ENUM ('draft', 'submitted', 'locked');
CREATE TYPE public.uom_type AS ENUM ('numeric_min', 'numeric_max', 'timeline', 'zero_based');
CREATE TYPE public.goal_status AS ENUM ('not_started', 'on_track', 'completed');

CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role public.app_role NOT NULL DEFAULT 'employee'::public.app_role,
    manager_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.goal_sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    cycle_year INT NOT NULL DEFAULT 2026,
    status public.sheet_status NOT NULL DEFAULT 'draft'::public.sheet_status,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_employee_cycle_year UNIQUE (employee_id, cycle_year)
);

CREATE TABLE public.goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_sheet_id UUID NOT NULL REFERENCES public.goal_sheets(id) ON DELETE CASCADE,
    thrust_area TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    uom public.uom_type NOT NULL,
    target_value TEXT NOT NULL,
    weightage INT NOT NULL CONSTRAINT check_minimum_individual_weightage CHECK (weightage >= 10),
    actual_achievement TEXT DEFAULT NULL,
    progress_status public.goal_status NOT NULL DEFAULT 'not_started'::public.goal_status,
    parent_goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.checkin_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_sheet_id UUID NOT NULL REFERENCES public.goal_sheets(id) ON DELETE CASCADE,
    manager_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    quarter_phase TEXT NOT NULL CONSTRAINT check_valid_quarter CHECK (quarter_phase IN ('Q1', 'Q2', 'Q3', 'Q4_Annual')),
    comment_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL,
    modified_by UUID NOT NULL REFERENCES public.profiles(id),
    action_type TEXT NOT NULL DEFAULT 'POST_LOCK_UPDATE',
    changed_fields JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: Enforce Max 8 Goals and Total Weightage Balance (= 100%) on Submission
CREATE OR REPLACE FUNCTION public.fn_validate_goal_sheet_submission() RETURNS TRIGGER AS $$
DECLARE v_goal_count INT; v_total_weight INT;
BEGIN
    IF NEW.status = 'submitted'::public.sheet_status AND OLD.status = 'draft'::public.sheet_status THEN
        SELECT COUNT(*), COALESCE(SUM(weightage), 0) INTO v_goal_count, v_total_weight FROM public.goals WHERE goal_sheet_id = NEW.id;
        IF v_goal_count > 8 THEN RAISE EXCEPTION 'CRITICAL_ERROR: Submissions are strictly capped at a maximum of 8 goals. Current count: %', v_goal_count; END IF;
        IF v_total_weight != 100 THEN RAISE EXCEPTION 'CRITICAL_ERROR: Cumulative goal sheet weightage must equal exactly 100%%. Current calculation: %%%%', v_total_weight; END IF;
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tg_enforce_submission_rules BEFORE UPDATE ON public.goal_sheets FOR EACH ROW EXECUTE FUNCTION public.fn_validate_goal_sheet_submission();

-- Trigger: Shared Goals Cascade Sync Engine
CREATE OR REPLACE FUNCTION public.fn_sync_shared_goals_progress() RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.actual_achievement IS DISTINCT FROM OLD.actual_achievement OR NEW.progress_status IS DISTINCT FROM OLD.progress_status) AND NEW.parent_goal_id IS NULL THEN
        UPDATE public.goals SET actual_achievement = NEW.actual_achievement, progress_status = NEW.progress_status, updated_at = NOW() WHERE parent_goal_id = NEW.id;
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tg_cascade_shared_goals AFTER UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.fn_sync_shared_goals_progress();

-- Trigger: Enforce Post-Lock Immutable Logging
CREATE OR REPLACE FUNCTION public.fn_audit_locked_goal_mutations() RETURNS TRIGGER AS $$
DECLARE v_current_status public.sheet_status; v_diff JSONB;
BEGIN
    SELECT status INTO v_current_status FROM public.goal_sheets WHERE id = OLD.goal_sheet_id;
    IF v_current_status = 'locked'::public.sheet_status THEN
        v_diff := jsonb_build_object('fields', jsonb_build_object('title', jsonb_build_object('old', OLD.title, 'new', NEW.title), 'target_value', jsonb_build_object('old', OLD.target_value, 'new', NEW.target_value), 'weightage', jsonb_build_object('old', OLD.weightage, 'new', NEW.weightage), 'actual_achievement', jsonb_build_object('old', OLD.actual_achievement, 'new', NEW.actual_achievement)), 'timestamp', NOW());
        INSERT INTO public.audit_logs (goal_id, modified_by, action_type, changed_fields) VALUES (OLD.id, auth.uid(), 'POST_LOCK_OVERRIDE_EXECUTION', v_diff);
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tg_audit_locked_mutations AFTER UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.fn_audit_locked_goal_mutations();

-- RLS Policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goal_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are readable by authenticated users" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins have full write permissions on profiles" ON public.profiles FOR ALL TO authenticated USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Employees can manage their own sheets" ON public.goal_sheets FOR ALL TO authenticated USING (employee_id = auth.uid()) WITH CHECK (employee_id = auth.uid());
CREATE POLICY "Managers can read and evaluate direct report sheets" ON public.goal_sheets FOR SELECT OR UPDATE TO authenticated USING (employee_id IN (SELECT id FROM public.profiles WHERE manager_id = auth.uid()));
CREATE POLICY "Admins have complete global bypass on goal sheets" ON public.goal_sheets FOR ALL TO authenticated USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Goals inherit read access from parent sheets" ON public.goals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Employees can write to goals only if parent sheet status is draft" ON public.goals FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.goal_sheets WHERE id = goals.goal_sheet_id AND employee_id = auth.uid() AND status = 'draft'));
CREATE POLICY "Managers can inline edit goals during submission phase" ON public.goals FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.goal_sheets WHERE id = goals.goal_sheet_id AND employee_id IN (SELECT id FROM public.profiles WHERE manager_id = auth.uid()) AND status = 'submitted'));
CREATE POLICY "Admins can override locked goals" ON public.goals FOR UPDATE TO authenticated USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

```

---

## 2. Strict API Contract & Type Architecture (TypeScript / Next.js Actions)

### 2.1 Domain Data Models (`types/schema.ts`)

```typescript
export type AppRole = 'employee' | 'manager' | 'admin';
export type SheetStatus = 'draft' | 'submitted' | 'locked';
export type UomType = 'numeric_min' | 'numeric_max' | 'timeline' | 'zero_based';
export type GoalStatus = 'not_started' | 'on_track' | 'completed';

export interface DbProfile { id: string; full_name: string; role: AppRole; manager_id: string | null; created_at: string; updated_at: string; }
export interface DbGoalSheet { id: string; employee_id: string; cycle_year: number; status: SheetStatus; created_at: string; updated_at: string; }
export interface DbGoal { id: string; goal_sheet_id: string; thrust_area: string; title: string; description: string; uom: UomType; target_value: string; weightage: number; actual_achievement: string | null; progress_status: GoalStatus; parent_goal_id: string | null; created_at: string; updated_at: string; }

```

### 2.2 Functional Operations Payload Contracts (`types/api.ts`)

```typescript
import { UomType, GoalStatus, SheetStatus } from './schema';

export interface CreateGoalPayload { goal_sheet_id: string; thrust_area: string; title: string; description: string; uom: UomType; target_value: string; weightage: number; }
export interface UpdateGoalInlinePayload { goal_id: string; title?: string; description?: string; target_value?: string; weightage?: number; }
export interface LogQuarterlyActualPayload { goal_id: string; actual_achievement: string; progress_status: GoalStatus; }
export interface ManagerReviewActionPayload { goal_sheet_id: string; action: 'approve' | 'return_rework'; comment?: string; quarter_phase?: 'Q1' | 'Q2' | 'Q3' | 'Q4_Annual'; }
export interface ServerActionResponse<T> { success: boolean; data: T | null; error: { code: 'UNAUTHORIZED' | 'VALIDATION_FAILED' | 'LIMIT_EXCEEDED' | 'TRANSACTION_FAILED'; message: string; details?: any; } | null; }

```

### 2.3 Dynamic Algorithmic Progress Calculator

Formulas for scoring metrics are computed dynamically using these specified mathematical principles:

* **Numeric MIN** (Higher is better):

$$\text{Progress} = \left( \frac{\text{Actual Achievement}}{\text{Planned Target}} \right) \times 100$$


* **Numeric MAX** (Lower is better):

$$\text{Progress} = \left( \frac{\text{Planned Target}}{\text{Actual Achievement}} \right) \times 100$$


* **Zero-Based Target** (Perfect compliance at zero):

$$\text{Progress} = \begin{cases} 100\%, & \text{if Actual Achievement} = 0 \\ 0\%, & \text{otherwise} \end{cases}$$



```typescript
export function calculateDynamicProgress(uom: UomType, target: string, actual: string | null): number {
  if (!actual || actual.trim() === '') return 0;
  const targetNum = parseFloat(target), actualNum = parseFloat(actual);

  if (isNaN(targetNum) || isNaN(actualNum)) {
    if (uom === 'timeline') {
      const targetDate = new Date(target).getTime(), actualDate = new Date(actual).getTime();
      if (isNaN(targetDate) || isNaN(actualDate)) return 0;
      return actualDate <= targetDate ? 100 : 0;
    }
    return 0;
  }

  switch (uom) {
    case 'numeric_min': return targetNum <= 0 ? 0 : Math.min(Math.round((actualNum / targetNum) * 100), 100);
    case 'numeric_max': return actualNum <= 0 ? 0 : Math.min(Math.round((targetNum / actualNum) * 100), 100);
    case 'zero_based': return actualNum === 0 ? 100 : 0;
    default: return 0;
  }
}

```

---

## 3. Strict Backend Validation Rules Middleware Matrix

The Server Actions layer mirrors database logic using this helper before executing state mutations:

```typescript
export interface LocalSheetValidationResult { passed: boolean; totalWeightage: number; goalCount: number; errorMessages: string[]; }

export function validateGoalSheetLocal(goals: { weightage: number }[]): LocalSheetValidationResult {
  const result: LocalSheetValidationResult = { passed: true, totalWeightage: 0, goalCount: goals.length, errorMessages: [] };

  if (result.goalCount > 8) {
    result.passed = false;
    result.errorMessages.push(`CAPPED_VOLUME: Sheet contains ${result.goalCount} goals. A maximum of 8 is allowed.`);
  }

  result.totalWeightage = goals.reduce((acc, current) => {
    if (current.weightage < 10) {
      result.passed = false;
      result.errorMessages.push(`MINIMUM_FLOOR_VIOLATION: Individual goal found below the mandatory 10% weightage minimum.`);
    }
    return acc + current.weightage;
  }, 0);

  if (result.totalWeightage !== 100) {
    result.passed = false;
    result.errorMessages.push(`WEIGHTAGE_MISMATCH: Total sheet weightage must equal exactly 100%. Current sum: ${result.totalWeightage}%`);
  }

  return result;
}

```

---

## 4. Operational Execution Guidelines for Antigravity

When modifying, generating, or verifying code, the agent must enforce these exact behaviors:

1. **Verify Shared KPI Isolation Rules:** For inherited goals (`parent_goal_id !== null`), fields for `title`, `description`, `uom`, and `target_value` must be HTML `disabled` or `read-only`. Employees can only mutate row `weightage`.
2. **Handle Multi-Persona Switching Overrides Safely:** In local dev/hackathon modes, link the custom user selector toolbar directly to state context. This dynamically adjusts the Supabase metadata role flags, eliminating sign-out friction when testing different roles.
3. **Audit Rule Integrity:** Server Actions must never bypass database validation triggers. Administrative status resets (`locked` back to `draft`) must route exclusively through audited administrative clients.