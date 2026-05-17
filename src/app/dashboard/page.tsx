import type { Metadata } from "next";
import Link from "next/link";
import { calculateProgress } from "@/lib/progress-engine";
import {
  getOrCreateMySheet,
  getGoalSheet,
  getTeamSheets,
} from "@/lib/actions/goal-sheet.actions";
import {
  getAllProfiles,
  getThrustAreas,
  getAuditLogs,
} from "@/lib/actions/admin.actions";
import { createServerClient } from "@/lib/supabase/server";
import type { Goal, GoalSheetWithGoals, Profile } from "@/lib/database.types";
import type { User } from "@supabase/supabase-js";

export const metadata: Metadata = {
  title: "Dashboard — PERFORM",
  description:
    "Employee performance cycle overview with active goals and tracking metrics.",
};

/* ─── Summary Card ─── */
function SummaryCard({
  label,
  icon,
  children,
}: {
  label: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-lg flex flex-col gap-md shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-1 transition-transform">
      <div className="flex justify-between items-start border-b border-outline pb-sm">
        <span className="text-label-bold font-[700] tracking-[0.05em] text-on-surface-variant uppercase">
          {label}
        </span>
        <span className="material-symbols-outlined text-on-surface">
          {icon}
        </span>
      </div>
      {children}
    </div>
  );
}

