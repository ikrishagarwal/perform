import type { Metadata } from "next";
import { createServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/database.types";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getComplianceMetrics, getCurrentPhase, getPhaseStats, getOrgQoQAnalytics, type OrgQoQAnalytics, type QoQProgressSummary } from "@/lib/actions/admin.actions";

export const metadata: Metadata = {
  title: "Admin Hub — PERFORM",
  description: "Global operational controls and system audit logs.",
};

export default async function AdminHubPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const userRole = profile ? (profile as Profile).role : null;

  if (userRole !== "admin" && userRole !== "manager") {
    redirect("/dashboard");
  }

  const { data: activeCycleData } = await supabase
    .from("performance_cycles")
    .select("id")
    .eq("is_active", true)
    .maybeSingle();
  const activeCycle = activeCycleData as { id: string } | null;

  let metrics = null;
  if (activeCycle?.id) {
    metrics = await getComplianceMetrics(activeCycle.id);
  }

  const currentPhase = await getCurrentPhase();
  
  // Fetch QoQ Analytics
  let qoqAnalytics: OrgQoQAnalytics | null = null;
  try {
    qoqAnalytics = await getOrgQoQAnalytics();
  } catch (err) {
    console.warn("Could not load QoQ analytics:", err);
  }

  const phaseStats = await Promise.all([
    getPhaseStats("GOAL_SETTING"),
    getPhaseStats("Q1"),
    getPhaseStats("Q2"),
    getPhaseStats("Q3"),
    getPhaseStats("Q4_Annual"),
  ]);

  return (
    <div className="flex flex-col gap-xl max-w-7xl mx-auto w-full">
      <header className="flex flex-col gap-sm">
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-[800] text-on-surface">
          Administration Hub
        </h1>
        <p className="text-body-lg font-[400] text-on-surface-variant max-w-[42rem]">
          Manage system-wide settings, audit modification logs, and distribute
          global targets.
        </p>
      </header>

      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
          <div className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-md shadow-[4px_4px_0px_0px_#000000]">
            <div className="text-label-bold font-[700] text-on-surface-variant uppercase text-xs mb-xs">Submission Rate</div>
            <div className="text-headline-lg font-[800] text-primary">{metrics.submissionRate}%</div>
            <div className="text-label-sm text-on-surface-variant">{metrics.submitted} / {metrics.totalEmployees} employees</div>
          </div>
          <div className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-md shadow-[4px_4px_0px_0px_#000000]">
            <div className="text-label-bold font-[700] text-on-surface-variant uppercase text-xs mb-xs">Approval Rate</div>
            <div className="text-headline-lg font-[800] text-tertiary">{metrics.approvalRate}%</div>
            <div className="text-label-sm text-on-surface-variant">{metrics.approved} sheets locked</div>
          </div>
          <div className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-md shadow-[4px_4px_0px_0px_#000000]">
            <div className="text-label-bold font-[700] text-on-surface-variant uppercase text-xs mb-xs">Pending Review</div>
            <div className="text-headline-lg font-[800] text-on-surface">{metrics.pending}</div>
            <div className="text-label-sm text-on-surface-variant">Requires manager action</div>
          </div>
          <div className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-md shadow-[4px_4px_0px_0px_#000000]">
            <div className="text-label-bold font-[700] text-on-surface-variant uppercase text-xs mb-xs">Not Started</div>
            <div className="text-headline-lg font-[800] text-error">{metrics.notStarted}</div>
            <div className="text-label-sm text-on-surface-variant">Missing goal sheets</div>
          </div>
        </div>
      )}

      {/* Phase Summary */}
      <div className="border-2 border-on-surface bg-surface-container-lowest p-lg">
        <div className="flex items-center justify-between mb-md">
          <h2 className="text-headline-md font-[800] text-on-surface">Phase Overview</h2>
          <Link
            href="/dashboard/admin/phases"
            className="px-md py-sm border-2 border-on-surface bg-surface text-on-surface text-label-bold font-[700] uppercase hover:bg-on-surface hover:text-on-primary transition-colors"
          >
            Manage Phases
          </Link>
        </div>
        <div className="mb-md px-sm py-xs bg-primary text-on-primary inline-flex items-center gap-sm">
          <span className="material-symbols-outlined text-lg">event_note</span>
          <span className="text-label-bold font-[700] uppercase">
            Current: {currentPhase.phaseLabel}
          </span>
          <span className="text-body-sm">
            ({currentPhase.windowStart} — {currentPhase.windowEnd})
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-gutter">
          {[
            { label: "Goal Setting", stats: phaseStats[0] },
            { label: "Q1 Check-in", stats: phaseStats[1] },
            { label: "Q2 Check-in", stats: phaseStats[2] },
            { label: "Q3 Check-in", stats: phaseStats[3] },
            { label: "Q4 Annual", stats: phaseStats[4] },
          ].map((item, idx) => {
            const percentage = item.stats.totalEmployees > 0
              ? Math.round((item.stats.submittedCount / item.stats.totalEmployees) * 100)
              : 0;
            const isActive = currentPhase.phase === ["GOAL_SETTING", "Q1", "Q2", "Q3", "Q4_Annual"][idx];
            return (
              <div
                key={item.label}
                className={`border-2 p-md ${isActive ? "bg-primary shadow-[4px_4px_0px_0px_#000000]" : "bg-surface"}`}
              >
                <div className="text-label-bold font-[700] uppercase text-xs text-on-surface-variant mb-xs">
                  {item.label}
                </div>
                <div className="text-headline-md font-[800] text-on-surface">
                  {item.stats.submittedCount}/{item.stats.totalEmployees}
                </div>
                <div className="mt-sm">
                  <div className="h-xs w-full border border-on-surface bg-surface-container-high">
                    <div
                      className="h-full bg-on-surface transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-label-bold font-[700] uppercase text-xs mt-xs text-on-surface-variant">
                    {percentage}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* QoQ Analytics Section */}
      {qoqAnalytics && (
        <div className="border-2 border-on-surface bg-surface-container-lowest p-lg">
          <div className="flex items-center justify-between mb-md">
            <h2 className="text-headline-md font-[800] text-on-surface">Quarter-on-Quarter Progress</h2>
          </div>
          
          {/* Aggregate QoQ Progress Bars */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-lg">
            {(["Q1", "Q2", "Q3", "Q4_Annual"] as const).map((quarter) => {
              const qData = qoqAnalytics.overall[quarter];
              if (!qData || qData.totalGoals === 0) {
                return (
                  <div key={quarter} className="border-2 border-on-surface p-md bg-surface">
                    <div className="text-label-bold font-[700] uppercase text-xs text-on-surface-variant mb-xs">
                      {quarter === "Q4_Annual" ? "Q4 Annual" : quarter}
                    </div>
                    <div className="text-body-md text-on-surface-variant italic">No data yet</div>
                  </div>
                );
              }
              const onTrackPct = Math.round(((qData.completedGoals + qData.onTrackGoals) / qData.totalGoals) * 100);
              const completedPct = Math.round((qData.completedGoals / qData.totalGoals) * 100);
              
              return (
                <div key={quarter} className="border-2 border-on-surface p-md bg-surface">
                  <div className="text-label-bold font-[700] uppercase text-xs text-on-surface-variant mb-xs">
                    {quarter === "Q4_Annual" ? "Q4 Annual" : quarter}
                  </div>
                  <div className="flex justify-between items-end mb-sm">
                    <span className="text-headline-md font-[800] text-on-surface">
                      {qData.completedGoals}/{qData.totalGoals}
                    </span>
                    <span className="text-label-sm text-on-surface-variant">goals</span>
                  </div>
                  <div className="mb-xs">
                    <div className="h-4 w-full border border-on-surface bg-surface-container-high flex overflow-hidden">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${completedPct}%` }}
                        title={`Completed: ${completedPct}%`}
                      />
                      <div
                        className="h-full bg-tertiary"
                        style={{ width: `${onTrackPct - completedPct}%` }}
                        title={`On Track: ${onTrackPct - completedPct}%`}
                      />
                    </div>
                  </div>
                  <div className="flex justify-between text-label-sm">
                    <span className="text-primary font-[700]">{completedPct}% complete</span>
                    <span className="text-on-surface-variant">{onTrackPct}% on track</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Period Comparison */}
          {qoqAnalytics.periodComparison && (
            <div className="border-t-2 border-on-surface pt-md">
              <h3 className="text-label-bold font-[700] uppercase text-xs text-on-surface-variant mb-md">
                Period-over-Period Changes
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
                {[
                  { label: "Q1 to Q2", data: qoqAnalytics.periodComparison.q1ToQ2 },
                  { label: "Q2 to Q3", data: qoqAnalytics.periodComparison.q2ToQ3 },
                  { label: "Q3 to Q4", data: qoqAnalytics.periodComparison.q3ToQ4 },
                ].map((period) => {
                  const completedChange = period.data.completedChange;
                  const onTrackChange = period.data.onTrackChange;
                  const isPositive = completedChange >= 0;
                  
                  return (
                    <div key={period.label} className="bg-surface p-md border border-on-surface">
                      <div className="text-label-bold font-[700] uppercase text-xs text-on-surface-variant mb-xs">
                        {period.label}
                      </div>
                      <div className="flex justify-between">
                        <div>
                          <span className={`text-label-bold font-[700] ${isPositive ? "text-primary" : "text-error"}`}>
                            {isPositive ? "+" : ""}{completedChange}
                          </span>
                          <span className="text-label-sm text-on-surface-variant ml-xs">completed</span>
                        </div>
                        <div>
                          <span className={`text-label-bold font-[700] ${onTrackChange >= 0 ? "text-tertiary" : "text-error"}`}>
                            {onTrackChange >= 0 ? "+" : ""}{onTrackChange}
                          </span>
                          <span className="text-label-sm text-on-surface-variant ml-xs">on track</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Department Breakdown */}
          {qoqAnalytics.byDepartment.length > 0 && (
            <div className="border-t-2 border-on-surface pt-md mt-md">
              <h3 className="text-label-bold font-[700] uppercase text-xs text-on-surface-variant mb-md">
                Department Performance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
                {qoqAnalytics.byDepartment.slice(0, 6).map((dept) => {
                  const q1 = dept.quarters.Q1;
                  const q2 = dept.quarters.Q2;
                  const q1Total = q1.completedGoals + q1.onTrackGoals + q1.notStartedGoals;
                  const q2Total = q2.completedGoals + q2.onTrackGoals + q2.notStartedGoals;
                  const q1Rate = q1Total > 0 ? Math.round(((q1.completedGoals + q1.onTrackGoals) / q1Total) * 100) : 0;
                  const q2Rate = q2Total > 0 ? Math.round(((q2.completedGoals + q2.onTrackGoals) / q2Total) * 100) : 0;
                  
                  return (
                    <div key={dept.managerId} className="bg-surface p-md border border-on-surface">
                      <div className="text-label-bold font-[700] text-on-surface mb-xs">
                        {dept.managerName}'s Team
                      </div>
                      <div className="flex justify-between text-label-sm mb-sm">
                        <span className="text-on-surface-variant">Q1: {q1Rate}%</span>
                        <span className="text-on-surface-variant">Q2: {q2Rate}%</span>
                      </div>
                      <div className="h-2 w-full border border-on-surface bg-surface-container-high flex">
                        <div
                          className="h-full bg-tertiary"
                          style={{ width: `${q1Rate}%` }}
                          title={`Q1: ${q1Rate}%`}
                        />
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${q2Rate}%` }}
                          title={`Q2: ${q2Rate}%`}
                        />
                      </div>
                      <div className="flex justify-between mt-xs text-label-xs text-on-surface-variant">
                        <span>Q1</span>
                        <span className={dept.trends.improvement >= 0 ? "text-primary" : "text-error"}>
                          {dept.trends.improvement >= 0 ? "+" : ""}{dept.trends.improvement}%
                        </span>
                        <span>Q2</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
        <Link
          href="/dashboard/admin/unlock"
          className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-lg shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] hover:-translate-y-1 hover:-translate-x-1 transition-all group"
        >
          <h3 className="text-headline-md font-[700] mb-sm border-b-2 border-on-surface pb-sm group-hover:border-error transition-colors">
            Goal Sheet Controls
          </h3>
          <p className="text-body-lg text-on-surface-variant">
            Force unlock locked goal sheets to allow edits.
          </p>
          <div className="mt-md text-label-bold font-[700] text-error uppercase text-xs">
            Open →
          </div>
        </Link>

        <Link
          href="/dashboard/admin/distribute"
          className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-lg shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] hover:-translate-y-1 hover:-translate-x-1 transition-all group"
        >
          <h3 className="text-headline-md font-[700] mb-sm border-b-2 border-on-surface pb-sm group-hover:border-primary transition-colors">
            Distribute KPI
          </h3>
          <p className="text-body-lg text-on-surface-variant">
            Push shared goals to multiple employees.
          </p>
          <div className="mt-md text-label-bold font-[700] text-primary uppercase text-xs">
            Open →
          </div>
        </Link>

        <Link
          href="/dashboard/admin/audit"
          className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-lg shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] hover:-translate-y-1 hover:-translate-x-1 transition-all group"
        >
          <h3 className="text-headline-md font-[700] mb-sm border-b-2 border-on-surface pb-sm group-hover:border-tertiary transition-colors">
            Audit Logs
          </h3>
          <p className="text-body-lg text-on-surface-variant">
            View system activity and modification history.
          </p>
          <div className="mt-md text-label-bold font-[700] text-tertiary uppercase text-xs">
            Open →
          </div>
        </Link>

        {userRole === "admin" && (
          <Link
            href="/dashboard/admin/employees"
            className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-lg shadow-[4px_4px_0px_0px_#000000] hover:shadow-[6px_6px_0px_0px_#000000] hover:-translate-y-1 hover:-translate-x-1 transition-all group"
          >
            <h3 className="text-headline-md font-[700] mb-sm border-b-2 border-on-surface pb-sm group-hover:border-secondary transition-colors">
              Employee Management
            </h3>
            <p className="text-body-lg text-on-surface-variant">
              Create, edit, and manage employee accounts.
            </p>
            <div className="mt-md text-label-bold font-[700] text-secondary uppercase text-xs">
              Open →
            </div>
          </Link>
        )}
      </div>
    </div>
  );
}