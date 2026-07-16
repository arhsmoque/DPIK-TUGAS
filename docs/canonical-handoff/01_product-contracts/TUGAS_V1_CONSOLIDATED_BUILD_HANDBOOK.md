# TUGAS V1 Consolidated Build Handbook

---

<!-- SOURCE: README.md -->

# TUGAS V1 CLI-Agent Build Bundle

**Product:** DPIK TUGAS  
**V1:** Accountability, internal review, formal submission, receipt-evidence and claim-readiness  
**Stack direction:** React + Vite + Supabase + Cloudflare modular monolith  
**Gate:** Implementation remains blocked until Turn 2 operational approval

## Canonical chain

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

## Start

1. Read `AGENTS.md`.
2. Read `00_V1_BUILD_DIRECTIVE.md`.
3. Check `reviews/turn-2-operational-approval.md`.
4. Follow `11_IMPLEMENTATION_SEQUENCE.md`.
5. Prove the five paths in `12_V1_ACCEPTANCE_SCENARIOS.md`.

> Build a focused DPIK accountability and submission-evidence system today, using an Engineering WorkOps architecture that can expand tomorrow without forcing tomorrow's platform complexity into today's V1.

---

<!-- SOURCE: 00_V1_BUILD_DIRECTIVE.md -->

# 00 — TUGAS V1 Build Directive

## Mission

Transform the current TUGAS repository into a secure, auditable modular monolith that makes accountable work traceable from obligation through technical review, formal submission, physical delivery, verified acknowledgement and claim-ready closure.

## Product position

TUGAS is DPIK's accountability, review and submission-evidence layer.

It is not:

- a Gmail, Outlook or WhatsApp replacement
- a document authoring or full document-management system
- Primavera or Microsoft Project
- an accounting or claim-valuation engine
- a courier-routing platform
- a generic workflow builder
- a commercial SaaS platform in V1

## Repository strategy

Retain React, Vite, Supabase and Cloudflare unless a proven blocker requires replacement.

Use a brownfield migration:

```text
discover
→ classify
→ secure
→ isolate
→ migrate
→ prove
→ retire legacy
```

## Mandatory V1 capabilities

1. Real authenticated users.
2. Organisation and project memberships.
3. Explicit permissions and role bundles.
4. Work Threads with owners, due commitments, progress and blockers.
5. Deliverable revisions and controlled internal review.
6. Submission Register with exact manifest snapshots.
7. Dispatch Attempts with custody history.
8. One-dispatch temporary external access.
9. Receipt Evidence Attempts with human verification.
10. Claim Requirements and derived readiness.
11. QS verification.
12. Management Attention.
13. Append-only business events.
14. Transactional outbox and projections.
15. Health, recovery and audit controls.

## Mutation contract

Every command contains:

```text
command_id
command_type
actor_id
organisation_id
project_id
aggregate_id
expected_version
idempotency_key
issued_at
payload
```

Execution:

```text
authenticate
→ resolve membership
→ check permission
→ check relationship
→ check separation of duty
→ load aggregate
→ check version
→ evaluate guard
→ mutate
→ append event
→ write outbox
→ commit
→ return authorised projection
```

## Required proofs

The release candidate must produce:

```text
RLS isolation report
authorization test report
five-path workflow report
idempotency report
projection consistency report
temporary-access security report
migration report
pilot readiness report
rollback plan
```

## Completion gate

V1 is not complete until:

- all mandatory scenarios pass
- cross-project access is denied
- typed-email and anonymous mutation paths are removed
- revisions and attempts remain historical
- delivery does not imply verification
- verification does not imply QS verification
- management sees explicit consequence and ownership
- two real pilot cycles complete successfully

---

<!-- SOURCE: 01_PRODUCT_CONTRACT.md -->

# 01 — TUGAS V1 Product Contract

## Purpose

TUGAS prevents material work obligations from disappearing between meetings, email, WhatsApp, staff memory, project folders, technical authoring tools, physical delivery and claim preparation.

## Operating promise

For every material matter, an authorised user can determine:

```text
what is required
who owns it
who is doing it
its current condition
what blocks it
what was reviewed
what was submitted
who had custody
what proves receipt
whether the proof is accepted
whether the claim requirement is satisfied
what happens next
```

