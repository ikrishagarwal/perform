"use client";

import { useState } from "react";
import { upsertGoals } from "@/lib/actions/goal.actions";
import { useToast } from "@/hooks/useToast";
import NeoToast from "@/components/feedback/NeoToast";
import type { Goal, GoalInsert } from "@/lib/database.types";
import EvidenceViewer from "@/components/evidence/EvidenceViewer";

export default function ManagerReviewGoalList({ 
  initialGoals, 
  sheetId,
  isLocked 
}: { 
  initialGoals: Goal[], 
  sheetId: string,
  isLocked: boolean
}) {
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedEvidence, setExpandedEvidence] = useState<Record<string, boolean>>({});
  const { toast, showSuccess, showError } = useToast();

  const toggleEvidence = (goalId: string) => {
    setExpandedEvidence(prev => ({ ...prev, [goalId]: !prev[goalId] }));
  };

  const updateGoal = (id: string, field: keyof Goal, value: any) => {
    if (isLocked) return;
    setGoals(prev => prev.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const dbGoals: (GoalInsert & { id?: string })[] = goals.map(g => ({
        goal_sheet_id: sheetId,
        thrust_area: g.thrust_area,
        title: g.title,
        description: g.description,
        uom: g.uom,
        target_value: g.target_value,
        weightage: g.weightage,
        actual_achievement: g.actual_achievement,
        progress_status: g.progress_status,
        parent_goal_id: g.parent_goal_id,
        sort_order: g.sort_order,
        evidence_url: g.evidence_url,
        id: g.id
      }));

      await upsertGoals(sheetId, dbGoals);
      showSuccess("Goal modifications saved.");
    } catch (err) {
      showError("Failed to save goal modifications.");
    } finally {
      setIsSaving(false);
    }
  };

  const totalWeight = goals.reduce((s, g) => s + g.weightage, 0);

  return (
    <div className="space-y-md">
      <NeoToast toast={toast} />
      <div className="flex justify-between items-center border-b border-on-surface pb-sm">
        <h3 className="text-label-bold">Goal Composition</h3>
        {!isLocked && (
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-md py-xs bg-primary text-on-primary border border-on-surface text-label-sm font-bold"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        )}
      </div>

      <div className="flex flex-col gap-sm">
        {goals.map((g) => (
          <div key={g.id} className="p-md border border-on-surface bg-surface shadow-[2px_2px_0px_0px_#000000]">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-md">
              <div className="md:col-span-3 flex flex-col gap-xs">
                <label className="text-[10px] uppercase font-bold text-on-surface-variant">Thrust Area</label>
                <input 
                  value={g.thrust_area}
                  disabled={isLocked}
                  onChange={(e) => updateGoal(g.id, "thrust_area", e.target.value)}
                  className="w-full bg-transparent border border-on-surface p-xs text-label-sm"
                />
              </div>
              <div className="md:col-span-5 flex flex-col gap-xs">
                <label className="text-[10px] uppercase font-bold text-on-surface-variant">Title</label>
                <input 
                  value={g.title}
                  disabled={isLocked}
                  onChange={(e) => updateGoal(g.id, "title", e.target.value)}
                  className="w-full bg-transparent border border-on-surface p-xs text-label-sm font-bold"
                />
              </div>
              <div className="md:col-span-2 flex flex-col gap-xs">
                <label className="text-[10px] uppercase font-bold text-on-surface-variant">Target</label>
                <input 
                  value={g.target_value}
                  disabled={isLocked}
                  onChange={(e) => updateGoal(g.id, "target_value", e.target.value)}
                  className="w-full bg-transparent border border-on-surface p-xs text-label-sm text-center"
                />
              </div>
              <div className="md:col-span-2 flex flex-col gap-xs">
                <label className="text-[10px] uppercase font-bold text-on-surface-variant">Weight (%)</label>
                <input 
                  type="number"
                  value={g.weightage}
                  disabled={isLocked}
                  onChange={(e) => updateGoal(g.id, "weightage", parseInt(e.target.value) || 0)}
                  className="w-full bg-transparent border border-on-surface p-xs text-label-sm text-center font-bold text-primary"
                />
              </div>
              <div className="md:col-span-12 flex flex-col gap-xs">
                <label className="text-[10px] uppercase font-bold text-on-surface-variant">Description</label>
                <textarea 
                  value={g.description}
                  disabled={isLocked}
                  onChange={(e) => updateGoal(g.id, "description", e.target.value)}
                  className="w-full bg-transparent border border-on-surface p-xs text-label-sm h-16 resize-none"
                />
              </div>

              <div className="md:col-span-12">
                <button
                  type="button"
                  onClick={() => toggleEvidence(g.id)}
                  className="flex items-center gap-sm text-label-md font-[500] text-on-surface-variant hover:text-on-surface transition-colors mt-md pt-md border-t border-on-surface-variant"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {expandedEvidence[g.id] ? "expand_less" : "expand_more"}
                  </span>
                  View Evidence
                  {(g.evidence_url as any[])?.length > 0 && (
                    <span className="px-xs py-xs bg-tertiary-container text-on-tertiary-container text-label-xs font-[700] rounded">
                      {(g.evidence_url as any[]).length}
                    </span>
                  )}
                </button>
                {expandedEvidence[g.id] && (
                  <div className="mt-md">
                    <EvidenceViewer goalId={g.id} />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center p-md bg-surface-container-low border border-on-surface">
        <span className="text-label-bold uppercase">Total Weightage</span>
        <span className={`text-headline-sm font-bold ${totalWeight === 100 ? "text-primary" : "text-error"}`}>
          {totalWeight}%
        </span>
      </div>
    </div>
  );
}
