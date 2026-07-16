# Turn 4 — Module, Data and Event Architecture

Status: `MODULE AND DATA ARCHITECTURE ESTABLISHED`

## Ownership rule

```text
A module may reference another module's accepted fact.
It may not derive, mutate or silently reinterpret the other module's state.
```

## Canonical modules and aggregates

| Module | Aggregate/process |
|---|---|
| Project Context | Project |
| Work Thread | WorkThread |
| Deliverable | Deliverable and immutable Revisions |
| Submission | Submission and manifest snapshot |
| Dispatch | DispatchAttempt and DeliveryAccess |
| Receipt Evidence | ReceiptEvidenceAttempt |
| Claim | ClaimPackage and requirements |
| Configuration | ConfigurationProfile and versions |
| Formal Submission Process | orchestration state only |
| Attention Projections | derived read models |
| Mismatch Analyzer | diagnostic analysis |

## One-command rule

```text
one command
→ one aggregate
→ one atomic transaction
```

No first-release multi-aggregate transaction exception is approved.

Cross-aggregate progression uses:

```text
source aggregate commit
→ published event/outbox
→ Process Manager
→ target command
```

## Database schemas

```text
auth
→ Supabase authentication

storage
→ object metadata

tugas
→ private business tables and Domain Event journal

tugas_ops
→ command receipts, outbox, process state, timers and health

tugas_read
→ private projections and checkpoints

api
→ user-facing security-invoker read contracts

internal_api
→ backend-only commit, lease and operational functions
```

Project-scoped roots and projections carry both `organisation_id` and `project_id` for RLS, composite referential integrity, diagnostics and index locality.

No global status enum is shared across modules.

## Transaction contract

Application:

```text
load aggregate
→ authorize
→ pure domain decision
→ prepare events
```

Database commit function:

```text
check expected version
write snapshot and owned history
append Domain Events
append outbox
insert command receipt
enforce idempotency
commit all or none
```

Default concurrency posture:

```text
READ COMMITTED
+ aggregate version
+ uniqueness constraints
+ short transaction
```

Idempotency:

```text
same key + same payload hash
→ prior receipt

same key + different payload hash
→ idempotency_conflict
```

## Authoritative Fact Reference

Cross-module consumers store:

```text
source module
source aggregate and version
source event ID/type
subject identity
occurred time
semantic fingerprint
published contract/version
```

Examples:

```text
Submission references DeliverableApproved for exact Revision R2.
Claim references ReceiptEvidenceVerified for exact Attempt E2.
Replacement Dispatch references DeliveryFailed for Attempt D1.
```

A foreign key proves existence only; it does not prove approval, verification or qualification.

## Referential integrity

```text
composite organisation/Project references where practical
ON DELETE RESTRICT for historical and cross-aggregate records
no hard deletion of canonical business history
no cascade deletion of Revisions, manifests, Attempts or decisions
explicit indexes for referencing columns
```

## Events

```text
Domain Event
→ accepted business fact

Published Integration Event
→ versioned cross-module contract

Technical Telemetry Event
→ execution observation
```

Examples:

```text
ReceiptEvidenceVerified
receipt-evidence.verified.v1
outbox.delivery.completed
```

The Domain Event journal is append-only. Publication mapping occurs before commit so required outbox messages are durable with the source event.

No universal total order is assumed. Local aggregate order uses `aggregate_version`; cross-aggregate causation uses correlation, causation, event and process IDs.

## Projections

```text
My Attention
My Work
Review Queue
Submission Register
Receipt Verification Queue
Claim Readiness
Management Attention
```

Every projection exposes version, checkpoint, last applied time and freshness condition. Projections may explain action; they may not authorize or execute business transitions.

## Configuration meaning

Business records bind exact immutable configuration versions. Historical records never silently use the current active policy. Rebase is an explicit authorized command.