/* ─── Status Badge ─── */
function StatusBadge({ status }: { status: "active" | "pending" | "draft" }) {
  const config = {
    active: {
      bg: "bg-surface-container",
      text: "text-on-surface",
      dot: "bg-primary",
      label: "Active",
    },
    pending: {
      bg: "bg-tertiary-fixed",
      text: "text-on-tertiary-fixed",
      dot: "bg-tertiary",
      label: "Pending Review",
    },
    draft: {
      bg: "bg-surface",
      text: "text-on-surface-variant",
      dot: "border border-outline",
      label: "Draft",
    },
  };
  const c = config[status];

  return (
    <span
      className={`px-sm py-xs border border-on-surface ${c.bg} rounded-lg text-label-bold font-[700] tracking-[0.05em] ${c.text} inline-flex items-center gap-xs`}
    >
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

async function EmployeeDashboardView({ user }: { user: User }) {
  if (!user) return null;

  let goals: Goal[] = [];
  try {
    const realSheet = await getOrCreateMySheet(user.id);
    const sheetWithGoals = await getGoalSheet(realSheet.id);
    goals = sheetWithGoals.goals;
  } catch (error) {
    console.error("Failed to load goals", error);
  }

  const totalWeightage = goals.reduce((sum, g) => sum + g.weightage, 0);
  const goalCount = goals.length;

  return (
    <>
      {/* Hero Section */}
      <header className="mb-xl flex flex-col gap-sm">
        <h2 className="text-label-bold font-[700] tracking-[0.05em] text-primary uppercase">
          Global Operations
        </h2>
        <h1 className="text-headline-lg-mobile md:text-display-xl font-[800] text-on-surface border-b-4 border-on-surface pb-sm inline-block w-fit">
          Performance Cycle: Q4 2024
        </h1>
      </header>

      {/* Summary Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-2xl">
        {/* Weightage Card */}
        <SummaryCard label="Total Weightage" icon="scale">
          <div className="flex items-baseline gap-xs">
            <span className="text-headline-lg font-[800] text-on-surface">
              {totalWeightage}
            </span>
            <span className="text-headline-md font-[700] text-on-surface-variant">
              / 100%
            </span>
          </div>
          <div className="w-full h-2 bg-surface-container border border-on-surface">
            <div
              className="h-full bg-primary border-r border-on-surface"
              style={{ width: `${Math.min(totalWeightage, 100)}%` }}
            />
          </div>
        </SummaryCard>

        {/* Goals Card */}
        <SummaryCard label="Active Goals" icon="flag">
          <div className="flex items-baseline gap-xs">
            <span className="text-headline-lg font-[800] text-on-surface">
              {String(goalCount).padStart(2, "0")}
            </span>
            <span className="text-label-bold font-[700] tracking-[0.05em] text-on-surface-variant ml-sm uppercase">
              Tracked
            </span>
          </div>
          <div className="flex gap-xs mt-auto flex-wrap">
            <span className="px-sm py-xs border border-on-surface rounded-sm text-label-sm font-[500] tracking-[0.02em] bg-surface-container">
              {goals.filter((g) => g.thrust_area === "Strategic").length}{" "}
              Strategic
            </span>
            <span className="px-sm py-xs border border-on-surface rounded-sm text-label-sm font-[500] tracking-[0.02em] bg-surface-container">
              {goals.filter((g) => g.thrust_area === "Operational").length}{" "}
              Operational
            </span>
          </div>
        </SummaryCard>

        {/* Days Remaining Card */}
        <SummaryCard label="Days Remaining" icon="calendar_today">
          <div className="flex items-baseline gap-xs text-tertiary">
            <span className="text-headline-lg font-[800]">14</span>
            <span className="text-label-bold font-[700] tracking-[0.05em] ml-sm uppercase">
              Days
            </span>
          </div>
          <p className="text-label-sm font-[500] tracking-[0.02em] text-on-surface-variant mt-auto border-t border-dashed border-outline pt-sm">
            Cycle closes Dec 31, 2024
          </p>
        </SummaryCard>
      </section>

      {/* Active Goal Sheets List */}
      <section className="flex flex-col gap-lg">
        <div className="flex items-center justify-between border-b-2 border-on-surface pb-sm">
          <h3 className="text-headline-md font-[700] text-on-surface">
            Active Goal Sheets
          </h3>
          <button className="text-label-bold font-[700] tracking-[0.05em] text-primary flex items-center gap-xs hover:underline decoration-2 underline-offset-4">
            View All Archive
            <span className="material-symbols-outlined text-[16px]">
              arrow_forward
            </span>
          </button>
        </div>

        <div className="bg-surface-container-lowest border-2 border-on-surface rounded-xl flex flex-col shadow-[4px_4px_0px_0px_#000000]">
          {/* Desktop Header */}
          <div className="hidden md:grid grid-cols-12 gap-md p-md border-b-2 border-on-surface bg-surface text-label-bold font-[700] tracking-[0.05em] text-on-surface-variant uppercase">
            <div className="col-span-5">Objective</div>
            <div className="col-span-2">Weight</div>
            <div className="col-span-3">Progress</div>
            <div className="col-span-2 text-right">Status</div>
          </div>

          {/* Goal Rows */}
          {goals.map((goal, i) => {
            const progress = calculateProgress(
              goal.uom,
              goal.target_value,
              goal.actual_achievement,
            );
            const isLast = i === goals.length - 1;
            const statusType =
              goal.progress_status === "on_track"
                ? "active"
                : goal.progress_status === "not_started"
                  ? "draft"
                  : "pending";

            const progressColor =
              progress >= 60
                ? "bg-primary"
                : progress >= 30
                  ? "bg-tertiary"
                  : "bg-outline";
            const progressLabel =
              goal.progress_status === "on_track"
                ? "On Track"
                : goal.progress_status === "not_started"
                  ? "Not Started"
                  : "Completed";
            const progressTextColor =
              goal.progress_status === "on_track"
                ? "text-on-surface-variant"
                : goal.progress_status === "not_started"
                  ? "text-on-surface-variant"
                  : "text-primary";

            return (
              <div
                key={goal.id}
                className={`grid grid-cols-1 md:grid-cols-12 gap-y-sm gap-x-md p-md ${
                  !isLast ? "border-b border-on-surface" : ""
                } hover:bg-surface-container-low transition-colors items-center group`}
              >
                {/* Objective */}
                <div className="col-span-1 md:col-span-5 flex flex-col gap-xs">
                  <span className="text-label-sm font-[500] tracking-[0.02em] text-primary uppercase tracking-widest">
                    {goal.thrust_area}
                  </span>
                  <h4 className="text-headline-md font-[700] text-on-surface group-hover:underline decoration-2 underline-offset-4 cursor-pointer">
                    {goal.title}
                  </h4>
                </div>

                {/* Weight */}
                <div className="col-span-1 md:col-span-2 text-body-lg font-[400] text-on-surface font-bold">
                  <span className="md:hidden text-label-sm font-[500] tracking-[0.02em] text-on-surface-variant mr-sm">
                    Weight:
                  </span>
                  {goal.weightage}%
                </div>

                {/* Progress */}
                <div className="col-span-1 md:col-span-3 flex flex-col gap-xs w-full">
                  <div className="flex justify-between text-label-sm font-[500] tracking-[0.02em]">
                    <span className={progressTextColor}>{progressLabel}</span>
                    <span className="text-on-surface font-bold">
                      {progress}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-surface-container border border-on-surface">
                    <div
                      className={`h-full ${progressColor} ${
                        progress > 0 ? "border-r border-on-surface" : ""
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="col-span-1 md:col-span-2 flex justify-start md:justify-end mt-sm md:mt-0">
                  <StatusBadge status={statusType} />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

async function ManagerDashboardView({ user }: { user: User }) {
  const { getTeamSheets } = await import("@/lib/actions/goal-sheet.actions");
  const sheets = await getTeamSheets(user.id);

  const pendingCount = sheets.filter((s) => s.status === "submitted").length;
  const approvedCount = sheets.filter((s) => s.status === "locked").length;

  return (
    <div className="flex flex-col gap-lg">
      <header className="mb-xl flex flex-col gap-sm">
        <h2 className="text-label-bold font-[700] tracking-[0.05em] text-primary uppercase">
          Manager Overview
        </h2>
        <h1 className="text-headline-lg-mobile md:text-display-xl font-[800] text-on-surface border-b-4 border-on-surface pb-sm inline-block w-fit">
          Team Tracker Grid
        </h1>
      </header>

      {/* Summary Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-lg">
        <div className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-lg flex flex-col gap-md shadow-[4px_4px_0px_0px_#000000]">
          <span className="text-label-bold font-[700] tracking-[0.05em] text-on-surface-variant uppercase">
            Team Size
          </span>
          <span className="text-headline-lg font-[800] text-on-surface">
            {sheets.length}
          </span>
        </div>
        <div className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-lg flex flex-col gap-md shadow-[4px_4px_0px_0px_#000000]">
          <span className="text-label-bold font-[700] tracking-[0.05em] text-tertiary uppercase">
            Pending Review
          </span>
          <span className="text-headline-lg font-[800] text-tertiary">
            {pendingCount}
          </span>
        </div>
        <div className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-lg flex flex-col gap-md shadow-[4px_4px_0px_0px_#000000]">
          <span className="text-label-bold font-[700] tracking-[0.05em] text-primary uppercase">
            Approved
          </span>
          <span className="text-headline-lg font-[800] text-primary">
            {approvedCount}
          </span>
        </div>
      </section>

      <div className="bg-surface-container-lowest border-2 border-on-surface rounded-xl shadow-[4px_4px_0px_0px_#000000] overflow-hidden">
        <div className="flex justify-between items-center p-md border-b-2 border-on-surface bg-surface-container-low">
          <h3 className="text-headline-md font-[700] text-on-surface">
            Direct Reports
          </h3>
          <Link
            href="/dashboard/review"
            className="text-label-bold font-[700] tracking-[0.05em] text-primary hover:underline"
          >
            View All Reviews &rarr;
          </Link>
        </div>
        <div className="flex flex-col">
          {sheets.slice(0, 5).map((sheet: GoalSheetWithGoals) => (
            <div
              key={sheet.id}
              className="flex justify-between items-center p-md border-b border-on-surface last:border-0 hover:bg-surface-container-low transition-colors"
            >
              <div className="flex items-center gap-sm">
                <div className="w-10 h-10 rounded border border-on-surface bg-surface-variant flex items-center justify-center font-[700] text-on-surface shrink-0">
                  {sheet.employee?.full_name?.charAt(0) || "?"}
                </div>
                <div className="flex flex-col">
                  <span className="text-label-bold font-[700] text-on-surface">
                    {sheet.employee?.full_name}
                  </span>
                  <span className="text-label-sm text-on-surface-variant">
                    {sheet.employee?.title}
                  </span>
                </div>
              </div>
              <div>
                <span
                  className={`px-sm py-xs border border-on-surface rounded text-label-sm font-[700] uppercase ${
                    sheet.status === "submitted"
                      ? "bg-tertiary-container text-on-tertiary-container"
                      : sheet.status === "locked"
                        ? "bg-surface-tint text-on-primary"
                        : "bg-error text-on-error"
                  }`}
                >
                  {sheet.status === "submitted"
                    ? "Pending"
                    : sheet.status === "locked"
                      ? "Approved"
                      : "Draft"}
                </span>
              </div>
            </div>
          ))}
          {sheets.length === 0 && (
            <div className="p-xl text-center text-label-bold font-[700] tracking-[0.05em] text-on-surface-variant">
              No direct reports found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

async function AdminDashboardView({ user }: { user: User }) {
  const [allProfiles, teamSheets, thrustAreas, auditLogs] = await Promise.all([
    getAllProfiles(),
    getTeamSheets(user.id),
    getThrustAreas(),
    getAuditLogs({ limit: 5 }),
  ]);

  const employees = allProfiles.filter((p) => p.role === "employee");
  const managers = allProfiles.filter((p) => p.role === "manager" || p.role === "admin");
  const activeThrustAreas = thrustAreas.filter((t) => t.is_active);

  const draftCount = teamSheets.filter((s) => s.status === "draft").length;
  const submittedCount = teamSheets.filter((s) => s.status === "submitted").length;
  const lockedCount = teamSheets.filter((s) => s.status === "locked").length;
  const totalSheets = teamSheets.length;

  return (
    <div className="flex flex-col gap-lg">
      <header className="mb-xl flex flex-col gap-sm">
        <h2 className="text-label-bold font-[700] tracking-[0.05em] text-primary uppercase">
          Global Operations
        </h2>
        <h1 className="text-headline-lg-mobile md:text-display-xl font-[800] text-on-surface border-b-4 border-on-surface pb-sm inline-block w-fit">
          Administration Dashboard
        </h1>
      </header>

      {/* Quick Stats Row */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
        <div className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-lg shadow-[4px_4px_0px_0px_#000000]">
          <div className="flex justify-between items-start border-b border-outline pb-sm mb-sm">
            <span className="text-label-bold font-[700] tracking-[0.05em] text-on-surface-variant uppercase">
              Total Employees
            </span>
            <span className="material-symbols-outlined text-on-surface">people</span>
          </div>
          <div className="text-headline-lg font-[800] text-on-surface">{employees.length}</div>
          <div className="text-label-sm text-on-surface-variant">Active workforce</div>
        </div>

        <div className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-lg shadow-[4px_4px_0px_0px_#000000]">
          <div className="flex justify-between items-start border-b border-outline pb-sm mb-sm">
            <span className="text-label-bold font-[700] tracking-[0.05em] text-on-surface-variant uppercase">
              Active Managers
            </span>
            <span className="material-symbols-outlined text-on-surface">supervisor_account</span>
          </div>
          <div className="text-headline-lg font-[800] text-on-surface">{managers.length}</div>
          <div className="text-label-sm text-on-surface-variant">Managers & admins</div>
        </div>

        <div className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-lg shadow-[4px_4px_0px_0px_#000000]">
          <div className="flex justify-between items-start border-b border-outline pb-sm mb-sm">
            <span className="text-label-bold font-[700] tracking-[0.05em] text-on-surface-variant uppercase">
              Goal Sheets
            </span>
            <span className="material-symbols-outlined text-on-surface">assignment</span>
          </div>
          <div className="text-headline-lg font-[800] text-on-surface">{totalSheets}</div>
          <div className="text-label-sm text-on-surface-variant">
            {submittedCount} pending, {lockedCount} approved
          </div>
        </div>

        <div className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-lg shadow-[4px_4px_0px_0px_#000000]">
          <div className="flex justify-between items-start border-b border-outline pb-sm mb-sm">
            <span className="text-label-bold font-[700] tracking-[0.05em] text-on-surface-variant uppercase">
              Thrust Areas
            </span>
            <span className="material-symbols-outlined text-on-surface">category</span>
          </div>
          <div className="text-headline-lg font-[800] text-on-surface">{activeThrustAreas.length}</div>
          <div className="text-label-sm text-on-surface-variant">Active focus areas</div>
        </div>
      </section>

      {/* Team Status Overview */}
      <section className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-lg shadow-[4px_4px_0px_0px_#000000]">
        <h3 className="text-label-bold font-[700] tracking-[0.05em] text-on-surface-variant uppercase mb-md">
          Goal Sheet Status Overview
        </h3>
        {totalSheets > 0 ? (
          <div className="space-y-md">
            <div className="flex items-center gap-md">
              <span className="w-20 text-label-sm font-[500] text-on-surface">Draft</span>
              <div className="flex-1 h-6 bg-surface-container border border-on-surface rounded overflow-hidden">
                <div
                  className="h-full bg-error transition-all"
                  style={{ width: `${(draftCount / totalSheets) * 100}%` }}
                />
              </div>
              <span className="w-12 text-label-bold font-[700] text-on-surface text-right">{draftCount}</span>
            </div>
            <div className="flex items-center gap-md">
              <span className="w-20 text-label-sm font-[500] text-on-surface">Submitted</span>
              <div className="flex-1 h-6 bg-surface-container border border-on-surface rounded overflow-hidden">
                <div
                  className="h-full bg-tertiary transition-all"
                  style={{ width: `${(submittedCount / totalSheets) * 100}%` }}
                />
              </div>
              <span className="w-12 text-label-bold font-[700] text-on-surface text-right">{submittedCount}</span>
            </div>
            <div className="flex items-center gap-md">
              <span className="w-20 text-label-sm font-[500] text-on-surface">Approved</span>
              <div className="flex-1 h-6 bg-surface-container border border-on-surface rounded overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(lockedCount / totalSheets) * 100}%` }}
                />
              </div>
              <span className="w-12 text-label-bold font-[700] text-on-surface text-right">{lockedCount}</span>
            </div>
          </div>
        ) : (
          <p className="text-label-bold font-[700] tracking-[0.05em] text-on-surface-variant">
            No goal sheets found for current cycle.
          </p>
        )}
      </section>

      {/* Recent Activity & Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter">
        {/* Recent Activity */}
        <section className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-lg shadow-[4px_4px_0px_0px_#000000]">
          <h3 className="text-label-bold font-[700] tracking-[0.05em] text-on-surface-variant uppercase mb-md border-b border-outline pb-sm">
            Recent Activity
          </h3>
          {auditLogs.length > 0 ? (
            <div className="flex flex-col gap-sm">
              {auditLogs.map((log) => {
                const changedFields = log.changed_fields || [];
                const actionLabel = changedFields.length > 0
                  ? `Updated ${changedFields.map(f => f.field).join(", ")}`
                  : "Modified";
                return (
                  <div
                    key={log.id}
                    className="flex items-center justify-between py-sm border-b border-outline last:border-0"
                  >
                    <div className="flex flex-col">
                      <span className="text-label-bold font-[700] text-on-surface truncate max-w-[200px]">
                        {actionLabel}
                      </span>
                      <span className="text-label-sm text-on-surface-variant">
                        {log.user_name || "System"} • {log.goal_title || "N/A"}
                      </span>
                    </div>
                    <span className="text-label-sm text-on-surface-variant whitespace-nowrap">
                      {new Date(log.created_at).toLocaleDateString()}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-label-sm text-on-surface-variant">No recent activity</p>
          )}
        </section>

        {/* Quick Actions */}
        <section className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-lg shadow-[4px_4px_0px_0px_#000000]">
          <h3 className="text-label-bold font-[700] tracking-[0.05em] text-on-surface-variant uppercase mb-md border-b border-outline pb-sm">
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-md">
            <Link
              href="/dashboard/admin/unlock"
              className="flex flex-col items-center gap-sm p-md border-2 border-on-surface rounded-lg hover:bg-surface-container-high hover:shadow-[2px_2px_0px_0px_#000000] transition-all"
            >
              <span className="material-symbols-outlined text-on-surface">lock_open</span>
              <span className="text-label-bold font-[700] text-on-surface text-center">Unlock Sheets</span>
            </Link>
            <Link
              href="/dashboard/admin/distribute"
              className="flex flex-col items-center gap-sm p-md border-2 border-on-surface rounded-lg hover:bg-surface-container-high hover:shadow-[2px_2px_0px_0px_#000000] transition-all"
            >
              <span className="material-symbols-outlined text-on-surface">share</span>
              <span className="text-label-bold font-[700] text-on-surface text-center">Distribute KPI</span>
            </Link>
            <Link
              href="/dashboard/admin/employees"
              className="flex flex-col items-center gap-sm p-md border-2 border-on-surface rounded-lg hover:bg-surface-container-high hover:shadow-[2px_2px_0px_0px_#000000] transition-all"
            >
              <span className="material-symbols-outlined text-on-surface">people</span>
              <span className="text-label-bold font-[700] text-on-surface text-center">Employees</span>
            </Link>
            <Link
              href="/dashboard/workspace"
              className="flex flex-col items-center gap-sm p-md border-2 border-on-surface rounded-lg hover:bg-surface-container-high hover:shadow-[2px_2px_0px_0px_#000000] transition-all"
            >
              <span className="material-symbols-outlined text-on-surface">add_circle</span>
              <span className="text-label-bold font-[700] text-on-surface text-center">Create Goal</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const userRole = profile ? (profile as { role?: string }).role : "employee";
  const role = userRole || "employee";

  if (role === "admin") {
    return <AdminDashboardView user={user} />;
  } else if (role === "manager") {
    return <ManagerDashboardView user={user} />;
  } else {
    return <EmployeeDashboardView user={user} />;
  }
}
