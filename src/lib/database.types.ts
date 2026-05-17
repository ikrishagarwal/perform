/* ─────────────────────────────────────────────────────────────
   database.types.ts — Strongly-typed contracts mirroring the
   PostgreSQL schema defined in 00001_initial_schema.sql
   ───────────────────────────────────────────────────────────── */

// ─── Enum Mirrors ───────────────────────────────────────────
export type AppRole = "employee" | "manager" | "admin";
export type SheetStatus = "draft" | "submitted" | "locked";
export type UomType = "numeric_min" | "percentage_min" | "numeric_max" | "percentage_max" | "timeline" | "zero_based";
export type GoalProgress = "not_started" | "on_track" | "completed";
export type QuarterPhase = "Q1" | "Q2" | "Q3" | "Q4_Annual";

// ─── Row Types ──────────────────────────────────────────────

export interface Profile {
  id: string;
  full_name: string;
  role: AppRole;
  manager_id: string | null;
  title: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PerformanceCycle {
  id: string;
  cycle_year: number;
  goal_setting_start: string;
  goal_setting_end: string;
  q1_start: string;
  q1_end: string;
  q2_start: string;
  q2_end: string;
  q3_start: string;
  q3_end: string;
  q4_start: string;
  q4_end: string;
  is_active: boolean;
  created_at: string;
}

export interface GoalSheet {
  id: string;
  employee_id: string;
  cycle_id: string;
  status: SheetStatus;
  submitted_at: string | null;
  approved_at: string | null;
  approved_by: string | null;
  rejection_feedback: string | null;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  goal_sheet_id: string;
  thrust_area: string;
  title: string;
  description: string;
  uom: UomType;
  target_value: string;
  weightage: number;
  actual_achievement: string | null;
  progress_status: GoalProgress;
  parent_goal_id: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CheckinComment {
  id: string;
  goal_sheet_id: string;
  manager_id: string;
  quarter_phase: QuarterPhase;
  comment_text: string;
  created_at: string;
}

export interface AuditLogChangedField {
  field: string;
  old_value: string | number;
  new_value: string | number;
}

export interface AuditLog {
  id: string;
  goal_id: string;
  goal_sheet_id: string;
  modified_by: string;
  changed_fields: AuditLogChangedField[];
  created_at: string;
}

// ─── Insert / Update DTOs ───────────────────────────────────

export type GoalInsert = Omit<Goal, "id" | "created_at" | "updated_at">;
export type GoalUpdate = Partial<
  Omit<Goal, "id" | "created_at" | "updated_at">
>;

export type GoalSheetInsert = Omit<GoalSheet, "id" | "created_at" | "updated_at">;
export type GoalSheetUpdate = Partial<
  Omit<GoalSheet, "id" | "employee_id" | "cycle_id" | "created_at" | "updated_at">
>;

export type CheckinCommentInsert = Omit<CheckinComment, "id" | "created_at">;

// ─── Joined View Types ──────────────────────────────────────

export interface GoalSheetWithGoals extends GoalSheet {
  goals: Goal[];
  employee?: Profile;
}

export interface GoalWithSheet extends Goal {
  goal_sheet: GoalSheet;
}

// ─── Supabase Generated Database Interface ──────────────────

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at" | "updated_at">;
        Update: Partial<Omit<Profile, "id" | "created_at">>;
      };
      performance_cycles: {
        Row: PerformanceCycle;
        Insert: Omit<PerformanceCycle, "id" | "created_at">;
        Update: Partial<Omit<PerformanceCycle, "id" | "created_at">>;
      };
      goal_sheets: {
        Row: GoalSheet;
        Insert: GoalSheetInsert;
        Update: GoalSheetUpdate;
      };
      goals: {
        Row: Goal;
        Insert: GoalInsert;
        Update: GoalUpdate;
      };
      checkin_comments: {
        Row: CheckinComment;
        Insert: CheckinCommentInsert;
        Update: Partial<Pick<CheckinComment, "comment_text">>;
      };
      audit_logs: {
        Row: AuditLog;
        Insert: Record<string, never>; // system-managed only
        Update: Record<string, never>;
      };
    };
    Enums: {
      app_role: AppRole;
      sheet_status: SheetStatus;
      uom_type: UomType;
      goal_progress: GoalProgress;
      quarter_phase: QuarterPhase;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
