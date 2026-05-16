---
trigger: model_decision
description: when making technical and design decisions
---

## 🚀 Antigravity Workspace Engine: Online

Welcome to the controls. I am **Antigravity**, your dedicated AI coding collaborator for the **AtomQuest Hackathon 1.0**. We are here to build a bulletproof, high-contrast, enterprise-grade **Goal Setting & Tracking Portal** using the Next.js App Router, TypeScript, and Supabase. No generic enterprise fluff, no blurry shadows—just crisp typography, rock-solid relational constraints, and clean, modular architecture.

Here is how our technical architecture and rule validation mapping stack up based on your blueprints:

---

## 🛠️ System Rules & Validation Matrix

Every database trigger, server action, and frontend form middleware we write will programmatically enforce these ironclad guardrails:

| Business Rule | Technical Implementation Layer | Failure Enforcement Mechanism |
| --- | --- | --- |
| **100% Allocation Constraint** | PostgreSQL Submit Trigger / Next.js Middleware | Blocks transition to `Submitted`; throws validation alert banner. |
| **10% Minimum Floor** | Database Table `CHECK` Constraint | Rejects row insertion/update if an individual goal weightage is $< 10\%$. |
| **Goal Volume Cap** | Pre-update Stored Procedure Trigger | Caps individual sheet row count at exactly **8 distinct rows**. |
| **Post-Approval Lock** | Supabase Row-Level Security (RLS) | Restricts row mutations to `Admin` role once state shifts to `Locked`. |
| **Shared KPI Cascade** | PL/pgSQL Automated Sync Trigger | Progress updates made by a parent KPI owner automatically rewrite child goals. |

### Core Algorithmic Engines

Progress tracking scores will compute dynamically via server components and frontend utilities following these exact mathematical paradigms:

* **Numeric MIN (Higher is Better):**

$$\text{Progress} = \left( \frac{\text{Actual Achievement}}{\text{Planned Target}} \right) \times 100$$


* **Numeric MAX (Lower is Better):**

$$\text{Progress} = \left( \frac{\text{Planned Target}}{\text{Actual Achievement}} \right) \times 100$$


* **Zero-Based Target:**

$$\text{Progress} = \begin{cases} 100\%, & \text{if Actual Achievement} = 0 \\ 0\%, & \text{otherwise} \end{cases}$$



---

## 🎨 Design System Configuration (Editorial Data Edition)

We will lock in the following configuration tokens across our global styles layout to ensure a punchy, high-contrast, professional appearance:

* **Typography (Apex Grotesk base):** Sharp line-height structures ($1.05$ to $1.15$ for display headers) paired with negative tracking values (`-0.02em` to `-0.03em`) to mimic premium editorial sheets.
* **Color Profile:** Pure Canvas White (`#ffffff`) surfaces broken up by Surface Panel Light Greys (`#f4f4f5`), isolated tightly with **1px solid black borders** (`#000000`).
* **Elevation Geometry:** Absolute flat architecture. Zero fuzzy blurs. Instead, we use solid hard-edged offset blocks:
* *Buttons / Primary Controls:* `4px 4px 0px 0px #000000`
* *Check-in Modals / Popups:* `8px 8px 0px 0px #000000`


* **Persona Switcher:** A persistent development toolbar locked to the main viewport layout shell allowing judges to swap contexts instantly between `Employee`, `Manager`, and `Admin` views with zero authentication friction.


## 📅 Implementation Roadmap

To maintain structural consistency and absolute zero code drift, we will follow our strict technical workflow sequentially:

1. **Database Schema Setup:** Compiling the complete migrations script including enums, core tables, triggers, and precise RLS policies.
2. **Core Layout & Global Typography System:** Establishing layout CSS variables, typography maps, and theme constants.
3. **Reusable Data-Dense Components:** Engineering the base inputs, custom status tags, and validation widgets.
4. **App View Integration:** Hooking up the actual `/dashboard` layout routes and Next.js Server Actions.

Where would you like to kick things off—shall we execute **Step 1** and construct the master SQL database schema migration script for Supabase?