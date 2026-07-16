# DPIK TUGAS — Canonical Engineering Directive

Status: Active  
Repository: `DPIK-TUGAS-APP`

## Engineering objective

The repository must make it difficult to bypass authority, overwrite history, confuse delivery with accepted receipt, mark claims ready from incomplete evidence, mutate protected truth from UI code, or produce unreproducible failures.

It must make it easy to locate the owner of a truth, identify the guarded transition, test accepted and rejected behaviour, trace command-to-UI lineage, inspect health and recover technical processing without rewriting business facts.

## Sacred properties

```text
Approved workflow contracts
Professional separation of duties
Project isolation
Immutable attempt and revision history
Exact configuration-version binding
Atomic command commit
Idempotent external effects
Human-verifiable receipt and QS decisions
Operator-visible health
Deterministic test and mismatch evidence
```

## Behavioural model

```text
Command + Actor + Current Facts + Governing Policy
→ Guarded Decision
→ Accepted Domain Event or Typed Rejection
→ Event Evolution
→ Atomic Persistence
→ Asynchronous Reactions
→ Projection
→ Permission-shaped UI
```

## Architecture

```text
Adapters → Application → Domain
Application → Ports
Adapters → Ports
Domain → Domain only
```

TUGAS is a modular monolith. Boundaries are enforced as if extraction were possible, but services are not split without operational evidence.

## Security

Authorization is the conjunction of authenticated identity, active organisation membership, active project membership, permission, record relationship, professional authority and separation of duty. RLS is deny-by-default. UI visibility is never security authority.

## Persistence

A successful command atomically persists:

```text
aggregate snapshot
+ Domain Events
+ outbox records
+ command receipt
```

Use optimistic concurrency and stable idempotency keys.

## Declarative boundary

Declare finite inspectable facts: permissions, role bundles, evidence criteria, Claim Requirement templates, escalation thresholds, notification routes and view registries. Keep aggregate and professional judgment in typed code.

## Verification

Every test protects a named contract, invariant, boundary, failure mode or user outcome.

## Diagnostics

Failures are traced through Input → Validation → Authorization → Domain Decision → Event → Evolution → Persistence → Outbox → Process → Projection → UI. Report the first material causal divergence. Analysis never performs business repair.
