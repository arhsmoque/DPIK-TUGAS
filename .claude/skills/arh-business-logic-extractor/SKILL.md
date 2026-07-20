---
name: arh-business-logic-extractor
description: Reverse engineers the *business* logic behind a repository — operational business truth, not code structure. Extracts business purpose, actors, preconditions, main flow, decision rules, state transitions, billing/credit impact, edge cases, data effects, ambiguities, and code references into an 11-section markdown template per feature, then renders an aggregate operator-facing HTML report with decision tables and flow diagrams. Use when asked to understand what a system actually does, document business rules, abstract a workflow for reuse, or prepare a repo for migration/onboarding.
---

# ARH Business Logic Extractor

This skill sits **downstream of** `arh-repo-codebase-inspector`, not in competition with it. The
inspector answers "what is this code shaped like" (directories, symbols, hotspots, TS/JS
architecture). This skill answers "what does this code *mean* in business terms" — the same
distinction its Core Principle makes explicit:

> **Never confuse code structure with business structure.**
> - Technical structure: `view -> serializer -> service -> provider -> model`
> - Business structure: `validate request -> determine eligibility -> choose route -> execute lookup -> normalize result -> update record -> charge credits`

Cherry-picked from the `reverse-engineering-business-logic` and `logic-extract` candidates cataloged
in `C:\00_ARH\_arh-build-laboratory\candidates\` (see their `arh-buildlab-candidate.meta.yaml` for the
full evaluation — both `pure-source`, zero runtime dependency, directly portable as markdown skills).
`reversa-main` and `repo2skill-master` were evaluated and rejected for this capability (heavy
multi-agent/runtime dependency, or redundant with the inspector's existing `docs`/`pack` commands) —
see their meta.yaml `rejection_reason` for why, so a future agent doesn't re-evaluate the same dead
ends.

---

## Project setup

Project-agnostic. Before use, check for `.arh-bl-config.yaml` at the target repo root for
`bl_output.root`, `bl_output.categories`, and `terminology`. If absent, ask the operator once for
project-specific terminology (or infer it from the codebase and record it), then default to:

```yaml
bl_output:
  root: business_logic/
  categories: [endpoints, models, workflows, billing]
terminology: {}
```

Write this file back to the repo root so the next run doesn't re-ask.

---

## Step 0: Find entry points with the inspector, not raw grep

Before tracing any flow, run the existing `arh-repo-codebase-inspector` tool to get the symbol
centroid and hotspot map — this is the "extend if 80% fits" step, not a restart from scratch:

```bash
python .claude/skills/arh-repo-codebase-inspector/scripts/repo_inspector_script/cli.py centroid --src <target-repo>
python .claude/skills/arh-repo-codebase-inspector/scripts/repo_inspector_script/cli.py risk --src <target-repo>
```

Use the centroid output to shortlist candidate entry points (views, handlers, models, workers) and
the risk output to prioritize which ones are worth documenting first (Tier 1 per
`references/bootstrapping.md`). Fall back to `Grep`/`Glob` only to fill gaps the centroid extraction
missed — do not re-grep the whole repo from zero.

## Steps 1–8: Extract, structure, save

Follow the core workflow exactly as documented:

1. **Identify the analysis scope** — Endpoint-to-BL, Model-to-BL, Workflow-to-BL, or Billing-to-BL
   (see `expertise.yaml` → `analysis_modes`).
2. **Identify entry points** for that scope (informed by Step 0's centroid/risk output).
3. **Trace the execution path** — controller → service → provider → DB → response.
4. **Extract business decisions** — validations, routing, charging, retries, fallbacks,
   termination conditions, prioritization.
5. **Separate technical from business** — rewrite mechanics in domain language (see
   `expertise.yaml` → `business_vs_technical_mapping`).
6. **Use domain language** from `.arh-bl-config.yaml` → `terminology`, or infer and record it.
7. **Produce structured output** using `output_template.md` (11 sections).
8. **Save to the BL output directory** — `[bl_root]/<state>/<category>/<name>.md` where state is
   `current` / `proposal` / `under_development` / `historical`. Update that state's `index.md` and
   `glossary.md`. See `references/bootstrapping.md` for the full directory layout and
   `references/collaboration.md` for versioning/team conventions.

Full detail for each step, the quality validation checklist, red flags to investigate, and the
diff/change-impact/gap-analysis advanced modes are unchanged from the source skill — read
`references/quick-start.md`, `references/advanced-modes.md`, and `references/validation.md` before
a first run; they are generic and require no further ARH-specific adaptation.

---

## Step 9 (new): Render the operator-facing report

Once one or more BL markdown documents exist under `[bl_root]/`, render the aggregate operator
report — this is the piece the source skills didn't have:

```bash
python .claude/skills/arh-business-logic-extractor/scripts/render_operator_report.py \
  --bl-root <target-repo>/business_logic \
  --output business_logic/_reports/<target-repo-name>-business-logic-report.html
```

The report is a single self-contained HTML file (no CDN/network dependency — safe to open offline
or forward to an operator with no ARH tooling installed):

- **Index**: every BL doc found, grouped by state (current/proposal/under_development/historical)
  and category, with business purpose as the one-line summary.
- **Decision-rule rollup**: every "Decision Rules" table from every doc, merged into one sortable
  table so an operator can scan business rules across the whole repo at once.
- **Flow list per doc**: each `mermaid stateDiagram-v2` block is parsed into a plain `A → B (trigger)`
  list (no mermaid runtime required to view it) plus the raw mermaid source in a collapsible
  `<details>` block for anyone who wants to paste it into a full renderer.
- **Ambiguities digest**: every "Ambiguities / Questions" section surfaced together, so open
  questions don't get lost inside individual docs — this is the list an operator should triage
  first.

Re-run this script any time new BL docs are added; it always rebuilds the whole report from
whatever is currently on disk under `bl_root` — it does not track state itself.

---

## Deliverables format

When reporting back to the operator after a run:

1. **Scope covered**: which entry points/features were analyzed, and which mode (Endpoint/Model/
   Workflow/Billing-to-BL) applied to each.
2. **BL docs written**: file paths under `bl_root`.
3. **Operator report**: path to the rendered HTML.
4. **Open ambiguities**: the ambiguities digest, surfaced directly — don't make the operator open
   the HTML to find out there are unresolved questions.
