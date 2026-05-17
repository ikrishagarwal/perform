"use server";


/* ─────────────────────────────────────────────────────────────
   admin.actions.ts — Server Actions for Admin/HR operations
   ───────────────────────────────────────────────────────────── */

import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import type {
  AuditLog,
  Profile,
  PerformanceCycle,
  GoalSheet,
  Goal,
  Database,
} from "@/lib/database.types";

// ─── Fetch audit logs ───────────────────────────────────────
export async function getAuditLogs(filters?: {
  goalSheetId?: string;
  limit?: number;
}): Promise<(AuditLog & { user_name?: string; goal_title?: string })[]> {
  const db = await createServerClient();

  let query = db
    .from("audit_logs")
    .select("*, profiles(full_name), goals(title)")
    .order("created_at", { ascending: false });

  if (filters?.goalSheetId) {
    query = query.eq("goal_sheet_id", filters.goalSheetId);
  }
  if (filters?.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch audit logs: ${error.message}`);

  return (data as any[])?.map((log) => ({
    ...log,
    user_name: log.profiles?.full_name || log.modified_by,
    goal_title: log.goals?.title || log.goal_id,
  })) ?? [];
}

// ─── Admin unlock: revert locked sheet to draft ─────────────
export async function adminUnlockSheet(sheetId: string) {
  const db = await createServerClient();

  const { data, error } = await db
    .from("goal_sheets")
    .update({ status: "draft" })
    .eq("id", sheetId)
    .select()
    .single();

  if (error) throw new Error(`Failed to unlock sheet: ${error.message}`);
  return data;
}

// ─── Manage performance cycles ──────────────────────────────
export async function upsertPerformanceCycle(
  cycle: Omit<PerformanceCycle, "id" | "created_at"> & { id?: string },
) {
  const db = await createServerClient();

  if (cycle.id) {
    const { id, ...rest } = cycle;
    const { data, error } = await db
      .from("performance_cycles")
      .update(rest)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(`Failed to update cycle: ${error.message}`);
    return data;
  }

  const { data, error } = await db
    .from("performance_cycles")
    .insert(cycle as Database["public"]["Tables"]["performance_cycles"]["Insert"])
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

// ─── Get direct reports (manager view) ──────────────────────
export async function getDirectReports(managerId: string): Promise<Profile[]> {
  const db = await createServerClient();

  const { data, error } = await db
    .from("profiles")
    .select("*")
    .eq("manager_id", managerId)
    .eq("role", "employee")
    .order("full_name", { ascending: true });

  if (error) throw new Error(`Failed to fetch direct reports: ${error.message}`);
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
    db
      .from("goals")
      .select("*")
      .in("goal_sheet_id", sheetIds)
      .order("sort_order"),
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

  const thrustAreaCounts: Record<string, number> = {};
  const [{ data: allGoals }] = await Promise.all([
    db.from("goals").select("thrust_area").in("goal_sheet_id", sheetsArr.map(s => s.id))
  ]);

  (allGoals as { thrust_area: string }[])?.forEach(g => {
    thrustAreaCounts[g.thrust_area] = (thrustAreaCounts[g.thrust_area] || 0) + 1;
  });

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
    thrustAreaBreakdown: thrustAreaCounts,
  };
}

// ─── Employee Management ───────────────────────────────────────

export interface CreateEmployeeInput {
  email: string;
  password: string;
  full_name: string;
  role: "employee" | "manager" | "admin";
  manager_id?: string;
  title?: string;
}

export async function createEmployee(input: CreateEmployeeInput) {
  const adminDb = createAdminClient();

  const { data: authUser, error: authError } = await adminDb.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
    user_metadata: {
      full_name: input.full_name,
      role: input.role,
    },
  });

  if (authError) {
    throw new Error(`Failed to create auth user: ${authError.message}`);
  }

  if (!authUser.user) {
    throw new Error("Failed to create auth user: no user returned");
  }

  const { error: profileError } = await adminDb.from("profiles").insert({
    id: authUser.user.id,
    full_name: input.full_name,
    role: input.role,
    manager_id: input.manager_id || null,
    title: input.title || "",
    is_active: true,
  });

  if (profileError) {
    await adminDb.auth.admin.deleteUser(authUser.user.id);
    throw new Error(`Failed to create profile: ${profileError.message}`);
  }

  return { id: authUser.user.id, ...input };
}

export async function updateEmployee(
  id: string,
  input: Partial<Omit<CreateEmployeeInput, "email" | "password" | "email_confirm" | "user_metadata">>
) {
  const db = await createServerClient();

  const updateData: Record<string, unknown> = {};
  if (input.full_name !== undefined) updateData.full_name = input.full_name;
  if (input.role !== undefined) updateData.role = input.role;
  if (input.manager_id !== undefined) updateData.manager_id = input.manager_id || null;
  if (input.title !== undefined) updateData.title = input.title;

  const { data, error } = await db
    .from("profiles")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update employee: ${error.message}`);
  return data;
}

export async function toggleEmployeeActive(id: string, isActive: boolean) {
  const db = await createServerClient();

  const { data, error } = await db
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to ${isActive ? "activate" : "deactivate"} employee: ${error.message}`);
  return data;
}

export async function deleteEmployee(id: string) {
  return toggleEmployeeActive(id, false);
}

export async function getAllManagers(): Promise<Profile[]> {
  const db = await createServerClient();

  const { data, error } = await db
    .from("profiles")
    .select("*")
    .in("role", ["manager", "admin"])
    .eq("is_active", true)
    .order("full_name", { ascending: true });

  if (error) throw new Error(`Failed to fetch managers: ${error.message}`);
  return data ?? [];
}

// ─── Thrust Areas Management ─────────────────────────────────
export interface ThrustArea {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export async function getThrustAreas(): Promise<ThrustArea[]> {
  const db = await createServerClient();

  const { data, error } = await db
    .from("thrust_areas")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(`Failed to fetch thrust areas: ${error.message}`);
  return data ?? [];
}

export async function createThrustArea(name: string, description?: string) {
  const db = await createServerClient();
  const adminDb = await createAdminClient();

  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    throw new Error("Only admins can create thrust areas");
  }

  const { data, error } = await adminDb
    .from("thrust_areas")
    .insert({ name, description: description || null })
    .select()
    .single();

  if (error) throw new Error(`Failed to create thrust area: ${error.message}`);
  return data;
}

export async function updateThrustArea(id: string, name: string, description?: string) {
  const db = await createServerClient();
  const adminDb = await createAdminClient();

  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    throw new Error("Only admins can update thrust areas");
  }

  const { data, error } = await adminDb
    .from("thrust_areas")
    .update({ name, description: description || null })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update thrust area: ${error.message}`);
  return data;
}

export async function toggleThrustArea(id: string, isActive: boolean) {
  const db = await createServerClient();
  const adminDb = await createAdminClient();

  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    throw new Error("Only admins can toggle thrust areas");
  }

  const { data, error } = await adminDb
    .from("thrust_areas")
    .update({ is_active: isActive })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to toggle thrust area: ${error.message}`);
  return data;
}
