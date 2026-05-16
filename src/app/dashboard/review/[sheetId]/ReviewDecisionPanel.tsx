"use client";

import { useRef, useState, useTransition } from "react";
import { approveSheet, rejectSheet } from "@/lib/actions/goal-sheet.actions";
import NeoToast from "@/components/feedback/NeoToast";
import { useToast } from "@/hooks/useToast";

type PendingAction = "approve" | "reject" | null;

export default function ReviewDecisionPanel({ sheetId }: { sheetId: string }) {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const feedbackRef = useRef<HTMLTextAreaElement>(null);
  const [isPending, startTransition] = useTransition();
  const { toast, showSuccess, showError } = useToast();

  const closeModal = () => setPendingAction(null);

  const confirmAction = () => {
    startTransition(async () => {
      try {
        if (pendingAction === "approve") {
          await approveSheet({ sheetId });
          showSuccess("Goal sheet approved and locked.");
        }
        if (pendingAction === "reject") {
          await rejectSheet({
            sheetId,
            rejectionFeedback: feedbackRef.current?.value ?? "",
          });
          showSuccess("Goal sheet rejected and moved to draft.");
        }
      } catch (err) {
        showError(
          err instanceof Error
            ? err.message
            : "Failed to complete review action.",
        );
      } finally {
        closeModal();
      }
    });
  };

  return (
    <>
      <NeoToast toast={toast} />
      <section className="flex gap-md">
        <div className="flex-1">
          <button
            type="button"
            onClick={() => setPendingAction("approve")}
            className="w-full px-md py-sm border border-on-surface bg-primary text-on-primary font-[700]"
          >
            Approve
          </button>
        </div>

        <div className="flex-1">
          <textarea
            ref={feedbackRef}
            name="rejectionFeedback"
            placeholder="Optional rejection feedback"
            className="w-full p-sm border border-on-surface mb-sm"
          />
          <button
            type="button"
            onClick={() => setPendingAction("reject")}
            className="w-full px-md py-sm border border-on-surface bg-error text-on-error font-[700]"
          >
            Reject
          </button>
        </div>
      </section>

      {pendingAction ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-md">
          <div
            className="absolute inset-0 bg-on-surface/60"
            onClick={closeModal}
          />
          <div className="relative w-[min(92vw,40rem)] border-2 border-on-surface bg-surface-container-lowest shadow-[8px_8px_0px_0px_#000000] p-lg">
            <h4 className="text-headline-md font-[800] mb-sm whitespace-normal break-words">
              {pendingAction === "approve"
                ? "Confirm Approval"
                : "Confirm Rejection"}
            </h4>
            <p className="text-body-md text-on-surface-variant mb-md whitespace-normal break-words leading-relaxed">
              {pendingAction === "approve"
                ? "This will lock the goal sheet and mark it as approved. Continue?"
                : "This will set the goal sheet back to draft for revisions. Continue?"}
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
                onClick={confirmAction}
                className="px-md py-sm border border-on-surface bg-on-surface text-on-primary text-label-bold font-[700] disabled:opacity-50"
              >
                {isPending ? "Working..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
