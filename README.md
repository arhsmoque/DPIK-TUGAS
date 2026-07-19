# DPIK TUGAS

Internal work assignment and accountability system for DPI Konsult Sdn Bhd. This repository is the canonical source for application code, database migrations, operating guidance, and verification evidence.

<!-- project-docs:readme:start -->
## Project links

| Destination | Intended audience |
| --- | --- |
| [GitHub repository](https://github.com/arhsmoque/DPIK-TUGAS) | Everyone |
| [Local operator console](http://127.0.0.1:4173) | Users after Start-TUGAS.cmd |
| [Supabase project dashboard](https://supabase.com/dashboard/project/mwvvtbgxnruxgjbffifd) | Authorized administrators and developers |
| [Supabase REST endpoint](https://mwvvtbgxnruxgjbffifd.supabase.co/rest/v1/) | Developers; authentication required |
| [User guide](user-guide.html) | Staff using My Work |
| [Administrator guide](admin-guide.html) | DPIK application administrators |
| [Developer guide](developer-guide.md) | Local and cloud builders |

## Current verified state

- **Status date:** 2026-07-18
- **Stage:** WP-130 — reference-slice qualification is the next safe action.
- **Runtime:** Non-production startup reference slice is executable locally against the shared Supabase development project.
- **Approval:** Operational approval is unsigned; pilot and production remain blocked.
- **Next safe action:** Prove authenticated two-user behavior, negative RLS cases, concurrency, idempotency, recovery, and browser smoke before expanding workflow.
- **Owned modules:** `deliverable`, `identity-access`, `project-context`, `work-thread`
- **Tracked migrations:** 6; latest `20260719001000_deliverable.sql`

## Common commands

| Command | Executes |
| --- | --- |
| `npm run dev` | `node scripts/run-vite-with-arh-env.mjs dev` |
| `npm run build` | `tsc --noEmit && node scripts/run-vite-with-arh-env.mjs build` |
| `npm run typecheck` | `tsc --noEmit --pretty` |
| `npm run lint` | `eslint .` |
| `npm run format` | `prettier --check .` |
| `npm run test` | `vitest run` |
| `npm run test:architecture` | `node scripts/verify/check-architecture.mjs` |
| `npm run docs:update` | `node scripts/sync-project-docs.mjs` |
| `npm run docs:check` | `node scripts/sync-project-docs.mjs --check` |

This block is generated from `docs/project-state.json`, `package.json`, the module tree, and tracked migrations. Change the source facts, then run `npm run docs:update`.
<!-- project-docs:readme:end -->

## Start locally

On the configured DPIK workstation, double-click `Start-TUGAS.cmd`, wait for the health confirmation, then open [http://127.0.0.1:4173](http://127.0.0.1:4173). Sign in using an approved email and its Supabase magic link.

The startup launcher reads public browser configuration from the ARH vault. Do not place Supabase management tokens or service-role keys in browser configuration.

## System architecture and transition programme

The canonical architecture, product contracts, and implementation sequence begin at [docs/canonical-handoff/README.md](docs/canonical-handoff/README.md). The seven-turn architecture design is retained under `docs/system-architecture-transition/`.

Design proof is not runtime proof or production authorization. The builder must execute the five canonical paths and complete operational approval records before pilot or release.

## Documentation automation

Changing work should update structured facts and evidence, not invite agents to rewrite status prose independently:

1. Update `docs/project-state.json` when stage, runtime, approval, links, description, or topics change.
2. Add the required decision/evidence/journal record.
3. Run `npm run docs:update` to refresh the managed README and AGENTS snapshots.
4. Run `npm run docs:check`; CI runs the same freshness gate.
5. Run `npm run repo:about:plan` to inspect proposed GitHub About metadata. `npm run repo:about:sync` is an explicit authenticated repository-setting mutation and requires operator authorization.

Content inside `project-docs` markers is generated. Edit its sources instead of editing the block directly.
