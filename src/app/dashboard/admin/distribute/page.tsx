"use client";

import { useState, useTransition, useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { distributeSharedGoal } from "@/lib/actions/goal.actions";
import NeoToast from "@/components/feedback/NeoToast";
import { useToast } from "@/hooks/useToast";
import { Profile, Goal, GoalSheet } from "@/lib/database.types";

export default function DistributePage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [sheets, setSheets] = useState<{ id: string; user_name: string }[]>([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [distGoal, setDistGoal] = useState({
    thrust_area: "Strategic",
    title: "",
    description: "",
    uom: "numeric_max",
    target_value: "",
    weightage: 10,
  });
  const [isPending, startTransition] = useTransition();
  const { toast, showSuccess, showError } = useToast();

  useEffect(() => {
    supabase.from("profiles").select("*").then(({ data }) => setProfiles(data || []));
  }, []);

  useEffect(() => {
    const loadSheets = async () => {
      if (selectedEmpIds.length > 0) {
        const { data } = await supabase
          .from("goal_sheets")
          .select("id, profiles(full_name)")
          .in("user_id", selectedEmpIds);
        if (data) {
          setSheets(data.map((s: any) => ({
            id: s.id,
            user_name: s.profiles?.full_name || "Unknown"
          })));
        }
      } else {
        setSheets([]);
      }
    };
    loadSheets();
  }, [selectedEmpIds]);

  const handleDistribute = () => {
    if (!distGoal.title || selectedEmpIds.length === 0) {
      showError("Enter goal title and select employees.");
      return;
    }

    startTransition(async () => {
      try {
        const sheetIds = sheets.map(s => s.id);
        if (sheetIds.length === 0) {
          showError("No goal sheets found for selected employees.");
          return;
        }

        await distributeSharedGoal({
          thrust_area: distGoal.thrust_area as any,
          title: distGoal.title,
          description: distGoal.description,
          uom: distGoal.uom as any,
          target_value: distGoal.target_value ? Number(distGoal.target_value) : null,
          weightage: distGoal.weightage,
          actual_achievement: null,
          progress_status: "not_started",
          sort_order: 99,
          evidence_url: null,
        }, sheetIds);
        
        showSuccess(`Distributed to ${sheetIds.length} employees.`);
        setDistGoal({ thrust_area: "Strategic", title: "", description: "", uom: "numeric_max", target_value: "", weightage: 10 });
        setSelectedEmpIds([]);
      } catch (err) {
        showError(err instanceof Error ? err.message : "Distribution failed");
      }
    });
  };

  const selectAllEmployees = () => {
    setSelectedEmpIds(profiles.filter(p => p.role === "employee").map(p => p.id));
  };

  return (
    <div className="flex flex-col gap-xl max-w-7xl mx-auto w-full">
      <NeoToast toast={toast} />

      <header className="flex flex-col gap-sm">
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-[800] text-on-surface">
          Distribute Shared KPI
        </h1>
        <p className="text-body-lg text-on-surface-variant">
          Push a common goal to multiple employees' goal sheets.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl">
        <div className="border-2 border-on-surface bg-surface-container-lowest p-lg shadow-[4px_4px_0px_0px_#000000]">
          <h3 className="text-headline-md font-[700] mb-md">Goal Details</h3>
          <div className="space-y-md">
            <div className="flex flex-col gap-xs">
              <label className="text-label-bold font-[700] uppercase text-xs">Thrust Area</label>
              <select
                value={distGoal.thrust_area}
                onChange={(e) => setDistGoal({...distGoal, thrust_area: e.target.value})}
                className="border-2 border-on-surface p-sm bg-surface text-body-lg"
              >
                <option value="Strategic">Strategic</option>
                <option value="Operational">Operational</option>
                <option value="Developmental">Developmental</option>
              </select>
            </div>
            <div className="flex flex-col gap-xs">
              <label className="text-label-bold font-[700] uppercase text-xs">Goal Title *</label>
              <input
                type="text"
                value={distGoal.title}
                onChange={(e) => setDistGoal({...distGoal, title: e.target.value})}
                className="border-2 border-on-surface p-sm bg-surface text-body-lg"
                placeholder="Enter goal title"
              />
            </div>
            <div className="flex flex-col gap-xs">
              <label className="text-label-bold font-[700] uppercase text-xs">Description</label>
              <textarea
                value={distGoal.description}
                onChange={(e) => setDistGoal({...distGoal, description: e.target.value})}
                className="border-2 border-on-surface p-sm bg-surface text-body-lg min-h-[80px]"
                placeholder="Optional description"
              />
            </div>
            <div className="grid grid-cols-2 gap-md">
              <div className="flex flex-col gap-xs">
                <label className="text-label-bold font-[700] uppercase text-xs">Target Value</label>
                <input
                  type="number"
                  value={distGoal.target_value}
                  onChange={(e) => setDistGoal({...distGoal, target_value: e.target.value})}
                  className="border-2 border-on-surface p-sm bg-surface text-body-lg"
                />
              </div>
              <div className="flex flex-col gap-xs">
                <label className="text-label-bold font-[700] uppercase text-xs">Weightage (%)</label>
                <input
                  type="number"
                  value={distGoal.weightage}
                  onChange={(e) => setDistGoal({...distGoal, weightage: Number(e.target.value)})}
                  className="border-2 border-on-surface p-sm bg-surface text-body-lg"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-2 border-on-surface bg-surface-container-lowest p-lg shadow-[4px_4px_0px_0px_#000000]">
          <div className="flex justify-between items-center mb-md border-b border-on-surface pb-sm">
            <h3 className="text-headline-md font-[700]">Select Employees</h3>
            <div className="flex gap-sm">
              <button onClick={selectAllEmployees} className="text-label-sm text-primary hover:underline">
                Select All
              </button>
              <button onClick={() => setSelectedEmpIds([])} className="text-label-sm text-error hover:underline">
                Clear
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-sm max-h-64 overflow-y-auto">
            {profiles.filter(p => p.role === "employee").map((p) => (
              <label key={p.id} className="flex items-center gap-sm p-sm border border-outline hover:bg-surface-container transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedEmpIds.includes(p.id)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedEmpIds([...selectedEmpIds, p.id]);
                    else setSelectedEmpIds(selectedEmpIds.filter(id => id !== p.id));
                  }}
                  className="w-4 h-4 accent-primary"
                />
                <div className="flex flex-col">
                  <span className="text-label-bold font-[700]">{p.full_name}</span>
                  <span className="text-label-sm text-on-surface-variant">{p.title}</span>
                </div>
              </label>
            ))}
          </div>
          <div className="mt-md pt-md border-t border-on-surface">
            <div className="text-label-bold font-[700] mb-sm">
              {sheets.length} goal sheet(s) will receive this goal
            </div>
            <button
              onClick={handleDistribute}
              disabled={isPending || !distGoal.title || selectedEmpIds.length === 0}
              className="w-full px-md py-sm border-2 border-on-surface bg-primary text-on-primary text-label-bold font-[700] uppercase tracking-[0.05em] disabled:opacity-50 hover:shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-px transition-all"
            >
              {isPending ? "Distributing..." : "Distribute Goal"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}