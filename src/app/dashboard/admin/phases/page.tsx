"use client";

import { useState, useTransition, useEffect } from "react";
import {
  getCurrentPhase,
  setCurrentPhase,
  toggleAutoMode,
  getPhaseStats,
  getAllEmployeeProgress,
  PhaseInfo,
  PhaseStats,
  EmployeePhaseProgress,
} from "@/lib/actions/admin.actions";
import NeoToast from "@/components/feedback/NeoToast";
import { useToast } from "@/hooks/useToast";

const PHASES = [
  { id: "GOAL_SETTING", label: "Goal Setting", window: "May 1-31" },
  { id: "Q1", label: "Q1 Check-in", window: "Jul 1-31" },
  { id: "Q2", label: "Q2 Check-in", window: "Oct 1-31" },
  { id: "Q3", label: "Q3 Check-in", window: "Jan 1-31" },
  { id: "Q4_Annual", label: "Q4 Annual", window: "Mar-Apr" },
];

export default function PhasesPage() {
  const [currentPhase, setCurrentPhaseInfo] = useState<PhaseInfo | null>(null);
  const [phaseStats, setPhaseStats] = useState<PhaseStats[]>([]);
  const [employeeProgress, setEmployeeProgress] = useState<EmployeePhaseProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const { toast, showSuccess, showError } = useToast();

  const loadData = async () => {
    try {
      const [phase, progress] = await Promise.all([
        getCurrentPhase(),
        getAllEmployeeProgress(),
      ]);
      setCurrentPhaseInfo(phase);
      setEmployeeProgress(progress);

      const statsPromises = PHASES.map((p) => getPhaseStats(p.id));
      const stats = await Promise.all(statsPromises);
      setPhaseStats(stats);
    } catch (err) {
      showError("Failed to load phase data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSetPhase = (phase: string) => {
    startTransition(async () => {
      try {
        await setCurrentPhase(phase);
        showSuccess(`Active phase set to ${PHASES.find(p => p.id === phase)?.label}`);
        loadData();
      } catch (err) {
        showError(err instanceof Error ? err.message : "Failed to set phase");
      }
    });
  };

  const handleToggleAutoMode = (enabled: boolean) => {
    startTransition(async () => {
      try {
        await toggleAutoMode(enabled);
        showSuccess(enabled ? "Auto mode enabled" : "Manual mode enabled");
        loadData();
      } catch (err) {
        showError(err instanceof Error ? err.message : "Failed to toggle mode");
      }
    });
  };

  const getPhaseStatus = (phaseId: string) => {
    if (!currentPhase) return "pending";
    if (currentPhase.phase === phaseId) return "active";
    return "pending";
  };

  const getStatusIcon = (status: "submitted" | "pending" | null | undefined) => {
    if (status === "submitted") return "✓";
    if (status === "pending") return "○";
    return "—";
  };

  const getStatusColor = (status: "submitted" | "pending" | null | undefined) => {
    if (status === "submitted") return "text-success";
    if (status === "pending") return "text-on-surface-variant";
    return "text-on-surface-variant";
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-xl max-w-7xl mx-auto w-full">
        <div className="text-center py-xl text-on-surface-variant">Loading...</div>
      </div>
    );
  }

  const activePhaseIndex = PHASES.findIndex(p => p.id === currentPhase?.phase);

  return (
    <div className="flex flex-col gap-xl max-w-7xl mx-auto w-full">
      <NeoToast toast={toast} />

      <header className="flex flex-col gap-sm">
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-[800] text-on-surface">
          Phase Management
        </h1>
        <p className="text-body-lg text-on-surface-variant">
          Control the active phase for goal setting and quarterly check-ins.
        </p>
      </header>

      {/* Current Phase Card */}
      <div className="border-2 border-on-surface bg-tertiary p-lg shadow-[4px_4px_0px_0px_#000000]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-md">
          <div>
            <p className="text-label-bold font-[700] uppercase text-xs text-on-tertiary mb-xs">
              Current Active Phase
            </p>
            <h2 className="text-headline-md font-[800] text-on-tertiary">
              {currentPhase?.phaseLabel || "Goal Setting"}
            </h2>
            {currentPhase && (
              <p className="text-body-lg text-on-tertiary mt-xs">
                {currentPhase.windowStart} — {currentPhase.windowEnd}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-sm">
            <div className="flex gap-xs">
              <button
                onClick={() => handleToggleAutoMode(true)}
                disabled={isPending}
                className={`px-md py-sm border-2 border-on-tertiary text-label-bold font-[700] uppercase ${
                  currentPhase?.isAutoMode
                    ? "bg-on-tertiary text-tertiary"
                    : "bg-transparent text-on-tertiary"
                }`}
              >
                Auto
              </button>
              <button
                onClick={() => handleToggleAutoMode(false)}
                disabled={isPending}
                className={`px-md py-sm border-2 border-on-tertiary text-label-bold font-[700] uppercase ${
                  !currentPhase?.isAutoMode
                    ? "bg-on-tertiary text-tertiary"
                    : "bg-transparent text-on-tertiary"
                }`}
              >
                Manual
              </button>
            </div>
            {!currentPhase?.isAutoMode && (
              <select
                value={currentPhase?.phase || "GOAL_SETTING"}
                onChange={(e) => handleSetPhase(e.target.value)}
                disabled={isPending}
                className="border-2 border-on-tertiary bg-tertiary text-on-tertiary p-sm text-body-lg font-[700]"
              >
                {PHASES.map((p) => (
                  <option key={p.id} value={p.id} className="bg-surface text-on-surface">
                    {p.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Phase Schedule */}
      <div className="border-2 border-on-surface bg-surface-container-lowest">
        <div className="border-b-2 border-on-surface p-md bg-surface">
          <h3 className="text-label-bold font-[700] uppercase text-xs text-on-surface">
            Phase Schedule
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-body-lg">
            <thead>
              <tr className="border-b-2 border-on-surface">
                <th className="text-left p-md text-label-bold font-[700] uppercase text-xs">Phase</th>
                <th className="text-left p-md text-label-bold font-[700] uppercase text-xs">Window</th>
                <th className="text-left p-md text-label-bold font-[700] uppercase text-xs">Status</th>
                <th className="text-left p-md text-label-bold font-[700] uppercase text-xs">Action</th>
              </tr>
            </thead>
            <tbody>
              {PHASES.map((phase, index) => {
                const stats = phaseStats[index];
                const status = getPhaseStatus(phase.id);
                const isPast = index < activePhaseIndex;
                return (
                  <tr key={phase.id} className="border-b border-on-surface">
                    <td className="p-md font-[700]">{phase.label}</td>
                    <td className="p-md text-on-surface-variant">{phase.window}</td>
                    <td className="p-md">
                      <span
                        className={`inline-flex items-center gap-xs px-sm py-xs border text-label-bold font-[700] uppercase text-xs ${
                          status === "active"
                            ? "border-success bg-success text-on-success"
                            : "border-on-surface bg-surface text-on-surface"
                        }`}
                      >
                        {status === "active" && "●"}
                        {status === "active" ? "Active" : isPast ? "Completed" : "Pending"}
                      </span>
                    </td>
                    <td className="p-md">
                      {status !== "active" && (
                        <button
                          onClick={() => handleSetPhase(phase.id)}
                          disabled={isPending}
                          className="px-sm py-xs border border-on-surface bg-surface text-on-surface text-label-bold font-[700] hover:bg-on-surface hover:text-on-primary transition-colors"
                        >
                          {isPast ? "Review" : "Set Active"}
                        </button>
                      )}
                      {status === "active" && (
                        <span className="text-on-surface-variant text-label-bold">Currently Active</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Phase Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-gutter">
        {PHASES.map((phase, index) => {
          const stats = phaseStats[index];
          const percentage = stats.totalEmployees > 0 
            ? Math.round((stats.submittedCount / stats.totalEmployees) * 100) 
            : 0;
          return (
            <div
              key={phase.id}
              className={`border-2 p-md ${
                getPhaseStatus(phase.id) === "active"
                  ? "bg-tertiary shadow-[4px_4px_0px_0px_#000000]"
                  : "bg-surface-container-lowest shadow-[2px_2px_0px_0px_#000000]"
              }`}
            >
              <p className={`text-label-bold font-[700] uppercase text-xs mb-xs ${getPhaseStatus(phase.id) === "active" ? "text-on-tertiary" : "text-on-surface-variant"}`}>
                {phase.label}
              </p>
              <p className={`text-headline-md font-[800] ${getPhaseStatus(phase.id) === "active" ? "text-on-tertiary" : "text-on-surface"}`}>
                {stats.submittedCount}/{stats.totalEmployees}
              </p>
              <div className="mt-sm">
                <div className="h-xs border border-on-surface bg-surface">
                  <div
                    className={`h-full transition-all ${getPhaseStatus(phase.id) === "active" ? "bg-on-tertiary" : "bg-on-surface"}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <p className={`text-label-bold font-[700] uppercase text-xs mt-xs ${getPhaseStatus(phase.id) === "active" ? "text-on-tertiary" : "text-on-surface-variant"}`}>
                  {percentage}% Complete
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Employee Progress Grid */}
      <div className="border-2 border-on-surface bg-surface-container-lowest">
        <div className="border-b-2 border-on-surface p-md bg-surface">
          <h3 className="text-label-bold font-[700] uppercase text-xs text-on-surface">
            Employee Progress
          </h3>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-body-lg">
            <thead className="sticky top-0 bg-surface z-10">
              <tr className="border-b-2 border-on-surface">
                <th className="text-left p-md text-label-bold font-[700] uppercase text-xs">Employee</th>
                {PHASES.map((p) => (
                  <th key={p.id} className="text-center p-md text-label-bold font-[700] uppercase text-xs">
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employeeProgress.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-xl text-center text-on-surface-variant">
                    No employees found
                  </td>
                </tr>
              ) : (
                employeeProgress.map((emp) => (
                  <tr key={emp.employeeId} className="border-b border-on-surface hover:bg-surface">
                    <td className="p-md font-[700]">{emp.employeeName}</td>
                    <td className={`p-md text-center text-lg ${getStatusColor(emp.goalSettingStatus)}`}>
                      {getStatusIcon(emp.goalSettingStatus)}
                    </td>
                    <td className={`p-md text-center text-lg ${getStatusColor(emp.q1Status)}`}>
                      {getStatusIcon(emp.q1Status)}
                    </td>
                    <td className={`p-md text-center text-lg ${getStatusColor(emp.q2Status)}`}>
                      {getStatusIcon(emp.q2Status)}
                    </td>
                    <td className={`p-md text-center text-lg ${getStatusColor(emp.q3Status)}`}>
                      {getStatusIcon(emp.q3Status)}
                    </td>
                    <td className={`p-md text-center text-lg ${getStatusColor(emp.q4Status)}`}>
                      {getStatusIcon(emp.q4Status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}