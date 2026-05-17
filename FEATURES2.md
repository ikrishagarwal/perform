# FEATURES2.md — COMPREHENSIVE FEATURE SPECIFICATION LOG

## System Target: Enterprise OKR & Performance Lifecycle Integration

## Engineering Standard: Next.js App Router + TypeScript + Supabase (PostgreSQL)

## Aesthetic Profile: Bold Typography / Editorial Data Edition

---

## 🚀 FEATURE IMPLEMENTATION STATUS (Audit Date: May 17, 2026)

| Feature ID | Feature Name                             | Status           | Summary of Remaining Work                                                                                   |
| :--------- | :--------------------------------------- | :--------------- | :---------------------------------------------------------------------------------------------------------- |
| **6.1**    | Secure Evidence Upload Pipeline         | ✅ **100% DONE** | Migration applied, storage bucket created, upload flow active.                                              |
| **6.2**    | Managerial Asset Verification Interface | ✅ **100% DONE** | Evidence viewer integrated into manager review page with preview/download.                                 |
| **7.1**    | Persistent In-App Notification Center   | ✅ **100% DONE** | Notification table + Bell component + triggers in goal-sheet actions.                                     |
| **7.2**    | SLA-Driven Escalation Engine             | ❌ **NOT STARTED** | Cron job and escalation logic pending.                                                                     |
| **8.1**    | High-Density Business Intelligence      | ❌ **NOT STARTED** | Visualization library integration + treemap/bar/pie charts pending.                                       |
| **8.2**    | Interactive Departmental Drilldowns     | ❌ **NOT STARTED** | Hierarchical state machine for drilldown filters pending.                                                   |
| **9.1**    | Shared Goals / KPI Distribution          | ✅ **100% DONE** | Admin/manager can push KPIs to employees; recipients can only adjust weightage; achievement syncs via DB trigger. |

---

## 📂 EPIC 6: Evidence Capture & Asset Management

### Feature 6.1: Secure Evidence Upload Pipeline

- **Status**: ✅ **100% IMPLEMENTED**
- **Functional Description**: Allows employees to attach verifiable proof (spreadsheets, performance metrics, PDFs) to their quarterly progress check-ins to substantiate empirical achievement claims.
- **Technical Requirements**:
  - ✅ Created Supabase storage bucket `evidence_attachments` with RLS policies.
  - ✅ Implemented client-side file drop zone using native HTML5 drag-and-drop API (plain React, no external libraries).
  - ✅ Supported file types: `.pdf`, `.docx`, `.xlsx`, `.png`, `.txt` with 10MB hard limit.
  - ✅ Built server action `uploadEvidence` that sanitizes filenames, generates UUID paths (`evidence/[goal_id]/[file_id]`), and writes to storage.
  - ✅ Updated database schema with `evidence_url` JSONB column in `public.goals` table.
- **Implementation Files**:
  - `supabase/migrations/00004_evidence_storage.sql` — Schema + RLS policies
  - `src/lib/actions/evidence.actions.ts` — Upload, delete, get, signed URL actions
  - `src/components/evidence/EvidenceUploader.tsx` — Drag-drop UI component
  - `src/app/dashboard/checkin/page.tsx` — Integrated upload UI per goal

### Feature 6.2: Managerial Asset Verification Interface

- **Status**: ✅ **100% IMPLEMENTED**
- **Functional Description**: Provides direct managers with inline access to view and validate attached evidence documents during the sheet review and quarterly check-in workflows.
- **Technical Requirements**:
  - ✅ Implemented inline file-preview component in review screen route `/dashboard/review/[sheetId]`.
  - ✅ Utilized signed URL generators (`supabase.storage.from().createSignedUrl`) to fetch time-restricted, secure read links for private assets.
  - ✅ Rendered integrated file viewer for PDFs/images, alongside a download fallback button for raw enterprise formats (`.xlsx`, `.docx`).
- **Implementation Files**:
  - `src/components/evidence/EvidenceViewer.tsx` — Preview + download UI component
  - `src/app/dashboard/review/[sheetId]/ManagerReviewGoalList.tsx` — Integrated evidence viewer per goal

---

## 🔔 EPIC 7: In-App Notification Ledger & Escalation Engine

### Feature 7.1: Persistent In-App Notification Center

- **Status**: ✅ **100% IMPLEMENTED**
- **Functional Description**: Replaces external email dispatches with an isolated, secure transactional notification feed built directly into the web portal navigation layout. Users can track all system events, status modifications, and operational feedback natively.
- **Technical Requirements**:
  - ✅ Created `public.notifications` table with RLS policies.
  - ✅ Implemented server actions: `createNotification`, `getNotifications`, `getUnreadCount`, `markAsRead`, `markAllAsRead`.
  - ✅ Created `<NotificationBell />` component in dashboard sidebar with unread count badge, dropdown list, and "Mark all as read" functionality.
  - ✅ Added notification triggers:
    - **Goal Sheet Submission**: Sends notification to manager when employee submits sheet.
    - **Goal Sheet Approval**: Sends notification to employee when manager approves sheet.
    - **Goal Sheet Rejection**: Sends notification to employee when manager rejects sheet.
    - **Check-in Submission**: Sends notification to manager when employee submits quarterly check-in.
