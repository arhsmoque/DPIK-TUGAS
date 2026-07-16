# src/modules

One directory per bounded module (Identity Access, Project Context, Work Thread, Deliverable, Submission, Dispatch, Receipt Evidence, Claim, Configuration, Formal Submission Process, Attention Projections, Mismatch Analyzer — see `docs/canonical-handoff/01_product-contracts/10_REPOSITORY_MODULE_MAP.md`).

Each module: `README.md`, `AGENTS.md`, `index.ts` (public API), `domain/`, `application/`, `ports/`, `adapters/`, `contracts/`, `tests/`.

Cross-module imports go through another module's `index.ts` only — enforced by `npm run test:architecture`. Domain code stays framework-free — also enforced.

Empty at WP-000. First module lands in WP-020 (Identity Access, Project Context).
