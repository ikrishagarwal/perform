# DESIGN.md — GOAL SETTING & TRACKING PORTAL

**Theme:** Bold Typography / Editorial Data Edition

---

## 1. Overview

High-contrast, information-dense workspace optimized for visual scanning. Replaces traditional spreadsheets with heavy sans-serif headers, rigid borders, and flat-color status components.

### Key Characteristics

* **High-Contrast Editorial Headers:** Tight tracking for strong hierarchy.
* **Stark Data Frames:** Solid 1px borders to isolate performance metrics.
* **Validation Banner Blocks:** Dynamic color shifting for weight distribution errors.
* **Dedicated Status Windows:** Contrasting profiles (`Draft` / `Pending Approval` / `Locked`).
* **Clean Geometric Layouts:** Side-by-side numerical targets, UOMs, and compliance tracks.
* **Sharp Shape Language:** 4px and 8px corners for an institutional look.
* **Dev Toolbar:** Fixed switcher allowing evaluators to cycle user roles seamlessly.

---

## 2. Colors

### Core Brand & Interaction

* **Brand Indigo** (`{colors.brand-indigo}`): Primary structural color; callouts, primary buttons, confirmations.
* **Brand Indigo Deep** (`{colors.brand-indigo-deep}`): Interactive mouse-press states.
* **Stark Ink** (`{colors.stark-ink}`): Pure obsidian for titles and primary reading.
* **Stark Ink Soft** (`{colors.stark-ink-soft}`): Warm off-black for body copy.

### Workspace Status System

* **Status Draft Grey** (`{colors.status-draft}`): Neutral slate for active, editable sheets.
* **Status Pending Amber** (`{colors.status-pending}`): High-visibility amber for sheets awaiting manager validation.
* **Status Locked Emerald** (`{colors.status-locked}`): Deep emerald for finalized sheets locked against modification.

### Surface & Partition Canvas

* **Canvas Stark** (`{colors.canvas-stark}`): Pure white baseline background.
* **Surface Panel** (`{colors.surface-panel}`): Light grey backing for form tables and sidebars.
* **Surface Data Row** (`{colors.surface-data-row}`): Alternating rows for data-dense tables.
* **Border Sharp** (`{colors.border-sharp}`): 1px solid black for inputs, cards, and tables.
* **Border Muted** (`{colors.border-muted}`): Low-contrast grid dividers.

### Semantic Alerts

* **Semantic Success** (`{colors.semantic-success}`): Green for valid 100% weight distributions.
* **Semantic Alert** (`{colors.semantic-alert}`): Orange for incomplete rows or warning cycles.
* **Semantic Critical** (`{colors.semantic-critical}`): Red for validation errors (e.g., weight boundary overflow, missing mandatory goals).

---

## 3. Typography

* **Primary Font:** Apex Grotesk (geometric sans-serif with clean ink traps).
* **System Fallbacks:** `Plus Jakarta Sans`, `Inter`, `-apple-system`, `sans-serif`.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Operational Implementation |
| --- | --- | --- | --- | --- | --- |
| `{typography.display-hero}` | 64px | 700 | 1.05 | -0.03em | Primary Dashboard Onboarding Titles |
| `{typography.display-lg}` | 40px | 700 | 1.10 | -0.02em | Operational Control Section Headers |
| `{typography.heading-1}` | 32px | 700 | 1.15 | -0.01em | Main Goal Sheet Title Panels |
| `{typography.heading-2}` | 24px | 700 | 1.20 | -0.01em | Direct-Report Grid Sub-Headers |
| `{typography.heading-3}` | 20px | 600 | 1.25 | 0 | Internal Form Card Table Headers |
| `{typography.heading-4}` | 16px | 600 | 1.30 | 0 | Metric Item Titles / Category Badges |
| `{typography.body-lead}` | 16px | 400 | 1.50 | 0 | Explanatory Form Instruction Elements |
| `{typography.body-data}` | 14px | 400 | 1.40 | 0 | Core Grid Entries / Numerical Values |
| `{typography.body-data-bold}` | 14px | 600 | 1.40 | 0 | High-Emphasis Dynamic Row Totals |
| `{typography.label-micro}` | 12px | 700 | 1.20 | +0.02em | All-Caps Status Badges / Table Labels |
| `{typography.action-md}` | 14px | 600 | 1.30 | 0 | Clickable Buttons / Interactive Labels |

### Principles

* **Tight Leading:** Headlines use 1.05 line height to structure screen space cleanly.
* **Negative Tracking:** Display headers use tight letter-spacing for punchy editorial impact.
* **Weight Parity:** Clear pairings—700 for structural labels, 400 for standard data.

---

## 4. Layout

* **Spacing System:** Strict 8px grid scale from `{spacing.xxs}` (4px) to `{spacing.xl}` (64px). Workspace sheets use `{spacing.lg}` (32px) margins.
* **Constraints:** Hard 1440px wide viewport with 24px fixed side gutters.
* **Structure:** Single wide control column for inputs + right-hand sticky status panel for real-time validation tracking.

---

## 5. Elevation & Depth

Flat design framework. Separation is achieved through solid borders and background shifts, not soft shadows.

| Depth Level | Treatment Parameters | Operational UI Case |
| --- | --- | --- |
| **Level 0 (Base)** | Flat color fill; `1px solid {colors.border-sharp}` frame. | Grid Framework Baselines, Standard Input Fields |
| **Level 1 (Highlight)** | Flat color shift; `1px solid {colors.stark-ink}` border. | Active Goal Row Selection Panels |
| **Level 2 (Pop)** | Black box-shadow offset: `4px 4px 0px 0px #000000`. | Primary Action Buttons, Navigation Elements |
| **Level 3 (Modal)** | Black box-shadow offset: `8px 8px 0px 0px #000000`. | Quarterly Performance Entry Modals |

