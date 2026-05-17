"use client";

import { useState, useTransition, useEffect } from "react";
import { createEmployee, updateEmployee, toggleEmployeeActive, getAllManagers, getAllProfiles } from "@/lib/actions/admin.actions";
import NeoToast from "@/components/feedback/NeoToast";
import { useToast } from "@/hooks/useToast";
import { Profile } from "@/lib/database.types";

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [managers, setManagers] = useState<Profile[]>([]);
  const [editingEmployee, setEditingEmployee] = useState<Profile | null>(null);
  const [showForm, setShowForm] = useState(false);
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

  const loadData = async () => {
    const [emps, mgrs] = await Promise.all([
      getAllProfiles(),
      getAllManagers(),
    ]);
    setEmployees(emps);
    setManagers(mgrs);
  };

  useEffect(() => {
    loadData().catch(console.error);
  }, []);

  const handleSubmit = () => {
    if (!employeeForm.full_name || (!editingEmployee && (!employeeForm.email || !employeeForm.password || employeeForm.password.length < 6))) {
      showError("Fill all required fields. Password min 6 chars.");
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
        setShowForm(false);
        setEditingEmployee(null);
        setEmployeeForm({ full_name: "", email: "", password: "", role: "employee", manager_id: "", title: "" });
        loadData();
      } catch (err) {
        showError(err instanceof Error ? err.message : "Operation failed");
      }
    });
  };

  const handleToggle = (employeeId: string, isActive: boolean) => {
    startTransition(async () => {
      try {
        await toggleEmployeeActive(employeeId, isActive);
        showSuccess(`Employee ${isActive ? "activated" : "deactivated"} successfully.`);
        loadData();
      } catch (err) {
        showError(err instanceof Error ? err.message : "Operation failed");
      }
    });
  };

  const openEdit = (emp: Profile) => {
    setEditingEmployee(emp);
    setEmployeeForm({
      full_name: emp.full_name || "",
      email: "",
      password: "",
      role: emp.role as "employee" | "manager" | "admin",
      manager_id: emp.manager_id || "",
      title: emp.title || "",
    });
    setShowForm(true);
  };

  const openNew = () => {
    setEditingEmployee(null);
    setEmployeeForm({ full_name: "", email: "", password: "", role: "employee", manager_id: "", title: "" });
    setShowForm(true);
  };

  return (
    <div className="flex flex-col gap-xl max-w-7xl mx-auto w-full">
      <NeoToast toast={toast} />

      <header className="flex flex-col gap-sm">
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-[800] text-on-surface">
          Employee Management
        </h1>
        <p className="text-body-lg text-on-surface-variant">
          Create, edit, and manage employee accounts and roles.
        </p>
      </header>

      <div className="flex justify-end">
        <button
          onClick={openNew}
          className="px-md py-sm border-2 border-on-surface bg-primary text-on-primary text-label-bold font-[700] uppercase tracking-[0.05em] shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_0px_#000000] transition-all"
        >
          + Add Employee
        </button>
      </div>

      {showForm && (
        <div className="border-2 border-on-surface bg-surface-container-lowest p-lg shadow-[4px_4px_0px_0px_#000000]">
          <h3 className="text-headline-md font-[700] mb-md">
            {editingEmployee ? "Edit Employee" : "New Employee"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div className="flex flex-col gap-xs">
              <label className="text-label-bold font-[700] uppercase text-xs">Full Name</label>
              <input
                type="text"
                value={employeeForm.full_name}
                onChange={(e) => setEmployeeForm({...employeeForm, full_name: e.target.value})}
                className="border-2 border-on-surface p-sm bg-surface text-body-lg"
              />
            </div>
            <div className="flex flex-col gap-xs">
              <label className="text-label-bold font-[700] uppercase text-xs">Title</label>
              <input
                type="text"
                value={employeeForm.title}
                onChange={(e) => setEmployeeForm({...employeeForm, title: e.target.value})}
                className="border-2 border-on-surface p-sm bg-surface text-body-lg"
              />
            </div>
            {!editingEmployee && (
              <div className="flex flex-col gap-xs">
                <label className="text-label-bold font-[700] uppercase text-xs">Email</label>
                <input
                  type="email"
                  value={employeeForm.email}
                  onChange={(e) => setEmployeeForm({...employeeForm, email: e.target.value})}
                  className="border-2 border-on-surface p-sm bg-surface text-body-lg"
                />
              </div>
            )}
            {!editingEmployee && (
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
            )}
            <div className="flex flex-col gap-xs">
              <label className="text-label-bold font-[700] uppercase text-xs">Role</label>
              <select
                value={employeeForm.role}
                onChange={(e) => setEmployeeForm({...employeeForm, role: e.target.value as any})}
                className="border-2 border-on-surface p-sm bg-surface text-body-lg"
              >
                <option value="employee">Employee</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {employeeForm.role === "employee" && (
              <div className="flex flex-col gap-xs">
                <label className="text-label-bold font-[700] uppercase text-xs">Manager</label>
                <select
                  value={employeeForm.manager_id}
                  onChange={(e) => setEmployeeForm({...employeeForm, manager_id: e.target.value})}
                  className="border-2 border-on-surface p-sm bg-surface text-body-lg"
                >
                  <option value="">Select Manager</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>{m.full_name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-sm mt-md">
            <button
              onClick={() => { setShowForm(false); setEditingEmployee(null); }}
              className="px-md py-sm border border-on-surface bg-surface text-on-surface text-label-bold font-[700]"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="px-md py-sm border border-on-surface bg-on-surface text-on-primary text-label-bold font-[700] disabled:opacity-50"
            >
              {isPending ? "Saving..." : editingEmployee ? "Update" : "Create"}
            </button>
          </div>
        </div>
      )}

      <div className="border-2 border-on-surface bg-surface-container-lowest overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-surface border-b-2 border-on-surface">
            <tr>
              <th className="p-sm text-label-bold font-[700] uppercase text-xs">Name</th>
              <th className="p-sm text-label-bold font-[700] uppercase text-xs">Title</th>
              <th className="p-sm text-label-bold font-[700] uppercase text-xs">Role</th>
              <th className="p-sm text-label-bold font-[700] uppercase text-xs">Manager</th>
              <th className="p-sm text-label-bold font-[700] uppercase text-xs">Status</th>
              <th className="p-sm text-label-bold font-[700] uppercase text-xs">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => {
              const manager = managers.find((m) => m.id === emp.manager_id);
              return (
                <tr key={emp.id} className="border-b border-on-surface/20">
                  <td className="p-sm text-body-lg">{emp.full_name}</td>
                  <td className="p-sm text-body-lg">{emp.title || "-"}</td>
                  <td className="p-sm text-body-lg capitalize">{emp.role}</td>
                  <td className="p-sm text-body-lg">{manager?.full_name || "-"}</td>
                  <td className="p-sm">
                    <span className={`px-sm py-xs text-label-bold font-[700] uppercase text-xs border ${
                      emp.is_active ? "border-tertiary text-tertiary" : "border-error text-error"
                    }`}>
                      {emp.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-sm">
                    <div className="flex gap-xs">
                      <button
                        onClick={() => openEdit(emp)}
                        className="px-sm py-xs border border-on-surface bg-surface text-on-surface text-label-bold font-[700] hover:bg-on-surface hover:text-on-primary transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggle(emp.id, !emp.is_active)}
                        disabled={isPending}
                        className={`px-sm py-xs border text-label-bold font-[700] ${
                          emp.is_active 
                            ? "border-error text-error hover:bg-error hover:text-on-error"
                            : "border-tertiary text-tertiary hover:bg-tertiary hover:text-on-tertiary"
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
          <div className="p-lg text-center text-on-surface-variant">No employees found.</div>
        )}
      </div>
    </div>
  );
}