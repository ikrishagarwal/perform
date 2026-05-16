/* ─────────────────────────────────────────────────────────────
   progress-engine.ts — Programmatic score computation engine
   Implements the four UoM formulas from PRD §6.1
   ───────────────────────────────────────────────────────────── */

import type { UomType } from "@/lib/database.types";

/**
 * Computes a progress percentage (0–100) given a UoM strategy,
 * a planned target, and the actual achievement value.
 *
 * Formulas:
 * - numeric_min  → (actual / target) × 100   (higher is better)
 * - numeric_max  → (target / actual) × 100   (lower is better)
 * - zero_based   → actual === 0 ? 100 : 0
 * - timeline     → completionDate <= deadline ? 100 : 0
 */
export function calculateProgress(
  uom: UomType,
  targetValue: string,
  actualAchievement: string | null
): number {
  if (!actualAchievement || actualAchievement.trim() === "") return 0;

  // ── Timeline: date comparison ──
  if (uom === "timeline") {
    const deadline = new Date(targetValue).getTime();
    const completion = new Date(actualAchievement).getTime();
    if (isNaN(deadline) || isNaN(completion)) return 0;
    return completion <= deadline ? 100 : 0;
  }

  // ── Numeric types ──
  const target = parseFloat(targetValue);
  const actual = parseFloat(actualAchievement);
  if (isNaN(target) || isNaN(actual)) return 0;

  switch (uom) {
    case "numeric_min":
      if (target <= 0) return 0;
      return Math.min(Math.round((actual / target) * 100), 100);

    case "numeric_max":
      if (actual <= 0) return 0;
      return Math.min(Math.round((target / actual) * 100), 100);

    case "zero_based":
      return actual === 0 ? 100 : 0;

    default:
      return 0;
  }
}

/**
 * Computes the weighted overall score for an array of goals.
 * Returns a percentage value 0–100.
 */
export function calculateOverallScore(
  goals: Array<{
    uom: UomType;
    target_value: string;
    actual_achievement: string | null;
    weightage: number;
  }>
): number {
  if (goals.length === 0) return 0;

  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const g of goals) {
    const progress = calculateProgress(g.uom, g.target_value, g.actual_achievement);
    totalWeightedScore += progress * (g.weightage / 100);
    totalWeight += g.weightage;
  }

  if (totalWeight === 0) return 0;
  return Math.round((totalWeightedScore / (totalWeight / 100)) * 100) / 100;
}
