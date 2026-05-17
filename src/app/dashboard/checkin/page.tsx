"use client";

import { useState, useEffect } from "react";
import { calculateProgress } from "@/lib/progress-engine";
import {
  getOrCreateMySheet,
  getGoalSheet,
} from "@/lib/actions/goal-sheet.actions";
import { updateGoalActuals } from "@/lib/actions/goal.actions";
import { createNotification } from "@/lib/actions/notification.actions";
import NeoToast from "@/components/feedback/NeoToast";
import { useToast } from "@/hooks/useToast";
import type { Goal } from "@/lib/database.types";
import EvidenceUploader from "@/components/evidence/EvidenceUploader";
import EvidenceViewer from "@/components/evidence/EvidenceViewer";

export default function PerformanceCheckin() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [actuals, setActuals] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sheetId, setSheetId] = useState<string>("");
  const [managerId, setManagerId] = useState<string | null>(null);
  const [employeeName, setEmployeeName] = useState<string>("");
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});
  const { toast, showSuccess, showError } = useToast();

  const toggleEvidence = (goalId: string) => {
    setExpandedEvidence((prev) => ({ ...prev, [goalId]: !prev[goalId] }));
  };

  useEffect(() => {
    async function loadData() {
      try {
        const { supabase } = await import("@/lib/supabase/client");
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, manager_id")
          .eq("id", user.id)
          .single() as { data: { full_name: string; manager_id: string | null } | null, error: null };

        const sheet = await getOrCreateMySheet(user.id);
        const fullSheet = await getGoalSheet(sheet.id);

        setSheetId(fullSheet.id);
        setGoals(fullSheet.goals);
        setManagerId(profile?.manager_id ?? null);
        setEmployeeName(profile?.full_name ?? "Employee");

        const init: Record<string, string> = {};
        fullSheet.goals.forEach((g) => {
          init[g.id] = g.actual_achievement ?? "";
        });
        setActuals(init);
      } catch (err) {
        console.error("Failed to load goals", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const goal of goals) {
        const actual = actuals[goal.id];
        if (
          actual !== undefined &&
          actual !== (goal.actual_achievement ?? "")
        ) {
          const progress = calculateProgress(
            goal.uom,
            goal.target_value,
            actual || null,
          );
          const status =
            progress >= 100
              ? "completed"
              : progress === 0
                ? "not_started"
                : "on_track";

          await updateGoalActuals(goal.id, actual, status);
        }
      }

      if (managerId) {
        try {
          await createNotification(
            managerId,
            "Check-in Submitted",
            `${employeeName} submitted their quarterly check-in.`,
            "/dashboard/checkin"
          );
        } catch (e) {
          console.error("Failed to send notification:", e);
        }
      }

      showSuccess("Check-in saved successfully!");
    } catch (err) {
      console.error(err);
      showError("Failed to save check-in.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-xl text-center text-on-surface-variant font-[500]">
        Loading Check-in Data...
      </div>
    );
  }

  /* ─── Goal Groups by Thrust Area ─── */
  const goalsByThrust = goals.reduce<Record<string, typeof goals>>(
    (acc, goal) => {
      const area = goal.thrust_area;
      if (!acc[area]) acc[area] = [];
      acc[area].push(goal);
      return acc;
    },
    {},
  );

  const totalGoals = goals.length;
  const onTrackCount = goals.filter((g) => {
    const p = calculateProgress(g.uom, g.target_value, actuals[g.id] || null);
    return p >= 70;
  }).length;

  const overallProgress = Math.round(
    goals.reduce((sum, g) => {
      const p = calculateProgress(g.uom, g.target_value, actuals[g.id] || null);
      return sum + (p * g.weightage) / 100;
    }, 0) || 0,
  );

  return (
    <div className="flex flex-col gap-xl md:gap-2xl max-w-[1440px] mx-auto w-full">
      <NeoToast toast={toast} />
      {/* Header Section */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-md">
        <div>
          <div className="inline-flex items-center gap-xs px-sm py-xs border border-on-surface rounded bg-surface-container-low mb-sm">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-label-sm font-[500] tracking-[0.02em] uppercase text-on-surface-variant">
              Q4 Review Phase
            </span>
          </div>
          <h1 className="text-headline-lg-mobile md:text-headline-lg font-[800] text-on-surface">
            Quarterly Performance Check-in
          </h1>
          <p className="text-body-lg font-[400] text-on-surface-variant mt-sm max-w-[42rem]">
            Enter actual achievements against targets. Goals are locked for
            editing during the review phase.
          </p>
        </div>
        <div className="flex items-center gap-md">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-lg py-sm bg-surface-container-lowest text-on-surface border border-on-surface text-label-bold font-[700] tracking-[0.05em] hover:bg-surface-container-low transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-lg py-sm bg-on-surface text-surface border border-on-surface text-label-bold font-[700] tracking-[0.05em] hover:shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-px hover:-translate-x-px transition-all flex items-center gap-xs disabled:opacity-50"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontVariationSettings: "'wght' 700" }}
            >
              send
            </span>
            Submit Review
          </button>
        </div>
      </section>

      {/* KPI Summary Bento */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        {/* Total Goals */}
        <div className="bg-surface-container-lowest border border-on-surface p-lg flex flex-col justify-between min-h-[160px]">
          <h3 className="text-label-bold font-[700] tracking-[0.05em] text-on-surface-variant uppercase">
            Total Goals
          </h3>
          <div className="flex items-baseline gap-sm mt-auto">
            <span className="text-display-xl font-[800] text-on-surface">
              {totalGoals}
            </span>
            <span className="text-body-md font-[400] text-on-surface-variant">
              active
            </span>
          </div>
        </div>

        {/* On Track */}
        <div className="bg-surface-container-lowest border border-on-surface p-lg flex flex-col justify-between min-h-[160px]">
          <h3 className="text-label-bold font-[700] tracking-[0.05em] text-on-surface-variant uppercase">
            On Track
          </h3>
          <div className="flex items-baseline gap-sm mt-auto">
            <span className="text-display-xl font-[800] text-primary">
              {onTrackCount}
            </span>
            <span className="text-body-md font-[400] text-on-surface-variant">
              goals
            </span>
          </div>
        </div>

        {/* Overall Completion */}
        <div className="bg-primary text-on-primary border border-on-surface p-lg flex flex-col justify-between min-h-[160px]">
          <h3 className="text-label-bold font-[700] tracking-[0.05em] text-on-primary-container uppercase">
            Overall Completion
          </h3>
          <div className="flex items-baseline gap-sm mt-auto">
            <span className="text-display-xl font-[800]">
              {overallProgress}%
            </span>
          </div>
        </div>
      </section>

      {/* Goal Review Rows */}
      {Object.entries(goalsByThrust).map(([thrustArea, tGoals]) => (
        <section key={thrustArea} className="flex flex-col gap-gutter">
          <h2 className="text-headline-md font-[700] text-on-surface border-b-2 border-on-surface pb-sm mb-sm">
            {thrustArea}
          </h2>

          {tGoals.map((goal) => {
            const actual = actuals[goal.id] ?? "";
            const progress = calculateProgress(
              goal.uom,
              goal.target_value,
              actual || null,
            );
            const isOnTrack = progress >= 70;
            const isAtRisk = progress >= 30 && progress < 70;

            /* Format display target */
            const displayTarget = (() => {
              if (goal.uom === "percentage_min" || goal.uom === "percentage_max") {
                return `${goal.target_value}%`;
              }
              if (goal.uom === "timeline") {
                return goal.target_value; // Assuming date string
              }
              if (goal.uom === "zero_based") {
                return "0 (Zero)";
              }
              // Numeric fallback with existing "smart" logic
              const val = parseFloat(goal.target_value);
              if (goal.uom === "numeric_min" && val >= 1000000) {
                return `$${(val / 1000000).toFixed(1)}M`;
              }
              if (goal.uom === "numeric_max") {
                return `${goal.target_value}`;
              }
              return goal.target_value;
            })();

            const statusLabel = isOnTrack
              ? "On Track"
              : isAtRisk
                ? "At Risk"
                : progress === 0
                  ? "Not Started"
                  : "Behind";

            const statusColor = isOnTrack
              ? "text-primary"
              : isAtRisk
                ? "text-tertiary-container"
                : "text-on-surface-variant";

            const barColor = isOnTrack
              ? "bg-primary"
              : isAtRisk
                ? "bg-tertiary-container"
                : "bg-outline";

            return (
              <div
                key={goal.id}
                className="bg-surface-container-lowest border border-on-surface p-lg flex flex-col gap-lg hover:bg-surface-bright transition-colors relative group"
              >
                {/* Lock icon */}
                <div className="absolute top-sm right-sm text-outline group-hover:text-on-surface">
                  <span
                    className="material-symbols-outlined"
                    title="Locked during review phase"
                  >
                    lock
                  </span>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-md">
                  <div className="flex-1">
                    <div className="flex items-center gap-sm mb-xs">
                      <span className="px-xs py-base border border-on-surface bg-surface-container-high text-label-sm font-[500] tracking-[0.02em] rounded-none">
                        Q4
                      </span>
                      <h3 className="text-headline-md font-[700] text-on-surface">
                        {goal.title}
                      </h3>
                    </div>
                    <p className="text-body-md font-[400] text-on-surface-variant">
                      {goal.description}
                    </p>
                  </div>
                  <div className="flex gap-lg">
                    {/* Target */}
                    <div className="text-right">
                      <p className="text-label-sm font-[500] tracking-[0.02em] text-on-surface-variant uppercase mb-xs">
                        Target
                      </p>
                      <p className="text-headline-md font-[700] text-on-surface">
                        {displayTarget}
                      </p>
                    </div>
                    <div className="w-px bg-outline-variant hidden md:block" />
                    {/* Actual Achievement */}
                    <div>
                      <p className="text-label-sm font-[500] tracking-[0.02em] text-on-surface-variant uppercase mb-xs">
                        Actual Achievement
                      </p>
                      <div className="relative flex items-center">
                        {(goal.uom === "numeric_min" && parseFloat(goal.target_value) >= 1000000) && (
                          <span className="absolute left-sm top-1/2 -translate-y-1/2 text-label-bold font-[700] tracking-[0.05em] text-on-surface-variant">
                            $
                          </span>
                        )}
                        <input
                          type="text"
                          value={actual}
                          onChange={(e) =>
                            setActuals((prev) => ({
                              ...prev,
                              [goal.id]: e.target.value,
                            }))
                          }
                          className={`w-32 py-xs bg-surface-container-highest border-b-2 border-on-surface focus:border-primary focus:bg-primary-fixed focus:outline-none text-headline-md font-[700] text-on-surface transition-colors ${
                            (goal.uom === "numeric_min" && parseFloat(goal.target_value) >= 1000000)
                              ? "pl-lg pr-sm"
                              : (goal.uom === "percentage_min" || goal.uom === "percentage_max" || (goal.uom === "numeric_min" && parseFloat(goal.target_value) < 1000000) || goal.uom === "numeric_max")
                                ? "pl-sm pr-lg text-right"
                                : "pl-sm pr-sm"
                          }`}
                          placeholder="0"
                        />
                        {(goal.uom === "percentage_min" || goal.uom === "percentage_max" || (goal.uom === "numeric_min" && parseFloat(goal.target_value) < 1000000)) && (
                          <span className="absolute right-sm top-1/2 -translate-y-1/2 text-label-bold font-[700] tracking-[0.05em] text-on-surface-variant">
                            %
                          </span>
                        )}
                        
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="flex flex-col gap-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-label-sm font-[500] tracking-[0.02em] text-on-surface-variant">
                      Progress ({progress}%)
                    </span>
                    <span
                      className={`text-label-sm font-[700] tracking-[0.02em] ${statusColor}`}
                    >
                      {statusLabel}
                    </span>
                  </div>
                  <div className="w-full h-3 border border-on-surface bg-surface-container-high relative">
                    <div
                      className={`absolute top-0 left-0 h-full ${barColor}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Evidence Section */}
                <div className="border-t border-on-surface-variant pt-md mt-md">
                  <button
                    type="button"
                    onClick={() => toggleEvidence(goal.id)}
                    className="flex items-center gap-sm text-label-md font-[500] text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      {expandedEvidence[goal.id] ? "expand_less" : "expand_more"}
                    </span>
                    Attach Evidence
                    {(goal.evidence_url as any[])?.length > 0 && (
                      <span className="px-xs py-xs bg-primary/20 text-primary text-label-xs font-[700] rounded">
                        {(goal.evidence_url as any[]).length}
                      </span>
                    )}
                  </button>
                  {expandedEvidence[goal.id] && (
                    <div className="mt-md">
                      <EvidenceUploader
                        goalId={goal.id}
                        sheetId={goal.goal_sheet_id}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
