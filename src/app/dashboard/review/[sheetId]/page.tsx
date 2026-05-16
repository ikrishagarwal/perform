import type { Metadata } from "next";
import Link from "next/link";
import { getGoalSheet } from "@/lib/actions/goal-sheet.actions";
import ReviewDecisionPanel from "./ReviewDecisionPanel";

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

  const totalWeight = (sheet.goals || []).reduce((s, g) => s + g.weightage, 0);

  return (
    <div className="max-w-4xl mx-auto">
      <header className="flex items-center justify-between mb-md">
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
            className="px-md py-sm border border-on-surface bg-surface-container-low text-on-surface"
          >
            Back to review
          </Link>
        </div>
      </header>

      <section className="mb-lg bg-surface-container-lowest border-2 border-on-surface p-md">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-label-bold">
              Status: <strong className="uppercase">{sheet.status}</strong>
            </p>
            <p className="text-label-sm text-on-surface-variant">
              Total Weight: {totalWeight}%
            </p>
          </div>
        </div>

        <div className="mt-md">
          <h3 className="text-label-bold mb-sm">Goals</h3>
          <div className="flex flex-col gap-sm">
            {(sheet.goals || []).map((g) => (
              <div
                key={g.id}
                className="p-sm border border-on-surface bg-surface"
              >
                <div className="flex justify-between items-start gap-sm">
                  <div>
                    <div className="text-label-bold">{g.title}</div>
                    <div className="text-label-sm text-on-surface-variant">
                      {g.thrust_area}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-label-sm">
                      Target: {g.target_value}
                    </div>
                    <div className="text-label-sm">Weight: {g.weightage}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ReviewDecisionPanel sheetId={sheet.id} />
    </div>
  );
}
