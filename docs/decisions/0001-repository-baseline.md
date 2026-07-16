# 0001 — Repository baseline toolchain

Status: Accepted
Date: 2026-07-16

## Decision

React + Vite + TypeScript (strict) + Vitest + ESLint (flat config) + Prettier, per `01_V1_BUILD_DIRECTIVE.md` ("retain React, Vite, Supabase and Cloudflare unless a proven blocker requires replacement"). `tsc --noEmit` rather than `tsc -b`/project references for now — simplest thing that gives strict typechecking without composite-project overhead; revisit if/when `apps/*` genuinely need independent incremental builds.

Architecture-test harness (`scripts/verify/check-architecture.mjs`) is deliberately a regex-based import scanner, not a full AST/dependency-graph tool — enforces the two rules the engineering standard names as non-negotiable from day one (domain stays framework-free; cross-module imports go through a public `index.ts` only). Expected to need to grow more precise as `src/modules` fills in; must never grow more permissive.

## Consequence

`src/modules/` is intentionally empty at this stage — WP-000 is scaffolding only, no business logic. The architecture gate currently passes trivially on an empty tree; its real test coverage lives in `tests/architecture/module-boundaries.test.ts` against fixtures, proving the checker actually catches both violation types before any real module exists to check.
