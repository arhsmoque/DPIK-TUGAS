# DPIK TUGAS Gaps and Findings

Status captured 2026-07-18. This file is append-only: close items by adding dated resolution notes rather than deleting history. No secret values belong here.

## Blocking gaps

| Priority | Gap                                                                   | Why it blocks                                                                                                                   | Required evidence to close                                                                                                                                                                                                                                           |
| -------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | Operational approval is unsigned                                      | Pilot, production, final schema, and irreversible legacy changes are outside current authority                                  | Signed approval record and explicit target-environment authorization                                                                                                                                                                                                 |
| P0       | WP-130 authenticated security/recovery matrix is incomplete           | Anonymous denial alone does not prove actor isolation or reliable command handling                                              | Two-user browser proof; wrong-actor and cross-Project denial; stale-version rejection; duplicate-command and lost-response recovery; RLS matrix evidence                                                                                                             |
| P1       | GitHub CI does not consume Supabase secrets or validate cloud startup | Stored secrets alone do not let cloud agents validate the linked service                                                        | Trusted-event workflow with least-privilege secret mapping, migration-history check, linked lint, build, and artifact/report output; no secret access from forks                                                                                                     |
| P1       | Database RPC path lacks an explicit client idempotency receipt        | Retry after an uncertain response can duplicate a logical command even though aggregate versions protect some concurrency cases | Stable command ID, unique receipt/constraint, replay response, and duplicate/lost-response tests                                                                                                                                                                     |
| P0       | Legacy `public.projects` has Row Level Security disabled              | Supabase's own advisory flags this critical: the anon and authenticated roles can read/write every row with no policy check     | Operator decision on the access policy this legacy table should have, then `ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY` plus explicit policies (enabling RLS with zero policies would instead block all access, so policies must land in the same change) |

## Implementation gaps

| Area                   | Current state                                                    | Gap / next proof                                                                                                       |
| ---------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Application boundary   | Pure TypeScript Work Thread domain and SQL RPC guards both exist | Route RPC handling through a clear application/domain adapter or add contract tests that prevent SQL/domain rule drift |
| Outbox                 | Rows commit with domain changes                                  | No publisher, retry schedule, dead-letter behavior, or projection-lag health signal exists                             |
| Browser proof          | Manual magic-link startup UI exists                              | No automated authenticated end-to-end test; email-link flow and two-account setup remain manual                        |
| Deployment             | Local `127.0.0.1:4173` startup is proven                         | No hosted non-production URL, Cloudflare deployment proof, or verified Supabase Auth redirect allow-list               |
| Project storage        | Canonical UUID Projects use `public.tugas_projects`              | Transitional name differs from the canonical model; merge/rename needs a deliberate legacy-data plan                   |
| Legacy security        | Canonical tables deny anonymous access                           | Historical legacy tables/policies, including signal-filter access, have not received a complete security disposition   |
| Local database tooling | Linked remote CLI operations work                                | Docker Desktop is unavailable, preventing reliable local Supabase stack, shadow diff, dump/pull, and reset proof       |
| Operator health        | `operator_health_snapshot()` RPC + Operator Health tab show outbox-pending, open-defect, and deferred-gate counts app-wide | Database and migration health still are not shown at a glance -- see 2026-07-20 resolution note for why that was deliberately excluded, not just missed |
| Identity bootstrap     | Named non-production actors are documented                       | Repeatable roster/bootstrap automation and role-grant audit UI are not complete                                        |

## Confirmed findings

- Repository `arhsmoque/DPIK-TUGAS` is public; all six GitHub secret names are present, but values are not repository content.
- Supabase development project `mwvvtbgxnruxgjbffifd` is in `ap-southeast-1` and was `ACTIVE_HEALTHY` when the startup slice was verified.
- Local and remote migration history aligned after reconciliation. Current migration files use fourteen-digit versions.
- Remote `db lint --linked --level error` returned no schema errors after the forward repair.
- Canonical `work_threads` reads and startup-context RPC calls reject anonymous requests with HTTP 401.
- Typecheck, lint, formatting, architecture gates, 56 tests, Vite production build, and local HTTP startup passed at the recorded checkpoint.
- The brownfield collision is concrete: legacy `public.projects` uses bigint while the canonical Project contract uses UUID.
- Current CI runs install, typecheck, lint, formatting, architecture tests, and unit tests on Node 22. It omits `npm run build` and all Supabase validation.
- 2026-07-19: Supabase's advisory API confirms `public.projects` (2 rows) has `rls_enabled: false`, the only table in `public` in that state; every other application table has RLS enabled.

## Resolution log

Append dated closure notes here, including the evidence path and the exact gap closed.

### 2026-07-18 — Cloud-agent grounding corrected

- Confirmed both startup migration files are tracked on `origin/main` in `69d9ec6`; no migration-source gap exists at the recorded head.
- Confirmed Identity Access, Project Context, and Work Thread TypeScript modules are tracked in `dece182`.
- Added `SUPABASE_SERVICE_ROLE_KEY` as a repository secret for trusted CI fixture operations. The P1 CI-workflow gap remains open until the workflow enforces trusted-event isolation and runs the required tests.
- Added `.agents/skills/dpik-tugas-cloud-ops/` to enforce fetch-first, commit-before-apply, linked-history, credential-safety, and evidence rules.

### 2026-07-19 — Exposed management token gap closed by operator directive

- Operator directed this gap be treated as resolved rather than continuing to gate other work on it. No new rotation evidence was generated in this session; this is an authority call, not a technical proof.

### 2026-07-20 — Operator health partially closed: app/outbox/gate signal, not database/migration

- Added `operator_health_snapshot()` (migration `20260720010000_operator_health.sql`) and an `Operator Health` tab (`apps/internal/src/OperatorHealthPanel.tsx`) surfacing outbox-pending count and oldest-pending age, open (unacknowledged) defect-report count, and deferred-governance-gate count, app-wide, gated on the `administration.manage_users` permission (same system-wide-via-any-project simplification `set_system_status` already uses).
- Deliberately excluded database and migration health: those live in Supabase's own `schema_migrations` catalog and advisory API, which is infrastructure-level and not something an application permission check should be trusted to expose to a browser client. That remains open; closing it would mean either a service-role-backed edge function or keeping it as CLI/CI-only evidence, and is a separate decision.
- The migration was committed and pushed before being applied to the linked project, per `.agents/skills/dpik-tugas-cloud-ops`'s commit-before-apply protocol.
- Removed from the blocking-gaps table above. If the token is later found not to have been rotated, treat it as a live P0 again rather than assuming this note covers it indefinitely.
