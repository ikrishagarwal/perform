"use server";

/* ─────────────────────────────────────────────────────────────
   employee.actions.ts — Server Actions for Employee Quarterly
   Check-ins and Progress Tracking
   ───────────────────────────────────────────────────────────── */

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GoalQuarterlyProgress, GoalProgress, QuarterPhase, Goal, GoalWithQuarterlyHistory, Database, PerformanceCycle } from "@/lib/database.types";

interface CheckinValidation {
  canSubmit: boolean;
  reason?: string;
  priorQuarterStatus?: string;
}

export async function getQuarterlyCheckins(goalId: string): Promise<GoalQuarterlyProgress[]> {
  const db = await createServerClient();

  const { data, error } = await db
    .from("goal_quarterly_progress")
    .select("*")
    .eq("goal_id", goalId)
    .order("submitted_at", { ascending: true });

  if (error) throw new Error(`Failed to fetch quarterly check-ins: ${error.message}`);
  return (data as GoalQuarterlyProgress[]) ?? [];
}

export async function getGoalWithQuarterlyHistory(goalId: string): Promise<GoalWithQuarterlyHistory | null> {
  const db = await createServerClient();

  const { data: goal, error: goalErr } = await db
    .from("goals")
    .select("*")
    .eq("id", goalId)
    .single();

  if (goalErr) throw new Error(`Failed to fetch goal: ${goalErr.message}`);

  const { data: progress, error: progressErr } = await db
    .from("goal_quarterly_progress")
    .select("*")
    .eq("goal_id", goalId)
    .order("submitted_at", { ascending: true });

  if (progressErr) throw new Error(`Failed to fetch quarterly progress: ${progressErr.message}`);

  return {
    ...(goal as Goal),
    quarterly_progress: (progress as GoalQuarterlyProgress[]) ?? [],
  };
}

export async function canSubmitCheckin(employeeId: string, targetQuarter: QuarterPhase): Promise<CheckinValidation> {
  const db = createAdminClient();

  const { data: validationResult, error } = await db.rpc("fn_can_submit_quarter", {
    p_employee_id: employeeId,
    p_target_quarter: targetQuarter,
  } as any);

  if (error) {
    console.error("Validation error:", error);
    return { canSubmit: true };
  }

  if (!validationResult) {
    return {
      canSubmit: false,
      reason: `You must have submitted your goal sheet for the prior quarter before submitting ${targetQuarter} progress.`,
    };
  }

  return { canSubmit: true };
}

export async function getCurrentQuarterForEmployee(_employeeId: string): Promise<QuarterPhase | null> {
  const db = await createServerClient();

  const result = await db
    .from("performance_cycles")
    .select("q1_start, q1_end, q2_start, q2_end, q3_start, q3_end, q4_start, q4_end")
    .eq("is_active", true)
    .single();

  const cycle = result.data as PerformanceCycle | null;
  if (!cycle) return null;

  const now = new Date();

  if (now >= new Date(cycle.q1_start) && now <= new Date(cycle.q1_end)) return "Q1";
  if (now >= new Date(cycle.q2_start) && now <= new Date(cycle.q2_end)) return "Q2";
  if (now >= new Date(cycle.q3_start) && now <= new Date(cycle.q3_end)) return "Q3";
  if (now >= new Date(cycle.q4_start) && now <= new Date(cycle.q4_end)) return "Q4_Annual";

  return null;
}

export async function submitQuarterlyCheckin(
  goalId: string,
  quarter: QuarterPhase,
  actualAchievement: string,
  progressStatus: GoalProgress,
  submittedBy: string
): Promise<GoalQuarterlyProgress> {
  const db = createAdminClient();

  // First try to update, if not found then insert
  const { data: existing } = await db
    .from("goal_quarterly_progress")
    .select("id")
    .eq("goal_id", goalId)
    .eq("quarter_phase", quarter)
    .maybeSingle() as { data: { id: string } | null };

  let result: { data: GoalQuarterlyProgress | null; error: Error | null };

  if (existing) {
    // Update existing
    const { data, error } = await (db.from("goal_quarterly_progress") as any)
      .update({
        actual_achievement: actualAchievement,
        progress_status: progressStatus,
        submitted_by: submittedBy,
      })
      .eq("goal_id", goalId)
      .eq("quarter_phase", quarter)
      .select()
      .single();
    result = { data: data as GoalQuarterlyProgress | null, error: error as Error | null };
  } else {
    // Insert new
    const { data, error } = await (db.from("goal_quarterly_progress") as any)
      .insert({
        goal_id: goalId,
        quarter_phase: quarter,
        actual_achievement: actualAchievement,
        progress_status: progressStatus,
        submitted_by: submittedBy,
      })
      .select()
      .single();
    result = { data: data as GoalQuarterlyProgress | null, error: error as Error | null };
  }

  if (result.error) throw new Error(`Failed to submit quarterly check-in: ${result.error.message}`);
  if (!result.data) throw new Error("Failed to submit quarterly check-in: no data returned");
  return result.data;
}

export async function getGoalsWithQuarterlyProgressForSheet(sheetId: string): Promise<GoalWithQuarterlyHistory[]> {
  const db = await createServerClient();

  const { data: goals, error } = await db
    .from("goals")
    .select("*")
    .eq("goal_sheet_id", sheetId)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(`Failed to fetch goals: ${error.message}`);
  if (!goals) return [];

  const goalIds = (goals as Goal[]).map((g) => g.id);

  const { data: allProgress, error: progressErr } = await db
    .from("goal_quarterly_progress")
    .select("*")
    .in("goal_id", goalIds)
    .order("submitted_at", { ascending: true });

  if (progressErr) throw new Error(`Failed to fetch quarterly progress: ${progressErr.message}`);

  const progressMap = new Map<string, GoalQuarterlyProgress[]>();
  for (const p of (allProgress as GoalQuarterlyProgress[]) ?? []) {
    const arr = progressMap.get(p.goal_id) ?? [];
    arr.push(p);
    progressMap.set(p.goal_id, arr);
  }

  return (goals as Goal[]).map((g) => ({
    ...g,
    quarterly_progress: progressMap.get(g.id) ?? [],
  })) as GoalWithQuarterlyHistory[];
}

export async function getQuarterlyProgressAggregate(
  employeeId: string,
  quarter: QuarterPhase
): Promise<{ totalGoals: number; completedGoals: number; onTrackGoals: number; notStartedGoals: number }> {
  const db = await createServerClient();

  const { data: progress, error } = await db
    .from("goal_quarterly_progress")
    .select("progress_status")
    .eq("submitted_by", employeeId)
    .eq("quarter_phase", quarter);

  if (error) throw new Error(`Failed to fetch aggregate: ${error.message}`);

  const progressData = progress as { progress_status: GoalProgress }[];
  const total = progressData.length;
  const completed = progressData.filter((p) => p.progress_status === "completed").length;
  const onTrack = progressData.filter((p) => p.progress_status === "on_track").length;
  const notStarted = progressData.filter((p) => p.progress_status === "not_started").length;

  return {
    totalGoals: total,
    completedGoals: completed,
    onTrackGoals: onTrack,
    notStartedGoals: notStarted,
  };
}