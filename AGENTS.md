# AGENTS.md — DPIK TUGAS

Canonical documents (read before touching business logic):

```text
docs/canonical-handoff/README.md
docs/canonical-handoff/00_MASTER_TRACKER.md
docs/canonical-handoff/01_ALL_PLANS_CONSOLIDATED.md
docs/canonical-handoff/04_builder-implementation-program/turn-1/02_WORK_PACKAGE_SEQUENCE.md
```

## Current stage

```text
WP-130 — reference-slice qualification is the next safe action. The non-production
startup now executes Supabase authentication, Project context, CreateWorkThread,
AssignWork, AcknowledgeAssignment and My Work. Final workflow expansion and
production schema remain blocked; operational approval is unsigned.
```

Do not expand business screens or schema beyond the startup reference slice before WP-130 security,
recovery and browser gates pass.

## Hard constraints

- No UI component may mutate protected tables directly.
- Domain code (`src/modules/*/domain/`) may not import React, Supabase, HTTP, storage, or any provider SDK — enforced by `npm run test:architecture`.
- Modules interact only through another module's public `index.ts`, never an internal path — enforced by `npm run test:architecture`.
- Every module has `README.md`, `AGENTS.md`, and `index.ts`.
- Every table and Domain Event has one owning module.
- Business rejection is an explicit transition, never an automatic technical retry.
- Roles are capability bundles granted with a recorded reason, not hardcoded job titles (`docs/canonical-handoff/01_product-contracts/04_ROLE_AND_AUTHORIZATION_MATRIX.md`). Separation of duty is a record-level check (same actor can't approve/verify their own prior fact), not a role exclusivity rule.
- Exactly one non-delegable exception exists: Submission signatory authority, gated to whoever holds valid PEPC status — do not model this as an ordinary capability grant.

## Commands

```text
npm run typecheck        -- tsc --noEmit
npm run lint              -- eslint .
npm run format             -- prettier --check .
npm test                    -- vitest run
npm run test:architecture    -- module-boundary gate
npm run build                 -- typecheck + vite build (apps/internal)
```

## Repository shape

```text
apps/{internal,delivery,jobs}    -- runtime adapters
src/{foundation,modules,composition} -- domain code
supabase/{migrations,seed,tests}
tests/{architecture,contracts,integration,browser,five-path}
docs/{canonical-handoff,decisions,evidence,operations}
scripts/{verify,generate,diagnostics}
```

## Session trace

Every session touching files leaves a trace in `docs/evidence/` using `docs/evidence/SESSION_TRACE_TEMPLATE.md`. See `docs/decisions/` for the running decision log.

## Cloud agent handoff

Read these append-only context records before changing the repository:

```text
journal.md
gaps-findings.md
oppurtunities-kiv.md
docs/evidence/2026-07-18-startup.md
docs/evidence/2026-07-18-cloud-agent-context.md
```

### Repository and environment

- GitHub repository: `arhsmoque/DPIK-TUGAS` (public), default branch `main`.
- Canonical application repository: this repository. The sibling `legacy-DPIK-TUGAS-App` is reference-only; do not commit canonical work there.
- Supabase development project: `dpik-tugas-app`, ref `mwvvtbgxnruxgjbffifd`, region `ap-southeast-1`.
- Non-production fixture: organisation `DPI Konsult Sdn Bhd`, Project `DPIK Tugas`, owner/admin `rahman@dpik.com.my`, assignee `smoque@gmail.com`.
- Browser startup is `Start-TUGAS.cmd`, then `http://127.0.0.1:4173`. The launcher reads public browser configuration from the ARH vault; it does not contain credentials.
- Use ARH environment variables and the canonical registry described by the operator-level `AGENTS.md`. Never hardcode machine-specific ARH paths in scripts or artifacts.

### GitHub Actions secret contract

The repository currently has these Actions secret names. Values must never be printed, committed, copied into evidence, or placed in pull-request text:

```text
SUPABASE_ACCESS_TOKEN
SUPABASE_PROJECT_REF
SUPABASE_URL
SUPABASE_ANON_KEY
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

The existing `.github/workflows/ci.yml` does not consume these secrets. Their presence is not permission to deploy, mutate production, or expose secrets to workflows triggered by forks. A cloud workflow must explicitly map only the minimum secret required for a trusted event. No database password or service-role key is registered because the current CLI path does not require either.

The management token pasted into the operator conversation is rotation debt. After rotation, update both `SUPABASE_ACCESS_TOKEN` and Supabase CLI native credential storage. Do not preserve the exposed value anywhere else.

### Safe Supabase sequence

Run from the repository root:

```text
npx supabase@2.109.1 projects list
npx supabase@2.109.1 migration list --linked
npx supabase@2.109.1 db lint --linked --level error
npm run typecheck
npm run lint
npm run format
npm run test:architecture
npm test
npm run build
```

Before any remote migration, compare local and remote migration history and inspect every SQL file. Use forward-only migrations. Do not run `db reset --linked`, destructive repair, legacy-table conversion, or production deployment without explicit operator authorization. Docker Desktop is not currently available, so local shadow-database commands such as `db pull`, `db diff`, and full local reset are not a reliable agent path.

### Brownfield boundaries and stop conditions

- Legacy `public.projects` uses bigint identifiers. The canonical UUID Project model is temporarily isolated as `public.tugas_projects`; do not rename or merge it casually.
- Protected startup mutations go through RPCs. UI components may not write protected tables directly.
- Canonical anonymous reads/RPC access are denied. Historical legacy policies still require a separate audit; do not infer whole-database security from the canonical checks.
- Stop before expanding schema or workflow until WP-130 proves authenticated two-user behavior, negative RLS cases, concurrency, idempotency, and recovery.
- Stop and report if migration history diverges, remote project identity differs, a required secret is absent, or a command would expose credentials in logs.
- Operational approval is still unsigned. Development reference-slice work is authorized; pilot, production, and irreversible legacy changes are not.