## Canonical lifecycle

```text
Instruction or obligation
→ Work Thread
→ assignment and execution
→ Deliverable
→ internal review
→ formal Submission
→ Dispatch Attempt
→ Receipt Evidence Attempt
→ Claim Requirement
→ Claim Package
→ accountable closure
```

## Closure definitions

### Work

```text
outcome completed
+ accountable authority accepts it
```

### Deliverable

```text
exact revision reviewed
+ corrections resolved
+ authorised reviewer approves
```

### Formal Submission

```text
approved revision
+ manifest
+ dispatch
+ delivery
+ verified acknowledgement
```

### Claim obligation

```text
approved Deliverable
+ formal Submission
+ verified evidence
+ all mandatory requirements satisfied
+ QS verification
```

## System boundary

| System | Owns |
|---|---|
| Gmail/Outlook/WhatsApp | Communication |
| Drive/SharePoint | Authoritative documents |
| Word/Excel/CAD | Authoring |
| TUGAS | Accountability, progression, review, evidence and readiness |

## Pilot success

- every material Deliverable has a named owner
- every Submission has an exact revision manifest
- every physical delivery has a custodian and attempt history
- receipt proof is found in under 30 seconds
- QS identifies gaps without messaging engineers
- delivered-but-unverified remains visibly blocked
- rejected proof creates a correction path
- management sees claims at risk from one surface
- temporary actors cannot read unrelated records
- workflow survives restart

---

<!-- SOURCE: 02_CANONICAL_WORKFLOW.md -->

# 02 — Canonical Workflow and Turn 2 Gate

## Status

**DRAFT — OPERATIONAL APPROVAL REQUIRED**

This becomes the behavioural source of truth only after approval by PM, QS/Finance, Administration/Document Control and Product Owner/Architecture.

## Rule

> Model behaviour through guarded transitions. Persist state as the result of accepted transitions.

## Canonical story

```text
Obligation identified
→ Work Thread created
→ assigned
→ acknowledged
→ work started
→ progress or blocker recorded
→ Deliverable Revision prepared
→ submitted for review
→ approved or revision requested
→ revised and resubmitted
→ approved revision enters Submission manifest
→ Submission approved for dispatch
→ Dispatch assigned
→ package collected
→ delivered or failed
→ Receipt Evidence uploaded
→ verified or rejected
→ Claim Requirement satisfied or blocked
→ Claim Package Ready for QS Review
→ QS verifies
```

## Aggregate ownership

| Aggregate | Owns |
|---|---|
| Work Thread | responsibility, execution, due commitment, blockers, accepted closure |
| Deliverable | revisions and internal review |
| Submission | exact issue manifest and acknowledgement requirement |
| Dispatch Attempt | one custody journey |
| Receipt Evidence Attempt | one proof package and decision |
| Claim Package | requirements and readiness |
| Temporary Delivery Access | one-dispatch capability |

## Five mandatory paths

### Happy Path

```text
WorkThreadCreated
→ WorkAssigned
→ AssignmentAcknowledged
→ WorkStarted
→ DeliverableRevisionPrepared
→ DeliverableSubmittedForReview
→ DeliverableApproved
→ SubmissionPrepared
→ SubmissionApprovedForDispatch
→ DispatchAssigned
→ PackageCollected
→ PackageDelivered
→ ReceiptEvidenceUploaded
→ ReceiptEvidenceVerified
→ ClaimRequirementSatisfied
→ ClaimPackageReadyForQSReview
→ ClaimPackageQSVerified
```

### Internal Revision

```text
DeliverableRevisionPrepared
→ DeliverableSubmittedForReview
→ DeliverableRevisionRequested
→ DeliverableResubmitted
→ DeliverableApproved
```

### Delivery Rejection

```text
DispatchAssigned
→ PackageCollected
→ PackageDelivered
→ ReceiptEvidenceUploaded
→ ReceiptEvidenceRejected
→ UploadReplacementReceiptEvidence
   or CreateReplacementDispatchAttempt
```

### Expiry/Overdue

```text
WorkAssigned
→ AssignmentAcknowledged
→ WorkStarted
→ DueTimeElapsed
→ WorkBecameOverdue
→ WorkEscalationRaised
```

