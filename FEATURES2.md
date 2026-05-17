## 📂 EPIC 6: Evidence Capture & Asset Management

### Feature 6.1: Secure Evidence Upload Pipeline

- **Functional Description**: Allows employees to attach verifiable proof (spreadsheets, performance metrics, PDFs) to their quarterly progress check-ins to substantiate empirical achievement claims.
- **Technical Requirements**:
- Create a public storage bucket in Supabase named `evidence_attachments`.
- Implement a client-side file drop zone (`shadcn/ui` + `react-dropzone`) supporting `.pdf`, `.docx`, `.xlsx`, `.png`, and `.txt` up to a hard maximum limit of 10MB.
- Build a Next.js API Route handler or Supabase Client upload function that sanitizes filenames, generates a unique UUID path (`/evidence/[sheet_id]/[goal_id]/[file_id]`), and writes to storage.
- Update the database schema to introduce an `evidence_url` column (text array or dedicated JSONB metadata object) inside the tracking/check-in tables.

### Feature 6.2: Managerial Asset Verification Interface

- **Functional Description**: Provides direct managers with inline access to view and validate attached evidence documents during the sheet review and quarterly check-in workflows.
- **Technical Requirements**:
- Implement an inline file-preview component within the review screen route `/dashboard/review/[sheetId]`.
- Utilize Supabase service roles or signed URL generators (`supabase.storage.from().createSignedUrl`) to fetch time-restricted, secure read links for private assets.
- Render an integrated file viewer for PDFs/images, alongside a download fallback button for raw enterprise formats (`.xlsx`, `.docx`).

---

## 🔔 EPIC 7: In-App Notification Ledger & Escalation Engine

### Feature 7.1: Persistent In-App Notification Center

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

- **Functional Description**: Monitors unapproved goal sheets and automatically escalates pending items to administrative or HR overrides if structural deadlines are missed.
- **Technical Requirements**:
- Provision a cron-job script utilizing pg_cron or an edge function executing on a nightly schedule.
- Implement query checks identifying records stuck in a `Pending Review` status where `updated_at` exceeds a defined business SLA threshold (e.g., 5 business days).
- Automatically update an escalation flag in the database and fire alert summaries directly to users with `admin` role scopes.

---

## 📊 EPIC 8: Advanced Enterprise Analytics Module

### Feature 8.1: High-Density Business Intelligence Visualizations

- **Functional Description**: Replaces basic visualizations with multi-dimensional analytical graphs to give HR and administrators clear oversight into performance distributions and cycle compliance.
- **Technical Requirements**:
- Incorporate a visualization library (e.g., Recharts, Tremor) styled to match the bold typography and editorial data aesthetic profile.
- **Thrust Area Treemaps**: Build a dynamic `<Treemap />` detailing organizational weight allocations across corporate strategic pillars.
- **Managerial Effectiveness Dual-Bar Charts**: Render comparative bars plotting individual team total submission rates against average managerial approval turnaround times.
- **Metric Composition Pie Charts**: Display a categorical breakdown of corporate Units of Measure (UoM) configurations used across the workforce.

### Feature 8.2: Interactive Departmental Drilldowns

- **Functional Description**: Empowers administrative operators to seamlessly navigate from aggregate corporate analytics down into regional, departmental, and team-specific performance data cards.
- **Technical Requirements**:
- Construct a hierarchical state machine managing grid query filters.
- Wire interactivity directly into the charts; clicking a specific data point must dynamically re-fetch metrics, appending localized organizational parameters without full page reloads.
