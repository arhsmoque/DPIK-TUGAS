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

## 2026-07-18 — Vite env fallback for cloud sessions

- Operator asked for an impact-radius assessment before letting a cloud agent build `apps/internal` without the local `ARH_VAULT` file. Assessed as low-risk when scoped to the build script alone: single file, no business-scope change, ARH_VAULT/ADR 0006 path unchanged and still takes priority, and no higher-privilege secret (service role key, access token) touched.
- Deliberately did not wire `.github/workflows/ci.yml`: it triggers on `pull_request`, and mapping repository secrets into that trigger would expose them to fork-originated PRs. That remains the open, separately-gated P1 CI-workflow item.
- `scripts/run-vite-with-arh-env.mjs` now falls back to `process.env.VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` when `ARH_VAULT` is unset, so a cloud session with those two repository secrets available as env vars can run `npm run build`/`npm run dev` without a local vault file.
- Verified: typecheck, lint, and all 56 tests pass; `npm run build` verified to fail with a clear message when neither credential source is set, and to succeed end-to-end using only the two `VITE_SUPABASE_*` env vars.
- Evidence: `docs/evidence/2026-07-18-vite-env-fallback.md`.

## 2026-07-19 — Operator visibility push

- Operator flagged that agents had been withholding visibility behind unresolved gates instead of surfacing runnable progress. Directive: close the exposed-token gap by authority call (see `gaps-findings.md`), and get the actual frontend in front of the operator instead of only reporting status prose.
- Ran the reference-slice app in-session against the real development Supabase project (`mwvvtbgxnruxgjbffifd`) using the anon key fetched live via the Supabase MCP tools, and screenshotted the login screen (light/dark) to confirm it renders and is wired to the real backend, not a mock.
- While inspecting the project for this, found a live, previously-undocumented finding: `public.projects` (legacy) has Row Level Security disabled, exposing its rows to the anon key. Recorded in `gaps-findings.md` for an explicit operator decision on remediation; not auto-fixed.
- Confirmed only two fixture identities exist with Project membership: `rahman@dpik.com.my` and `smoque@gmail.com`. No hosted/browsable URL exists yet — this session has no Cloudflare access, so a real in-house-testable deployment needs either operator-side Cloudflare Pages setup or a Cloudflare API token handed to a cloud agent.
## 2026-07-20 — Repo auditor, and independent Cloudflare/Supabase CI deploys

- Added `.agents/skills/repo-codebase-inspector` (self-contained, `uv run`, no local setup) — TS/JS
  architecture, dependency, portability, and quality-gate audit. Run via `npm run audit:tsjs`.
  Complements `npm run test:architecture`; does not replace it.
- Closed the "still needs a local machine" gap this repo's Cloudflare deploy had: `deploy.yml`
  (Pages) was correct but dormant — `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` were never set as
  repository secrets. Operator added both via `gh secret set`; Pages deploy is now live and green.
- Wired `apps/jobs`'s outbox-publisher as a Cloudflare Worker (`apps/jobs/wrangler.toml`,
  `apps/jobs/src/worker.mjs`) with a 5-minute Cron Trigger, replacing the manual `--watch` polling
  loop. `processBatch` itself is unchanged and stays covered by `notify.test.mjs`; `worker.mjs` is a
  thin env-binding adapter only. Runtime secrets (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) still
  need a one-time `wrangler secret put` bind before the Worker's scheduled runs will do anything
  beyond the console-notifier no-op.
- Added `.github/workflows/supabase-migrate.yml`: applies `supabase/migrations/**` from CI using
  the `SUPABASE_ACCESS_TOKEN`/`SUPABASE_PROJECT_REF` secrets that had existed since 2026-07-18 but
  were never consumed by any workflow — this was the actual remaining local-machine dependency for
  the merge-to-main migration path, not Cloudflare auth.
- Each unit (Pages, jobs Worker, Supabase migrate) is an independent, path-filtered GitHub Actions
  workflow with its own fail-fast secrets check; none blocks or is blocked by another.
- Authored `.agents/skills/arh-cloudflare-wrangler-deploy` (also canonical in ARH at
  `_arh-agent-domain/agent-skills/arh-cloudflare-wrangler-deploy.source`) so the pattern is reusable
  by any repo/agent, not DPIK-TUGAS-specific. `references/known-pitfalls.md` and
  `assets/verify-deploy-unit.mjs` exist because the first real push cycle hit three CI failures one
  at a time (a Workers-only `Response` global failing `no-undef`, `prettier --check` flagging
  `wrangler.toml` with no parser, a scoped-vs-repo-wide format-check distinction) — each is now
  caught in one local run instead of costing a push-and-wait round trip.
- Verified: `wrangler deploy --dry-run` clean, `test:architecture` and the full `apps/jobs` suite
  pass unchanged, and both the Pages and jobs-Worker GitHub Actions runs are green on `main`
  (`7d570f8`, `c9436ee`).
- Not yet done: Worker runtime secrets are unbound (see above); no hosted proof the Worker's
  scheduled run actually processes a real outbox message end-to-end.
