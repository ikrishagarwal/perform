# FEATURES.md — COMPREHENSIVE FEATURE SPECIFICATION LOG

## System Target: In-House Goal Setting & Tracking Portal

## Engineering Standard: Next.js App Router + TypeScript + Supabase DB

## Aesthetic Profile: Bold Typography / Editorial Data Edition

---

## 🚀 FEATURE IMPLEMENTATION STATUS (Audit Date: May 16, 2026)

| Feature ID | Feature Name                             | Status           | Summary of Remaining Work                                                                                   |
| :--------- | :--------------------------------------- | :--------------- | :---------------------------------------------------------------------------------------------------------- |
| **1.1**    | Multi-Tenant RBAC Routing Gateway        | 🟡 **PARTIAL**   | Middleware handles auth but needs explicit redirection to role-specific sub-routes.                         |
| **1.2**    | Interactive Multi-Persona Switcher       | ❌ **PENDING**   | Dev toolbar for rapid role swapping is not yet implemented.                                                 |
| **2.1**    | Dynamic Goal Sheet Composition Workplace | ✅ **100% DONE** | Full CRUD workspace with linear data grid implemented.                                                      |
| **2.2**    | Real-Time Constraint Validation Engine   | ✅ **100% DONE** | 8-goal cap, 10% min weight, 100% total sum enforced via UI and DB Triggers.                                 |
| **2.3**    | Shared Departmental KPI Distribution     | 🟡 **PARTIAL**   | DB sync logic and Server Actions exist; Admin UI for distribution is missing.                               |
| **3.1**    | Team Compliance Dashboard View           | ✅ **100% DONE** | Manager-facing grid with report statuses and completion tracking is active.                                 |
| **3.2**    | Inline Modification & Approval View      | ✅ **100% DONE** | Manager review detail page with approve/reject actions, feedback capture, and confirmation modal is active. |
| **4.1**    | Quarterly Progress Capture Portal        | ✅ **100% DONE** | Check-in interface for actuals entry and status updates is fully functional.                                |
| **4.2**    | Programmatic Score Calculation Engine    | ✅ **100% DONE** | Formulas for Numeric Min/Max, Timeline, and Zero-Based are implemented in `progress-engine.ts`.             |
| **4.3**    | Shared Goal Real-Time Cascading Sync     | ✅ **100% DONE** | Database trigger `tg_cascade_shared_goals` automatically syncs parent to child actuals.                     |
| **5.1**    | Immutable Post-Lock Change Ledger        | ✅ **100% DONE** | Database trigger `tg_audit_locked_mutations` captures diffs on locked records to `audit_logs`.              |
| **5.2**    | Admin Overrides & Unlock Control         | ✅ **100% DONE** | Admin Hub now supports force unlock with confirmation modal and toast feedback.                             |
| **5.3**    | Global Compliance & Data Export          | 🟡 **PARTIAL**   | CSV export is implemented via Admin Hub; compliance heatmap visualizations remain pending.                  |

---

## 1. EPIC 1: Persona-Based Core Authentication & Navigation

### Feature 1.1: Multi-Tenant RBAC Routing Gateway

- **Status**: 🟡 **PARTIALLY IMPLEMENTED**
- **Functional Description**: A unified, high-contrast entry login portal that securely segmentations traffic based on organizational security context.
- **Technical Requirements**:
  - Authenticate user credentials securely via Supabase Auth services.
  - Implement Next.js Middleware to parse user role claims (`employee`, `manager`, `admin`) directly from database profiles upon successful session authorization.
  - Enforce immediate server-side redirection to the designated workspace sub-routes (`/dashboard/employee`, `/dashboard/manager`, or `/dashboard/admin`).
  - Implement a fallback route protection engine that blocks unauthorized cross-role path executions with an immediate access rejection error.

### Feature 1.2: Interactive Multi-Persona Switcher (Dev Mode Toolbar)

