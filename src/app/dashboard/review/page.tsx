import type { Metadata } from "next";
import { getTeamSheets } from "@/lib/actions/goal-sheet.actions";
import { createServerClient } from "@/lib/supabase/server";
import ManagerReviewGrid from "./ManagerReviewGrid";

export const metadata: Metadata = {
  title: "Manager Review — PERFORM",
  description:
    "Review and approve team goals for the current performance cycle.",
};

export default async function ManagerReviewPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const sheets = await getTeamSheets(user.id);

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

      <ManagerReviewGrid initialSheets={sheets} />
    </div>
  );
}
