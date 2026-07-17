# DPIK TUGAS Agent Journal

This is an append-only, operator-facing continuity record. It explains why work was done and where the next agent should resume. Technical proof belongs in `docs/evidence/`; architectural decisions belong in `docs/decisions/`. Never record secret values here.

## 2026-07-16 — Canonical baseline

- The canonical handoff and work-package sequence were established as the source of truth for the rebuild.
- WP-000/WP-010 foundation work created the modular TypeScript/React structure, architecture enforcement, and verification harness.
- The legacy application was retained as a brownfield reference, not as the destination for new canonical implementation.

## 2026-07-17 — Identity, Project context, and Work Thread

- Continued only within the non-production reference-slice authority because operational approval remains unsigned.
- Completed WP-020 Identity Access and Project Context contracts, negative access proof, and Supabase identity adapter tests.
- Corrected inherited Windows verification and development-tooling issues discovered while exercising the gates.
- Completed WP-100 pure Work Thread transitions for create, assign, and acknowledge. Legacy email-based identity and generic status cycling were rejected as canonical domain behavior; its projection/search ideas remain salvage candidates.
- Evidence: `docs/evidence/2026-07-17-wp-020.md` and `docs/evidence/2026-07-17-wp-100.md`.

## 2026-07-18 — Supabase startup slice

- Operator identified the development Supabase project and startup actors. The repository was linked using CLI native credential storage.
- Reconciled historical remote migration metadata and normalized an obsolete eight-digit version record to the fourteen-digit convention.
- Preserved the brownfield bigint `public.projects` table. The canonical UUID Project model was introduced as `public.tugas_projects` to avoid destructive conversion.
- Applied forward migrations for organisation, identity membership, role bundles, Project context, Work Threads, Domain Events, outbox, RLS, and create/assign/acknowledge RPCs.
- Remote lint found an ambiguous assignment parameter; a forward repair migration corrected it before UI use.
- Added the vault-backed one-click launcher and authenticated startup UI. Verified remote migration alignment, database lint, anonymous denial, architecture, 56 tests, production build, and startup HTTP 200.
- Evidence: `docs/evidence/2026-07-18-startup.md`; ADRs `0004` through `0006`.

## 2026-07-18 — Cloud-agent credential handoff

- Added six GitHub Actions repository secrets by name: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`.
- Values were not written to the repository or evidence. The Supabase management token remains in native CLI credential storage and must be rotated because it was exposed in conversation.
- No database password or service-role key was added. They are unnecessary for the currently verified passwordless CLI route and would unnecessarily increase authority.
- Finding: existing CI does not consume the new secrets, build the Vite application, or validate linked migrations/database lint. This is now explicit in `gaps-findings.md`; adding a trusted cloud workflow remains a separately authorized implementation.

## Resume point

Resume at WP-130 reference-slice qualification. First rotate the exposed management token, then prove the authenticated two-user browser and negative-security/recovery matrix. Do not expand business workflow or declare pilot readiness before those gates and operational approval pass.

## 2026-07-18 — Shared cloud-operations contract

- A cloud agent reported the startup migrations and TypeScript modules missing. Fetching `origin/main` proved this was stale-checkout context: the modules are in `dece182`, and both applied migration files are in `69d9ec6`.
- Added the requested `SUPABASE_SERVICE_ROLE_KEY` repository secret by retrieving it through the authenticated Supabase CLI and piping it directly to GitHub. No value was printed, committed, or copied into repository artifacts.
- Added the repository-native `dpik-tugas-cloud-ops` skill with a deterministic preflight and a commit-before-apply shared-migration protocol.
- Clarified that the three-state SQL lifecycle is deliberate startup-slice scope. Role bundle names remain temporary debt and must be reconciled through a later forward migration after stable canonical machine codes are decided.
- Operator proposed an in-house Android application to avoid browser clutter. Recorded Capacitor as the preferred KIV approach because it reuses the React/Vite implementation; signing-key custody, package registration, update distribution, mobile UX, and WP-130 remain gates before implementation.
