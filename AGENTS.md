# AGENTS.md — DPIK TUGAS

Canonical documents (read before touching business logic):

```text
docs/canonical-handoff/README.md
docs/canonical-handoff/00_MASTER_TRACKER.md
docs/canonical-handoff/01_ALL_PLANS_CONSOLIDATED.md
docs/canonical-handoff/04_builder-implementation-program/turn-1/02_WORK_PACKAGE_SEQUENCE.md
```

<!-- project-docs:agents:start -->
## Generated project snapshot

```text
Status date: 2026-07-18
Stage: WP-130 — reference-slice qualification is the next safe action.
Runtime: Non-production startup reference slice is executable locally against the shared Supabase development project.
Approval: Operational approval is unsigned; pilot and production remain blocked.
Next safe action: Prove authenticated two-user behavior, negative RLS cases, concurrency, idempotency, recovery, and browser smoke before expanding workflow.
Owned modules: claim, deliverable, dispatch, governance-gate, identity-access, project-context, receipt-evidence, submission, work-thread
Latest migration: 20260720000000_governance_gate.sql
```

Do not expand business screens or schema beyond the startup reference slice before WP-130 security, recovery, idempotency, and browser gates pass.
<!-- project-docs:agents:end -->

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

## Deployment

Cloudflare Pages (`apps/internal`) and the `apps/jobs` outbox-publisher Worker deploy independently
from GitHub Actions on push to `main`, path-filtered so one unit's change never triggers another's
deploy. Supabase migrations under `supabase/migrations/**` apply from CI the same way. All three
authenticate only with GitHub Actions repository secrets — never a local `wrangler login` or
`supabase link` session. See `.agents/skills/arh-cloudflare-wrangler-deploy/SKILL.md` before adding
a new deployable unit, converting a script into a scheduled Worker, or diagnosing a dormant/failing
deploy workflow — it also has `assets/verify-deploy-unit.mjs` (lint + typecheck + architecture +
test + scoped format-check + wrangler dry-run in one command) and
`references/known-pitfalls.md` (real CI failures already hit and fixed once, so they don't need
re-discovering).

Before auditing or substantially changing TS/JS structure, see
`.agents/skills/repo-codebase-inspector/SKILL.md` (`npm run audit:tsjs`) — covers architecture
boundaries, undeclared dependencies, hardcoded paths, and missing quality gates; complements, does
not replace, `npm run test:architecture`.

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

## Documentation as a byproduct

- Update `docs/project-state.json` only when its structured facts change.
- Run `npm run docs:update` after changing modules, migrations, package scripts, stage, links, or repository metadata.
- Never hand-edit content inside `project-docs` markers; CI runs `npm run docs:check` and rejects stale generated snapshots.
- Keep human rationale in decisions, evidence, and the append-only journal. The generator owns factual indexes, not architectural reasoning.
- `npm run repo:about:plan` is read-only. Run `npm run repo:about:sync` only with explicit operator authority because it mutates GitHub repository settings.

## Cloud agent handoff

Read these append-only context records before changing the repository:

```text
journal.md
gaps-findings.md
oppurtunities-kiv.md
docs/evidence/2026-07-18-startup.md
docs/evidence/2026-07-18-cloud-agent-context.md
```

For GitHub, Supabase, CI, migration, RLS-fixture, or shared-project work, load `.agents/skills/dpik-tugas-cloud-ops/SKILL.md` and run its preflight before any remote mutation.

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
SUPABASE_SERVICE_ROLE_KEY
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

The existing `.github/workflows/ci.yml` does not consume these secrets. Their presence is not permission to deploy, mutate production, or expose secrets to workflows triggered by forks. A cloud workflow must explicitly map only the minimum secret required for a trusted event. `SUPABASE_SERVICE_ROLE_KEY` is restricted to trusted fixture setup/cleanup and must never enter browser code, `VITE_*`, fork-triggered jobs, logs, or application assertions. No database password is registered because the current CLI path does not require one.

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
