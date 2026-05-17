"use client";

import { useState, useTransition, useEffect } from "react";
import { getThrustAreas, createThrustArea, updateThrustArea, toggleThrustArea, ThrustArea } from "@/lib/actions/admin.actions";
import NeoToast from "@/components/feedback/NeoToast";
import { useToast } from "@/hooks/useToast";

export default function ThrustAreasPage() {
  const [areas, setAreas] = useState<ThrustArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingArea, setEditingArea] = useState<ThrustArea | null>(null);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [isPending, startTransition] = useTransition();
  const { toast, showSuccess, showError } = useToast();

  const loadData = async () => {
    try {
      const data = await getThrustAreas();
      setAreas(data);
    } catch (err) {
      showError("Failed to load thrust areas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      showError("Name is required");
      return;
    }

    startTransition(async () => {
      try {
        if (editingArea) {
          await updateThrustArea(editingArea.id, formData.name, formData.description);
          showSuccess("Thrust area updated");
        } else {
          await createThrustArea(formData.name, formData.description);
          showSuccess("Thrust area created");
        }
        setShowForm(false);
        setEditingArea(null);
        setFormData({ name: "", description: "" });
        loadData();
      } catch (err) {
        showError(err instanceof Error ? err.message : "Operation failed");
      }
    });
  };

  const handleToggle = (id: string, isActive: boolean) => {
    startTransition(async () => {
      try {
        await toggleThrustArea(id, !isActive);
        showSuccess(`Thrust area ${!isActive ? "activated" : "deactivated"}`);
        loadData();
      } catch (err) {
        showError(err instanceof Error ? err.message : "Operation failed");
      }
    });
  };

  const openEdit = (area: ThrustArea) => {
    setEditingArea(area);
    setFormData({ name: area.name, description: area.description || "" });
    setShowForm(true);
  };

  const openNew = () => {
    setEditingArea(null);
    setFormData({ name: "", description: "" });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingArea(null);
    setFormData({ name: "", description: "" });
  };

  return (
    <div className="flex flex-col gap-xl max-w-7xl mx-auto w-full">
      <NeoToast toast={toast} />

      <header className="flex flex-col gap-sm">
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-[800] text-on-surface">
          Thrust Areas
        </h1>
        <p className="text-body-lg text-on-surface-variant">
          Manage the categories used for goal setting across the organization.
        </p>
      </header>

      <div className="flex justify-end">
        <button
          onClick={openNew}
          className="px-md py-sm border-2 border-on-surface bg-primary text-on-primary text-label-bold font-[700] uppercase tracking-[0.05em] shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[6px_6px_0px_0px_#000000] transition-all"
        >
          + Add Thrust Area
        </button>
      </div>

      {showForm && (
        <div className="border-2 border-on-surface bg-surface-container-lowest p-lg shadow-[4px_4px_0px_0px_#000000]">
          <h3 className="text-headline-md font-[700] mb-md">
            {editingArea ? "Edit Thrust Area" : "New Thrust Area"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <div className="flex flex-col gap-xs">
              <label className="text-label-bold font-[700] uppercase text-xs">Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="border-2 border-on-surface p-sm bg-surface text-body-lg"
                placeholder="e.g., Strategic"
              />
            </div>
            <div className="flex flex-col gap-xs">
              <label className="text-label-bold font-[700] uppercase text-xs">Description</label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="border-2 border-on-surface p-sm bg-surface text-body-lg"
                placeholder="Optional description"
              />
            </div>
          </div>
          <div className="flex gap-sm mt-md">
            <button
              onClick={closeForm}
              className="px-md py-sm border border-on-surface bg-surface text-on-surface text-label-bold font-[700]"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="px-md py-sm border border-on-surface bg-on-surface text-on-primary text-label-bold font-[700] disabled:opacity-50"
            >
              {isPending ? "Saving..." : editingArea ? "Update" : "Create"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-xl text-on-surface-variant">Loading...</div>
      ) : areas.length === 0 ? (
        <div className="border-2 border-on-surface bg-surface-container-lowest p-xl text-center">
          <span className="material-symbols-outlined text-4xl text-on-surface-variant mb-md block">
            category
          </span>
          <p className="text-body-lg text-on-surface-variant">No thrust areas found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          {areas.map((area) => (
            <div
              key={area.id}
              className="border-2 border-on-surface bg-surface-container-lowest p-lg shadow-[4px_4px_0px_0px_#000000] flex flex-col"
            >
              <div className="flex items-start justify-between mb-md">
                <div className="w-10 h-10 border-2 border-on-surface rounded bg-tertiary flex items-center justify-center text-on-tertiary font-bold shadow-[2px_2px_0px_0px_#000000]">
                  {area.name[0]}
                </div>
                <span className="px-sm py-xs border border-on-surface text-label-bold font-[700] uppercase text-xs bg-surface">
                  Active
                </span>
              </div>
              <h3 className="text-headline-md font-[700] text-on-surface mb-sm">
                {area.name}
              </h3>
              <p className="text-body-lg text-on-surface-variant flex-1">
                {area.description || "No description"}
              </p>
              <div className="flex gap-sm mt-md pt-md border-t-2 border-on-surface">
                <button
                  onClick={() => openEdit(area)}
                  className="flex-1 px-sm py-xs border border-on-surface bg-surface text-on-surface text-label-bold font-[700] hover:bg-on-surface hover:text-on-primary transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleToggle(area.id, area.is_active)}
                  disabled={isPending}
                  className="flex-1 px-sm py-xs border border-error text-error text-label-bold font-[700] hover:bg-error hover:text-on-error transition-colors"
                >
                  Deactivate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}