"use server";


/* ─────────────────────────────────────────────────────────────
   checkin.actions.ts — Server Actions for quarterly check-ins
   ───────────────────────────────────────────────────────────── */

import { createServerClient } from "@/lib/supabase/server";
import type { PostgrestSingleResponse } from "@supabase/supabase-js";
import type {
  CheckinComment,
  CheckinCommentInsert,
  QuarterPhase,
  PerformanceCycle,
  Database,
} from "@/lib/database.types";

// ─── Get comments for a sheet ───────────────────────────────
export async function getCheckinComments(
  sheetId: string,
): Promise<CheckinComment[]> {
  const db = await createServerClient();

  const { data, error } = await db
    .from("checkin_comments")
    .select("*")
    .eq("goal_sheet_id", sheetId)
    .order("created_at", { ascending: true });

  if (error)
    throw new Error(`Failed to fetch check-in comments: ${error.message}`);
  return (data as CheckinComment[]) ?? [];
}

// ─── Upsert a check-in comment ──────────────────────────────
export async function upsertCheckinComment(
  comment: CheckinCommentInsert,
): Promise<CheckinComment> {
  const db = await createServerClient();

  const { data, error } = await db
    .from("checkin_comments")
    // @ts-ignore
    .upsert(comment as Database["public"]["Tables"]["checkin_comments"]["Insert"], {
      onConflict: "goal_sheet_id,manager_id,quarter_phase",
    })
    .select()
    .single();

  if (error)
    throw new Error(`Failed to save check-in comment: ${error.message}`);
  return data!;
}

// ─── Determine active quarter from the cycle calendar ───────
export async function getActiveQuarter(): Promise<QuarterPhase | null> {
  const db = await createServerClient();
  const now = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const { data: cycle } = await db
    .from("performance_cycles")
    .select("*")
    .eq("is_active", true)
    .single();

  if (!cycle) return null;

  const c = cycle as PerformanceCycle;
  if (now >= c.q1_start && now <= c.q1_end) return "Q1";
  if (now >= c.q2_start && now <= c.q2_end) return "Q2";
  if (now >= c.q3_start && now <= c.q3_end) return "Q3";
  if (now >= c.q4_start && now <= c.q4_end) return "Q4_Annual";

  return null;
}
