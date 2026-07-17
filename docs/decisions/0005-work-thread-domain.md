# 0005 — Work Thread domain (WP-100)

Status: Accepted for controlled non-production implementation  
Date: 2026-07-17

## Decision

The Work Thread aggregate is event-sourced through pure `decide` and `evolve` functions. WP-100
implements only the three reference-slice transitions authorized by the work-package sequence:

```text
WT-01 CreateWorkThread       nonexistent → WorkThreadCreated → Unassigned
WT-02 AssignWork             Unassigned → WorkAssigned → AwaitingAcknowledgement
WT-03 AcknowledgeAssignment  AwaitingAcknowledgement → AssignmentAcknowledged → Assigned
```

Commands are domain values rather than generic status mutations. Rejected decisions return stable,
typed failures and no accepted events. Evolution also returns a typed failure for an impossible
history instead of throwing or silently manufacturing state.

The first assignment records its assignee, delegator, reason, timestamp, due commitment, and
sequence. Acknowledgement is accepted only from that current assignee and cannot predate assignment.
Candidate permission and Project eligibility remain application-layer checks for WP-110; the pure
aggregate does not import Identity Access or Project Context.

## Legacy disposition

The legacy `src/core/task.js` was inspected. Its `todo → doing → done → todo` status cycle, typed-email
identity, random task code, and unilateral assignment are incompatible with the canonical guarded
transition model and are not salvaged into the aggregate. Its deterministic My Work bucketing,
filtering, and search behavior may be adapted later into WP-120 projections after the canonical
event model exists.

## Consequence

WP-110 can wrap these decisions with command envelopes, actor-context authorization, optimistic
concurrency, idempotency, event envelopes, atomic persistence, and outbox commit without moving
domain rules into adapters.

