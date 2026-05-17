import type { Metadata } from "next";
import Link from "next/link";
import { getGoalSheet } from "@/lib/actions/goal-sheet.actions";
import ReviewDecisionPanel from "./ReviewDecisionPanel";
import ManagerReviewGoalList from "./ManagerReviewGoalList";

export const metadata: Metadata = {
  title: "Review Sheet — PERFORM",
};

export default async function ReviewDetailPage({
  params,
}: {
  params: Promise<{ sheetId: string }>;
}) {
  const { sheetId } = await params;
  const sheet = await getGoalSheet(sheetId);
  if (!sheet) return <div>Sheet not found.</div>;

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-lg pb-2xl">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-headline-md font-[800]">
            Review: {sheet.employee?.full_name ?? "Employee"}
          </h1>
          <p className="text-label-sm text-on-surface-variant">
            Sheet ID: {sheet.id}
          </p>
        </div>
        <div className="flex gap-sm">
          <Link
            href="/dashboard/review"
            className="px-md py-sm border-2 border-on-surface bg-surface text-on-surface font-bold hover:shadow-[4px_4px_0px_0px_#000000] transition-all"
          >
            Back to grid
          </Link>
        </div>
      </header>

      <section className="bg-surface-container-lowest border-2 border-on-surface p-md shadow-[4px_4px_0px_0px_#000000]">
        <div className="flex justify-between items-center mb-md border-b border-outline pb-sm">
          <p className="text-label-bold">
            Status: <span className={`px-sm py-xs border border-on-surface rounded uppercase text-xs ${
              sheet.status === "submitted" ? "bg-tertiary text-on-tertiary" : "bg-primary text-on-primary"
            }`}>{sheet.status}</span>
          </p>
          <p className="text-label-sm text-on-surface-variant">
            Cycle ID: {sheet.cycle_id.slice(0, 8)}...
          </p>
        </div>

        <ManagerReviewGoalList 
          initialGoals={sheet.goals || []} 
          sheetId={sheet.id} 
          isLocked={sheet.status === "locked"}
        />
      </section>

      {sheet.status !== "locked" && (
        <div className="bg-surface-container-lowest border-2 border-on-surface p-md shadow-[4px_4px_0px_0px_#000000]">
          <h3 className="text-label-bold mb-md border-b border-outline pb-sm uppercase">Decision Panel</h3>
          <ReviewDecisionPanel sheetId={sheet.id} />
        </div>
      )}
      
      {sheet.status === "locked" && sheet.rejection_feedback && (
        <div className="bg-error-container text-on-error-container border-2 border-error p-md">
          <h3 className="text-label-bold mb-xs">Previous Rejection Feedback:</h3>
          <p className="text-body-md">{sheet.rejection_feedback}</p>
        </div>
      )}
    </div>
  );
}
