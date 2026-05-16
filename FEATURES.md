# FEATURES.md — COMPREHENSIVE FEATURE SPECIFICATION LOG
## System Target: In-House Goal Setting & Tracking Portal
## Engineering Standard: Next.js App Router + TypeScript + Supabase DB 
## Aesthetic Profile: Bold Typography / Editorial Data Edition

This document provides a highly structured breakdown of all system features required for implementation. [cite_start]It cross-references the official hackathon Problem Statement guidelines [cite: 1] and the core architectural constraints of the project PRD and Design System.

---

## 1. EPIC 1: Persona-Based Core Authentication & Navigation

### Feature 1.1: Multi-Tenant RBAC Routing Gateway
* [cite_start]**Functional Description**: A unified, high-contrast entry login portal that securely segmentations traffic based on organizational security context[cite: 1].
* **Technical Requirements**:
    * Authenticate user credentials securely via Supabase Auth services.
    * Implement Next.js Middleware to parse user role claims (`employee`, `manager`, `admin`) directly from database profiles upon successful session authorization.
    * Enforce immediate server-side redirection to the designated workspace sub-routes (`/dashboard/employee`, `/dashboard/manager`, or `/dashboard/admin`).
    * Implement a fallback route protection engine that blocks unauthorized cross-role path executions with an immediate access rejection error.

### Feature 1.2: Interactive Multi-Persona Switcher (Dev Mode Toolbar)
* [cite_start]**Functional Description**: A fixed developer environment visual toolbar that allows hackathon evaluators to toggle between user journeys instantly without logging out[cite: 1].
* **Technical Requirements**:
    * Render a fixed layout panel anchored to the viewport baseline using raw black borders (`1px solid #000000`) and a flat layout depth offset (`4px 4px 0px 0px #000000`).
    * Expose explicit, single-click buttons to dynamically re-scope the active app session metadata context to `Employee`, `Manager`, or `Admin`.
    * Use state management to simulate client-side context overrides, updating application views dynamically to match the selected role without forcing a full cache refresh or losing app data state.

---

## 2. EPIC 2: Phase 1 — Goal Creation & Submission Lifecycle

### Feature 2.1: Dynamic Goal Sheet Composition Workplace
* [cite_start]**Functional Description**: An employee-facing interface to design, edit, and locally store draft performance targets for the active calendar year[cite: 1].
* **Technical Requirements**:
    * Formulate a dense linear data data grid allowing users to insert, modify, or clear individual goal rows seamlessly.
    * [cite_start]Bind every interactive form field explicitly to the strict schema data points: `Thrust Area` selection dropdown, free-text `Title` and `Description` areas, `Unit of Measurement (UoM)` selectors, text `Target Value` inputs, and numerical `Weightage` fields[cite: 1].
    * Maintain data states locally within an active form array before committing batch transactions to the `public.goals` table via Next.js Server Actions.

### Feature 2.2: Real-Time Constraint Validation Engine
* [cite_start]**Functional Description**: A rigid, client-and-server-side verification layout that enforces strict compliance boundaries before a sheet can be submitted[cite: 1].
* **Technical Requirements**:
    * [cite_start]**Volume Boundary**: Restrict the form row array length to a maximum upper ceiling of 8 goals per employee[cite: 1]. [cite_start]Disable row-addition actions if the ceiling is reached[cite: 1].
    * [cite_start]**Floor Boundary**: Implement an inline validation filter that flags a sheet error if any single goal item weightage allocation drops below 10%[cite: 1].
    * [cite_start]**Accumulation Balance**: Render a persistent side panel layout (`validation-sticky-panel`) tracking total weightage distributions dynamically[cite: 1]. [cite_start]Freeze the master "Submit Goal Sheet" action if the cumulative sum does not equal exactly 100%[cite: 1].
    * **Database Verification Backup**: Wire a database trigger function (`fn_validate_goal_sheet_submission`) on the PostgreSQL table layer to reject raw insert or update queries that violate these exact validation parameters.


```

[Goal Sheet Inputs] ──► (Real-Time Checking) ──► Total Weight = 100%? ──► YES ──► Save & Lock
└──► NO ──► Block Submission Action

```

### Feature 2.3: Shared Departmental KPI Distribution Engine
* [cite_start]**Functional Description**: Allows administrators or direct managers to broadcast foundational KPI goals across multiple employee sheets simultaneously[cite: 1].
* **Technical Requirements**:
    * [cite_start]Build an administrative distribution view to select target organizational tracking tracks and push uniform parent goal records[cite: 1].
    * [cite_start]**Cascading Read-Only Mapping**: When an employee mounts a sheet containing a shared goal (`parent_goal_id IS NOT NULL`), render the fields for `Title`, `Description`, `UoM`, and `Target Value` as completely read-only blocks[cite: 1].
    * [cite_start]**Weightage Overrides**: Retain write permissions exclusively on the local `Weightage` input field, allowing employees to manage their own weight distributions[cite: 1].

---

## 3. EPIC 3: Phase 1 — Managerial Review & Operational Workflows

### Feature 3.1: Team Compliance Dashboard View
* [cite_start]**Functional Description**: A centralized interface providing direct managers real-time visibility into the current submission status across all direct reports[cite: 1].
* **Technical Requirements**:
    * Fetch and display direct report data cards utilizing a simple database query matching the manager's `profile_id` against employee `manager_id` fields.
    * Group team statuses dynamically into distinct categories: `Draft (Awaiting Submission)`, `Pending Review`, and `Approved & Locked`.

