"use server";

/* ─────────────────────────────────────────────────────────────
   goal-sheet.actions.ts — Server Actions for Goal Sheet CRUD
   ───────────────────────────────────────────────────────────── */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import type {
  GoalSheet,
  GoalSheetWithGoals,
  SheetStatus,
  Goal,
  Profile,
  PerformanceCycle,
  Database,
} from "@/lib/database.types";

// ─── Fetch active cycle ─────────────────────────────────────
export async function getActiveCycle() {
  const db = await createServerClient();
  const { data, error } = (await db
    .from("performance_cycles")
    .select("*")
    .eq("is_active", true)
    .single()) as PostgrestSingleResponse<PerformanceCycle>;

  if (error) throw new Error(`Failed to fetch active cycle: ${error.message}`);
  return data!;
}

// ─── Fetch a single goal sheet with its goals ───────────────
export async function getGoalSheet(
  sheetId: string,
): Promise<GoalSheetWithGoals> {
  if (!sheetId || sheetId === "undefined") {
    throw new Error("Invalid sheetId provided to getGoalSheet");
  }
  const db = await createServerClient();

  const { data: sheet, error: sheetErr } = (await (db.from("goal_sheets") as any)
    .select("*")
    .eq("id", sheetId)
    .single()) as PostgrestSingleResponse<GoalSheet>;
  if (sheetErr) throw new Error(`Sheet not found: ${sheetErr.message}`);

  const { data: goals, error: goalsErr } = await (db.from("goals") as any)
    .select("*")
    .eq("goal_sheet_id", sheetId)
    .order("sort_order", { ascending: true });
  if (goalsErr) throw new Error(`Failed to fetch goals: ${goalsErr.message}`);

  return { ...sheet, goals: (goals as Goal[]) ?? [] } as GoalSheetWithGoals;
}

// ─── Fetch or create the employee's sheet for active cycle ──
export async function getOrCreateMySheet(
  employeeId: string,
): Promise<GoalSheet> {
  const db = await createServerClient();
  const cycle = await getActiveCycle();

  // Try to find existing sheet
  const { data: existing } = (await (db.from("goal_sheets") as any)
    .select("*")
    .eq("employee_id", employeeId)
    .eq("cycle_id", cycle.id)
    .maybeSingle()) as PostgrestSingleResponse<GoalSheet>;

  if (existing) return existing;

  // Create new sheet
  const { data: created, error } = (await (db.from("goal_sheets") as any)
    .insert({
      employee_id: employeeId,
      cycle_id: cycle.id,
    } as Database["public"]["Tables"]["goal_sheets"]["Insert"])
    .select()
    .single()) as PostgrestSingleResponse<GoalSheet>;

  if (error) throw new Error(`Failed to create goal sheet: ${error.message}`);
  if (!created) throw new Error("Failed to create goal sheet: No data returned");
  return created;
}

// ─── Get all sheets for a given cycle (admin / manager) ─────
export async function getSheetsByCycle(
  cycleId: string,
): Promise<GoalSheetWithGoals[]> {
  const db = await createServerClient();

  const { data: sheets, error } = await (db.from("goal_sheets") as any)
    .select("*")
    .eq("cycle_id", cycleId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to fetch sheets: ${error.message}`);
  if (!sheets) return [];

  const sheetsArr = sheets as GoalSheet[];

  // Batch-fetch all goals for these sheets
  const sheetIds = sheetsArr.map((s) => s.id);
  const { data: allGoals } = await (db.from("goals") as any)
    .select("*")
    .in("goal_sheet_id", sheetIds)
    .order("sort_order", { ascending: true });

  const goalMap = new Map<string, Goal[]>();
  for (const g of (allGoals as Goal[]) ?? []) {
    const arr = goalMap.get(g.goal_sheet_id) ?? [];
    arr.push(g);
    goalMap.set(g.goal_sheet_id, arr);
  }

  return sheetsArr.map((s) => ({
    ...s,
    goals: goalMap.get(s.id) ?? [],
  })) as GoalSheetWithGoals[];
}

// ─── Get sheets for a manager's direct reports (or all for Admin) ──
export async function getTeamSheets(
  callerId: string,
): Promise<GoalSheetWithGoals[]> {
  const db = await createServerClient();
  const cycle = await getActiveCycle();

  // 1. Determine which employees to fetch
  const { data: callerProfile } = (await db
    .from("profiles")
    .select("role")
    .eq("id", callerId)
    .single()) as PostgrestSingleResponse<Profile>;

  const profile = callerProfile;

  let reportIds: string[] = [];

  if (profile?.role === "admin") {
    // Admin: Get all employees
    const { data: allEmps } = await db
      .from("profiles")
      .select("id")
      .eq("role", "employee");
    reportIds = (allEmps as Profile[])?.map((r) => r.id) ?? [];
  } else {
    // Manager: Get direct reports only
    const { data: reports } = await db
      .from("profiles")
      .select("id")
      .eq("manager_id", callerId);
    reportIds = (reports as Profile[])?.map((r) => r.id) ?? [];
  }

  if (reportIds.length === 0) return [];

  // 2. Fetch sheets for those employees
  const { data: sheets, error } = await (db.from("goal_sheets") as any)
    .select("*")
    .eq("cycle_id", cycle.id)
    .in("employee_id", reportIds)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to fetch team sheets: ${error.message}`);
  if (!sheets) return [];

  const sheetsArr = sheets as GoalSheet[];

  // 3. Attach goals + employee profiles
  const sheetIds = sheetsArr.map((s) => s.id);
  const [{ data: allGoals }, { data: profiles }] = await Promise.all([
    (db.from("goals") as any)
      .select("*")
      .in("goal_sheet_id", sheetIds)
      .order("sort_order", { ascending: true }),
    db.from("profiles").select("*").in("id", reportIds),
  ]);

  const goalMap = new Map<string, Goal[]>();
  for (const g of (allGoals as Goal[]) ?? []) {
    const arr = goalMap.get(g.goal_sheet_id) ?? [];
    arr.push(g);
    goalMap.set(g.goal_sheet_id, arr);
  }

  const profileMap = new Map<string, Profile>();
  for (const p of (profiles as Profile[]) ?? []) {
    profileMap.set(p.id, p);
  }

  return sheetsArr.map((s) => ({
    ...s,
    goals: goalMap.get(s.id) ?? [],
    employee: profileMap.get(s.employee_id) ?? undefined,
  })) as GoalSheetWithGoals[];
}

