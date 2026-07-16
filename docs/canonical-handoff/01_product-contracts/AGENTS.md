# AGENTS.md — DPIK TUGAS V1

## Mission

Implement TUGAS V1 as DPIK's accountability and submission-evidence system.

## Hard gate

Do not implement final schema, APIs or screens until `reviews/turn-2-operational-approval.md` records approval from:

- Project Manager
- QS/Finance
- Administration/Document Control
- Product Owner/Architecture

The five paths must be approved:

1. Happy Path
2. Internal Revision
3. Delivery Rejection
4. Expiry/Overdue
5. Claim Gap

## Behavioural doctrine

1. Model behaviour through guarded transitions.
2. Persist current state as the projection of accepted transitions.
3. Keep aggregate transitions local.
4. Use a named Process Manager for mandatory cross-aggregate sequencing.
5. Retry technical failures; model business rejection explicitly.
6. Preserve all historical revisions and attempts.
7. A screen may expose a transition but may never invent one.
8. No direct client mutation of protected state.
9. Check identity, scope, permission, relationship, guard and version on every command.
10. Keep professional judgment human-authorised.

## Brownfield rule

Preserve useful, battle-tested modules unless evidence shows they obstruct the target architecture.

Before editing:

```text
list files
→ read governing docs
→ map imports and runtime wiring
→ classify active/legacy/duplicate/dead
→ record what can remain
→ modify mechanically
```

Do not rewrite from scratch.

## Production blockers to remove

- typed-email identity
- broad anonymous Supabase policies
- UI-only authorization
- direct status edits
- conflicting state vocabularies
- overwritten revisions or attempts
- manually toggled claim readiness

## Architecture

```text
domain
→ application
→ ports
→ adapters
→ UI
```

Dependencies point inward.

## Persistence

```text
aggregate tables
+ append-only domain event journal
+ transactional outbox
+ projections
+ optimistic concurrency
```

## Security

- deny by default
- project-scoped RLS
- administration does not imply professional authority
- courier access is one-dispatch capability access
- evidence upload and verification are separate
- claim readiness is derived, then QS-verified
- raw temporary tokens are never stored

## Session trace

Any session changing repository files must leave a validated trace containing:

```text
files inspected
assumptions
changes
tests
failures
remaining risks
gate status
```

## Stop conditions

Stop and report when:

- Turn 2 approval is absent
- authority is unresolved
- a required transition is missing
- schema conflicts with workflow
- RLS cannot prove project isolation
- a screen requires an unapproved state
- migration would destroy history
