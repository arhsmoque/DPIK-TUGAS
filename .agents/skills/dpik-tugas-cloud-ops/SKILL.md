---
name: dpik-tugas-cloud-ops
description: Safely coordinate DPIK TUGAS GitHub, Supabase, CI, migrations, secrets, and WP-130 database qualification. Use for repository synchronization, schema changes, migration drift, Supabase CLI or MCP work, GitHub Actions database jobs, RLS fixtures, shared-project operations, or cloud-agent handoff in arhsmoque/DPIK-TUGAS.
---

# DPIK TUGAS Cloud Operations

Keep Git as the schema source of truth while multiple agents share the Supabase development project. Prefer evidence and forward-only recovery over inferred or destructive repair.

## Load context

Read these repository files completely before acting:

1. `AGENTS.md`
2. `journal.md`
3. `gaps-findings.md`
4. `docs/canonical-handoff/README.md`
5. `docs/canonical-handoff/00_MASTER_TRACKER.md`
6. `docs/canonical-handoff/04_builder-implementation-program/turn-1/02_WORK_PACKAGE_SEQUENCE.md`

For authorization or role work, also read `docs/canonical-handoff/01_product-contracts/04_ROLE_AND_AUTHORIZATION_MATRIX.md`. For database work, inspect every file in `supabase/migrations/` and the latest startup evidence in `docs/evidence/`.

Run `node .agents/skills/dpik-tugas-cloud-ops/scripts/preflight.mjs` before remote work. Stop on any failed check; do not work around divergence silently.

If a fresh cloud checkout is not linked, run `npx supabase@2.109.1 link --project-ref "$SUPABASE_PROJECT_REF"` in a trusted shell, then run the preflight again. Never place the token or project secret values on the command line.

## Establish the actual state

1. Resolve the repository and remote; require `arhsmoque/DPIK-TUGAS` unless the operator explicitly names a fork.
2. Fetch before trusting local file listings or commit history.
3. Compare `HEAD`, `origin/main`, the working tree, tracked migration files, and linked migration history.
4. Treat `origin/main` as authoritative for source and Supabase project `mwvvtbgxnruxgjbffifd` as the shared development runtime.
5. If a claimed missing artifact exists on `origin/main`, report the exact commit and require the stale agent to pull. Do not recreate it.

Current grounding facts:

- `dece182` contains `src/modules/identity-access`, `src/modules/project-context`, and `src/modules/work-thread`.
- `69d9ec6` contains `20260718010000_startup_reference_slice.sql` and `20260718011000_fix_assign_work_parameter.sql`.
- The SQL lifecycle constraint intentionally covers only `Unassigned`, `AwaitingAcknowledgement`, and `Assigned` for the startup slice. The TypeScript domain models later states but does not yet persist their transitions.
- Legacy bigint `public.projects` and canonical UUID `public.tugas_projects` coexist. Never merge, rename, or drop either by inference.

## Synchronize a migration

Use this sequence for every schema change:

1. Fetch and update from `origin/main`; require a clean, non-divergent base.
2. Run the preflight and inspect `npx supabase@2.109.1 migration list --linked`.
3. Create one forward migration with a fourteen-digit UTC timestamp and descriptive suffix.
4. Never edit a migration already applied to any shared remote. Correct it with a later forward migration.
5. Review SQL for transactionality, ownership, grants, RLS, idempotent fixtures, rollback consequences, and brownfield collisions.
6. Run the narrowest available local/static checks. If Docker is unavailable, state which shadow-database proof could not run.
7. Commit and push the migration file before applying it to the shared project. Re-fetch and prove that the exact commit is on the remote branch.
8. Re-run the linked migration comparison immediately before applying. Stop if another migration appeared.
9. Apply only the committed migration through the CLI or approved Supabase MCP operation.
10. Run linked migration comparison, `db lint --linked --level error`, focused RLS/RPC probes, and repository checks.
11. Commit evidence in `docs/evidence/` in the same work unit. Use a later forward repair if post-apply validation finds a defect.

Never run `db reset --linked`, destructive repair, history rewriting, or unreviewed `drop`/`truncate` against the shared project. Use `migration repair` only with explicit operator authority and evidence proving whether the source file or remote history is wrong.

If a remote migration exists without a Git file, stop all new DDL. Recover the exact applied SQL from the applying agent or an authoritative database record, commit it under the remote version, compare live objects, and document any unverifiable difference. Never reverse-engineer an approximation and label it exact.

## Use credentials safely

Repository secret names are contracts, not values:

```text
SUPABASE_ACCESS_TOKEN
SUPABASE_PROJECT_REF
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

- Never print, echo, commit, cache in artifacts, or place secret values in evidence or PR text.
- Never expose `SUPABASE_SERVICE_ROLE_KEY` through `VITE_*`, browser code, preview bundles, logs, or fork-triggered workflows.
- Use the anon key for client-equivalent positive/negative access tests.
- Use the service-role key only in a trusted CI fixture setup/cleanup step that cannot run for untrusted pull requests. Keep application assertions on authenticated user sessions.
- Use the access token and project ref only for approved CLI management operations.
- Treat the management token exposed in prior conversation as compromised until rotation is evidenced.
- Do not request a database password while the verified CLI/API-key path is sufficient.

## Design GitHub Actions safely

Separate jobs by authority:

1. Keep lint, typecheck, architecture, unit tests, and build credential-free for every pull request.
2. Run linked Supabase and authenticated integration checks only on a trusted protected-branch event, protected environment, or explicit `workflow_dispatch`.
3. Map secrets at the narrowest step or job. Do not use `pull_request_target` to execute untrusted checkout code with secrets.
4. Make fixtures uniquely namespaced and cleanup idempotent. Never delete shared non-fixture data.
5. Emit migration versions, test names, and pass/fail status—not keys, tokens, JWTs, headers, or raw environment dumps.
6. Upload a credential-free verification report and record its run URL in `docs/evidence/` when the result changes a work-package gate.

## Qualify WP-130

Prove at minimum:

- authenticated owner can create and assign within the fixture Project;
- authenticated assignee can acknowledge and query My Work;
- anonymous access is denied;
- wrong actor, cross-Project actor, and revoked membership are denied;
- stale aggregate version is rejected;
- duplicate command and lost-response retry are deterministic;
- service-role fixture setup does not substitute for end-user RLS proof;
- cleanup leaves pre-existing shared data untouched.

Do not mark WP-130 complete from HTTP 200, anonymous 401, or service-role-only queries.

## Reconcile known design debt

- Treat `startup_work_owner_admin` and `startup_assignee` as temporary fixture bundle codes. Do not edit the applied startup migration.
- Before a forward rename, define stable machine codes for the canonical `Work Owner`, `Preparer / Assignee`, and `Administration` bundles; keep Work Owner and Administration as separate grants even when one fixture user holds both.
- Do not expand the SQL lifecycle constraint until the corresponding commands, events, RPC/application adapters, RLS, and tests are ready.
- Do not drop legacy tables or policies merely because current rows appear empty. Require inventory, dependency proof, backup/restore evidence, and explicit irreversible-change authority.

## Leave a handoff

For every mutation, report:

- fetched base commit and pushed commit;
- migration version and whether it was committed before application;
- linked project ref and migration-history result;
- validation executed and unavailable checks;
- secret names used, never values;
- remaining blocker and exact next safe action.

Append repository evidence and the operator task journal. Keep the working tree clean and synchronized before yielding to another agent.