- **Implementation Files**:
  - `supabase/migrations/00005_notifications.sql` — Table schema + RLS policies
  - `src/lib/database.types.ts` — Added `Notification` interface
  - `src/lib/actions/notification.actions.ts` — All server actions
  - `src/components/notifications/NotificationBell.tsx` — Bell component with dropdown
  - `src/app/dashboard/DashboardClientShell.tsx` — Integrated Bell in sidebar header
  - `src/lib/actions/goal-sheet.actions.ts` — Added notification triggers in `updateSheetStatus`, `approveSheet`, `rejectSheet`

### Feature 7.2: SLA-Driven Escalation Engine

- **Status**: ❌ **NOT STARTED**
- **Functional Description**: Monitors unapproved goal sheets and automatically escalates pending items to administrative or HR overrides if structural deadlines are missed.
- **Technical Requirements**:
  - Provision a cron-job script utilizing pg_cron or an edge function executing on a nightly schedule.
  - Implement query checks identifying records stuck in a `Pending Review` status where `updated_at` exceeds a defined business SLA threshold (e.g., 5 business days).
  - Automatically update an escalation flag in the database and fire alert summaries directly to users with `admin` role scopes.

---

## 📊 EPIC 8: Advanced Enterprise Analytics Module

### Feature 8.1: High-Density Business Intelligence Visualizations

- **Status**: ❌ **NOT STARTED**
- **Functional Description**: Replaces basic visualizations with multi-dimensional analytical graphs to give HR and administrators clear oversight into performance distributions and cycle compliance.
- **Technical Requirements**:
  - Incorporate a visualization library (e.g., Recharts, Tremor) styled to match the bold typography and editorial data aesthetic profile.
  - **Thrust Area Treemaps**: Build a dynamic `<Treemap />` detailing organizational weight allocations across corporate strategic pillars.
  - **Managerial Effectiveness Dual-Bar Charts**: Render comparative bars plotting individual team total submission rates against average managerial approval turnaround times.
  - **Metric Composition Pie Charts**: Display a categorical breakdown of corporate Units of Measure (UoM) configurations used across the workforce.

### Feature 8.2: Interactive Departmental Drilldowns

- **Status**: ❌ **NOT STARTED**
- **Functional Description**: Empowers administrative operators to seamlessly navigate from aggregate corporate analytics down into regional, departmental, and team-specific performance data cards.
- **Technical Requirements**:
  - Construct a hierarchical state machine managing grid query filters.
  - Wire interactivity directly into the charts; clicking a specific data point must dynamically re-fetch metrics, appending localized organizational parameters without full page reloads.

---

## 🎯 EPIC 9: Shared Goals & KPI Distribution

### Feature 9.1: Shared Goals / KPI Distribution

- **Status**: ✅ **100% IMPLEMENTED**
- **Functional Description**: Allows admins and managers to push departmental KPIs to multiple employees. Recipients can only adjust weightage; Goal Title and Target are read-only. Achievement updates by the primary owner sync across all linked goal sheets via database trigger.
- **Technical Requirements**:
  - ✅ Admin/manager can access "Distribute Shared KPI" modal in Admin Hub page.
  - ✅ Managers can only distribute to their direct reports (filtered by `manager_id`).
  - ✅ Admins can distribute to all employees.
  - ✅ Recipients see shared goals with Title and Target fields read-only (disabled inputs with dashed border).
  - ✅ Recipients can only modify Weightage (and Unit in UI for consistency).
  - ✅ Visual "Shared KPI" badge displayed next to goal Title.
  - ✅ Database trigger `fn_cascade_shared_goals()` syncs `actual_achievement` and `progress_status` from parent goal to all children when parent is updated.
- **Implementation Files**:
  - `src/lib/actions/admin.actions.ts` — Added `getDirectReports(managerId)` action.
  - `src/lib/actions/goal.actions.ts` — `distributeSharedGoal()` creates parent + child goals with `parent_goal_id` linkage.
  - `src/app/dashboard/admin/page.tsx` — Updated role check to allow managers (role check: `admin` OR `manager`).
  - `src/app/dashboard/admin/AdminActionsPanel.tsx` — Added `userId` and `userRole` props; uses `getDirectReports()` for managers, `getAllProfiles()` for admins.
  - `src/app/dashboard/workspace/page.tsx` — Added `parentGoalId` to GoalRow; disabled Title/Target/Unit inputs when `parentGoalId` is set; added "Shared KPI" badge.
  - `supabase/migrations/00001_initial_schema.sql` — DB trigger `fn_cascade_shared_goals()` already handles sync.