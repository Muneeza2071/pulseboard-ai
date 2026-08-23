# PulseBoard AI — Frontend Design Plan

## Product surface

PulseBoard AI is a business command center for founders and small SaaS teams. The first frontend release focuses on an executive dashboard that combines revenue signals, customer health, active deals, operational activity, and an AI insight panel. It must feel calmer and more business-focused than a cyberpunk developer console.

## Visual direction

The interface uses a **deep navy analytics canvas** (`#07111F`) with layered slate-blue panels (`#0D1B2A`), cyan live-data accents (`#22D3EE`), violet AI accents (`#8B5CF6`), and amber/rose attention states. The UI relies on deterministic CSS grids, lightweight SVG chart paths, and Lucide icons rather than copied stock dashboard imagery. The visual references were used only to confirm the desired premium analytics mood; no external artwork will be embedded.

## Desktop layout

The desktop dashboard uses a 252px left rail with the PulseBoard mark, workspace switcher, main navigation, and a lower profile card. The content column starts with a compact top bar, a greeting and date-range control, then a 4-card KPI strip. Under it, a seven-column revenue trend card sits beside a five-column AI insight panel. The next row contains at-risk accounts and an activity stream. Navigation targets are Dashboard, Customers, Pipeline, Metrics, AI Analyst, Reports, and Settings.

## Mobile layout: Galaxy A21s priority

At widths below 760px, the fixed left rail becomes a top mobile header and a bottom tab bar. The bottom tabs are **Home**, **Customers**, **AI**, **Reports**, and **More**. KPI cards become a horizontally scrollable snap row; no chart is compressed below a readable width. The AI panel remains an obvious primary action. All menu controls have visible close/back behavior and tap targets of at least 44px.

## Screens included in the frontend foundation

| Screen | Primary content | User actions |
| --- | --- | --- |
| Dashboard | KPI cards, revenue chart, at-risk accounts, AI summary, activity feed | Date range, drill down, open AI analyst |
| Customers | Search and health-filter table/card list | Search, filter, open company profile |
| Pipeline | Deal stages and weighted pipeline total | Change stage view, create deal placeholder |
| Metrics | Metric definitions and trend selector | Choose time range, open import placeholder |
| AI Analyst | Evidence-aware question composer | Ask question, select suggested prompt |
| Reports | Saved report cards and export action placeholders | Open report, view scheduled state |
| Settings | Workspace and integration rows | Open settings placeholder |

## Interaction rules

Navigation is fully functional within the frontend shell. The date-range control changes the displayed label. Sidebar items switch views. Search filters customer rows. AI suggested prompts populate a displayed answer card rather than pretending that live data has been queried. Import, export, and create buttons show an explicit **“Frontend foundation — connect backend next”** notification, so the UI never misrepresents demo data as a real business action.
