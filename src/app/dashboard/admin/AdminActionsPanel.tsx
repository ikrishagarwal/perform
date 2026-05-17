"use client";

import { useState, useTransition, useEffect } from "react";
import { adminUnlockSheet, getComplianceMetrics, getAuditLogs, getAllProfiles, getDirectReports, createEmployee, updateEmployee, toggleEmployeeActive, getAllManagers } from "@/lib/actions/admin.actions";
import { distributeSharedGoal } from "@/lib/actions/goal.actions";
import { getOrCreateMySheet } from "@/lib/actions/goal-sheet.actions";
import NeoToast from "@/components/feedback/NeoToast";
import { useToast } from "@/hooks/useToast";
import { AuditLog, Profile, GoalInsert } from "@/lib/database.types";

type ModalType = "unlock" | "export" | "audit" | "distribute" | "employees" | "employeeForm" | null;

interface Metrics {
  totalEmployees: number;
  sheetsCreated: number;
  submitted: number;
  approved: number;
  pending: number;
  draft: number;
  notStarted: number;
  submissionRate: number;
  approvalRate: number;
  thrustAreaBreakdown: Record<string, number>;
}

export default function AdminActionsPanel({
  activeCycleId,
  userId,
  userRole,
}: {
  activeCycleId: string | null;
  userId: string;
  userRole: string;
}) {
  const [sheetId, setSheetId] = useState("");
  const [modalType, setModalType] = useState<ModalType>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);
  const [distGoal, setDistGoal] = useState<Partial<GoalInsert>>({
    thrust_area: "Strategic",
    uom: "numeric_max",
    weightage: 10,
  });
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [managers, setManagers] = useState<Profile[]>([]);
  const [editingEmployee, setEditingEmployee] = useState<Profile | null>(null);
  const [employeeForm, setEmployeeForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "employee" as "employee" | "manager" | "admin",
    manager_id: "",
    title: "",
  });
  const [isPending, startTransition] = useTransition();
  const { toast, showSuccess, showError } = useToast();

  useEffect(() => {
    if (activeCycleId) {
      getComplianceMetrics(activeCycleId).then(m => setMetrics(m as any)).catch(console.error);
    }
  }, [activeCycleId]);

  const openModal = async (type: ModalType) => {
    if (type === "audit") {
      getAuditLogs({ limit: 20 }).then(setAuditLogs).catch(console.error);
    }
    if (type === "distribute") {
      if (userRole === "manager") {
        getDirectReports(userId).then(setProfiles).catch(console.error);
      } else {
        getAllProfiles().then(setProfiles).catch(console.error);
      }
    }
    if (type === "employees") {
      try {
        const [emps, mgrs] = await Promise.all([
          getAllProfiles(),
          getAllManagers(),
        ]);
        setEmployees(emps);
        setManagers(mgrs);
      } catch (err) {
        showError("Failed to load employees");
      }
    }
    setModalType(type);
  };

  const closeModal = () => setModalType(null);

  const confirmUnlock = () => {
    if (!sheetId.trim()) {
      showError("Enter a goal sheet ID before unlocking.");
      return;
    }

    startTransition(async () => {
      try {
        await adminUnlockSheet(sheetId.trim());
        showSuccess("Goal sheet unlocked successfully.");
        setSheetId("");
        closeModal();
        // Refresh metrics
        if (activeCycleId) {
          const m = await getComplianceMetrics(activeCycleId);
          setMetrics(m);
        }
      } catch (err) {
        showError(
          err instanceof Error ? err.message : "Failed to unlock sheet",
        );
      }
    });
  };

  const confirmExport = () => {
    if (!activeCycleId) {
      showError("No active cycle is configured for export.");
      return;
    }

    showSuccess("Preparing CSV export...");
    closeModal();
    window.location.href = `/api/export/csv?cycleId=${encodeURIComponent(activeCycleId)}`;
  };

  const confirmDistribute = () => {
    if (!distGoal.title || !distGoal.target_value || selectedEmpIds.length === 0) {
      showError("Please fill all fields and select at least one employee.");
      return;
    }

    startTransition(async () => {
      try {
        // 1. Get or create sheets for all selected employees
        const sheetIds = await Promise.all(
          selectedEmpIds.map(async (empId) => {
            const sheet = await getOrCreateMySheet(empId);
            return sheet.id;
          })
        );

        // 2. Distribute the goal
        await distributeSharedGoal(distGoal as GoalInsert, sheetIds);
        
        showSuccess(`Goal distributed to ${selectedEmpIds.length} employees.`);
        closeModal();
        // Refresh metrics
        if (activeCycleId) {
          const m = await getComplianceMetrics(activeCycleId);
          setMetrics(m);
        }
      } catch (err) {
        showError(err instanceof Error ? err.message : "Distribution failed");
      }
    });
  };

  const openEmployeeForm = (employee?: Profile) => {
    if (employee) {
      setEditingEmployee(employee);
      setEmployeeForm({
        full_name: employee.full_name,
        email: "",
        password: "",
        role: employee.role,
        manager_id: employee.manager_id || "",
        title: employee.title,
      });
    } else {
      setEditingEmployee(null);
      setEmployeeForm({
        full_name: "",
        email: "",
        password: "",
        role: "employee",
        manager_id: "",
        title: "",
      });
    }
    setModalType("employeeForm");
  };

  const confirmEmployeeForm = () => {
    if (!employeeForm.full_name || !employeeForm.role) {
      showError("Name and role are required.");
      return;
    }
    if (!editingEmployee && (!employeeForm.email || !employeeForm.password || employeeForm.password.length < 6)) {
      showError("Email and password (min 6 chars) are required for new employees.");
      return;
    }

    startTransition(async () => {
      try {
        if (editingEmployee) {
          const updateData: {
            full_name: string;
            role: "employee" | "manager" | "admin";
            manager_id?: string;
            title: string;
          } = {
            full_name: employeeForm.full_name,
            role: employeeForm.role,
            title: employeeForm.title,
          };
          if (employeeForm.role === "employee" && employeeForm.manager_id) {
            updateData.manager_id = employeeForm.manager_id;
          }
          await updateEmployee(editingEmployee.id, updateData);
          showSuccess("Employee updated successfully.");
        } else {
          await createEmployee({
            full_name: employeeForm.full_name,
            email: employeeForm.email,
            password: employeeForm.password,
            role: employeeForm.role,
            manager_id: employeeForm.role === "employee" ? employeeForm.manager_id : undefined,
            title: employeeForm.title,
          });
          showSuccess("Employee created successfully.");
        }
        closeModal();
        openModal("employees");
      } catch (err) {
        showError(err instanceof Error ? err.message : "Operation failed");
      }
    });
  };

  const toggleEmployeeStatus = (employeeId: string, isActive: boolean) => {
    startTransition(async () => {
      try {
        await toggleEmployeeActive(employeeId, isActive);
        showSuccess(`Employee ${isActive ? "activated" : "deactivated"} successfully.`);
        openModal("employees");
      } catch (err) {
        showError(err instanceof Error ? err.message : "Operation failed");
      }
    });
  };

  return (
    <div className="flex flex-col gap-gutter">
      <NeoToast toast={toast} />
      
      {/* Metrics Row */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-gutter">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <div className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-lg shadow-[4px_4px_0px_0px_#000000]">
          <h3 className="text-headline-md font-[700] mb-md border-b-2 border-on-surface pb-sm">
            Operational Controls
          </h3>
          <div className="space-y-sm">
            <div className="text-label-bold font-[700] tracking-[0.05em] text-on-surface-variant">
              Manage Performance Cycle
            </div>
            <div className="flex flex-col gap-xs">
              <label
                htmlFor="sheetId"
                className="text-label-sm font-[600] text-on-surface"
              >
                Goal Sheet ID
              </label>
              <input
                id="sheetId"
                value={sheetId}
                onChange={(e) => setSheetId(e.target.value)}
                placeholder="Enter sheet UUID"
                className="w-full px-sm py-sm border border-on-surface bg-surface text-on-surface"
              />
              <button
                type="button"
                onClick={() => openModal("unlock")}
                className="mt-xs px-md py-sm border border-on-surface bg-error text-on-error text-label-bold font-[700] tracking-[0.05em] hover:shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-px hover:-translate-x-px transition-all"
              >
                Force Unlock Goal Sheet
              </button>
            </div>
            <button
              type="button"
              onClick={() => openModal("distribute")}
              className="w-full mt-sm px-md py-sm border border-on-surface bg-primary text-on-primary text-label-bold font-[700] tracking-[0.05em] hover:shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-px transition-all"
            >
              Distribute Shared KPI
            </button>
            {userRole === "admin" && (
              <button
                type="button"
                onClick={() => openModal("employees")}
                className="w-full mt-sm px-md py-sm border border-on-surface bg-secondary text-on-secondary text-label-bold font-[700] tracking-[0.05em] hover:shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-px transition-all"
              >
                Manage Employees
              </button>
            )}
          </div>
        </div>

        <div className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-lg shadow-[4px_4px_0px_0px_#000000]">
          <h3 className="text-headline-md font-[700] mb-md border-b-2 border-on-surface pb-sm">
            Global Reports
          </h3>
          <div className="space-y-sm text-label-bold font-[700] tracking-[0.05em] text-primary">
            <button
              type="button"
              onClick={() => openModal("export")}
              className="w-full text-left hover:underline disabled:opacity-50"
              disabled={!activeCycleId}
            >
              Export Data (CSV)
            </button>
            <div className="text-on-surface-variant mb-md">Organizational Thrust Areas</div>
            <div className="grid grid-cols-2 gap-sm">
              {metrics && Object.entries(metrics.thrustAreaBreakdown).map(([area, count]) => (
                <div key={area} className="border border-on-surface p-sm bg-surface flex flex-col items-center justify-center text-center">
                  <div className="text-label-sm font-bold uppercase truncate w-full">{area}</div>
                  <div className="text-headline-md font-extrabold text-primary">{count}</div>
                  <div className="text-[10px] text-on-surface-variant uppercase">Goals Assigned</div>
                </div>
              ))}
              {(!metrics || Object.keys(metrics.thrustAreaBreakdown).length === 0) && (
                <div className="col-span-2 text-center py-md text-on-surface-variant italic">No goal data available yet.</div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-lg shadow-[4px_4px_0px_0px_#000000]">
          <h3 className="text-headline-md font-[700] mb-md border-b-2 border-on-surface pb-sm">
            Audit Logs
          </h3>
          <ul className="space-y-sm text-label-bold font-[700] tracking-[0.05em] text-primary">
            <li>
              <button onClick={() => openModal("audit")} className="hover:underline text-left">View System Activity</button>
            </li>
            <li>Track Locked Modifications</li>
          </ul>
        </div>
      </div>

      {modalType && ["unlock", "export"].includes(modalType) ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-md">
          <div
            className="absolute inset-0 bg-on-surface/60"
            onClick={closeModal}
          />
          <div className="relative w-[min(92vw,40rem)] border-2 border-on-surface bg-surface-container-lowest shadow-[8px_8px_0px_0px_#000000] p-lg">
            <h4 className="text-headline-md font-[800] mb-sm whitespace-normal break-words">
              {modalType === "unlock"
                ? "Confirm Force Unlock"
                : "Confirm CSV Export"}
            </h4>
            <p className="text-body-md text-on-surface-variant mb-md whitespace-normal break-words leading-relaxed">
              {modalType === "unlock"
                ? "This will set the selected goal sheet back to draft, allowing edits again. Continue?"
                : "This will generate and download the active cycle export CSV. Continue?"}
            </p>
            <div className="flex flex-wrap items-center justify-end gap-sm">
              <button
                type="button"
                onClick={closeModal}
                className="px-md py-sm border border-on-surface bg-surface text-on-surface text-label-bold font-[700]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={modalType === "unlock" ? confirmUnlock : confirmExport}
                className="px-md py-sm border border-on-surface bg-on-surface text-on-primary text-label-bold font-[700] disabled:opacity-50"
              >
                {isPending ? "Working..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {modalType === "distribute" && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-md">
          <div
            className="absolute inset-0 bg-on-surface/60"
            onClick={closeModal}
          />
          <div className="relative w-[min(92vw,50rem)] max-h-[90vh] flex flex-col border-2 border-on-surface bg-surface-container-lowest shadow-[8px_8px_0px_0px_#000000]">
            <div className="p-lg border-b-2 border-on-surface bg-surface flex justify-between items-center">
              <h4 className="text-headline-md font-[800]">Distribute Shared KPI</h4>
              <button onClick={closeModal} className="material-symbols-outlined">close</button>
            </div>
            <div className="flex-1 overflow-y-auto p-lg space-y-lg">
              {/* Goal Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
                <div className="flex flex-col gap-xs">
                  <label className="text-label-sm font-[600]">Title</label>
                  <input
                    value={distGoal.title || ""}
                    onChange={(e) => setDistGoal({...distGoal, title: e.target.value})}
                    className="border border-on-surface p-sm bg-surface"
                    placeholder="e.g. Q4 Revenue Target"
                  />
                </div>
                <div className="flex flex-col gap-xs">
                  <label className="text-label-sm font-[600]">Thrust Area</label>
                  <select
                    value={distGoal.thrust_area}
                    onChange={(e) => setDistGoal({...distGoal, thrust_area: e.target.value})}
                    className="border border-on-surface p-sm bg-surface"
                  >
                    <option>Strategic</option>
                    <option>Operational</option>
                  </select>
                </div>
                <div className="flex flex-col gap-xs md:col-span-2">
                  <label className="text-label-sm font-[600]">Description</label>
                  <textarea
                    value={distGoal.description || ""}
                    onChange={(e) => setDistGoal({...distGoal, description: e.target.value})}
                    className="border border-on-surface p-sm bg-surface h-20"
                  />
                </div>
                <div className="flex flex-col gap-xs">
                  <label className="text-label-sm font-[600]">Target Value</label>
                  <input
                    value={distGoal.target_value || ""}
                    onChange={(e) => setDistGoal({...distGoal, target_value: e.target.value})}
                    className="border border-on-surface p-sm bg-surface"
                  />
                </div>
                <div className="flex flex-col gap-xs">
                  <label className="text-label-sm font-[600]">Weightage (%)</label>
                  <input
                    type="number"
                    value={distGoal.weightage || ""}
                    onChange={(e) => setDistGoal({...distGoal, weightage: Number(e.target.value)})}
                    className="border border-on-surface p-sm bg-surface"
                  />
                </div>
              </div>

              {/* Employee Selection */}
              <div className="space-y-sm">
                <div className="flex justify-between items-center border-b border-on-surface pb-xs">
                  <label className="text-label-bold font-[700]">Select Employees</label>
                  <div className="flex gap-sm">
                    <button
                      onClick={() => setSelectedEmpIds(profiles.filter(p => p.role === "employee").map(p => p.id))}
                      className="text-label-sm text-primary hover:underline"
                    >
                      Select All
                    </button>
                    <button
                      onClick={() => setSelectedEmpIds([])}
                      className="text-label-sm text-error hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-sm max-h-48 overflow-y-auto p-xs">
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
              </div>
            </div>
            <div className="p-lg border-t-2 border-on-surface bg-surface flex justify-end gap-sm">
              <button
                onClick={closeModal}
                className="px-md py-sm border border-on-surface bg-surface text-on-surface text-label-bold font-[700]"
              >
                Cancel
              </button>
              <button
                disabled={isPending}
                onClick={confirmDistribute}
                className="px-md py-sm border border-on-surface bg-primary text-on-primary text-label-bold font-[700] disabled:opacity-50"
              >
                {isPending ? "Distributing..." : "Confirm Distribution"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalType === "audit" && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-md">
          <div
            className="absolute inset-0 bg-on-surface/60"
            onClick={closeModal}
          />
          <div className="relative w-[min(92vw,60rem)] max-h-[80vh] flex flex-col border-2 border-on-surface bg-surface-container-lowest shadow-[8px_8px_0px_0px_#000000]">
            <div className="p-lg border-b-2 border-on-surface bg-surface flex justify-between items-center">
              <h4 className="text-headline-md font-[800]">System Audit Logs</h4>
              <button onClick={closeModal} className="material-symbols-outlined">close</button>
            </div>
            <div className="flex-1 overflow-y-auto p-lg">
              <div className="space-y-md">
                {auditLogs.map((log) => (
                  <div key={log.id} className="border border-on-surface p-md rounded bg-surface">
                    <div className="flex justify-between items-start mb-sm pb-xs border-b border-dashed border-outline">
                      <span className="text-label-bold font-[700] text-primary">{new Date(log.created_at).toLocaleString()}</span>
                      <span className="text-label-sm text-on-surface-variant">Sheet: {log.goal_sheet_id.slice(0, 8)}...</span>
                    </div>
                    <div className="space-y-xs">
                      {log.changed_fields.map((field, idx) => (
                        <div key={idx} className="text-body-sm">
                          <span className="font-bold text-on-surface">{field.field}:</span>{" "}
                          <span className="text-error line-through">{field.old_value}</span>{" "}
                          <span className="material-symbols-outlined text-xs align-middle">arrow_forward</span>{" "}
                          <span className="text-primary font-bold">{field.new_value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <div className="text-center py-xl text-on-surface-variant italic">No audit logs found.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {modalType === "employees" && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-md">
          <div className="absolute inset-0 bg-on-surface/60" onClick={closeModal} />
          <div className="relative w-[min(92vw,70rem)] max-h-[90vh] flex flex-col border-2 border-on-surface bg-surface-container-lowest shadow-[8px_8px_0px_0px_#000000]">
            <div className="p-lg border-b-2 border-on-surface bg-surface flex justify-between items-center">
              <h4 className="text-headline-md font-[800]">Manage Employees</h4>
              <button onClick={closeModal} className="material-symbols-outlined">close</button>
            </div>
            <div className="p-lg">
              <button
                onClick={() => openEmployeeForm()}
                className="mb-md px-md py-sm border-2 border-on-surface bg-primary text-on-primary text-label-bold font-[700] hover:shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-px transition-all"
              >
                + Add Employee
              </button>
              <div className="overflow-x-auto border-2 border-on-surface">
                <table className="w-full text-left">
                  <thead className="bg-surface border-b-2 border-on-surface">
                    <tr>
                      <th className="p-sm text-label-bold font-[700] uppercase border-r border-on-surface">Name</th>
                      <th className="p-sm text-label-bold font-[700] uppercase border-r border-on-surface">Role</th>
                      <th className="p-sm text-label-bold font-[700] uppercase border-r border-on-surface">Manager</th>
                      <th className="p-sm text-label-bold font-[700] uppercase border-r border-on-surface">Title</th>
                      <th className="p-sm text-label-bold font-[700] uppercase border-r border-on-surface">Status</th>
                      <th className="p-sm text-label-bold font-[700] uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map((emp) => {
                      const manager = managers.find(m => m.id === emp.manager_id);
                      return (
                        <tr key={emp.id} className="border-b border-on-surface hover:bg-surface-container">
                          <td className="p-sm border-r border-on-surface text-label-bold font-[700]">{emp.full_name}</td>
                          <td className="p-sm border-r border-on-surface">
                            <span className={`px-sm py-xs text-label-sm font-[700] uppercase ${
                              emp.role === "admin" ? "bg-error text-on-error" :
                              emp.role === "manager" ? "bg-tertiary text-on-tertiary" :
                              "bg-primary-container text-on-primary-container"
                            }`}>
                              {emp.role}
                            </span>
                          </td>
                          <td className="p-sm border-r border-on-surface text-label-sm">{manager?.full_name || "-"}</td>
                          <td className="p-sm border-r border-on-surface text-label-sm">{emp.title || "-"}</td>
                          <td className="p-sm border-r border-on-surface">
                            <span className={`px-sm py-xs text-label-sm font-[700] uppercase ${
                              emp.is_active ? "bg-tertiary text-on-tertiary" : "bg-surface-variant text-on-surface-variant"
                            }`}>
                              {emp.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="p-sm">
                            <div className="flex gap-xs">
                              <button
                                onClick={() => openEmployeeForm(emp)}
                                className="px-sm py-xs border border-on-surface bg-surface text-on-surface text-label-sm font-[700] hover:shadow-[2px_2px_0px_0px_#000000] transition-all"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => toggleEmployeeStatus(emp.id, !emp.is_active)}
                                className={`px-sm py-xs border text-label-sm font-[700] transition-all ${
                                  emp.is_active
                                    ? "border-error bg-surface text-error hover:shadow-[2px_2px_0px_0px_#000000]"
                                    : "border-tertiary bg-tertiary text-on-tertiary hover:shadow-[2px_2px_0px_0px_#000000]"
                                }`}
                              >
                                {emp.is_active ? "Deactivate" : "Activate"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {employees.length === 0 && (
                  <div className="p-xl text-center text-on-surface-variant italic">No employees found.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {modalType === "employeeForm" && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-md">
          <div className="absolute inset-0 bg-on-surface/60" onClick={closeModal} />
          <div className="relative w-[min(92vw,40rem)] border-2 border-on-surface bg-surface-container-lowest shadow-[8px_8px_0px_0px_#000000] p-lg">
            <h4 className="text-headline-md font-[800] mb-lg border-b-2 border-on-surface pb-sm">
              {editingEmployee ? "Edit Employee" : "Add Employee"}
            </h4>
            <div className="space-y-md">
              <div className="flex flex-col gap-xs">
                <label className="text-label-bold font-[700] uppercase text-xs">Full Name</label>
                <input
                  value={employeeForm.full_name}
                  onChange={(e) => setEmployeeForm({...employeeForm, full_name: e.target.value})}
                  className="border-2 border-on-surface p-sm bg-surface text-body-lg"
                  placeholder="John Doe"
                />
              </div>
              {!editingEmployee && (
                <>
                  <div className="flex flex-col gap-xs">
                    <label className="text-label-bold font-[700] uppercase text-xs">Email</label>
                    <input
                      type="email"
                      value={employeeForm.email}
                      onChange={(e) => setEmployeeForm({...employeeForm, email: e.target.value})}
                      className="border-2 border-on-surface p-sm bg-surface text-body-lg"
                      placeholder="john@company.com"
                    />
                  </div>
                  <div className="flex flex-col gap-xs">
                    <label className="text-label-bold font-[700] uppercase text-xs">Password</label>
                    <input
                      type="password"
                      minLength={6}
                      value={employeeForm.password}
                      onChange={(e) => setEmployeeForm({...employeeForm, password: e.target.value})}
                      className="border-2 border-on-surface p-sm bg-surface text-body-lg"
                      placeholder="Min 6 characters"
                    />
                  </div>
                </>
              )}
              <div className="flex flex-col gap-xs">
                <label className="text-label-bold font-[700] uppercase text-xs">Role</label>
                <select
                  value={employeeForm.role}
                  onChange={(e) => setEmployeeForm({...employeeForm, role: e.target.value as "employee" | "manager" | "admin"})}
                  className="border-2 border-on-surface p-sm bg-surface text-body-lg appearance-none cursor-pointer"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              {employeeForm.role === "employee" && (
                <div className="flex flex-col gap-xs">
                  <label className="text-label-bold font-[700] uppercase text-xs">Manager</label>
                  <select
                    value={employeeForm.manager_id}
                    onChange={(e) => setEmployeeForm({...employeeForm, manager_id: e.target.value})}
                    className="border-2 border-on-surface p-sm bg-surface text-body-lg appearance-none cursor-pointer"
                  >
                    <option value="">Select Manager</option>
                    {managers.map(m => (
                      <option key={m.id} value={m.id}>{m.full_name}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex flex-col gap-xs">
                <label className="text-label-bold font-[700] uppercase text-xs">Title</label>
                <input
                  value={employeeForm.title}
                  onChange={(e) => setEmployeeForm({...employeeForm, title: e.target.value})}
                  className="border-2 border-on-surface p-sm bg-surface text-body-lg"
                  placeholder="e.g. Software Engineer"
                />
              </div>
            </div>
            <div className="flex justify-end gap-sm mt-lg pt-lg border-t-2 border-on-surface">
              <button
                onClick={closeModal}
                className="px-md py-sm border-2 border-on-surface bg-surface text-on-surface text-label-bold font-[700]"
              >
                Cancel
              </button>
              <button
                onClick={confirmEmployeeForm}
                disabled={isPending}
                className="px-md py-sm border-2 border-on-surface bg-primary text-on-primary text-label-bold font-[700] disabled:opacity-50"
              >
                {isPending ? "Saving..." : editingEmployee ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
