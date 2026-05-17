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
    // @ts-ignore - Supabase type inference issue
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
      // @ts-ignore
      .update(rest)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(`Failed to update cycle: ${error.message}`);
    return data;
  }

  const { data, error } = await db
    .from("performance_cycles")
    // @ts-ignore
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

  const { error: profileError } = await adminDb.from("profiles").insert(
    {
    id: authUser.user.id,
    full_name: input.full_name,
    role: input.role,
    manager_id: input.manager_id || null,
    title: input.title || "",
    is_active: true,
  } as any
);

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
    // @ts-ignore
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
    // @ts-ignore
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
    .single() as any;

  if (profile?.role !== "admin") {
    throw new Error("Only admins can create thrust areas");
  }

  const { data, error } = await adminDb
    .from("thrust_areas")
    // @ts-ignore
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
    .single() as any;

  if (profile?.role !== "admin") {
    throw new Error("Only admins can update thrust areas");
  }

  const { data, error } = await adminDb
    .from("thrust_areas")
    // @ts-ignore
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
    .single() as any;

  if (profile?.role !== "admin") {
    throw new Error("Only admins can toggle thrust areas");
  }

  const { data, error } = await adminDb
    .from("thrust_areas")
    // @ts-ignore
    .update({ is_active: isActive })
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to toggle thrust area: ${error.message}`);
  return data;
}

// ─── Phase Management ─────────────────────────────────────

export interface PhaseInfo {
  phase: string;
  phaseLabel: string;
  isAutoMode: boolean;
  windowStart: string;
  windowEnd: string;
}

export interface PhaseStats {
  phase: string;
  totalEmployees: number;
  submittedCount: number;
  employees: {
    id: string;
    name: string;
    submitted: boolean;
    submittedAt?: string;
  }[];
}

export interface EmployeePhaseProgress {
  employeeId: string;
  employeeName: string;
  goalSettingStatus: "submitted" | "pending" | null;
  q1Status: "submitted" | "pending" | null;
  q2Status: "submitted" | "pending" | null;
  q3Status: "submitted" | "pending" | null;
  q4Status: "submitted" | "pending" | null;
}

export interface GoalCheckin {
  id: string;
  goal_id: string;
  quarter_phase: string;
  actual_achievement: string | null;
  progress_status: string | null;
  created_at: string;
  updated_at: string;
}

export async function getCurrentPhase(): Promise<PhaseInfo> {
  const db = await createServerClient();

  const { data: cycle } = await db
    .from("performance_cycles")
    .select("*")
    .eq("is_active", true)
    .single() as { data: any };

  const phaseLabels: Record<string, string> = {
    GOAL_SETTING: "Goal Setting",
    Q1: "Q1 Check-in",
    Q2: "Q2 Check-in",
    Q3: "Q3 Check-in",
    Q4_Annual: "Q4 Annual",
  };

  const currentPhase = cycle?.current_phase || "GOAL_SETTING";

  return {
    phase: currentPhase,
    phaseLabel: phaseLabels[currentPhase] || currentPhase,
    isAutoMode: cycle?.is_auto_mode ?? false,
    windowStart: getPhaseWindowStart(cycle, currentPhase),
    windowEnd: getPhaseWindowEnd(cycle, currentPhase),
  };
}

function getPhaseWindowStart(cycle: any, phase: string): string {
  if (!cycle) return "";
  switch (phase) {
    case "GOAL_SETTING": return cycle.goal_setting_start;
    case "Q1": return cycle.q1_start;
    case "Q2": return cycle.q2_start;
    case "Q3": return cycle.q3_start;
    case "Q4_Annual": return cycle.q4_start;
    default: return "";
  }
}

function getPhaseWindowEnd(cycle: any, phase: string): string {
  if (!cycle) return "";
  switch (phase) {
    case "GOAL_SETTING": return cycle.goal_setting_end;
    case "Q1": return cycle.q1_end;
    case "Q2": return cycle.q2_end;
    case "Q3": return cycle.q3_end;
    case "Q4_Annual": return cycle.q4_end;
    default: return "";
  }
}

export async function setCurrentPhase(phase: string) {
  const db = await createServerClient();
  const adminDb = await createAdminClient();

  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single() as any;

  if (profile?.role !== "admin") {
    throw new Error("Only admins can change phases");
  }

  await (adminDb.from("performance_cycles") as any).update({
    current_phase: phase,
    is_auto_mode: false,
  }).eq("is_active", true);

  const { data: cycle } = await adminDb
    .from("performance_cycles")
    .select("*")
    .eq("is_active", true)
    .single() as { data: any };

  if (!cycle) throw new Error("No active performance cycle found");
  return cycle;
}

export async function toggleAutoMode(enabled: boolean) {
  const db = await createServerClient();
  const adminDb = await createAdminClient();

  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single() as any;

  if (profile?.role !== "admin") {
    throw new Error("Only admins can toggle auto mode");
  }

  await (adminDb.from("performance_cycles") as any).update({
    is_auto_mode: enabled,
  }).eq("is_active", true);

  const { data: cycle2 } = await adminDb
    .from("performance_cycles")
    .select("*")
    .eq("is_active", true)
    .single() as { data: any };

  if (!cycle2) throw new Error("No active performance cycle found");
  return cycle2;
}

export async function getPhaseStats(phase: string): Promise<PhaseStats> {
  const db = await createServerClient();

  const { data: cycle } = await db
    .from("performance_cycles")
    .select("id")
    .eq("is_active", true)
    .single() as { data: any };

  if (!cycle) {
    return { phase, totalEmployees: 0, submittedCount: 0, employees: [] };
  }

  const { data: employees } = await db
    .from("profiles")
    .select("id, full_name")
    .eq("role", "employee")
    .eq("is_active", true) as { data: any };

  const { data: goalSheets } = await db
    .from("goal_sheets")
    .select("id, employee_id")
    .eq("cycle_id", cycle.id) as { data: any };

  const goalSheetIds = goalSheets?.map((gs: any) => gs.id) || [];
  const employeeIds = goalSheets?.map((gs: any) => gs.employee_id) || [];

  let submittedCount = 0;
  const employeeProgress: PhaseStats["employees"] = [];

  if (phase === "GOAL_SETTING") {
    const { data: submittedSheets } = await db
      .from("goal_sheets")
      .select("employee_id, submitted_at")
      .eq("cycle_id", cycle.id)
      .neq("status", "draft") as { data: any };

    const submittedMap = new Map<string, string>(submittedSheets?.map((s: any) => [s.employee_id, s.submitted_at]) || []);

    for (const emp of employees || []) {
      const submitted = submittedMap.has(emp.id) || employeeIds.includes(emp.id);
      if (submitted) submittedCount++;
      employeeProgress.push({
        id: emp.id,
        name: emp.full_name,
        submitted: submitted,
        submittedAt: submittedMap.get(emp.id) || undefined,
      });
    }
  } else {
    const { data: checkins } = await db
      .from("goal_checkins")
      .select("goal_id, created_at, goals(goal_sheet(employee_id))")
      .eq("quarter_phase", phase) as { data: any };

    const submittedGoals = new Set(
      checkins?.map((c: any) => c.goals?.goal_sheet?.employee_id).filter(Boolean) || []
    );

    for (const emp of employees || []) {
      const submitted = submittedGoals.has(emp.id);
      if (submitted) submittedCount++;
      employeeProgress.push({
        id: emp.id,
        name: emp.full_name,
        submitted,
      });
    }
  }

  return {
    phase,
    totalEmployees: employees?.length || 0,
    submittedCount,
    employees: employeeProgress,
  };
}

export async function getAllEmployeeProgress(): Promise<EmployeePhaseProgress[]> {
  const db = await createServerClient();

  const { data: cycle } = await db
    .from("performance_cycles")
    .select("id")
    .eq("is_active", true)
    .single() as { data: any };

  if (!cycle) return [];

  const { data: employees } = await db
    .from("profiles")
    .select("id, full_name")
    .eq("role", "employee")
    .eq("is_active", true)
    .order("full_name") as { data: any };

  const { data: goalSheets } = await db
    .from("goal_sheets")
    .select("id, employee_id, status, submitted_at")
    .eq("cycle_id", cycle.id) as { data: any };

  const { data: checkins } = await db
    .from("goal_checkins")
    .select("*") as { data: any };

  const goalSheetMap = new Map(goalSheets?.map((gs: any) => [gs.employee_id, gs]) || []);
  const checkinMap = new Map<string, GoalCheckin[]>();

  for (const checkin of checkins || []) {
    const { data: goal } = await db
      .from("goals")
      .select("goal_sheet_id")
      .eq("id", checkin.goal_id)
      .single() as { data: any };

    if (goal) {
      const { data: gs } = await db
        .from("goal_sheets")
        .select("employee_id")
        .eq("id", goal.goal_sheet_id)
        .single() as { data: any };

      if (gs?.employee_id) {
        const existing = checkinMap.get(gs.employee_id) || [];
        existing.push(checkin);
        checkinMap.set(gs.employee_id, existing);
      }
    }
  }

  const result: EmployeePhaseProgress[] = [];

  for (const emp of employees || []) {
    const sheet = goalSheetMap.get(emp.id);
    const empCheckins = checkinMap.get(emp.id) || [];

    const getStatus = (phase: string): "submitted" | "pending" | null => {
      const sheetAny = sheet as any;
      if (phase === "GOAL_SETTING") {
        return sheetAny && sheetAny.status !== "draft" ? "submitted" : (sheetAny ? "pending" : null);
      }
      return empCheckins.some(c => c.quarter_phase === phase) ? "submitted" : (sheetAny ? "pending" : null);
    };

    result.push({
      employeeId: emp.id,
      employeeName: emp.full_name,
      goalSettingStatus: getStatus("GOAL_SETTING"),
      q1Status: getStatus("Q1"),
      q2Status: getStatus("Q2"),
      q3Status: getStatus("Q3"),
      q4Status: getStatus("Q4_Annual"),
    });
  }

  return result;
}

export async function submitCheckin(
  goalId: string,
  actualAchievement: string,
  progressStatus: string
) {
  const db = await createServerClient();

  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: currentPhase } = await db.rpc("fn_get_current_phase");

  const { data: existing } = await db
    .from("goal_checkins")
    .select("id")
    .eq("goal_id", goalId)
    .eq("quarter_phase", currentPhase || "GOAL_SETTING")
    .single() as { data: any };

  let result: { data: any; error: any };

  if (existing) {
    result = await (db.from("goal_checkins") as any).update({
        actual_achievement: actualAchievement,
        progress_status: progressStatus,
      })
      .eq("id", existing.id)
      .select()
      .single();
  } else {
    result = await db
      .from("goal_checkins")
      .insert({
        goal_id: goalId,
        quarter_phase: currentPhase || "GOAL_SETTING",
        actual_achievement: actualAchievement,
        progress_status: progressStatus,
      } as any)
      .select()
      .single();
  }

  if (result.error) throw new Error(`Failed to submit check-in: ${result.error.message}`);
  return result.data;
}

export async function getGoalCheckins(goalId: string): Promise<GoalCheckin[]> {
  const db = await createServerClient();

  const result = await (db
    .from("goal_checkins")
    .select("*")
    .eq("goal_id", goalId)
    .order("quarter_phase"));

  if (result.error) throw new Error(`Failed to fetch check-ins: ${result.error.message}`);
  return result.data || [];
}
