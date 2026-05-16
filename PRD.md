# PRODUCT REQUIREMENT DOCUMENT (PRD)

## Project Title: In-House Goal Setting & Tracking Portal

**Document Version:** 1.0

**Target Performance Cycle:** Annual Cycle starting May 1st 

**Author:** Krish

---

## 1. Objective & Scope

Organizations using manual, distributed methods like spreadsheets and emails suffer from real-time blind spots, poor strategic alignment, and intensive manual compilation during review periods.

This project delivers a centralized, responsive web-based application designed to manage the entire lifecycle of an employee’s performance goals. The platform guarantees strict data validation, secure manager-approval workflows, dynamic progress calculations, and audit-ready tracking logs to ensure institutional compliance.

---

## 2. Technology Stack Selection

To balance execution speed, type safety, and efficient deployment, the platform will utilize the following architecture:

* **Frontend & Backend Orchestration:** Next.js (App Router) leveraging TypeScript for strict type safety across data contracts. For styling we'll be using shadcn ui components with tailwindcss.
* **Backend-as-a-Service (BaaS):** Supabase providing transactional management and database interaction.
* **Database:** PostgreSQL (via Supabase) for structural integrity, utilizing Triggers and Check Constraints to enforce core rules directly at the persistence layer.
* **Authentication & Access Control:** Supabase Auth mapping users to customized application roles.

---

## 3. User Roles & Access Control Matrix

The system recognizes three core personas with deeply segmented structural boundaries:

| Role | Operational Responsibility 

 | Key Platform Scope 

 |
| --- | --- | --- |
| **Employee** | Formulates goal sheets; logs quarterly actual outputs. | Read/Write on active drafts; Read-Only on locked cycles; Write access to actual metrics. |
| **Manager (L1)** | Evaluates, rewrites, and solidifies direct report goal selections. | Team visibility grid; Inline field overrides; Rework rejection controls; Feedback logging. |
| **Admin / HR** | Configures organizational cadence; alters system flags; audits history. | Cycle timelines management; Structural schema override; Multi-tenant audit trail viewer. |

---

## 4. Application Architecture & User Flow

An employee initiates the journey by building a draft, which transitions across strict states enforced by backend evaluations before locking down into an unmodifiable record.

```
[Login] 
   │
   ▼
[Role-Based Redirection Middleware]
   │
   ├───► (Employee) ──► Dashboard ──► Goal Form (Draft) ──► Submit Validation (100%)
   │                                                             │ (Locks Form)
   │                                                             ▼
   ├───► (Manager)  ──► Team Tracker Grid ◄──────────────────────┘
   │                       │
   │                       ├──► Approve (State: Locked)
   │                       └──► Reject / Return for Rework (State: Draft)
   │
   └───► (Admin / HR) ──► Global Console ──► Audit Logs / Manual Cycle Overrides

```

---

## 5. Detailed Page-by-Page Specifications

### 5.1 Global App Shell & Navigation

* 
**Layout Structure:** Dynamic sidebar updating its menu choices natively based on the signed-in user's role profile.


* **Hackathon Environment Helper:** A floating **"Demo Role Switcher" drop-down** anchored in the bottom-right viewport during testing. This allows evaluators to swap rapidly between Employee, Manager, and Admin context states without leaving the current session or generating distinct login details.



---

### 5.2 Authentication Page (`/login`)

* 
**Visual Layout:** A centered, minimalist layout featuring credential fields and a single-click OAuth gateway option.


* **Core Functionality:** Validates identity inputs via Supabase Auth. Upon resolution, Next.js Middleware reads the underlying metadata role attribute and forwards the user to their designated workspace sub-route.

---

### 5.3 Employee Dashboard (`/dashboard/employee`)

* **Visual Layout:** Metric summarization display showing current cycle status, progress completion charts, and an active timeline indicator.
* **Core Functionality:**
* Presents a status badge indicating the current state of the sheet: `Draft`, `Pending Approval`, or `Locked`.


* Displays an action card that shifts dynamically depending on the active cycle calendar window.


* Displays a list view of current goals alongside calculated tracking scores.





---

### 5.4 Goal Sheet Workspace (`/dashboard/employee/goals/edit`)

* 
**Visual Layout:** A dynamic table interface that supports adding and removing rows, restricting entries when limits are reached.


* **Form Input Structure per Row:**
* 
**Thrust Area:** Categorized selection list.


* 
**Goal Title & Description:** Free-text fields.


* 
**Unit of Measurement (UoM):** Selection options for Numeric Min, Numeric Max, Timeline, or Zero-Based.


* 
**Target Metric:** Input adjusted dynamically to fit the chosen UoM type.


* 
**Weightage Allocation:** Numerical percentage field with a minimum entry requirement of 10%.




* **Enforced Constraints (Client & Server Validation):**
* Hides the "Submit Goal Sheet" action if the internal array length exceeds 8 items.


* Rejects form submission if the total weightage field sum does not equal exactly 100%.


* 
**Shared Goal Treatment:** Inherited entries are marked as read-only across descriptions and targets, allowing the employee to modify only the local weightage field allocation.





---

### 5.5 Manager Dashboard (`/dashboard/manager`)

