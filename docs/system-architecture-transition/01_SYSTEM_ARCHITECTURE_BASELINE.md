# Turn 1 — System Architecture Baseline

Status: `BASELINE ESTABLISHED`

## Objective

Prevent three failures before implementation:

```text
re-deciding settled architecture
implementing provisional transitions as final
allowing code structure to become accidental system design
```

## Authority hierarchy

```text
1. Operationally approved transition matrices and five-path proof
2. Product Contract and Canonical Workflow
3. System Architecture and Transition Pack
4. Canonical Engineering Directive
5. Module manifests and public contracts
6. Executable acceptance, architecture and security tests
7. Implementation
8. Legacy repository evidence
```

A lower authority may refine implementation detail. It may not alter the meaning of a higher authority.

## Canonical purpose

> TUGAS ensures every material work obligation has an accountable owner, due date, current condition, supporting evidence, review outcome and visible history, regardless of whether it originated from a meeting, email or WhatsApp.

## Canonical business chain

```text
Project
→ Work Thread
→ Deliverable
→ Submission
→ Dispatch Attempt
→ Receipt Evidence Attempt
→ Claim Requirement
→ Claim Package
```

## Independent truths

```text
Document truth
Custody truth
Receipt-evidence truth
Claim-readiness truth
```

A valid combined condition can be:

```text
Deliverable Revision: Approved
Submission: Prepared and approved for dispatch
Dispatch Attempt: Delivered
Receipt Evidence Attempt: Rejected
Claim Requirement: Unsatisfied
```

No single `complete`, `verified` or `claim_ready` flag may collapse these truths.

## Settled architecture

```text
module-first modular monolith
domain-driven bounded modules
hexagonal dependency direction
one canonical PostgreSQL/Supabase data platform
current-state aggregate tables
append-only Domain Event journal
transactional outbox
optimistic concurrency
permission-shaped projections
named Formal Submission Process Manager
safe operator recovery
```

Dependency direction:

```text
Adapters → Application → Domain
Application → Ports
Adapters → Ports
Domain → Domain only
```

## Settled invariants

1. UI does not mutate protected business tables directly.
2. Every business truth and table has one owner.
3. Mandatory cross-aggregate progression uses commands, events and a Process Manager.
4. Business rejection is not technical retry.
5. Replacement work creates new Revision, Attempt or configuration-version identity.
6. Project isolation and separation of duty are explicit.
7. Professional approval remains human-authorized.
8. Projections expose freshness and remain derived.
9. Database edits are not ordinary recovery.
10. Microservices, Temporal runtime and generic workflow/rules engines remain deferred.

## Baseline gaps assigned to later turns

```text
Turn 2:
actors, external systems and trust boundaries

Turn 3:
runtime, deployment, secrets and environments

Turn 4:
module/data ownership, transactions and events

Turn 5:
local aggregate transition matrices

Turn 6:
Process Manager, timers, retry and failure propagation

Turn 7:
five-path proof and final approval
```
