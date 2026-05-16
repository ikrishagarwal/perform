"use client";

import { useState, useTransition } from "react";
import { adminUnlockSheet } from "@/lib/actions/admin.actions";
import NeoToast from "@/components/feedback/NeoToast";
import { useToast } from "@/hooks/useToast";

type ModalType = "unlock" | "export" | null;

export default function AdminActionsPanel({
  activeCycleId,
}: {
  activeCycleId: string | null;
}) {
  const [sheetId, setSheetId] = useState("");
  const [modalType, setModalType] = useState<ModalType>(null);
  const [isPending, startTransition] = useTransition();
  const { toast, showSuccess, showError } = useToast();

  const openModal = (type: ModalType) => {
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
      <NeoToast toast={toast} />
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
          <div className="text-on-surface-variant">Compliance Metrics</div>
        </div>
      </div>

      <div className="bg-surface-container-lowest border-2 border-on-surface rounded-xl p-lg shadow-[4px_4px_0px_0px_#000000]">
        <h3 className="text-headline-md font-[700] mb-md border-b-2 border-on-surface pb-sm">
          Audit Logs
        </h3>
        <ul className="space-y-sm text-label-bold font-[700] tracking-[0.05em] text-primary">
          <li>View System Activity</li>
          <li>Track Locked Modifications</li>
        </ul>
      </div>

      {modalType ? (
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
    </div>
  );
}