### Claim Gap

```text
DeliverableApproved
→ SubmissionRegistered
→ PackageDelivered
→ ReceiptVerificationOutstanding
→ ClaimRequirementGapRecorded
→ ClaimPackageBlocked
```

## Process Manager

Canonical name:

```text
FormalSubmissionFulfilmentProcess
```

It coordinates mandatory cross-aggregate progression but does not own aggregate truth or replace human judgment.

## Failure taxonomy

Technical retry:

```text
provider timeout
network failure
storage interruption
notification failure
transient database failure
```

Business correction:

```text
revision requested
wrong revision
missing stamp
evidence rejected
recipient refusal
manifest incomplete
access expired
```

## Exit gate

No implementation until:

1. all local matrices are reviewed
2. the five paths are rehearsed with real examples
3. evidence requirements are confirmed
4. authority boundaries are confirmed
5. timers and escalation thresholds are confirmed
6. approval is recorded in `reviews/turn-2-operational-approval.md`

> No transition contract, no architecture. No approved five-path proof, no screens.

---

<!-- SOURCE: 03_DOMAIN_AND_STATE_MODEL.md -->

# 03 — Domain and State Model

## Domain map

```text
Organisation
└── Project
    ├── Work Thread
    │   └── Deliverable
    │       └── Deliverable Revision
    ├── Submission
    ├── Dispatch Attempt
    ├── Receipt Evidence Attempt
    ├── Claim Package
    │   └── Claim Requirement
    └── Temporary Delivery Access
```

## State doctrine

Current state is a projection of accepted transitions.

Keep orthogonal truths separate:

```text
Work = Blocked; overdue = true
Dispatch = Delivered; Evidence = Rejected
Deliverable = Approved; Claim Requirement = Unsatisfied
```

## Aggregate states

### Work Thread

```text
Unassigned
AwaitingAcknowledgement
Assigned
InProgress
Blocked
AwaitingAcceptance
Closed
Cancelled
```

### Deliverable

```text
Draft
InReview
RevisionRequired
Resubmitted
Approved
Rejected
Withdrawn
```

### Submission

```text
Draft
Prepared
ReadyForDispatch
InDelivery
ReceiptPending
Acknowledged
ClaimLinked
Cancelled
Superseded
```

### Dispatch Attempt

```text
Prepared
Assigned
InTransit
Delivered
Failed
Cancelled
```

### Receipt Evidence Attempt

```text
PendingVerification
Verified
Rejected
Withdrawn
```

### Claim Package

```text
EvidenceIncomplete
ReadyForQSReview
QSVerified
Submitted
Closed
```

Requirement states:

```text
Unsatisfied
Satisfied
Waived
Invalidated
```

### Temporary Delivery Access

```text
Active
Completed
Expired
Revoked
```

## Core invariants

- every review targets an exact revision
- every approval identifies an exact revision
- new revisions never overwrite old revisions
- replacement dispatches create new attempts
- replacement proof creates new attempts
- delivered never moves backward
- rejected evidence never satisfies a Claim Requirement
- readiness is derived from mandatory requirements
- QS verification remains human
- raw temporary token is not stored

## Persistence

```text
current aggregate tables
+ append-only domain_events
+ outbox_messages
+ projection tables
+ optimistic concurrency
```

Every aggregate has integer `version`. Every mutation checks `expected_version`.

---

<!-- SOURCE: 04_ROLE_AND_AUTHORIZATION_MATRIX.md -->

# 04 — Roles and Authorization Matrix

## Authorization formula

```text
Identity
∩ active organisation membership
∩ active project membership
∩ explicit permission
∩ record relationship
∩ professional authority
∩ separation-of-duty rule
∩ transition guard
∩ expected version
= accepted command
```

## Role bundles

| Role | Main authority |
|---|---|
| Organisation Director | Management attention and exceptional decision |
| Project Manager | Work assignment and accountability |
| Technical Assignee | Progress, blockers and Deliverable preparation |
| Technical Reviewer | Review, revision request, approval or rejection |
| Document Controller | Submission preparation and dispatch coordination |
| Dispatch Coordinator | Dispatch and temporary access |
| QS Verifier | Evidence verification and claim readiness |
| Finance Viewer | Claim visibility |
| System Administrator | Identity, membership and security configuration |
| Audit Viewer | Read-only audit |

