"use client";

import { useState, useCallback, useEffect } from "react";
import {
  getOrCreateMySheet,
  getGoalSheet,
  updateSheetStatus,
} from "@/lib/actions/goal-sheet.actions";
import { upsertGoals } from "@/lib/actions/goal.actions";
import { getThrustAreas, getCurrentPhase, submitCheckin, getGoalCheckins, PhaseInfo, GoalCheckin } from "@/lib/actions/admin.actions";
import NeoToast from "@/components/feedback/NeoToast";
import { useToast } from "@/hooks/useToast";
import type { GoalInsert } from "@/lib/database.types";

/* ─── Types ─── */
interface GoalRow {
  id: string; // "new-..." for unsaved, or real UUID
  thrustArea: string;
  title: string;
  description: string;
  unit: string;
  target: string;
  weightage: number;
  parentGoalId?: string | null;
}

function generateId() {
  return `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function GoalWorkspace() {
  const [rows, setRows] = useState<GoalRow[]>([]);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [thrustAreas, setThrustAreas] = useState<string[]>([]);
  const [currentPhase, setCurrentPhase] = useState<PhaseInfo | null>(null);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [checkins, setCheckins] = useState<Record<string, GoalCheckin[]>>({});
  const [checkinForm, setCheckinForm] = useState<Record<string, { actual: string; progress: string }>>({});
  const [submittingCheckin, setSubmittingCheckin] = useState(false);
  const { toast, showSuccess, showError } = useToast();

  useEffect(() => {
    async function loadData() {
      try {
        const { supabase } = await import("@/lib/supabase/client");
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        // Load current phase
        const phase = await getCurrentPhase();
        setCurrentPhase(phase);

        // Load thrust areas first
        const areas = await getThrustAreas();
        const areaNames = areas.map(a => a.name);
        setThrustAreas(areaNames);

        const defaultThrustArea = areaNames[0] || "Strategic";

        const sheet = await getOrCreateMySheet(user.id);
        const fullSheet = await getGoalSheet(sheet.id);

        setSheetId(fullSheet.id);
        if (fullSheet.goals.length > 0) {
          setRows(
            fullSheet.goals.map((g) => ({
              id: g.id,
              thrustArea: g.thrust_area,
              title: g.title,
              description: g.description,
              unit: g.uom,
              target: g.target_value,
              weightage: g.weightage,
              parentGoalId: g.parent_goal_id,
            })),
          );
        } else {
          // Default empty row
          setRows([
            {
              id: generateId(),
              thrustArea: defaultThrustArea,
              title: "New Goal",
              description: "",
              unit: "numeric_min",
              target: "100",
              weightage: 10,
            },
          ]);
        }
      } catch (err) {
        console.warn("Using fallback/mock state due to db error", err);
        // Fallback thrust areas
        setThrustAreas(["Strategic", "Operational", "Developmental"]);
        setRows([
          {
            id: generateId(),
            thrustArea: "Strategic",
            title: "New Goal",
            description: "",
            unit: "numeric_min",
            target: "100",
            weightage: 10,
          },
        ]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalWeight = rows.reduce((s, r) => s + (r.weightage || 0), 0);
  const deficit = 100 - totalWeight;
  const isValid =
    totalWeight === 100 &&
    rows.length <= 8 &&
    rows.every((r) => r.weightage >= 10);
  const canAddRow = rows.length < 8;

  const updateRow = useCallback(
    (id: string, field: keyof GoalRow, value: string | number) => {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
      );
    },
    [],
  );

  const removeRow = useCallback((id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const addRow = useCallback(() => {
    if (!canAddRow) return;
    setRows((prev) => [
      ...prev,
      {
        id: generateId(),
        thrustArea: "Revenue Growth",
        title: "New Goal",
        description: "",
        unit: "numeric_min",
        target: "",
        weightage: 10,
      },
    ]);
  }, [canAddRow]);

  const handleSubmit = async () => {
    if (!isValid || !sheetId) return;
    setSaving(true);
    try {
      const dbGoals: (GoalInsert & { id?: string })[] = rows.map((r) => {
        const base: GoalInsert = {
          goal_sheet_id: sheetId,
          thrust_area: r.thrustArea,
          title: r.title,
          description: r.description,
          uom: r.unit as any, // Explicitly cast to UomType
          target_value: String(r.target),
          weightage: r.weightage,
          actual_achievement: null,
          progress_status: "not_started",
          parent_goal_id: null,
          sort_order: 0,
        };
        return r.id.startsWith("new-") ? base : { ...base, id: r.id };
      });

      await upsertGoals(sheetId, dbGoals);
      await updateSheetStatus(sheetId, "submitted");
      showSuccess("Goals submitted successfully!");
    } catch (err) {
      console.error(err);
      showError("Failed to submit goals.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-xl">
      <NeoToast toast={toast} />
      {/* ─── Goal Rows Section ─── */}
      <section className="flex-1 max-w-[1200px] flex flex-col gap-lg">
        <header className="mb-md">
          {currentPhase && (
            <div className="inline-flex items-center gap-sm px-md py-sm border-2 border-primary bg-primary-container mb-md">
              <span className="material-symbols-outlined text-primary">event_note</span>
              <span className="text-label-bold font-[700] uppercase text-primary">
                Current Phase: {currentPhase.phaseLabel}
              </span>
              <span className="text-body-sm text-on-surface-variant">
                ({currentPhase.windowStart} — {currentPhase.windowEnd})
              </span>
            </div>
          )}
          <h1 className="text-headline-lg-mobile md:text-headline-lg font-[800] text-on-surface mb-xs uppercase">
            Goal Workspace
          </h1>
          <p className="text-body-lg font-[400] text-on-surface-variant">
            Define structured objectives. Total weight must equal 100% prior to
            submission.
          </p>
        </header>

        {rows.map((row) => (
          <div
            key={row.id}
            className="bg-surface-container-lowest border-2 border-on-surface shadow-[4px_4px_0px_0px_#1b1b1b] hover:shadow-[6px_6px_0px_0px_#1b1b1b] transition-shadow duration-200"
          >
            {/* Row 1: Title + Description (all screens) / Title + Thrust + Description + Metrics (2xl+) */}
            <div className="3xl:grid 3xl:grid-cols-12 flex flex-col">
              {/* Title */}
              <div className="3xl:col-span-3 border-b-2 3xl:border-b-0 3xl:border-r border-on-surface p-md flex flex-col">
                <label className="text-label-bold font-[700] tracking-[0.05em] text-on-surface uppercase mb-sm text-[10px] flex items-center gap-xs">
                  Title
                  {row.parentGoalId && (
                    <span className="text-[10px] bg-primary text-on-primary px-xs py-px rounded uppercase tracking-wider">Shared KPI</span>
                  )}
                </label>
                <input
                  type="text"
                  value={row.title}
                  onChange={(e) =>
                    !row.parentGoalId && updateRow(row.id, "title", e.target.value)
                  }
                  disabled={!!row.parentGoalId}
                  className={`w-full flex-1 min-h-[48px] bg-transparent border text-body-md font-[700] focus:ring-0 focus:border-2 focus:border-primary p-sm rounded-none placeholder:text-on-surface-variant ${row.parentGoalId ? 'border-dashed border-on-surface-variant text-on-surface-variant cursor-not-allowed' : 'border-on-surface text-on-surface'}`}
                  placeholder="Goal title..."
                />
              </div>

              {/* Thrust Area - only on 2xl, otherwise in row 2 */}
              <div className="hidden 3xl:flex 3xl:col-span-2 border-b-2 3xl:border-b-0 3xl:border-r border-on-surface p-md bg-surface-bright flex flex-col">
                <label className="text-label-bold font-[700] tracking-[0.05em] text-on-surface uppercase mb-sm text-[10px]">
                  Thrust Area
                </label>
                <div className="relative flex-1">
                  <select
                    value={row.thrustArea}
                    onChange={(e) =>
                      updateRow(row.id, "thrustArea", e.target.value)
                    }
                    className="w-full h-full min-h-[48px] bg-transparent border border-on-surface text-body-md font-[400] text-on-surface focus:ring-0 focus:border-2 focus:border-primary p-sm appearance-none rounded-none cursor-pointer"
                  >
                    {thrustAreas.map((area) => (
                      <option key={area}>{area}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-sm top-1/2 -translate-y-1/2 pointer-events-none text-on-surface">
                    arrow_drop_down
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="3xl:col-span-4 border-b-2 3xl:border-b-0 3xl:border-r border-on-surface p-md flex flex-col">
                <label className="text-label-bold font-[700] tracking-[0.05em] text-on-surface uppercase mb-sm text-[10px]">
                  Objective Description
                </label>
                <textarea
                  value={row.description}
                  onChange={(e) =>
                    updateRow(row.id, "description", e.target.value)
                  }
                  className="w-full flex-1 min-h-[48px] bg-transparent border border-on-surface text-body-md font-[400] text-on-surface focus:ring-0 focus:border-2 focus:border-primary p-sm resize-none rounded-none placeholder:text-on-surface-variant"
                  placeholder="Enter objective..."
                />
              </div>

              {/* Metrics Cluster - only on 2xl */}
              <div className="hidden 3xl:grid 3xl:col-span-3 grid-cols-3">
                {/* Unit */}
                <div className="col-span-1 border-r border-on-surface p-md flex flex-col bg-surface-bright">
                  <label className="text-label-bold font-[700] tracking-[0.05em] text-on-surface uppercase mb-sm text-[10px]">
                    Unit
                  </label>
                  <div className="relative flex-1">
                    <select
                      value={row.unit}
                      onChange={(e) => !row.parentGoalId && updateRow(row.id, "unit", e.target.value)}
                      disabled={!!row.parentGoalId}
                      className={`w-full h-full min-h-[48px] bg-transparent border text-label-bold font-[700] tracking-[0.05em] focus:ring-0 focus:border-2 focus:border-primary p-sm appearance-none rounded-none ${row.parentGoalId ? 'border-dashed border-on-surface-variant text-on-surface-variant cursor-not-allowed' : 'border-on-surface text-on-surface'}`}
                    >
                      <optgroup label="Min (Higher is Better)">
                        <option value="numeric_min">Numeric (Min)</option>
                        <option value="percentage_min">Percentage (Min)</option>
                      </optgroup>
                      <optgroup label="Max (Lower is Better)">
                        <option value="numeric_max">Numeric (Max)</option>
                        <option value="percentage_max">Percentage (Max)</option>
                      </optgroup>
                      <option value="timeline">Timeline</option>
                      <option value="zero_based">Zero Based</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface text-[16px]">
                      arrow_drop_down
                    </span>
                  </div>
                </div>
                {/* Target */}
                <div className="col-span-1 border-r border-on-surface p-md flex flex-col bg-surface">
                  <label className="text-label-bold font-[700] tracking-[0.05em] text-on-surface uppercase mb-sm text-[10px]">
                    Target
                  </label>
                  <input
                    type="number"
                    value={row.target}
                    onChange={(e) =>
                      !row.parentGoalId && updateRow(row.id, "target", e.target.value)
                    }
                    disabled={!!row.parentGoalId}
                    className={`w-full flex-1 bg-transparent border text-headline-md font-[700] focus:ring-0 focus:border-2 focus:border-primary p-sm text-center rounded-none ${row.parentGoalId ? 'border-dashed border-on-surface-variant text-on-surface-variant cursor-not-allowed' : 'border-on-surface text-on-surface'}`}
                  />
                </div>
                {/* Weight */}
                <div className="col-span-1 p-md flex flex-col bg-primary-container/10">
                  <label className="text-label-bold font-[700] tracking-[0.05em] text-primary uppercase mb-sm text-[10px]">
                    Weight %
                  </label>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={10}
                      max={100}
                      value={row.weightage}
                      onChange={(e) =>
                        updateRow(
                          row.id,
                          "weightage",
                          parseInt(e.target.value) || 0,
                        )
                      }
                      className="w-full h-full bg-surface-container-lowest border-2 border-primary text-headline-md font-[700] text-primary focus:ring-0 p-sm text-center rounded-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Thrust Area + Metrics (only on screens smaller than 2xl) */}
            <div className="3xl:hidden grid grid-cols-2">
              {/* Thrust Area */}
              <div className="col-span-1 border-r border-b border-on-surface p-md bg-surface-bright flex flex-col">
                <label className="text-label-bold font-[700] tracking-[0.05em] text-on-surface uppercase mb-sm text-[10px]">
                  Thrust Area
                </label>
                <div className="relative flex-1">
                  <select
                    value={row.thrustArea}
                    onChange={(e) =>
                      updateRow(row.id, "thrustArea", e.target.value)
                    }
                    className="w-full h-full min-h-[48px] bg-transparent border border-on-surface text-body-md font-[400] text-on-surface focus:ring-0 focus:border-2 focus:border-primary p-sm appearance-none rounded-none cursor-pointer"
                  >
                    {thrustAreas.map((area) => (
                      <option key={area}>{area}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-sm top-1/2 -translate-y-1/2 pointer-events-none text-on-surface">
                    arrow_drop_down
                  </span>
                </div>
              </div>

              {/* Metrics: Unit + Target + Weight */}
              <div className="col-span-1 grid grid-cols-3 border-b border-on-surface">
                {/* Unit */}
                <div className="col-span-1 border-r border-on-surface p-md flex flex-col bg-surface-bright">
                  <label className="text-label-bold font-[700] tracking-[0.05em] text-on-surface uppercase mb-sm text-[10px]">
                    Unit
                  </label>
                  <div className="relative flex-1">
                    <select
                      value={row.unit}
                      onChange={(e) => !row.parentGoalId && updateRow(row.id, "unit", e.target.value)}
                      disabled={!!row.parentGoalId}
                      className={`w-full h-full min-h-[48px] bg-transparent border text-label-bold font-[700] tracking-[0.05em] focus:ring-0 focus:border-2 focus:border-primary p-sm appearance-none rounded-none ${row.parentGoalId ? 'border-dashed border-on-surface-variant text-on-surface-variant cursor-not-allowed' : 'border-on-surface text-on-surface'}`}
                    >
                      <optgroup label="Min">
                        <option value="numeric_min">Num</option>
                        <option value="percentage_min">%</option>
                      </optgroup>
                      <optgroup label="Max">
                        <option value="numeric_max">Num</option>
                        <option value="percentage_max">%</option>
                      </optgroup>
                      <option value="timeline">Time</option>
                      <option value="zero_based">Zero</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface text-[16px]">
                      arrow_drop_down
                    </span>
                  </div>
                </div>
                {/* Target */}
                <div className="col-span-1 border-r border-on-surface p-md flex flex-col bg-surface">
                  <label className="text-label-bold font-[700] tracking-[0.05em] text-on-surface uppercase mb-sm text-[10px]">
                    Target
                  </label>
                  <input
                    type="number"
                    value={row.target}
                    onChange={(e) =>
                      !row.parentGoalId && updateRow(row.id, "target", e.target.value)
                    }
                    disabled={!!row.parentGoalId}
                    className={`w-full flex-1 bg-transparent border text-headline-md font-[700] focus:ring-0 focus:border-2 focus:border-primary p-sm text-center rounded-none ${row.parentGoalId ? 'border-dashed border-on-surface-variant text-on-surface-variant cursor-not-allowed' : 'border-on-surface text-on-surface'}`}
                  />
                </div>
                {/* Weight */}
                <div className="col-span-1 p-md flex flex-col bg-primary-container/10">
                  <label className="text-label-bold font-[700] tracking-[0.05em] text-primary uppercase mb-sm text-[10px]">
                    Weight %
                  </label>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={10}
                      max={100}
                      value={row.weightage}
                      onChange={(e) =>
                        updateRow(
                          row.id,
                          "weightage",
                          parseInt(e.target.value) || 0,
                        )
                      }
                      className="w-full h-full bg-surface-container-lowest border-2 border-primary text-headline-md font-[700] text-primary focus:ring-0 p-sm text-center rounded-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Row actions (mobile delete) */}
            {rows.length > 1 && (
              <div className="border-t border-on-surface p-sm flex justify-end">
                <button
                  onClick={() => removeRow(row.id)}
                  className="text-label-sm font-[500] tracking-[0.02em] text-error flex items-center gap-xs hover:underline"
                >
                  <span className="material-symbols-outlined text-[16px]">
                    delete
                  </span>
                  Remove
                </button>
              </div>
            )}
          </div>
        ))}

        {/* Add Row Button */}
        {canAddRow && (
          <button
            onClick={addRow}
            className="self-start px-lg py-sm border-2 border-dashed border-on-surface-variant text-on-surface-variant text-label-bold font-[700] tracking-[0.05em] hover:bg-surface-container-high hover:border-on-surface hover:text-on-surface transition-colors flex items-center gap-sm"
          >
            <span className="material-symbols-outlined">add</span>
            Append Goal Row ({rows.length}/8)
          </button>
        )}
      </section>

      {/* ─── Validation Sticky Panel ─── */}
      <aside className="xl:w-[320px] shrink-0">
        <div className="sticky top-margin-desktop bg-surface-container-lowest border-2 border-on-surface shadow-[8px_8px_0px_0px_#1b1b1b] flex flex-col">
          {/* Header */}
          <div
            className={`p-lg border-b-2 border-on-surface flex flex-col gap-sm ${
              isValid
                ? "bg-primary-fixed text-on-primary-fixed"
                : "bg-error-container text-on-error-container"
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-headline-md font-[800] uppercase tracking-tight">
                Validation
              </h2>
              <span className="material-symbols-outlined text-[32px] filled-icon">
                {isValid ? "check_circle" : "warning"}
              </span>
            </div>
            <div className="text-body-md font-[400]">
              {isValid
                ? "All validations passed. Ready for submission."
                : "Total weight is incomplete. Adjusted targets required."}
            </div>
          </div>

          {/* Metrics */}
          <div className="p-lg flex flex-col gap-md">
            <div className="flex justify-between items-end border-b border-on-surface pb-xs">
              <span className="text-label-bold font-[700] tracking-[0.05em] text-on-surface uppercase">
                Current Total
              </span>
              <span
                className={`text-display-xl font-[800] leading-none ${
                  isValid ? "text-primary" : "text-error"
                }`}
              >
                {totalWeight}
                <span className="text-headline-md">%</span>
              </span>
            </div>
            <div className="flex justify-between items-end">
              <span className="text-label-sm font-[500] tracking-[0.02em] text-on-surface-variant uppercase">
                {deficit >= 0 ? "Deficit" : "Excess"}
              </span>
              <span className="text-headline-md font-[700] text-on-surface">
                {Math.abs(deficit)}%
              </span>
            </div>
            {/* Progress Bar */}
            <div className="h-6 w-full border-2 border-on-surface bg-surface-container-high mt-sm flex">
              <div
                className={`h-full border-r-2 border-on-surface ${
                  isValid ? "bg-primary" : "bg-error"
                }`}
                style={{ width: `${Math.min(totalWeight, 100)}%` }}
              />
              <div className="h-full bg-transparent flex-1" />
            </div>

            {/* Per-goal validations */}
            <div className="space-y-xs mt-md">
              <span className="text-label-bold font-[700] tracking-[0.05em] text-on-surface uppercase text-[10px]">
                Goal Weights
              </span>
              {rows.map((r, i) => (
                <div
                  key={r.id}
                  className="flex justify-between items-center text-label-sm font-[500] tracking-[0.02em]"
                >
                  <span className="text-on-surface-variant truncate max-w-[180px]">
                    {r.thrustArea || `Goal ${i + 1}`}
                  </span>
                  <span
                    className={
                      r.weightage < 10
                        ? "text-error font-bold"
                        : "text-on-surface"
                    }
                  >
                    {r.weightage}%{r.weightage < 10 && " ⚠"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="p-lg pt-0 mt-auto">
            {loading ? (
              <div className="w-full text-center p-md text-on-surface-variant font-[500]">
                Loading workspace...
              </div>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!isValid || saving}
                className={`w-full border-2 border-on-surface p-md text-label-bold font-[700] tracking-[0.05em] flex items-center justify-center gap-sm uppercase transition-all ${
                  isValid && !saving
                    ? "bg-primary text-on-primary shadow-[4px_4px_0px_0px_#1b1b1b] -translate-y-[2px] hover:-translate-y-[4px] hover:shadow-[6px_6px_0px_0px_#1b1b1b] cursor-pointer"
                    : "bg-on-surface text-on-primary opacity-90 cursor-not-allowed shadow-[4px_4px_0px_0px_#1b1b1b]"
                }`}
              >
                <span className="material-symbols-outlined">
                  {isValid && !saving ? "send" : "lock"}
                </span>
                {saving ? "Submitting..." : "Submit Workspace"}
              </button>
            )}
          </div>

          {/* Check-in Button */}
          <div className="px-lg pb-lg">
            <button
              onClick={() => setShowCheckinModal(true)}
              className="w-full border-2 border-on-surface bg-tertiary text-on-tertiary p-md text-label-bold font-[700] tracking-[0.05em] flex items-center justify-center gap-sm uppercase shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_0px_#000000] transition-all"
            >
              <span className="material-symbols-outlined">analytics</span>
              Submit Check-in
            </button>
            <p className="text-label-sm text-on-surface-variant text-center mt-xs">
              Current: {currentPhase?.phaseLabel || "Loading..."}
            </p>
          </div>
        </div>
      </aside>

      {/* Check-in Modal */}
      {showCheckinModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-md">
          <div className="bg-surface border-2 border-on-surface shadow-[8px_8px_0px_0px_#000000] max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="border-b-2 border-on-surface p-lg bg-primary">
              <h2 className="text-headline-md font-[800] text-on-primary uppercase">
                Submit {currentPhase?.phaseLabel} Check-in
              </h2>
              <p className="text-body-lg text-on-primary mt-xs">
                Update progress for each of your goals
              </p>
            </div>
            <div className="p-lg flex flex-col gap-lg">
              {rows.filter(r => !r.parentGoalId).map((goal) => (
                <div key={goal.id} className="border-2 border-on-surface p-md">
                  <div className="flex items-center justify-between mb-md">
                    <div>
                      <h3 className="text-label-bold font-[700] text-on-surface uppercase">{goal.title}</h3>
                      <p className="text-body-sm text-on-surface-variant">{goal.thrustArea} • {goal.target} {goal.unit}</p>
                    </div>
                    <span className="px-sm py-xs border border-on-surface bg-surface text-label-bold font-[700] text-xs">
                      {goal.weightage}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-md">
                    <div className="flex flex-col gap-xs">
                      <label className="text-label-bold font-[700] uppercase text-xs">Actual Achievement</label>
                      <input
                        type="text"
                        value={checkinForm[goal.id]?.actual || ""}
                        onChange={(e) => setCheckinForm(prev => ({
                          ...prev,
                          [goal.id]: { ...prev[goal.id], actual: e.target.value, progress: prev[goal.id]?.progress || "not_started" }
                        }))}
                        placeholder="Enter actual achievement..."
                        className="border-2 border-on-surface p-sm bg-surface"
                      />
                    </div>
                    <div className="flex flex-col gap-xs">
                      <label className="text-label-bold font-[700] uppercase text-xs">Progress Status</label>
                      <select
                        value={checkinForm[goal.id]?.progress || "not_started"}
                        onChange={(e) => setCheckinForm(prev => ({
                          ...prev,
                          [goal.id]: { ...prev[goal.id], progress: e.target.value }
                        }))}
                        className="border-2 border-on-surface p-sm bg-surface"
                      >
                        <option value="not_started">Not Started</option>
                        <option value="on_track">On Track</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t-2 border-on-surface p-lg flex gap-md justify-end">
              <button
                onClick={() => setShowCheckinModal(false)}
                className="px-lg py-sm border-2 border-on-surface bg-surface text-on-surface text-label-bold font-[700] uppercase"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setSubmittingCheckin(true);
                  try {
                    for (const goal of rows.filter(r => !r.parentGoalId)) {
                      const form = checkinForm[goal.id];
                      if (form?.actual || form?.progress) {
                        await submitCheckin(goal.id, form.actual || "", form.progress || "not_started");
                      }
                    }
                    showSuccess("Check-in submitted successfully!");
                    setShowCheckinModal(false);
                  } catch (err) {
                    showError(err instanceof Error ? err.message : "Failed to submit check-in");
                  } finally {
                    setSubmittingCheckin(false);
                  }
                }}
                disabled={submittingCheckin}
                className="px-lg py-sm border-2 border-on-surface bg-primary text-on-primary text-label-bold font-[700] uppercase shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_0px_#000000] transition-all disabled:opacity-50"
              >
                {submittingCheckin ? "Submitting..." : "Submit Check-in"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
