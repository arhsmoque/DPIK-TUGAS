# DPIK TUGAS Gaps and Findings

Status captured 2026-07-18. This file is append-only: close items by adding dated resolution notes rather than deleting history. No secret values belong here.

## Blocking gaps

| Priority | Gap                                                                   | Why it blocks                                                                                                                   | Required evidence to close                                                                                                                                       |
| -------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P0       | Exposed Supabase management token has not been rotated                | The value appeared in conversation and must be treated as compromised                                                           | Revoke/rotate it, update CLI native credential storage and `SUPABASE_ACCESS_TOKEN`, then prove old token rejection without printing either value                 |
| P0       | Operational approval is unsigned                                      | Pilot, production, final schema, and irreversible legacy changes are outside current authority                                  | Signed approval record and explicit target-environment authorization                                                                                             |
| P0       | WP-130 authenticated security/recovery matrix is incomplete           | Anonymous denial alone does not prove actor isolation or reliable command handling                                              | Two-user browser proof; wrong-actor and cross-Project denial; stale-version rejection; duplicate-command and lost-response recovery; RLS matrix evidence         |
| P1       | GitHub CI does not consume Supabase secrets or validate cloud startup | Stored secrets alone do not let cloud agents validate the linked service                                                        | Trusted-event workflow with least-privilege secret mapping, migration-history check, linked lint, build, and artifact/report output; no secret access from forks |
| P1       | Database RPC path lacks an explicit client idempotency receipt        | Retry after an uncertain response can duplicate a logical command even though aggregate versions protect some concurrency cases | Stable command ID, unique receipt/constraint, replay response, and duplicate/lost-response tests                                                                 |

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
| Operator health        | Logs and checks exist                                            | No single operator dashboard shows app, database, migration, outbox, and projection health at a glance                 |
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

## Resolution log

Append dated closure notes here, including the evidence path and the exact gap closed.
