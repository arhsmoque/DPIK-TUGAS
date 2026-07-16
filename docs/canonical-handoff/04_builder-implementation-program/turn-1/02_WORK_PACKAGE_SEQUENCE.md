# Builder Work-Package Sequence

## WP-000 — Repository baseline

Deliver:

```text
root AGENTS.md
locked toolchain
strict TypeScript configuration
workspace layout
format/lint/typecheck/test commands
architecture-test harness
session trace template
decision and evidence directories
```

Exit:

```text
fresh clone installs
typecheck passes
architecture gate passes
no production secrets required
```

## WP-010 — Foundation contracts

Deliver branded identifiers, Result and typed failure, Command and Domain Event envelopes, ClockPort, IdPort, correlation/causation and canonical payload hashing.

## WP-020 — Identity and Project context

Deliver Supabase identity adapter, organisation/Project memberships, role-bundle candidate permissions, actor-context resolver and negative-access fixtures.

## WP-100 — Work Thread domain

Deliver `CreateWorkThread`, `AssignWork`, `AcknowledgeAssignment`, pure decide/evolve, state/failure unions and unit/property tests.

## WP-110 — Work Thread application and persistence

Deliver authority proofs, command-store port, atomic commit adapter, idempotency, optimistic concurrency, Domain Event and outbox commit.

## WP-120 — My Work projection and internal UI

Deliver projection reducer, checkpoint/freshness, permission-shaped query and minimal internal browser surface.

## WP-130 — Reference-slice qualification

Prove happy path, wrong actor, cross-Project denial, stale version, duplicate command, lost-response recovery, RLS negative matrix, browser smoke and diagnostic lineage.

Only after WP-130 passes may the builder proceed to Deliverable and Submission.
