"use server";

/* ─────────────────────────────────────────────────────────────
   goal-sheet.actions.ts — Server Actions for Goal Sheet CRUD
   ───────────────────────────────────────────────────────────── */

import { createServerClient } from "@/lib/supabase/server";
import type { GoalSheet, GoalSheetWithGoals, SheetStatus } from "@/lib/database.types";

// ─── Fetch active cycle ─────────────────────────────────────
export async function getActiveCycle() {
  const db = await createServerClient();
  const { data, error } = await db
    .from("performance_cycles")
    .select("*")
    .eq("is_active", true)
    .single();

  if (error) throw new Error(`Failed to fetch active cycle: ${error.message}`);
  return data;
}

// ─── Fetch a single goal sheet with its goals ───────────────
export async function getGoalSheet(sheetId: string): Promise<GoalSheetWithGoals> {
  const db = await createServerClient();

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

  return { ...(sheet as any), goals: goals ?? [] } as any;
}

// ─── Fetch or create the employee's sheet for active cycle ──
export async function getOrCreateMySheet(employeeId: string): Promise<GoalSheet> {
  const db = await createServerClient();
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
    .insert({ employee_id: employeeId, cycle_id: cycle.id })
    .select()
    .single();

  if (error) throw new Error(`Failed to create goal sheet: ${error.message}`);
  return created;
}

// ─── Get all sheets for a given cycle (admin / manager) ─────
export async function getSheetsByCycle(cycleId: string): Promise<GoalSheetWithGoals[]> {
  const db = await createServerClient();

  const { data: sheets, error } = await db
    .from("goal_sheets")
    .select("*")
    .eq("cycle_id", cycleId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to fetch sheets: ${error.message}`);
  if (!sheets) return [];

  // Batch-fetch all goals for these sheets
  const sheetIds = sheets.map((s) => s.id);
  const { data: allGoals } = await db
    .from("goals")
    .select("*")
    .in("goal_sheet_id", sheetIds)
    .order("sort_order", { ascending: true });

  const goalMap = new Map<string, typeof allGoals>();
  for (const g of allGoals ?? []) {
    const arr = goalMap.get(g.goal_sheet_id) ?? [];
    arr.push(g);
    goalMap.set(g.goal_sheet_id, arr);
  }

  return (sheets as any[]).map((s) => ({ ...(s as any), goals: goalMap.get(s.id) ?? [] })) as any;
}

// ─── Get sheets for a manager's direct reports (or all for Admin) ──
export async function getTeamSheets(callerId: string): Promise<GoalSheetWithGoals[]> {
  const db = await createServerClient();
  const cycle = await getActiveCycle();

  // 1. Determine which employees to fetch
  const { data: callerProfile } = await db
    .from("profiles")
    .select("role")
    .eq("id", callerId)
    .single();

  let reportIds: string[] = [];

  if (callerProfile?.role === "admin") {
    // Admin: Get all employees
    const { data: allEmps } = await db
      .from("profiles")
      .select("id")
      .eq("role", "employee");
    reportIds = allEmps?.map((r) => r.id) ?? [];
  } else {
    // Manager: Get direct reports only
    const { data: reports } = await db
      .from("profiles")
      .select("id")
      .eq("manager_id", callerId);
    reportIds = reports?.map((r) => r.id) ?? [];
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
  const sheetIds = sheets.map((s) => s.id);
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

  const goalMap = new Map<string, any[]>();
  for (const g of allGoals ?? []) {
    const arr = goalMap.get(g.goal_sheet_id) ?? [];
    arr.push(g);
    goalMap.set(g.goal_sheet_id, arr);
  }

  const profileMap = new Map<string, any>();
  for (const p of profiles ?? []) {
    profileMap.set(p.id, p);
  }

  return (sheets as any[]).map((s) => ({
    ...(s as any),
    goals: goalMap.get(s.id) ?? [],
    employee: profileMap.get(s.employee_id) ?? undefined,
  })) as any;
}

// ─── Update sheet status ────────────────────────────────────
export async function updateSheetStatus(
  sheetId: string,
  status: SheetStatus,
  options?: { rejectionFeedback?: string; approvedBy?: string }
) {
  const db = await createServerClient();

  const update: Record<string, unknown> = { status };
  if (options?.rejectionFeedback !== undefined) {
    update.rejection_feedback = options.rejectionFeedback;
  }
  if (options?.approvedBy) {
    update.approved_by = options.approvedBy;
  }

  const { data, error } = await db
    .from("goal_sheets")
    // @ts-ignore
    .update(update as any)
    .eq("id", sheetId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update sheet status: ${error.message}`);
  return data;
}
