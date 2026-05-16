import type { Metadata } from "next";
import { calculateProgress } from "@/lib/progress-engine";
import { getOrCreateMySheet, getGoalSheet } from "@/lib/actions/goal-sheet.actions";
import { createServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard — PERFORM",
  description: "Employee performance cycle overview with active goals and tracking metrics.",
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
function StatusBadge({
  status,
}: {
  status: "active" | "pending" | "draft";
}) {
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

export default async function EmployeeDashboard() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  let goals: any[] = [];
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
              goal.actual_achievement
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
