import type { Metadata } from "next";
import { getTeamSheets } from "@/lib/actions/goal-sheet.actions";
import { createServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Manager Review — PERFORM",
  description:
    "Review and approve team goals for the current performance cycle.",
};

/* ─── Status Badge ─── */
function ReviewStatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { bg: string; text: string; label: string }
  > = {
    submitted: {
      bg: "bg-tertiary-container",
      text: "text-on-tertiary-container",
      label: "Pending Review",
    },
    locked: {
      bg: "bg-surface-tint",
      text: "text-on-primary",
      label: "Approved",
    },
    draft: {
      bg: "bg-error",
      text: "text-on-error",
      label: "Draft",
    },
  };
  const c = config[status] ?? config.draft;

  return (
    <span
      className={`inline-flex px-sm py-xs border border-on-surface ${c.bg} ${c.text} text-label-sm font-[500] tracking-[0.02em] rounded uppercase`}
    >
      {c.label}
    </span>
  );
}

export default async function ManagerReviewPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const sheets = await getTeamSheets(user.id);

  /* Build review rows from actual data */
  const reviewRows = sheets.map((sheet) => {
    const employee = (sheet as any).employee;
    const goals = sheet.goals || [];
    const totalWeight = goals.reduce((s, g) => s + g.weightage, 0);
    return { sheet, employee, totalWeight };
  });

  return (
    <div className="flex flex-col gap-xl max-w-7xl mx-auto w-full">
      {/* Header */}
      <header className="flex flex-col gap-sm">
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-[800] text-on-surface">
          Manager Review
        </h1>
        <p className="text-body-lg font-[400] text-on-surface-variant max-w-2xl">
          Review and approve team goals for the current cycle. Ensure alignment
          with departmental objectives.
        </p>
      </header>

      {/* Filters */}
      <div className="flex flex-wrap gap-sm items-center">
        <button className="px-md py-sm border-2 border-on-surface bg-on-surface text-on-primary text-label-bold font-[700] tracking-[0.05em] shadow-[4px_4px_0px_0px_#000000] -translate-y-px -translate-x-px">
          All
        </button>
        <button className="px-md py-sm border border-on-surface bg-surface-container-lowest text-on-surface text-label-bold font-[700] tracking-[0.05em] hover:bg-surface-container-high transition-colors">
          Pending
        </button>
        <button className="px-md py-sm border border-on-surface bg-surface-container-lowest text-on-surface text-label-bold font-[700] tracking-[0.05em] hover:bg-surface-container-high transition-colors">
          Approved
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-surface-container-lowest border-2 border-on-surface shadow-[8px_8px_0px_0px_#000000] overflow-hidden flex flex-col">
        {/* Table Header (Desktop) */}
        <div className="hidden md:grid grid-cols-12 gap-gutter bg-on-surface text-on-primary p-md border-b border-on-surface items-center text-label-bold font-[700] tracking-[0.05em]">
          <div className="col-span-4">Employee Name</div>
          <div className="col-span-3">Submission Status</div>
          <div className="col-span-3">Total Weightage</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        {/* Table Rows */}
        <div className="flex flex-col">
          {reviewRows.map(({ sheet, employee, totalWeight }) => {
            const isDraft = sheet.status === "draft";
            return (
              <div
                key={sheet.id}
                className="flex flex-col md:grid md:grid-cols-12 gap-sm md:gap-gutter p-md border-b border-on-surface items-center hover:bg-surface-container-low transition-colors"
              >
                {/* Employee */}
                <div className="md:col-span-4 flex items-center gap-sm w-full">
                  <div className="w-10 h-10 rounded border border-on-surface overflow-hidden shrink-0 bg-surface-dim flex items-center justify-center text-label-bold font-[700] tracking-[0.05em] text-on-surface">
                    {employee?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={employee.avatar_url}
                        alt={employee.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      employee?.full_name
                        .split(" ")
                        .map((n: string) => n[0])
                        .join("") ?? "?"
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-label-bold font-[700] tracking-[0.05em] text-on-surface">
                      {employee?.full_name}
                    </span>
                    <span className="text-label-sm font-[500] tracking-[0.02em] text-on-surface-variant">
                      {employee?.title}
                    </span>
                  </div>
                </div>

                {/* Status */}
                <div className="md:col-span-3 w-full flex justify-between md:block items-center">
                  <span className="md:hidden text-label-bold font-[700] tracking-[0.05em] text-on-surface-variant">
                    Status:
                  </span>
                  <ReviewStatusBadge status={sheet.status} />
                </div>

                {/* Weightage */}
                <div className="md:col-span-3 w-full flex justify-between md:block items-center">
                  <span className="md:hidden text-label-bold font-[700] tracking-[0.05em] text-on-surface-variant">
                    Weightage:
                  </span>
                  <div className="flex items-center gap-sm w-full max-w-[120px]">
                    <span className="text-label-bold font-[700] tracking-[0.05em] text-on-surface">
                      {totalWeight}%
                    </span>
                    <div className="h-2 w-full bg-surface-container-high border border-on-surface">
                      <div
                        className={`h-full border-r border-on-surface ${
                          totalWeight >= 100 ? "bg-primary" : "bg-tertiary"
                        }`}
                        style={{
                          width: `${Math.min(totalWeight, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="md:col-span-2 w-full flex justify-end md:block mt-sm md:mt-0">
                  <button
                    disabled={isDraft}
                    className={`w-full md:w-auto px-md py-sm border border-on-surface bg-surface-container-lowest text-on-surface text-label-bold font-[700] tracking-[0.05em] text-center transition-all ${
                      isDraft
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:shadow-[4px_4px_0px_0px_#000000] hover:-translate-y-px hover:-translate-x-px"
                    }`}
                  >
                    {sheet.status === "locked" ? (
                      <span className="flex items-center justify-center gap-xs">
                        <span className="material-symbols-outlined text-[16px]">
                          visibility
                        </span>
                        View
                      </span>
                    ) : (
                      "Review"
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
