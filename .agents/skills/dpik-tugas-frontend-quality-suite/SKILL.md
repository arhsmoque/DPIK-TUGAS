---
name: dpik-tugas-frontend-quality-suite
description: "Routing entry point for DPIK TUGAS frontend, documentation, and operator-console quality work: which of the operator-facing design doctrine, browser-based UI verification, and purpose-driven content design skills to apply, in what order, and which parts of each to skip for this repo. Use before changing apps/internal panels (AdminPanel, DispatchPanel, ClaimsPanel, SubmissionsPanel, ReceiptEvidencePanel, WorkThreadActions), before writing or editing AGENTS.md/README/ADRs/journal/evidence docs, or before reporting a frontend change as done."
compatibility: "Points to arh-operator-facing-frontend-design, arh-frontend-design-suite (cockpit-operator module only), arh-frontend-ui-ux-audit, and arh-purpose-driven-content-design -- those skills' own compatibility requirements apply when this routes to them (arh-frontend-ui-ux-audit needs Node.js + playwright-cli + a running app)."
---

# Dpik Tugas Frontend Quality Suite

# DPIK TUGAS Frontend & Content Quality Suite

A routing skill, not a content merge. DPIK TUGAS is an internal operator/admin tool (Dispatch,
Claims, Admin, Submissions, Receipt Evidence, Work Thread panels under `apps/internal`) — it is not
an F&B storefront, WhatsApp ordering flow, or homestay booking site. Most of
`arh-frontend-design-suite`'s modules (`fnb-hospitality`, `homestay-booking`) do not apply here;
this skill exists so an agent reaches for the *right* one-third of that suite plus the two adjacent
skills that do apply, instead of either skipping design doctrine entirely or importing irrelevant
F&B/homestay assets into an admin-panel change.

## Which skill, when

| Task | Skill | Why this one, not another |
| --- | --- | --- |
| Designing, redesigning, or reviewing any `apps/internal/src/*.tsx` panel | `arh-operator-facing-frontend-design` | Every DPIK TUGAS screen is an operator surface — visibility, control, and reasoning-transparency are the actual design doctrine here, not consumer-facing visual polish. |
| Cross-checking a panel against a broader design/evaluation rubric | `arh-frontend-design-suite`, **`references/modules/cockpit-operator.md` only** | That one module matches DPIK TUGAS's shape (operator cockpit). Do not pull `fnb-hospitality.md`, `homestay-booking.md`, or the `assets/fnb/` / `assets/homestay/` palettes/tokens into this repo — they belong to a different product family. |
| After any frontend code change, before calling it done | `arh-frontend-ui-ux-audit` | Confirms the change actually renders and behaves in a real browser against the running app — typecheck/lint/`test:architecture` passing is not the same claim. Requires the target app already running (`npm run dev`) and Playwright installed. |
| Writing or repairing `AGENTS.md`, `README.md`, an ADR, `journal.md`, `gaps-findings.md`, or an evidence doc | `arh-purpose-driven-content-design` | These documents fail when they list features instead of grounding each section in who reads it, what decision it supports, and what proof backs it — exactly the failure mode this skill corrects for. Journal/evidence entries especially: state the fact, the why, the resume point — not a feature inventory. |

## Sequencing for a typical change

1. Before touching a panel: skim `arh-operator-facing-frontend-design` for the relevant
   visibility/control/reasoning-transparency pattern, and `cockpit-operator.md` if the change is
   structural (new panel, new status surface) rather than a small fix.
2. Make the change.
3. Verify with `arh-frontend-ui-ux-audit` against the actually running app — do not report the UI
   feature as verified from code reading or a passing build alone.
4. If the change touches `AGENTS.md`, adds a journal entry, or produces an evidence doc, apply
   `arh-purpose-driven-content-design` to that writing — do not default to a feature-listing
   changelog style.

## What this skill deliberately does not do

It does not duplicate any of the four skills' content, and it does not stay in sync by copying —
routing to the canonical skill means an update to the doctrine upstream applies here automatically.
If a future DPIK TUGAS surface genuinely needs the F&B or homestay modules (unlikely — that would
mean the product scope changed), route to `arh-frontend-design-suite` directly rather than expanding
this skill's table to include them speculatively.
