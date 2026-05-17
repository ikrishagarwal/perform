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
| **7.1**    | Persistent In-App Notification Center   | ❌ **NOT STARTED** | Database table + frontend UI component pending.                                                            |
| **7.2**    | SLA-Driven Escalation Engine             | ❌ **NOT STARTED** | Cron job and escalation logic pending.                                                                     |
| **8.1**    | High-Density Business Intelligence      | ❌ **NOT STARTED** | Visualization library integration + treemap/bar/pie charts pending.                                       |
| **8.2**    | Interactive Departmental Drilldowns     | ❌ **NOT STARTED** | Hierarchical state machine for drilldown filters pending.                                                   |

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

- **Status**: ❌ **NOT STARTED**
- **Functional Description**: Replaces external email dispatches with an isolated, secure transactional notification feed built directly into the web portal navigation layout. Users can track all system events, status modifications, and operational feedback natively.
- **Technical Requirements**:
  - **Database Architecture**: Provision a new table `public.notifications` with the following structural layout:

```sql
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  target_url TEXT, -- Dynamic internal deep-linking route
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id) WHERE is_read = FALSE;

```

  - **Workflow Pipeline Actions**:
    - **Trigger Step A (Submission)**: When an employee executes a goal sheet submission, inject an atomic server action entry targeting the assigned `manager_id` profile with a `target_url` mapped to `/dashboard/review/[sheetId]`.
    - **Trigger Step B (Evaluation)**: When a manager invokes `approveSheet` or `rejectSheet`, commit a record targeting the employee's `profile_id` containing the status update summary and any written markdown review feedback text.

  - **Frontend Navigation Elements**: Create a global `<NotificationBell />` popover navigation layout component within the core dashboard shell layout. This component must fetch unread metrics, display custom toast alerts upon new events, order data rows sequentially by `created_at DESC`, and feature a "Mark all as read" API interaction trigger.

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