- **Status**: ❌ **NOT IMPLEMENTED** (Won't be implemented)
- **Functional Description**: A fixed developer environment visual toolbar that allows hackathon evaluators to toggle between user journeys instantly without logging out.
- **Technical Requirements**:
  - Render a fixed layout panel anchored to the viewport baseline using raw black borders (`1px solid #000000`) and a flat layout depth offset (`4px 4px 0px 0px #000000`).
  - Expose explicit, single-click buttons to dynamically re-scope the active app session metadata context to `Employee`, `Manager`, or `Admin`.
  - Use state management to simulate client-side context overrides, updating application views dynamically to match the selected role without forcing a full cache refresh or losing app data state.

---

## 2. EPIC 2: Phase 1 — Goal Creation & Submission Lifecycle

### Feature 2.1: Dynamic Goal Sheet Composition Workplace

- **Status**: ✅ **100% IMPLEMENTED**
- **Functional Description**: An employee-facing interface to design, edit, and locally store draft performance targets for the active calendar year.
- **Technical Requirements**:
  - Formulate a dense linear data data grid allowing users to insert, modify, or clear individual goal rows seamlessly.
  - Bind every interactive form field explicitly to the strict schema data points: `Thrust Area`, `Title`, `Description`, `UoM`, `Target Value`, and `Weightage`.
  - Maintain data states locally within an active form array before committing batch transactions to the `public.goals` table via Next.js Server Actions.

### Feature 2.2: Real-Time Constraint Validation Engine

- **Status**: ✅ **100% IMPLEMENTED**
- **Functional Description**: A rigid, client-and-server-side verification layout that enforces strict compliance boundaries before a sheet can be submitted.
- **Technical Requirements**:
  - **Volume Boundary**: Restrict the form row array length to a maximum of 8 goals.
  - **Floor Boundary**: Implement validation that flags an error if any single weightage allocation drops below 10%.
  - **Accumulation Balance**: Render a persistent side panel tracking total weightage (must equal exactly 100%).
  - **Database Verification Backup**: Trigger `tg_goal_volume_cap` and `tg_validate_sheet_submission` enforce these rules at the persistence layer.

### Feature 2.3: Shared Departmental KPI Distribution Engine

- **Status**: 🟡 **PARTIALLY IMPLEMENTED**
- **Functional Description**: Allows administrators or direct managers to broadcast foundational KPI goals across multiple employee sheets simultaneously.
- **Technical Requirements**:
  - Build an administrative distribution view to select target organizational tracking tracks and push uniform parent goal records. (**PENDING UI**)
  - **Cascading Read-Only Mapping**: Shared goals (`parent_goal_id IS NOT NULL`) are read-only except for weightage. (**IMPLEMENTED IN LOGIC**)
  - **Weightage Overrides**: Retain write permissions exclusively on the local `Weightage` input field. (**IMPLEMENTED IN LOGIC**)

---

## 3. EPIC 3: Phase 1 — Managerial Review & Operational Workflows

### Feature 3.1: Team Compliance Dashboard View

- **Status**: ✅ **100% IMPLEMENTED**
- **Functional Description**: A centralized interface providing direct managers real-time visibility into the current submission status across all direct reports.
- **Technical Requirements**:
  - Fetch and display direct report data cards matching manager's `profile_id` against employee `manager_id`.
  - Group team statuses dynamically into: `Draft`, `Pending Review`, and `Approved & Locked`.

### Feature 3.2: Inline Modification & Approval Framework

- **Status**: ✅ **100% IMPLEMENTED**
- **Functional Description**: Enables direct managers to evaluate submitted employee sheets, modify fields inline, or reject the sheet back to a draft state.
- **Technical Requirements**:
  - **Review Detail Screen**: Route to `/dashboard/review/[sheetId]` to inspect sheet-level goals, totals, and status metadata.
  - **Approve Command**: Server Action `approveSheet` updates `goal_sheets.status` to `locked` and stamps approval timestamp.
  - **Rework Rejection Command**: Server Action `rejectSheet` reverts status to `draft` and stores manager feedback.
  - **Confirmation + Feedback UX**: Actions run through confirmation modal and toast notifications (replacing browser alerts).

---

## 4. EPIC 4: Phase 2 — Achievement Tracking & Quarterly Check-ins

### Feature 4.1: Quarterly Progress Capture Portal

- **Status**: ✅ **100% IMPLEMENTED**
- **Functional Description**: A periodic tracking interface enabling employees to log empirical achievement metrics against their locked targets.
- **Technical Requirements**:
  - Lock entry fields programmatically, unlocking access only within authorized tracking windows. (**UI SKELETON ACTIVE**)
  - Expose a dropdown for progress indicator: `Not Started`, `On Track`, or `Completed`.

### Feature 4.2: Programmatic Score Calculation Engine

- **Status**: ✅ **100% IMPLEMENTED**
- **Functional Description**: An automated server analytics system that processes actual achievements against planned targets using specific mathematical formulas.
- **Technical Requirements**:
  - **Numeric MIN Formula**: (actual / target) × 100.
  - **Numeric MAX Formula**: (target / actual) × 100.
  - **Zero-Based Compliance Formula**: 100% if actual is 0, else 0%.
  - **Timeline Formula**: Date-driven comparison.

### Feature 4.3: Shared Goal Real-Time Cascading Sync

- **Status**: ✅ **100% IMPLEMENTED**
- **Functional Description**: Automatically propagates achievement tracking updates from parent KPI down to all linked child goal sheets.
- **Technical Requirements**:
  - Implement asynchronous table trigger `tg_cascade_shared_goals`.
  - Run an atomic update cascade that propagates value modifications to records with matching `parent_goal_id`.

---

## 5. EPIC 5: Governance, Audit Logs, & System Administration

### Feature 5.1: Immutable Post-Lock Change Ledger

- **Status**: ✅ **100% IMPLEMENTED**
- **Functional Description**: A system compliance feature that logs all modifications made to goal sheets after they have entered a locked state.
- **Technical Requirements**:
  - Use PostgreSQL trigger `tg_audit_locked_mutations` to capture JSONB diff objects of `old_value` and `new_value`.
  - Write data logs into `public.audit_logs`.
  - Validation script `supabase/verify_audit_rls.sql` verifies trigger/function presence and hardened policy checks.

### Feature 5.2: Admin Overrides & Exceptional Unlock Control

- **Status**: ✅ **100% IMPLEMENTED**
- **Functional Description**: Provides system administrators and HR leads the ability to unlock sheets and modify operational cycle settings.
- **Technical Requirements**:
  - Admin console implemented at `/dashboard/admin` with dedicated `AdminActionsPanel`.
  - "Force Unlock Goal Sheet" workflow implemented with server action `adminUnlockSheet`.
  - Destructive action safety added via confirmation modal plus non-blocking toast feedback.

### Feature 5.3: Global Compliance & Data Export Engine

- **Status**: 🟡 **PARTIALLY IMPLEMENTED**
- **Functional Description**: A governance dashboard for HR to track organizational compliance rates and export performance data.
- **Technical Requirements**:
  - **Real-Time Dashboards**: Render visual heatmaps and tracking progress components. (**PENDING**)
  - **Data Portability Engine**: CSV export implemented via `/api/export/csv` and Admin Hub "Export Data (CSV)" action. (**IMPLEMENTED**)
