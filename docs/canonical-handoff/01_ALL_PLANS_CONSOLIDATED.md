# All TUGAS Plans Consolidated

Status: `DESIGN_PROOF_COMPLETE — IMPLEMENTATION TURN 1 COMPLETE`  
Contract posture: `1.0.0-rc1`  
Pilot and production: `BLOCKED`

This document provides one continuous view of the plans produced from the original TUGAS product definition through the first turn of the builder implementation programme.

# 1. Product purpose

TUGAS is DPIK's accountability and submission-evidence platform.

It must make the following chain explicit and auditable:

```text
Project
→ Work Thread
→ Deliverable Revision
→ Submission
→ Dispatch Attempt
→ Receipt Evidence Attempt
→ Claim Requirement
→ Claim Package
```

TUGAS owns:

```text
responsibility and due commitments
structured work progression
immutable Deliverable Revisions
technical review decisions
formal Submission manifests
physical custody attempts
receipt-evidence attempts and professional decisions
Claim Requirement qualification and readiness
management attention
business audit history
```

TUGAS does not replace:

```text
Gmail, Outlook or WhatsApp
Word, Excel or CAD
Drive or SharePoint
Primavera or Microsoft Project
courier routing or fleet management
accounting or Claim valuation
professional engineering or QS judgment
```

# 2. Independent truths

The design deliberately keeps these truths separate:

```text
Work responsibility
Document approval
Formal package identity
Physical custody
Receipt-evidence sufficiency
Claim readiness
QS professional verification
```

Therefore:

```text
Deliverable Approved
≠ Submission Prepared

Package Delivered
≠ Receipt Evidence Verified

Receipt Evidence Verified
≠ Claim Package ReadyForQSReview

ReadyForQSReview
≠ QSVerified
```

# 3. Product-contract programme

The Product Contract bundle defines:

- the V1 mission and exclusions;
- the canonical workflow;
- roles and layered authorization;
- information architecture;
- Work Thread and review surfaces;
- Submission, delivery, evidence and Claim surfaces;
- management, administration and operations;
- database and RLS direction;
- repository module map;
- implementation sequence;
- V1 acceptance scenarios;
- deferred V2 capabilities.

The product-level hard gate is:

```text
No approved transition contract
→ no production workflow authority.
```

# 4. Engineering-standard programme

The engineering bundle defines how the repository must be built:

```text
domain-driven modular monolith
hexagonal module boundaries
strict TypeScript
pure domain decide/evolve functions
typed command and event envelopes
runtime boundary validation
transactional outbox
Process Manager orchestration
permission-shaped projections
correlated observability
risk-shaped testing
first-divergence mismatch analysis
safe operator recovery
```

Central dependency direction:

```text
Adapters → Application → Domain
Application → Ports
Adapters → Ports
Domain → Domain only
```

Central persistence rule:

```text
successful command
→ aggregate snapshot
+ Domain Events
+ outbox records
+ command receipt
committed atomically
```

# 5. System Architecture Turn 1 — Baseline

Turn 1 separated settled decisions from provisional authority and recorded transition gaps.

The governing rule became:

```text
Transitions are the behavioural source of truth.
Current state is the persisted projection of accepted transitions.
```

The architecture was fixed as a modular monolith rather than premature microservices.

# 6. System Architecture Turn 2 — Context and trust

Turn 2 established actors, systems of record and trust zones.

Authorization is the conjunction of:

```text
authenticated identity
active organisation membership
active Project membership
candidate permission
record relationship
professional authority
separation of duty
aggregate guard
expected version
```

Administration does not imply technical-review, receipt-verification or QS authority.

Temporary external delivery access is:

```text
one Dispatch Attempt
one limited action set
one expiry
revocable
no Project browsing
no Claim data
no professional decisions
```

# 7. System Architecture Turn 3 — Runtime and deployment

The system remains one codebase and coordinated release, deployed through three runtime adapters:

```text
tugas-internal
→ internal SPA, authenticated commands and queries

tugas-delivery
→ one-Dispatch capability surface and proof upload

tugas-jobs
→ outbox, Process Manager, timers, projections and recovery
```

First-release platform direction:

```text
Cloudflare Workers + Static Assets
Supabase Auth
PostgreSQL / Supabase
Supabase object storage
database-backed outbox and Process Manager
Cloudflare Cron as scheduler wake-up
```

Queues, Workflows and Temporal remain deferred behind ports.

# 8. System Architecture Turn 4 — Modules and data

Canonical modules:

```text
Identity Access
Project Context
Work Thread
Deliverable
Submission
Dispatch
Receipt Evidence
Claim
Configuration
Formal Submission Process
Attention Projections
Mismatch Analyzer
```

Default transaction rule:

```text
one command
→ one aggregate
→ one atomic aggregate transaction
```

A module may reference another module's accepted fact. It may not derive, mutate or silently reinterpret the other module's state.

Cross-module qualification uses an Authoritative Fact Reference to an accepted event.

Database schema direction:

```text
tugas
→ private business tables and Domain Events

tugas_ops
→ commands, outbox, process, timers and health

tugas_read
→ projections and checkpoints

api
→ user-facing security-invoker reads

internal_api
→ backend-only commit and operational functions
```

# 9. System Architecture Turn 5 — Local transitions

Eight local transition models were completed.

## Work Thread

