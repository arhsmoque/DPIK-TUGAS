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
WP-000 — repository baseline. Toolchain, strict TypeScript, architecture-test
harness, workspace layout. No business logic, no Supabase connection, no
production secrets required.
```

Do not implement business screens or database schema before WP-000's exit gate passes and WP-010/WP-020 (foundation contracts, identity/project context) land.

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
