import type { Metadata } from "next";
import { getTeamSheets, getTeamSheetsWithQuarterData } from "@/lib/actions/goal-sheet.actions";
import { createServerClient } from "@/lib/supabase/server";
import ManagerReviewGrid from "./ManagerReviewGrid";
import type { QuarterPhase } from "@/lib/database.types";

export const metadata: Metadata = {
  title: "Manager Review — PERFORM",
  description:
    "Review and approve team goals for the current performance cycle.",
};

interface Props {
  searchParams: Promise<{ quarter?: string }>;
}

export default async function ManagerReviewPage({ searchParams }: Props) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const params = await searchParams;
  const selectedQuarter = params.quarter as QuarterPhase | undefined;

  // If a quarter is selected, use quarter-aware data fetch
  const sheets = selectedQuarter 
    ? await getTeamSheetsWithQuarterData(user.id, selectedQuarter)
    : await getTeamSheets(user.id);

  return (
    <div className="flex flex-col gap-xl max-w-7xl mx-auto w-full">
      {/* Header */}
      <header className="flex flex-col gap-sm">
        <h1 className="text-headline-lg-mobile md:text-headline-lg font-[800] text-on-surface">
          Manager Review
        </h1>
        <p className="text-body-lg font-[400] text-on-surface-variant max-w-[42rem]">
          Review and approve team goals for the current cycle. Ensure alignment
          with departmental objectives.
        </p>
      </header>

      <ManagerReviewGrid initialSheets={sheets} selectedQuarter={selectedQuarter} />
    </div>
  );
}