## Separation of duties

1. A preparer cannot ordinarily approve when independent review is required.
2. Evidence upload and evidence verification are separate.
3. System administration does not imply professional approval.
4. Courier access is a one-dispatch capability, not membership.
5. Management overrides use explicit named commands and reasons.

## Stable permissions

```text
work.create
work.assign
work.acknowledge
work.update
work.change_due_date
work.accept
work.reopen

deliverable.create
deliverable.submit
deliverable.review
deliverable.approve
deliverable.reject

submission.prepare
submission.approve_dispatch
submission.cancel
submission.supersede

dispatch.create
dispatch.assign
dispatch.report_collection
dispatch.report_delivery
dispatch.report_failure
dispatch.create_replacement

receipt.upload
receipt.verify
receipt.reject

claim.create
claim.configure_requirements
claim.evaluate
claim.verify
claim.waive_requirement
claim.submit

management.read_attention
administration.manage_users
administration.manage_memberships
administration.manage_roles
security.revoke_temporary_access
```

## Rejection behaviour

A rejected command:

- leaves business state unchanged
- emits no accepted event
- returns a stable code
- records audit where required
- avoids exposing hidden record existence

---

<!-- SOURCE: 05_INFORMATION_ARCHITECTURE.md -->

# 05 — Information Architecture

## One internal application

Use one permission-aware application shell.

Separate only the external delivery surface because its trust boundary differs.

## Primary navigation

```text
My Attention
My Work
Projects
Review
Submissions
Claims
Management
Administration
```

Visibility is permission-aware.

## Project workspace

```text
Overview
Work
Deliverables
Submissions
Claims
Activity
Members
```

## Canonical routes

```text
/attention
/work
/projects
/projects/:projectId
/projects/:projectId/work/:workThreadId
/projects/:projectId/deliverables/:deliverableId
/projects/:projectId/submissions/:submissionId
/projects/:projectId/claims/:claimPackageId
/review
/submissions
/dispatches/:dispatchAttemptId
/receipt-verification
/receipt-evidence/:receiptEvidenceAttemptId
/claims
/management/attention
/administration/*
/delivery/access/:opaqueToken
```

## Every operational surface shows

```text
project
record reference
current condition
owner
next action
due or waiting deadline
blocking reason
data freshness
```

## Read models

```text
GetMyAttention
ListMyWork
GetProjectWorkspace
GetWorkThread
GetDeliverableReviewWorkspace
GetReviewQueue
ListSubmissionRegister
GetSubmissionWorkspace
GetDispatchStatus
GetReceiptVerificationQueue
GetClaimReadiness
GetManagementAttention
```

## State language

Never use colour alone.

Good:

```text
Claim Blocked
Verified acknowledgement missing.
Owner: Document Control
Overdue by 2 days.
```

## External delivery projection

Expose only:

```text
destination
recipient contact
package summary
delivery instruction
proof requirement
permitted actions
expiry
```

Exclude project navigation, technical documents, claims and unrelated records.

---

<!-- SOURCE: 06_WORK_AND_REVIEW_SURFACES.md -->

# 06 — Work and Review Surfaces

## Surface set

```text
My Work
Create Work Thread
Work Thread Detail
Create Deliverable
Deliverable Review Workspace
Review Queue
```

## Work Thread detail

Required regions:

```text
record header
expected outcome
source
assignment
due commitments
structured updates
blocker
related Deliverables
outcome acceptance
activity history
```

## Structured updates

Allowed types:

```text
Progress
Blocker
Question
Clarification
Decision
Commitment note
```

Avoid chat-like noise.

## Assignment path

```text
WorkAssigned
→ AssignmentAcknowledged
→ WorkStarted
```

Reassignment preserves previous ownership, reason and time.

## Due commitment

Changing a due date creates a new commitment and preserves:

```text
original due date
new due date
approver
reason
overdue history
```

## Blocker

Required:

```text
blocked outcome
reason
required resolver
effect
needed-by time
```

## Deliverable Revision

Contains:

```text
revision ID
human label
repository reference
prepared by
prepared at
change summary
supersedes revision
fingerprint where practical
```

