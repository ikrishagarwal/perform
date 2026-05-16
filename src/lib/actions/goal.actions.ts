"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */

/* ─────────────────────────────────────────────────────────────
   goal.actions.ts — Server Actions for individual Goal CRUD
   ───────────────────────────────────────────────────────────── */

import { createServerClient } from "@/lib/supabase/server";
import type { GoalInsert, GoalUpdate, Goal } from "@/lib/database.types";

// ─── Create a new goal row ──────────────────────────────────
export async function createGoal(goal: GoalInsert): Promise<Goal> {
  const db = (await createServerClient()) as any;

  const { data, error } = await db
    .from("goals")
    .insert(goal)
    .select()
    .single();

  if (error) throw new Error(`Failed to create goal: ${error.message}`);
  return data as Goal;
}

// ─── Batch-upsert goals (for form save) ─────────────────────
export async function upsertGoals(
  sheetId: string,
  goals: Array<GoalInsert & { id?: string }>
): Promise<Goal[]> {
  const db = (await createServerClient()) as any;

  // Delete any existing goals that are no longer in the payload
  const incomingIds = goals.filter((g) => g.id).map((g) => g.id!);
  if (incomingIds.length > 0) {
    await db
      .from("goals")
      .delete()
      .eq("goal_sheet_id", sheetId)
      .not("id", "in", `(${incomingIds.join(",")})`);
  } else {
    // All new — clear old goals
    await db.from("goals").delete().eq("goal_sheet_id", sheetId);
  }

  // Upsert each goal with sort_order
  const results: Goal[] = [];
  for (let i = 0; i < goals.length; i++) {
    const { id, ...fields } = goals[i];
    const payload = { ...fields, goal_sheet_id: sheetId, sort_order: i };

    if (id) {
      const { data, error } = await db
        .from("goals")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw new Error(`Failed to update goal ${id}: ${error.message}`);
      results.push(data as Goal);
    } else {
      const { data, error } = await db
        .from("goals")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(`Failed to insert goal: ${error.message}`);
      results.push(data as Goal);
    }
  }

  return results;
}

// ─── Update a single goal ───────────────────────────────────
export async function updateGoal(goalId: string, updates: GoalUpdate): Promise<Goal> {
  const db = (await createServerClient()) as any;

  const { data, error } = await db
    .from("goals")
    .update(updates)
    .eq("id", goalId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update goal: ${error.message}`);
  return data as Goal;
}

// ─── Delete a goal ──────────────────────────────────────────
export async function deleteGoal(goalId: string) {
  const db = (await createServerClient()) as any;

  const { error } = await db.from("goals").delete().eq("id", goalId);
  if (error) throw new Error(`Failed to delete goal: ${error.message}`);
}

// ─── Update quarterly actuals (check-in) ────────────────────
export async function updateGoalActuals(
  goalId: string,
  actualAchievement: string,
  progressStatus: "not_started" | "on_track" | "completed"
): Promise<Goal> {
  const db = (await createServerClient()) as any;

  const { data, error } = await db
    .from("goals")
    .update({
      actual_achievement: actualAchievement,
      progress_status: progressStatus,
    })
    .eq("id", goalId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update actuals: ${error.message}`);
  return data as Goal;
}

// ─── Distribute a shared KPI to multiple employees ─────────
export async function distributeSharedGoal(
  parentGoal: GoalInsert,
  targetSheetIds: string[]
): Promise<Goal[]> {
  const db = (await createServerClient()) as any;

  // 1. Create the parent goal (on the admin/manager's own sheet or a sentinel sheet)
  const { data: parentData, error: parentErr } = await db
    .from("goals")
    .insert(parentGoal)
    .select()
    .single();
  
  const parent = parentData as unknown as Goal;

  if (parentErr) throw new Error(`Failed to create parent goal: ${parentErr.message}`);

  // 2. Create child copies on each target sheet
  const children: Goal[] = [];
  for (const sheetId of targetSheetIds) {
    const child: GoalInsert = {
      goal_sheet_id: sheetId,
      thrust_area: parent.thrust_area,
      title: parent.title,
      description: parent.description,
      uom: parent.uom,
      target_value: parent.target_value,
      weightage: parent.weightage,
      actual_achievement: null,
      progress_status: "not_started",
      parent_goal_id: parent.id,
      sort_order: 99, // appended at end
    };

    const { data, error } = await db
      .from("goals")
      .insert(child)
      .select()
      .single();

    if (error) throw new Error(`Failed to distribute to sheet ${sheetId}: ${error.message}`);
    children.push(data as Goal);
  }

  return [parent, ...children];
}
