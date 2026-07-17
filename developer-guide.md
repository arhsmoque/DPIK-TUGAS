# DPIK TUGAS Developer Guide

This guide onboards local and cloud builders. Read the root `AGENTS.md` and the canonical handoff before changing business behavior.

## Repository and runtime

- Canonical repository: `arhsmoque/DPIK-TUGAS`
- Required Node.js: 22 or newer
- Frontend: React, TypeScript, and Vite
- Backend: Supabase Auth, PostgreSQL, RLS, and RPCs
- Shared development project: `mwvvtbgxnruxgjbffifd`, `ap-southeast-1`
- Architecture: domain modules with ports/adapters; protected writes go through commands/RPCs

The sibling legacy repository is reference-only. Do not place canonical migrations or new domain behavior there.

## First checkout

```bash
git fetch origin
git switch main
git pull --ff-only origin main
npm install
npm run docs:check
npm run typecheck
npm run lint
npm run test:architecture
npm test
npm run build
```

Local ARH workstations can start the UI with `Start-TUGAS.cmd`. Other environments must supply `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` through their approved secret/configuration mechanism.

## Modules and boundaries

- `src/foundation/`: shared identifiers, results, command/event envelopes, clocks and IDs
- `src/modules/identity-access/`: authenticated identity and provider adapter
- `src/modules/project-context/`: membership, permissions, role bundles and actor context
- `src/modules/work-thread/`: Work Thread commands, events, decide/evolve and failures
- `apps/internal/`: internal user interface and runtime adapters
- `supabase/migrations/`: forward-only database source of truth

Domain code must not import React, Supabase, HTTP, storage, or provider SDKs. Cross-module imports use the target module's public `index.ts`.

## Shared Supabase discipline

Load `.agents/skills/dpik-tugas-cloud-ops/SKILL.md`, then run:

```bash
node .agents/skills/dpik-tugas-cloud-ops/scripts/preflight.mjs
```

For every schema change: pull first, create a fourteen-digit forward migration, review it, commit and push the SQL before applying it, recheck linked history immediately before apply, then lint and record evidence. Never edit an applied migration or run `db reset --linked`.

Use the service-role key only for trusted CI fixture setup/cleanup. End-user assertions must use authenticated user sessions so RLS is genuinely tested.

## Documentation workflow

`docs/project-state.json` is the structured source for changing project metadata. Module names, migration inventory, and package commands are discovered automatically.

```bash
npm run docs:update       # refresh README and AGENTS managed blocks
npm run docs:check        # fail if generated documentation is stale
npm run repo:about:plan   # preview GitHub About metadata
```

Only an explicitly authorized operator or agent runs `npm run repo:about:sync`. Architectural rationale stays in `docs/decisions/`; execution proof stays in `docs/evidence/`; chronological context stays in `journal.md`.

## Definition of done

A work unit is complete when its behavior is usable, focused tests and architecture gates pass, migrations are committed and aligned, observable failure/recovery exists, generated documentation is current, evidence is recorded, and the next safe action is clear.

## Android direction

Capacitor is KIV as a thin Android shell around the existing React/Vite build. Do not fork the domain into a separate native implementation. Before starting, pass WP-130 and decide the package ID, signing-key custody, update channel, magic-link callback, mobile navigation, permissions, network-loss behavior, and device distribution model.