---

## 6. Shapes

### Border Radius Scale

| Token Title | Absolute Value | Structural UI Application |
| --- | --- | --- |
| `{rounded.none}` | 0px | High-Density Linear Table Cells, Inline Separator Lines |
| `{rounded.sm}` | 4px | Small Contextual Action Buttons, System Status Tags |
| `{rounded.md}` | 6px | Core Inputs, Selection Dropdowns, Main Action Buttons |
| `{rounded.lg}` | 8px | Structural Section Cards, Form Blocks, Dashboard Panels |
| `{rounded.full}` | 9999px | Operational Indicators (**Never** used for Input Fields) |

---

## 7. Components

### Action Buttons

* **`button-primary`:** For major status triggers (e.g., submission). BG `{colors.brand-indigo}`, text `{colors.canvas-stark}`, type `{typography.action-md}`, border `1px solid {colors.stark-ink}`, radius `{rounded.md}`, shadow `4px 4px 0px 0px #000000`.
* **`button-secondary`:** For saving drafts/reverting lines. Transparent fill, text `{colors.stark-ink}`, border `1px solid {colors.border-sharp}`, radius `{rounded.md}`, flat (no shadow).
* **`button-danger`:** For wiping drafts/removing lines. BG `{colors.semantic-critical}`, text `{colors.canvas-stark}`, type `{typography.action-md}`, border `1px solid {colors.stark-ink}`, radius `{rounded.md}`, shadow `4px 4px 0px 0px #000000`.

### Containers & Panels

* **`goal-workspace-row`:** Performance row container. BG `{colors.canvas-stark}`, border `1px solid {colors.border-sharp}`, radius `{rounded.lg}`, interior padding `{spacing.md}` (16px). Houses inline spaces for Thrust Area, Description, UOM, Target, and Weight inputs.
* **`validation-sticky-panel`:** Floating side controller for real-time tracking. BG `{colors.surface-panel}`, radius `{rounded.lg}`, outline `2px solid {colors.stark-ink}`, padding `{spacing.md}` (16px).
* *Under/Over Balanced:* Text indicators display in `{colors.semantic-critical}`.
* *Balanced:* Background accent shifts to `{colors.semantic-success}`.



### Inputs & Badges

* **`workspace-input-field`:** Standard data entries. BG `{colors.canvas-stark}`, text `{colors.stark-ink}`, border `1px solid {colors.border-sharp}`, radius `{rounded.md}`, height 40px. Focus state expands to `2px solid {colors.brand-indigo}`.
* **`badge-status-draft`:** Unsubmitted sheets. BG `{colors.surface-panel}`, text `{colors.stark-ink-soft}`, type `{typography.label-micro}`, radius `{rounded.sm}`, border `1px solid {colors.border-sharp}`.
* **`badge-status-pending`:** Awaiting review. BG `{colors.status-pending}`, text `{colors.stark-ink}`, type `{typography.label-micro}`, radius `{rounded.sm}`, border `1px solid {colors.stark-ink}`.
* **`badge-status-locked`:** Finalized/read-only. BG `{colors.status-locked}`, text `{colors.canvas-stark}`, type `{typography.label-micro}`, radius `{rounded.sm}`, border `1px solid {colors.stark-ink}`.

### Progress Elements

* **`progress-track-bar`:** Quarterly check-in tracking. Base BG `{colors.surface-panel}`, radius `{rounded.full}`, height 12px. Horizontal progress fill uses `{colors.brand-indigo}` based on formula:

$$\text{Progress Fill \%} = \left( \frac{\text{Actual Achievement}}{\text{Planned Target}} \right) \times 100$$



---

## 8. Do's and Don'ts

### Do

* Enforce bold display tokens (`{typography.heading-1}`) on main workspace headings.
* Render live weight totals in the sidebar panel clearly before submission.
* Force input rows to a read-only visual state once the parent sheet is locked.
* Use strict rectangular button profiles with solid offset block shadows.
* Isolate direct data points with high-contrast, solid 1px black border boundaries.
* Maintain a strict 8px padding grid inside data tables.

### Don't

* Do not use soft, blurry drop shadows; rely on crisp, flat color blocks and line offsets.
* Do not use rounded pill buttons for primary workflows; maintain clean geometric shapes.
* Do not hide validation logs inside dropdowns; show layout issues immediately.
* Do not allow goal sheet submission if total cumulative weightage is not exactly 100%.
* Do not bypass the 10% lower limit floor constraint on individual weight inputs.

---

## 9. Responsive Behavior

| Breakpoint Target | Viewport Boundary | Core Layout Adaptation Rules Enforced |
| --- | --- | --- |
| **Mobile Grid** | < 600px | Inputs collapse from horizontal rows to vertical stacks. Validation panel shifts from sticky sidebar to fixed top banner. |
| **Tablet Grid** | 600px – 1024px | Data cells condense. Thrust areas and description fields collapse into nested sub-rows. |
| **Desktop Base** | > 1024px | Full multi-column grids display inline with the real-time sticky validation sidebar. |

---

## 10. Iteration Guide

1. Build out individual text elements and entry fields in isolation before rendering full rows.
2. Verify validation logic on the client side before binding properties to the database backend.
3. Check project formatting rules by running the linter tool: `npx @google/design.md lint DESIGN.md`.
4. Ensure primary actions use 6px curves (`{rounded.md}`) and outer containment cards use 8px curves (`{rounded.lg}`).

---

## 11. Known Gaps

* Dark mode color tokens are omitted; defaults assume a high-contrast white layout canvas.
* Micro-interaction transition speeds are undefined; a standard baseline of 100ms is recommended.
* Color definitions for handling retroactive adjustments past active windows are pending future updates.