## Review decision

Contains:

```text
exact revision
reviewer
decision
comments
time
authority snapshot
```

## Revision path

```text
Draft
→ InReview
→ RevisionRequired
→ Resubmitted
→ Approved
```

Earlier revisions and decisions remain immutable.

## Approval meaning

Approval means internal technical acceptance only.

It does not mean:

```text
client submitted
physically delivered
receipt verified
claim ready
```

## Review Queue priority

```text
overdue review
claim-linked review
oldest waiting
submission deadline
```

## Prohibited

- generic "Done" checkbox
- one status dropdown
- approval through chat comment
- revision overwrite
- silent deadline change
- self-approval through admin access

---

<!-- SOURCE: 07_SUBMISSION_DELIVERY_CLAIM_SURFACES.md -->

# 07 — Submission, Delivery and Claim Surfaces

## Four truth bands

Every Submission surface displays:

```text
Document condition
Custody condition
Evidence condition
Claim effect
```

Example:

```text
Document: Receipt pending
Custody: Delivered
Evidence: Rejected
Claim: Blocked
```

## Submission Register entry

Shows:

```text
reference
project
manifest
recipient
latest Dispatch Attempt
latest Evidence Attempt
Claim relationship
blocking reason
owner
next action
```

## Submission manifest

Manifest items bind to exact Deliverable Revision IDs.

Later revisions never replace the manifest automatically.

## Dispatch Attempt

One attempt equals one custody journey.

Required data:

```text
custodian
destination
recipient contact
package summary
assigned time
collected time
delivered or failed time
failure reason
replacement relationship
```

## External delivery

Permitted:

```text
confirm collection
report delivery
report failure
upload proof
```

No project membership or browsing.

## Receipt Evidence

Evidence types:

```text
stamped cover letter
signed acknowledgement
client document-control receipt
official email acknowledgement
courier proof
delivery photograph
recipient confirmation
```

Upload produces `PendingVerification`.

Verifier decides:

```text
VerifyReceiptEvidence
RejectReceiptEvidence
```

## Rejection correction

Evidence-only correction:

```text
UploadReplacementReceiptEvidence
```

Physical correction:

```text
CreateReplacementDispatchAttempt
```

Original attempts remain unchanged.

## Claim Package

Displays each mandatory requirement and qualifying evidence.

Readiness:

```text
all mandatory requirements Satisfied or authorised Waived
→ ReadyForQSReview
```

Human QS then verifies.

## Prohibited

- Delivered equals claim-ready
- courier verifies proof
- rejected proof replaced in place
- failed Dispatch reset
- manifest edited after issue
- claim readiness checkbox
- generic attachment pile

---

<!-- SOURCE: 08_MANAGEMENT_ADMIN_OPERATIONS.md -->

# 08 — Management, Administration and Operations

## Authority boundaries

### Management

Sees material interventions and records explicit decisions.

### Administration

Manages identity, membership, roles and governed configuration.

### Operations

Observes health and performs safe technical recovery.

None may silently rewrite business history.

## Management Attention

Categories:

```text
Claim Blocked
Submission at Risk
Delivery Failure
Proof Outstanding
Evidence Rejected
Material Work Overdue
Critical Blocker
Review Delay
Responsibility Gap
Decision Required
System Degradation
```

Every item shows:

```text
problem
consequence
owner
age
next action
decision authority
evidence
```

## Configuration versioning

Version:

```text
role bundles
evidence profiles
claim templates
escalation policies
temporary-access policy
notification policy
```

Lifecycle:

```text
Draft
Active
Superseded
Disabled
Retired
```

## Operational Control

Observe:

```text
authentication
API
database
storage
outbox worker
process manager
projection worker
timer scheduler
notification worker
temporary-access endpoint
```

Health:

```text
Healthy
Delayed
Degraded
Blocked
Failed
Maintenance
Unknown
```

## Safe recovery

```text
RetryTechnicalOperation
RebuildProjection
ReplayOutboxMessage
Re-evaluateTimer
ResumeWorker
VerifyConsistency
ExportDiagnosticTrace
```

Safe recovery must not approve Deliverables, verify Evidence or force Claim readiness.

## Operator and agent parity

Each recurring control has:

