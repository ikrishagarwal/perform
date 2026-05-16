"use server";

/* ─────────────────────────────────────────────────────────────
   admin.actions.ts — Server Actions for Admin/HR operations
   ───────────────────────────────────────────────────────────── */

import { createServerClient } from "@/lib/supabase/server";
import type { AuditLog, Profile, PerformanceCycle, GoalSheet, Goal } from "@/lib/database.types";

// ─── Fetch audit logs ───────────────────────────────────────
export async function getAuditLogs(filters?: {
  goalSheetId?: string;
  limit?: number;
}): Promise<AuditLog[]> {
  const db = await createServerClient();

  let query = db
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters?.goalSheetId) {
    query = query.eq("goal_sheet_id", filters.goalSheetId);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch audit logs: ${error.message}`);
  return data ?? [];
}

// ─── Admin unlock: revert locked sheet to draft ─────────────
export async function adminUnlockSheet(sheetId: string) {
  const db = await createServerClient();

  const { data, error } = await db
    .from("goal_sheets")
    // @ts-expect-error status update is valid but type check can be strict
    .update({ status: "draft" })
    .eq("id", sheetId)
    .select()
    .single();

  if (error) throw new Error(`Failed to unlock sheet: ${error.message}`);
  return data;
}

// ─── Manage performance cycles ──────────────────────────────
export async function upsertPerformanceCycle(cycle: Omit<PerformanceCycle, "id" | "created_at"> & { id?: string }) {
  const db = await createServerClient();

  if (cycle.id) {
    const { id, ...rest } = cycle;
    const { data, error } = await db
      .from("performance_cycles")
      // @ts-expect-error update rest may contain unexpected fields
      .update(rest)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(`Failed to update cycle: ${error.message}`);
    return data;
  }

  const { data, error } = await db
    .from("performance_cycles")
    // @ts-expect-error insert cycle may contain unexpected fields
    .insert(cycle)
    .select()
    .single();
  if (error) throw new Error(`Failed to create cycle: ${error.message}`);
  return data;
}

// ─── Get all profiles (admin view) ──────────────────────────
export async function getAllProfiles(): Promise<Profile[]> {
  const db = await createServerClient();

  const { data, error } = await db
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) throw new Error(`Failed to fetch profiles: ${error.message}`);
  return data ?? [];
}

// ─── CSV Export: aggregate goals + actuals for download ─────
export async function exportGoalDataCsv(cycleId: string): Promise<string> {
  const db = await createServerClient();

  const { data: sheets } = await db
    .from("goal_sheets")
    .select("*")
    .eq("cycle_id", cycleId);

  const sheetsArr = (sheets as GoalSheet[]) || [];
  if (sheetsArr.length === 0) return "";

  const sheetIds = sheetsArr.map((s) => s.id);
  const empIds = sheetsArr.map((s) => s.employee_id);

  const [{ data: goals }, { data: profiles }] = await Promise.all([
    db.from("goals").select("*").in("goal_sheet_id", sheetIds).order("sort_order"),
    db.from("profiles").select("*").in("id", empIds),
  ]);

  const profileMap = new Map<string, string>();
  const profilesArr = (profiles as Profile[]) || [];
  for (const p of profilesArr) {
    profileMap.set(p.id, p.full_name);
  }

  const sheetEmpMap = new Map<string, string>();
  for (const s of sheetsArr) {
    sheetEmpMap.set(s.id, s.employee_id);
  }

  // Build CSV
  const headers = [
    "Employee Name",
    "Sheet Status",
    "Thrust Area",
    "Goal Title",
    "UoM",
    "Target Value",
    "Weightage (%)",
    "Actual Achievement",
    "Progress Status",
  ];

  const goalsArr = (goals as Goal[]) || [];
  const rows = goalsArr.map((g) => {
    const empId = sheetEmpMap.get(g.goal_sheet_id) ?? "";
    const empName = profileMap.get(empId) ?? "Unknown";
    const sheet = sheetsArr.find((s) => s.id === g.goal_sheet_id);

    return [
      empName,
      sheet?.status ?? "",
      g.thrust_area,
      g.title,
      g.uom,
      g.target_value,
      String(g.weightage),
      g.actual_achievement ?? "",
      g.progress_status,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}

// ─── Compliance metrics: submission/checkin rates ───────────
export async function getComplianceMetrics(cycleId: string) {
  const db = await createServerClient();

  const { data: sheets } = await db
    .from("goal_sheets")
    .select("*")
    .eq("cycle_id", cycleId);

  const { count: totalEmployees } = await db
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "employee");

  const sheetsArr = (sheets as GoalSheet[]) || [];
  const total = totalEmployees ?? 0;
  const submitted = sheetsArr.filter((s) => s.status !== "draft").length;
  const approved = sheetsArr.filter((s) => s.status === "locked").length;
  const pending = sheetsArr.filter((s) => s.status === "submitted").length;
  const draft = sheetsArr.filter((s) => s.status === "draft").length;
  const notStarted = total - sheetsArr.length;

  return {
    totalEmployees: total,
    sheetsCreated: sheetsArr.length,
    submitted,
    approved,
    pending,
    draft,
    notStarted,
    submissionRate: total > 0 ? Math.round((submitted / total) * 100) : 0,
    approvalRate: total > 0 ? Math.round((approved / total) * 100) : 0,
  };
}