// ─── Update sheet status ────────────────────────────────────
export async function updateSheetStatus(
  sheetId: string,
  status: SheetStatus,
  options?: { rejectionFeedback?: string; approvedBy?: string },
) {
  const db = createAdminClient();

  const update: any = { status };
  if (options?.rejectionFeedback !== undefined) {
    update.rejection_feedback = options.rejectionFeedback;
  }
  if (options?.approvedBy) {
    update.approved_by = options.approvedBy;
  }

  const { data, error } = (await (db.from("goal_sheets") as any)
    .update(update as Database["public"]["Tables"]["goal_sheets"]["Update"])
    .eq("id", sheetId)
    .select()
    .maybeSingle()) as PostgrestSingleResponse<GoalSheet>;

  if (error) throw new Error(`Failed to update sheet status: ${error.message}`);
  if (!data) {
    // Row was updated but RLS prevented it from being returned, or ID was invalid.
    // Re-fetch to confirm the update took effect.
    const { data: refetched } = (await db
      .from("goal_sheets")
      .select("*")
      .eq("id", sheetId)
      .maybeSingle()) as PostgrestSingleResponse<GoalSheet>;
    if (refetched) return refetched;
    throw new Error(
      `Sheet ${sheetId} not found or not accessible after status update.`,
    );
  }
  return data;
}

// ─── Approve a sheet (RLS-aware server action) ─────────────
export async function approveSheet(formData: FormData | { sheetId?: string }) {
  const sheetId =
    formData instanceof FormData
      ? String(formData.get("sheetId"))
      : formData.sheetId;
  if (!sheetId) throw new Error("Missing sheetId for approveSheet");

  const db = await createServerClient();

  const { data, error } = (await (db.from("goal_sheets") as any)
    .update({
      status: "locked",
      approved_at: new Date().toISOString(),
    } as Database["public"]["Tables"]["goal_sheets"]["Update"])
    .eq("id", sheetId)
    .select()
    .maybeSingle()) as PostgrestSingleResponse<GoalSheet>;

  if (error) throw new Error(`Failed to approve sheet: ${error.message}`);
  return data;
}

// ─── Reject a sheet with feedback (RLS-aware server action) ─
export async function rejectSheet(
  formData: FormData | { sheetId?: string; rejectionFeedback?: string },
) {
  const sheetId =
    formData instanceof FormData
      ? String(formData.get("sheetId"))
      : formData.sheetId;
  const rejectionFeedback =
    formData instanceof FormData
      ? String(formData.get("rejectionFeedback") ?? "")
      : formData.rejectionFeedback;

  if (!sheetId) throw new Error("Missing sheetId for rejectSheet");

  const db = await createServerClient();

  const { data, error } = (await (db.from("goal_sheets") as any)
    .update({
      status: "draft",
      rejection_feedback: rejectionFeedback,
    } as Database["public"]["Tables"]["goal_sheets"]["Update"])
    .eq("id", sheetId)
    .select()
    .maybeSingle()) as PostgrestSingleResponse<GoalSheet>;

  if (error) throw new Error(`Failed to reject sheet: ${error.message}`);
  return data;
}
