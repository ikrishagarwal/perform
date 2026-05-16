"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

/* ─────────────────────────────────────────────────────────────
   goal-sheet.actions.ts — Server Actions for Goal Sheet CRUD
   ───────────────────────────────────────────────────────────── */

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GoalSheet, GoalSheetWithGoals, SheetStatus, Goal, Profile, PerformanceCycle } from "@/lib/database.types";

// ─── Fetch active cycle ─────────────────────────────────────
export async function getActiveCycle() {
  const db = ((await createServerClient()) as any) as any;
  const { data, error } = await db
    .from("performance_cycles")
    .select("*")
    .eq("is_active", true)
    .single();

  if (error) throw new Error(`Failed to fetch active cycle: ${error.message}`);
  return data as PerformanceCycle;
}

// ─── Fetch a single goal sheet with its goals ───────────────
export async function getGoalSheet(sheetId: string): Promise<GoalSheetWithGoals> {
  const db = (await createServerClient()) as any;

  const { data: sheet, error: sheetErr } = await db
    .from("goal_sheets")
    .select("*")
    .eq("id", sheetId)
    .single();
  if (sheetErr) throw new Error(`Sheet not found: ${sheetErr.message}`);

  const { data: goals, error: goalsErr } = await db
    .from("goals")
    .select("*")
    .eq("goal_sheet_id", sheetId)
    .order("sort_order", { ascending: true });
  if (goalsErr) throw new Error(`Failed to fetch goals: ${goalsErr.message}`);

  return { ...(sheet as GoalSheet), goals: goals ?? [] } as GoalSheetWithGoals;
}

// ─── Fetch or create the employee's sheet for active cycle ──
export async function getOrCreateMySheet(employeeId: string): Promise<GoalSheet> {
  const db = (await createServerClient()) as any;
  const cycle = await getActiveCycle();

  // Try to find existing sheet
  const { data: existing } = await db
    .from("goal_sheets")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("cycle_id", cycle.id)
    .single();

  if (existing) return existing;

  // Create new sheet
  const { data: created, error } = await db
    .from("goal_sheets")
    .insert({ employee_id: employeeId, cycle_id: (cycle as PerformanceCycle).id })
    .select()
    .single();

  if (error) throw new Error(`Failed to create goal sheet: ${error.message}`);
  return created as GoalSheet;
}

// ─── Get all sheets for a given cycle (admin / manager) ─────
export async function getSheetsByCycle(cycleId: string): Promise<GoalSheetWithGoals[]> {
  const db = (await createServerClient()) as any;

  const { data: sheets, error } = await db
    .from("goal_sheets")
    .select("*")
    .eq("cycle_id", cycleId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to fetch sheets: ${error.message}`);
  if (!sheets) return [];

  // Batch-fetch all goals for these sheets
  const sheetIds = sheets.map((s: any) => s.id as string);
  const { data: allGoals } = await db
    .from("goals")
    .select("*")
    .in("goal_sheet_id", sheetIds)
    .order("sort_order", { ascending: true });

  const goalMap = new Map<string, Goal[]>();
  for (const g of (allGoals as Goal[] ?? [])) {
    const arr = goalMap.get(g.goal_sheet_id) ?? [];
    arr.push(g);
    goalMap.set(g.goal_sheet_id, arr);
  }

  return sheets.map((s: any) => ({ ...s, goals: goalMap.get(s.id) ?? [] })) as GoalSheetWithGoals[];
}

// ─── Get sheets for a manager's direct reports (or all for Admin) ──
export async function getTeamSheets(callerId: string): Promise<GoalSheetWithGoals[]> {
  const db = (await createServerClient()) as any;
  const cycle = await getActiveCycle();

  // 1. Determine which employees to fetch
  const { data: callerProfile } = await db
    .from("profiles")
    .select("role")
    .eq("id", callerId)
    .single();
  
  const profile = callerProfile as { role: string } | null;

  let reportIds: string[] = [];

  if (profile?.role === "admin") {
    // Admin: Get all employees
    const { data: allEmps } = await db
      .from("profiles")
      .select("id")
      .eq("role", "employee");
    reportIds = allEmps?.map((r: any) => r.id) ?? [];
  } else {
    // Manager: Get direct reports only
    const { data: reports } = await db
      .from("profiles")
      .select("id")
      .eq("manager_id", callerId);
    reportIds = reports?.map((r: any) => r.id) ?? [];
  }

  if (reportIds.length === 0) return [];

  // 2. Fetch sheets for those employees
  const { data: sheets, error } = await db
    .from("goal_sheets")
    .select("*")
    .eq("cycle_id", cycle.id)
    .in("employee_id", reportIds)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to fetch team sheets: ${error.message}`);
  if (!sheets) return [];

  // 3. Attach goals + employee profiles
  const sheetIds = sheets.map((s: any) => s.id);
  const [{ data: allGoals }, { data: profiles }] = await Promise.all([
    db
      .from("goals")
      .select("*")
      .in("goal_sheet_id", sheetIds)
      .order("sort_order", { ascending: true }),
    db
      .from("profiles")
      .select("*")
      .in("id", reportIds)
  ]);

  const goalMap = new Map<string, Goal[]>();
  for (const g of allGoals ?? []) {
    const arr = goalMap.get(g.goal_sheet_id) ?? [];
    arr.push(g);
    goalMap.set(g.goal_sheet_id, arr);
  }

  const profileMap = new Map<string, Profile>();
  for (const p of profiles ?? []) {
    profileMap.set(p.id, p);
  }

  return (sheets as GoalSheet[]).map((s) => ({
    ...s,
    goals: goalMap.get(s.id) ?? [],
    employee: profileMap.get(s.employee_id) ?? undefined,
  })) as GoalSheetWithGoals[];
}

// ─── Update sheet status ────────────────────────────────────
export async function updateSheetStatus(
  sheetId: string,
  status: SheetStatus,
  options?: { rejectionFeedback?: string; approvedBy?: string }
) {
  const db = createAdminClient() as any;

  const update: Record<string, unknown> = { status };
  if (options?.rejectionFeedback !== undefined) {
    update.rejection_feedback = options.rejectionFeedback;
  }
  if (options?.approvedBy) {
    update.approved_by = options.approvedBy;
  }

  const { data, error } = await db
    .from("goal_sheets")
    .update(update as never)
    .eq("id", sheetId)
    .select()
    .maybeSingle();

  if (error) throw new Error(`Failed to update sheet status: ${error.message}`);
  if (!data) {
    // Row was updated but RLS prevented it from being returned, or ID was invalid.
    // Re-fetch to confirm the update took effect.
    const { data: refetched } = await db
      .from("goal_sheets")
      .select("*")
      .eq("id", sheetId)
      .maybeSingle();
    if (refetched) return refetched;
    throw new Error(`Sheet ${sheetId} not found or not accessible after status update.`);
  }
  return data;
}
