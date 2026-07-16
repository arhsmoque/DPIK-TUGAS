# 11 — Implementation Sequence

## Phase 0 — Gate and discovery

Deliver:

```text
repository map
legacy route map
schema/RLS inventory
auth inventory
risk register
Turn 2 approval status
```

## Phase 1 — Security containment

1. Replace typed-email identity.
2. Remove broad anonymous mutation.
3. Establish organisation and project membership.
4. Create permissions and role bundles.
5. Add deny-by-default RLS.
6. Add authorization decision service.
7. Prove negative access tests.

Exit:

```text
anonymous denied
cross-project access denied
system administration separated from professional authority
```

## Phase 2 — Domain and event infrastructure

1. Shared IDs, command envelope and errors.
2. Optimistic concurrency.
3. Domain event journal.
4. Transactional outbox.
5. Process record and scheduler seam.
6. Audit correlation.

Exit:

```text
aggregate + event + outbox commit atomically
duplicate commands are idempotent
stale versions are rejected
```

## Phase 3 — Work Thread

Implement creation, assignment, acknowledgement, progress, blockers, due commitments, overdue and outcome acceptance.

## Phase 4 — Deliverable review

Implement revisions, review, revision request, resubmission, approval, rejection and separation of duties.

## Phase 5 — Submission Register

Implement exact manifest, cover-letter reference, acknowledgement requirement, dispatch approval and supersession.

## Phase 6 — Dispatch and temporary access

Implement custody transitions, failure, replacement, one-dispatch token, expiry and revocation.

## Phase 7 — Receipt Evidence

Implement upload, verification, rejection, replacement evidence and replacement Dispatch decisions.

## Phase 8 — Claim readiness

Implement requirements, qualification, gap reasons, derived readiness, QS verification, waiver and invalidation.

## Phase 9 — Read models and UI

Build projections before final screens:

```text
My Attention
My Work
Review Queue
Submission Register
Receipt Verification
Claim Readiness
Management Attention
```

Then build screens using approved commands only.

## Phase 10 — Management, admin and operations

Implement management decisions, configuration versioning, security events, health, outbox controls, projection rebuild, maintenance and audit export.

## Phase 11 — Legacy migration and retirement

Migrate usable records, preserve source trace, freeze legacy mutation, compare old/new and retire only after validation.

## Phase 12 — Pilot commissioning

Run:

```text
security test
five-path workflow test
restart recovery test
projection rebuild test
temporary access test
two real submission/claim cycles
operator drill
backup restoration test
```