* 
**Visual Layout:** A grid layout that provides visibility into all direct reports, sorted by submission status indicators.


* **Core Functionality:**
* Displays tracking metrics showing real-time completion status for quarterly checkpoints.


* Provides quick links to review pending employee goal sheets.





---

### 5.6 Manager Review & Adjustments View (`/dashboard/manager/review/[employeeId]`)

* **Visual Layout:** Split-screen layout. The left pane shows the proposed goals; the right pane contains review tools and discussion input logs.


* **Core Functionality:**
* 
**Inline Editing:** Allows the manager to alter target values or reallocate weight distributions directly within the input fields before finalizing approval.


* 
**Approve Action:** Changes the document state to `Locked`, disabling further user edits unless an admin grants an exception.


* 
**Rework Action:** Appends feedback comments and reverts the state back to `Draft`, opening edit permissions back up for the employee.





---

### 5.7 Quarterly Check-In Interface (`/dashboard/shared/checkin`)

* 
**Visual Layout:** A comparative layout display that shows Planned Targets alongside an editable field for Actual Achievements.


* **Core Functionality:**
* Restricts inputs to active date ranges mapped out across the annual corporate calendar windows.


* Employees can select a progress state indicator from three values: `Not Started`, `On Track`, or `Completed`.


* Managers can use a feedback text area to save check-in discussion notes.





---

### 5.8 Admin / HR Administration Hub (`/dashboard/admin`)

* **Visual Layout:** A multi-tab dashboard organized into Operational Controls, Audit Logs, and Global Reports.
* **Core Functionality:**
* 
**Exception Gate:** Includes an unlock tool that lets an admin revert a locked goal sheet to an editable state for adjustments.


* 
**Shared KPI Distribution:** A distribution terminal used to create and broadcast a parent goal out to all target employee sheets simultaneously.





---

## 6. Business Logic & Calculation Formula Specifications

### 6.1 Progress Score Computations

System performance tracking scores are computed dynamically using programmatic formulas rather than manual user entry:

* 
**Min (Higher is Better - e.g., Revenue targets):** 


$$\text{Progress} = \frac{\text{Actual Achievement}}{\text{Planned Target}}$$


* 
**Max (Lower is Better - e.g., Turnaround Time / Cost metrics):** 


$$\text{Progress} = \frac{\text{Planned Target}}{\text{Actual Achievement}}$$


* 
**Timeline (Date-Driven constraints):** Evaluates whether the system completion date falls before or after the deadline target.


* 
**Zero-Based (Risk Mitigation - e.g., Incidents):** 


$$\text{Progress} = \begin{cases} 100\%, & \text{if Actual Achievement} = 0 \\ 0\%, & \text{otherwise} \end{cases}$$



---

### 6.2 Shared Goal Data Synchronization

When an authoritative user updates a parent KPI metric record, changes trigger a database operation:

```sql
-- Enforces target sync down to child links when a parent row changes
CREATE OR REPLACE FUNCTION process_shared_target_sync()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.actual_achievement IS DISTINCT FROM OLD.actual_achievement AND NEW.parent_goal_id IS NULL THEN
    UPDATE goals 
    SET actual_achievement = NEW.actual_achievement
    WHERE parent_goal_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

```

---

## 7. Reporting & Governance Governance Requirements

### 7.1 Real-Time Compliance Metrics Dashboard

* Tracks organization-wide form submissions and check-in completion rates through a centralized data view.



### 7.2 Data Portability Export Engine

* Includes a download utility that converts target and performance data into standardized CSV spreadsheets for offline analysis.



### 7.3 System Audit Trail

* Tracks and captures modification events executed after a document goes into a locked cycle state.


* **Data Structure Design:**

```typescript
interface AuditTrailEntry {
  id: string;
  goalId: string;
  modifiedBy: string; // User ID reference
  timestamp: string; // ISO Date String
  changedFields: {
    field: string;
    previousValue: string | number;
    newValue: string | number;
  }[];
}

```

---

## 8. Milestone Calendar Windows

The platform enforces strict submission windows based on the current calendar year:

| Calendar Window 

 | Actionable System Stage 

 | System Behavior Enforced |
| --- | --- | --- |
| **May 1st – May 31st** | Phase 1 Goal Setting Setup | Full creation and approval pathways open.

 |
| **July** | Q1 Compliance Progress Check | Actuals capture fields unlocked.

 |
| **October** | Q2 Compliance Progress Check | Actuals capture fields unlocked.

 |
| **January** | Q3 Compliance Progress Check | Actuals capture fields unlocked.

 |
| **March – April** | Q4 Wrap-Up & Final Evaluation | Performance data finalized; modifications locked.

 |

---

## 9. Non-Functional Goals & Quality Metrics

* 
**Data Integrity Assurance:** Uses cascading database delete rules and check constraints to prevent invalid weight distributions or row overflow conditions from entering the tables.


* **User Interface Performance:** Uses Next.js Server Components to minimize hydration overhead, while offloading intense table filtering tasks to optimized database query routines.
* **Security Protocol:** Implements Row-Level Security (RLS) layers to isolate and protect user goal data based on active session attributes.