```text
UI control
CLI command
same authorization
same parameters
same result envelope
same audit trail
```

## Audit

Maintain distinguishable:

```text
business audit
security audit
operational audit
```

Correlate through:

```text
command_id
event_id
correlation_id
causation_id
process_id
```

---

<!-- SOURCE: 09_DATABASE_AND_RLS_DIRECTIVE.md -->

# 09 — Database and RLS Directive

## Required tables

```text
organisations
users
organisation_memberships
projects
project_memberships
permissions
role_bundles
role_bundle_permissions
organisation_role_assignments
project_role_assignments

work_threads
work_due_commitments
work_blockers
work_updates

deliverables
deliverable_revisions
review_decisions

submissions
submission_manifest_items

dispatch_attempts
temporary_delivery_access

receipt_evidence_attempts
receipt_evidence_items

claim_packages
claim_requirements

formal_submission_processes
domain_events
outbox_messages

my_attention_projection
my_work_projection
review_queue_projection
submission_register_projection
receipt_verification_projection
claim_readiness_projection
management_attention_projection

security_events
operational_events
configuration_versions
```

## Common columns

Project-scoped tables include:

```text
organisation_id
project_id
created_at
created_by
updated_at
updated_by
version
```

## Protected fields

Client code must not freely write:

```text
organisation_id
project_id
version
approved_revision_id
review_state
submission_state
dispatch_state
verification_state
verified_by
readiness_state
requirement satisfaction
token_hash
domain event actor
domain event time
```

## RLS doctrine

1. Enable RLS on every exposed table.
2. Deny by default.
3. Check active organisation membership.
4. Check active project membership.
5. Check explicit permission.
6. Check record relationship where required.
7. Keep service-role secrets server-side.
8. Remove broad anonymous policies.
9. Never trust client-supplied project scope.
10. Test negative cases.

## Suggested helpers

```text
is_active_organisation_member(user_id, organisation_id)
is_active_project_member(user_id, project_id)
has_permission(user_id, permission_code, organisation_id, project_id)
is_assigned_actor(user_id, record_type, record_id)
```

Review security-definer privileges and search paths carefully.

## Mutation boundary

Preferred:

```text
UI
→ server application command
→ authorization
→ domain guard
→ database transaction
```

The browser must not directly update aggregate state.

## Atomic commit

One transaction writes:

```text
aggregate change
domain event
outbox message
```

## Optimistic concurrency

Every aggregate uses integer `version`.

Zero rows updated under the expected-version condition returns:

```text
stale_record_version
```

## Temporary capability

Store token hash only.

The public endpoint resolves the token server-side and returns one minimal Dispatch projection.

## Migration order

1. Inventory schema and RLS.
2. Back up.
3. Introduce real authentication.
4. Add organisation/project scope.
5. Add membership and permissions.
6. lock anonymous access.
7. Create canonical aggregates.
8. Migrate legacy records with source trace.
9. Add event journal and outbox.
10. Add projections.
11. Add temporary access.
12. Prove RLS.
13. Retire legacy mutation routes.
14. Preserve rollback until pilot acceptance.

---

<!-- SOURCE: 10_REPOSITORY_MODULE_MAP.md -->

# 10 — Repository Module Map

## Target structure

```text
src/
  domain/
    project/
    identity-access/
    work-thread/
    deliverable/
    submission/
    dispatch/
    receipt-evidence/
    claim/
    management/
    configuration/
    shared/

  application/
    commands/
    queries/
    authorization/
    policies/
    process-managers/
    projections/
    management/
    administration/
    operations/

  ports/
    repositories/
    authentication/
    authorization/
    event-journal/
    outbox/
    clock/
    object-storage/
    notifications/
    workflow-coordinator/
    health/

  adapters/
    web/
    supabase/
    storage/
    notifications/
    scheduler/
    operations-cli/

  ui/
    shell/
    attention/
    work/
    deliverables/
    review/
    submissions/
    dispatch/
    external-delivery/
    receipt-evidence/
    claims/
    management/
    administration/
    operations/

supabase/
  migrations/
  policies/
  functions/
  seed/

tests/
  domain/
  application/
  authorization/
  rls/
  integration/
  workflow/
  ui/
```

## Dependency rules