### Feature 3.2: Inline Modification & Approval Framework
* [cite_start]**Functional Description**: Enables direct managers to evaluate submitted employee sheets, modify fields inline, or reject the sheet back to a draft state[cite: 1].
* **Technical Requirements**:
    * [cite_start]Provide absolute inline write access to goal targets and weight layouts while a sheet remains in the `submitted` state[cite: 1].
    * [cite_start]**Approve Command**: Update `goal_sheets.status` to `locked` via a secure database transaction[cite: 1]. [cite_start]This completely revokes employee write privileges via Row-Level Security (RLS) configuration rules[cite: 1].
    * [cite_start]**Rework Rejection Command**: Revert sheet status flags back to `draft`[cite: 1]. Append mandatory manager text feedback to the record, reopening full edit workflows for the employee.

---

## 4. EPIC 4: Phase 2 — Achievement Tracking & Quarterly Check-ins

### Feature 4.1: Quarterly Progress Capture Portal
* [cite_start]**Functional Description**: A periodic tracking interface enabling employees to log empirical achievement metrics against their locked targets within specific operational calendar windows[cite: 1].
* **Technical Requirements**:
    * [cite_start]Lock entry fields programmatically, unlocking access only within authorized tracking windows: Q1 (July), Q2 (October), Q3 (January), and Q4/Annual Review (March/April)[cite: 1].
    * [cite_start]Expose a clear dropdown component for employees to assign an current progress indicator value: `Not Started`, `On Track`, or `Completed`[cite: 1].

### Feature 4.2: Programmatic Score Calculation Engine
* [cite_start]**Functional Description**: An automated server analytics system that processes actual achievements against planned targets using specific mathematical formulas[cite: 1].
* **Technical Requirements**:
    * **Numeric MIN Formula**: If a goal uses `numeric_min` (higher is better), calculate the tracking metric as:
      [cite_start]$$\text{Progress} = \left( \frac{\text{Actual Achievement}}{\text{Planned Target}} \right) \times 100$$ [cite: 1]
    * **Numeric MAX Formula**: If a goal uses `numeric_max` (lower is better), calculate the tracking metric as:
      [cite_start]$$\text{Progress} = \left( \frac{\text{Planned Target}}{\text{Actual Achievement}} \right) \times 100$$ [cite: 1]
    * **Zero-Based Compliance Formula**: If a goal uses `zero_based` (zero represents absolute operational success), compute the output dynamically:
      [cite_start]$$\text{Progress} = \begin{cases} 100\%, & \text{if Actual Achievement} = 0 \\ 0\%, & \text{otherwise} \end{cases}$$ [cite: 1]
    * [cite_start]**Timeline Formula**: For date-driven constraints (`timeline`), calculate performance status by verifying if the recorded completion timestamp falls before or after the deadline target[cite: 1].

### Feature 4.3: Shared Goal Real-Time Cascading Sync
* [cite_start]**Functional Description**: Automatically propagates achievement tracking updates from the primary owner of a shared KPI down to all linked child goal sheets[cite: 1].
* **Technical Requirements**:
    * Implement an asynchronous table trigger (`tg_cascade_shared_goals`) executing on updates to the `public.goals` table.
    * [cite_start]Intercept any mutation to the `actual_achievement` or `progress_status` fields where `parent_goal_id` is null (the parent record)[cite: 1].
    * [cite_start]Run an atomic update cascade that propagates those identical value modifications to all records containing a matching `parent_goal_id`[cite: 1]. [cite_start]This ensures data consistency across all linked employee sheets instantly[cite: 1].

---

## 5. EPIC 5: Governance, Audit Logs, & System Administration

### Feature 5.1: Immutable Post-Lock Change Ledger
* [cite_start]**Functional Description**: A system compliance feature that logs all modifications made to goal sheets after they have entered a locked state[cite: 1].
* **Technical Requirements**:
    * [cite_start]Use a PostgreSQL table rule (`tg_audit_locked_mutations`) to intercept any update attempts on goals whose parent sheet status is marked as `locked`[cite: 1].
    * [cite_start]Automatically capture the modifying user's unique ID (`auth.uid()`), an absolute timestamp marker, and an explicit JSONB diff object documenting the `old_value` and `new_value` properties for every modified field[cite: 1].
    * [cite_start]Write data logs into an un-deletable tracking repository (`public.audit_logs`) to maintain a clear audit trail for administrative review[cite: 1].

### Feature 5.2: Admin Overrides & Exceptional Unlock Control
* [cite_start]**Functional Description**: Provides system administrators and HR leads the ability to unlock sheets and modify operational cycle settings[cite: 1].
* **Technical Requirements**:
    * Build an administrative system console view restricted strictly to profiles matching the `admin` app role.
    * Implement an explicit "Unlock Sheet" action button that updates a sheet's status from `locked` back to `draft`, restoring temporary edit permissions to resolve organizational errors.

### Feature 5.3: Global Compliance & Data Export Engine
* [cite_start]**Functional Description**: A governance dashboard for HR to track organizational compliance rates and export comprehensive performance data for offline analysis[cite: 1].
* **Technical Requirements**:
    * [cite_start]**Real-Time Dashboards**: Render clear visual heatmaps and tracking progress components summarizing overall check-in completion metrics for active quarters across all business units[cite: 1].
    * [cite_start]**Data Portability Engine**: Build a server-side processing utility that aggregates employee details alongside planned targets and actual achievements into an optimized CSV flat file download stream[cite: 1].