```text
Unassigned
→ AwaitingAcknowledgement
→ Assigned
→ InProgress
→ AwaitingAcceptance
→ Closed
```

`Blocked` and `Overdue` are orthogonal conditions, not lifecycle states.

## Deliverable

```text
Draft
→ InReview
→ RevisionRequired
→ Draft with new Revision
→ InReview
→ Approved
```

Every review and decision targets one exact immutable Revision. `Resubmitted` is an action, not a durable state.

## Submission

```text
Draft
→ Prepared
→ ReadyForDispatch
```

Cancelled and Superseded are terminal alternatives. Custody, evidence and Claim conditions are not Submission states.

## Dispatch Attempt

```text
Prepared
→ Assigned
→ InTransit
→ Delivered
```

Failed and Cancelled are terminal. One Attempt equals one custody journey. Replacement creates a new Attempt.

## Delivery Access

```text
Active
→ Completed | Expired | Revoked
```

Rotation invalidates the prior token generation without creating internal membership.

## Receipt Evidence Attempt

```text
Collecting
→ PendingVerification
→ Verified
```

Rejected and Withdrawn are terminal alternatives. Verified evidence may later become Invalidated without deleting the earlier decision.

## Claim Package

Lifecycle and readiness are separate axes.

```text
Lifecycle:
Open → Submitted → Closed
Open → Cancelled

Readiness:
EvidenceIncomplete
↔ ReadyForQSReview
→ QSVerified
```

A qualifying fact may later make readiness Invalidated.

## Configuration Profile

```text
Draft
→ Validated
→ Approved
→ Active
→ Superseded
→ Retired
```

Activating a new version atomically supersedes the prior active version.

# 10. System Architecture Turn 6 — Process Manager

The named coordinator is:

```text
FormalSubmissionFulfilmentProcess
```

It starts on:

```text
SubmissionApprovedForDispatch
```

It completes successfully on:

```text
ClaimPackageReadyForQSReview
```

It may automatically issue only deterministic commands such as:

```text
CreateReceiptEvidenceAttempt
EvaluateClaimRequirement
RecalculateClaimReadiness
InvalidateClaimEvidence
```

It may not automatically create or assign a Dispatch, select a correction, create replacement attempts, verify evidence, approve a waiver or perform QS verification.

Technical failure and business correction are separate:

```text
technical failure
→ retry the same identity and intent

business rejection
→ wait for an authorized explicit correction
```

# 11. System Architecture Turn 7 — Five-path design proof

## Happy Path

```text
accountable work
→ exact approved Revision
→ formal Submission
→ delivered Dispatch
→ verified Receipt Evidence
→ satisfied Claim Requirements
→ ReadyForQSReview
```

## Internal Revision

```text
R1 requires revision
→ preserve R1
→ create R2
→ approve R2
→ manifest references R2 only
```

## Delivery Rejection / Re-dispatch

```text
D1 Delivered
→ E1 Rejected
→ authorized re-dispatch choice
→ new D2 and E2
→ E2 Verified
→ Claim ready
```

D1 and E1 remain historical.

## Expiry / Overdue

```text
Work Thread InProgress
→ WorkBecameOverdue
→ lifecycle remains InProgress

Delivery Access Expired
→ Dispatch remains Assigned
→ new access may be issued
```

## Claim Gap

```text
mandatory receipt proof missing or rejected
→ ClaimRequirementGapRecorded
→ EvidenceIncomplete
→ named owner and next action
→ corrected verified evidence
→ ReadyForQSReview
```

Design proof is complete. Runtime execution proof is pending.

# 12. Builder Implementation Programme

The implementation programme is eight turns:

```text
Turn 1 — repository convergence and execution charter
Turn 2 — foundation, Identity Access, Project Context and security
Turn 3 — Work Thread reference vertical slice
Turn 4 — Deliverable Revision, review and Submission
Turn 5 — Dispatch, Delivery Access and external delivery
Turn 6 — Receipt Evidence, Claim Requirements and professional decisions
Turn 7 — Process Manager, projections, jobs and operator controls
Turn 8 — five-path execution, migration rehearsal and pilot evidence
```

Turn 1 is complete.

The first executable slice is fixed as:

```text
Authenticate
→ resolve current Project membership
→ CreateWorkThread
→ AssignWork
→ AcknowledgeAssignment
→ query My Work
```

The builder must prove this vertical slice before broadening.

# 13. Current authorization

```text
A0 Documentation and scaffolding: authorized
A1 Reference slice: authorized
A2 Full bounded non-production implementation: conditional
A3 Pilot: blocked
A4 Production: blocked
```

Unapproved configuration uses explicit markers:

```text
proposed_default
not_production_approved
```

# 14. Pending operational decisions

```text
Work outcome acceptor
Reviewer appointment and competency
PM technical approval rule
Submission dispatch approver
Receipt Evidence verifier
Uploader/verifier separation exceptions
Claim waiver authority
QS/Finance role separation
Timer values and business calendar
Client-specific receipt criteria
Retention periods
Pilot Project
Production cutover approval
```

# 15. Immediate next action

```text
1. Merge the comprehensive planning/handoff PR.
2. Cut the repository-foundation branch from updated main.
3. Begin WP-000 only.
4. Do not start business screens before architecture, security and toolchain gates pass.
5. Run DPIK operational review in parallel using the final approval records.
```