```text
domain imports no adapter or UI
application imports domain and ports
ports define interfaces
adapters implement ports
UI calls application use cases
```

## Brownfield mapping

For each existing file:

```text
classify active/legacy/duplicate/dead/unknown
map inbound and outbound imports
identify runtime route
identify data mutation
identify auth assumption
identify target module
decide preserve/adapt/replace/retire
```

## Migration units

```text
identity-access kernel
project membership kernel
Work Thread kernel
Deliverable review kernel
Submission kernel
Dispatch capability
Receipt verification
Claim readiness
attention projections
management/admin/operations
legacy retirement
```

No direct UI-to-Supabase domain mutation.

---

<!-- SOURCE: 11_IMPLEMENTATION_SEQUENCE.md -->

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

---

<!-- SOURCE: 12_V1_ACCEPTANCE_SCENARIOS.md -->

# 12 — V1 Acceptance Scenarios

## Security

- anonymous cannot read or mutate project data
- Project A member cannot access Project B
- System Administrator cannot approve without reviewer authority
- assignee cannot self-approve when independent review is required
- courier token accesses one Dispatch only
- expired or revoked token cannot mutate
- temporary actor cannot list projects or claims
- stale version is rejected

## Work Thread

- assignee acknowledges their own assignment
- another user cannot acknowledge
- blocker identifies resolver and consequence
- overdue does not change execution state
- extension preserves original deadline and overdue history
- closure requires accountable acceptance
- reopening requires authority and reason

## Deliverable

- review targets exact revision
- revision request preserves earlier revision
- resubmission creates new revision
- approval identifies exact revision
- approval does not imply Submission
- rejected Deliverable remains visible
- concurrent conflicting decisions cannot both succeed

## Submission

- only approved revision enters manifest
- later revision does not replace manifest
- incomplete manifest cannot dispatch
- supersession preserves original
- delivered Dispatch does not acknowledge Submission

## Dispatch

- collection requires assignment
- delivery requires collection
- failure preserves attempt
- replacement creates new attempt
- duplicate delivery command creates one result
- access expiry raises attention without rewriting business state

## Receipt Evidence

- upload produces PendingVerification
- uploader does not automatically verify
- rejection requires reason
- rejected attempt remains immutable
- replacement creates new attempt
- unavailable evidence blocks verification

## Claim

- approved Deliverable plus delivery is insufficient without verified receipt
- requirement satisfaction points to qualifying evidence
- all mandatory requirements create ReadyForQSReview
- readiness does not automatically create QSVerified
- waiver requires elevated authority and reason
- invalidation re-evaluates readiness

## Management and operations

- Management sees reason, owner, age and consequence
- management decision and domain command remain separate
- projection rebuild does not change aggregates
- notification retry does not duplicate business records
- read-only maintenance blocks mutation
- health shows lag and oldest waiting item
- diagnostic trace links command, event, outbox, process and projection

## Mandatory end-to-end proof

Execute and report:

```text
Happy Path
Internal Revision Path
Delivery Rejection Path
Expiry/Overdue Path
Claim Gap Path
```

---

<!-- SOURCE: 13_V2_DEFERRED_REGISTER.md -->

# 13 — V2 Deferred Register

The following must not delay V1.

## Communication and AI

- Gmail and Outlook automatic ingestion
- WhatsApp monitoring
- meeting-minute extraction
- automatic project detection
- AI task extraction
- AI summarisation and classification

## Documents

- OCR of stamps and signatures
- automatic Word/PDF/CAD comparison
- semantic document search
- AI evidence judgment
- autonomous professional approval

## Logistics

- courier API integration
- live GPS maps
- route optimisation
- fleet management
- native driver application
- offline-first delivery

## Platform

- generic workflow builder
- page builder
- arbitrary custom fields
- plugin marketplace
- commercial multi-tenancy
- billing
- client portal
- native mobile application

## Project and commercial systems

- programme scheduling engine
- resource planning
- full contract administration
- claim valuation
- payment certificate calculation
- accounting integration

## Architecture

- Temporal unless validated complexity proves it necessary
- distributed microservices
- universal event sourcing
- cross-region active-active deployment

Passive interfaces may be preserved, but no deferred capability may become a V1 dependency.
