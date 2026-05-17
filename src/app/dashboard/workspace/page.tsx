"use client";

import { useState, useCallback, useEffect } from "react";
import {
  getOrCreateMySheet,
  getGoalSheet,
  updateSheetStatus,
} from "@/lib/actions/goal-sheet.actions";
import { upsertGoals } from "@/lib/actions/goal.actions";
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
}

const THRUST_AREAS = [
  "Revenue Growth",
  "Operational Efficiency",
  "Customer Success",
  "Innovation",
  "People & Culture",
];

function generateId() {
  return `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function GoalWorkspace() {
  const [rows, setRows] = useState<GoalRow[]>([]);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast, showSuccess, showError } = useToast();

  useEffect(() => {
    async function loadData() {
      try {
        const { supabase } = await import("@/lib/supabase/client");
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

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
            })),
          );
        } else {
          // Default empty row
          setRows([
            {
              id: generateId(),
              thrustArea: "Revenue Growth",
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
        setRows([
          {
            id: generateId(),
            thrustArea: "Revenue Growth",
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
            <div className="grid grid-cols-1 md:grid-cols-12 flex-1">
              {/* Thrust Area */}
              <div className="md:col-span-3 border-b md:border-b-0 md:border-r border-on-surface p-md bg-surface-bright flex flex-col">
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
                    {THRUST_AREAS.map((area) => (
                      <option key={area}>{area}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-sm top-1/2 -translate-y-1/2 pointer-events-none text-on-surface">
                    arrow_drop_down
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="md:col-span-5 border-b md:border-b-0 md:border-r border-on-surface p-md flex flex-col">
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

              {/* Metrics Cluster */}
              <div className="md:col-span-4 grid grid-cols-3">
                {/* Unit */}
                <div className="col-span-1 border-r border-on-surface p-md flex flex-col bg-surface-bright">
                  <label className="text-label-bold font-[700] tracking-[0.05em] text-on-surface uppercase mb-sm text-[10px]">
                    Unit
                  </label>
                  <div className="relative flex-1">
                    <select
                      value={row.unit}
                      onChange={(e) => updateRow(row.id, "unit", e.target.value)}
                      className="w-full h-full min-h-[48px] bg-transparent border border-on-surface text-label-bold font-[700] tracking-[0.05em] text-on-surface focus:ring-0 focus:border-2 focus:border-primary p-sm appearance-none rounded-none cursor-pointer"
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
                      updateRow(row.id, "target", e.target.value)
                    }
                    className="w-full flex-1 bg-transparent border border-on-surface text-headline-md font-[700] text-on-surface focus:ring-0 focus:border-2 focus:border-primary p-sm text-center rounded-none"
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
        </div>
      </aside>
    </div>
  );
}
