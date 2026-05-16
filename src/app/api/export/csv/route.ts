/* ─────────────────────────────────────────────────────────────
   GET /api/export/csv — CSV download endpoint for admin/HR
   ───────────────────────────────────────────────────────────── */

import { NextRequest, NextResponse } from "next/server";
import { exportGoalDataCsv } from "@/lib/actions/admin.actions";

export async function GET(request: NextRequest) {
  const cycleId = request.nextUrl.searchParams.get("cycleId");

  if (!cycleId) {
    return NextResponse.json({ error: "cycleId query parameter is required" }, { status: 400 });
  }

  try {
    const csv = await exportGoalDataCsv(cycleId);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="goal_export_${Date.now()}.csv"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
