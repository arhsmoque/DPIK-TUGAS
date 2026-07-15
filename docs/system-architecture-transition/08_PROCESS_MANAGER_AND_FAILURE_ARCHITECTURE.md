# Turn 6 — Process Manager and Failure Architecture

Status: `PROCESS_MANAGER_AND_FAILURE_MODEL_COMPLETE — OPERATIONAL APPROVAL PENDING`

## 1. Process boundary

The canonical cross-aggregate coordinator is:

```text
FormalSubmissionFulfilmentProcess
```

It starts when TUGAS accepts:

```text
SubmissionApprovedForDispatch
```

It reaches successful fulfilment when TUGAS accepts:

```text
ClaimPackageReadyForQSReview
```

This boundary intentionally excludes Deliverable review and Submission preparation, which remain local aggregate workflows. It also excludes `QSVerified`, Claim submission and payment.

## 2. Truth ownership

| Truth | Owner |
|---|---|
| exact formal package | Submission |
| one custody journey | Dispatch Attempt |
| temporary external capability | Delivery Access |
| proof and verification | Receipt Evidence Attempt |
| requirement satisfaction and readiness | Claim Package |
| waiting, reactions and issued commands | Formal Submission Fulfilment Process |

The Process Manager coordinates accepted facts. It never creates substitute business statuses.

## 3. Process identity

```text
process_id
process_type = formal_submission_fulfilment
organisation_id
project_id
submission_id
claim_scope_id
process_generation
```

If no Claim scope is yet bound, verified receipt may be reached but the process waits in `WaitingForClaimBinding`.

## 4. Two-axis model

### Coordination condition

```text
WaitingForDispatchCreation
WaitingForDispatchAssignment
WaitingForCollection
WaitingForDelivery
WaitingForEvidenceSubmission
WaitingForEvidenceVerification
CorrectionDecisionRequired
WaitingForReplacementEvidence
WaitingForReplacementDispatch
WaitingForClaimBinding
WaitingForClaimEvaluation
CompletedReadyForQSReview
Cancelled
```

### Execution health

```text
Healthy
Retrying
TechnicalBlocked
Corrupted
```

Technical failure changes execution health. It does not rewrite the business coordination condition.

## 5. Deterministic automatic commands

The process may issue only commands whose required facts and policies are already explicit:

```text
CreateReceiptEvidenceAttempt
EvaluateClaimRequirement
RecalculateClaimReadiness
InvalidateClaimEvidence
```

It does not automatically issue:

```text
Create or assign Dispatch
Create replacement Dispatch
Create replacement Evidence Attempt
Verify Receipt Evidence
Waive Claim Requirement
Verify Claim Package
```

Those require human details or professional authority.

## 6. Correction doctrine

```text
Technical failure
→ retry the same intended operation with the same identity

Business rejection
→ enter an explicit correction condition and choose a new command
```

Examples:

```text
DeliveryFailed
→ CorrectionDecisionRequired
→ normally choose ReplacementDispatch

ReceiptEvidenceRejected
→ CorrectionDecisionRequired
→ choose EvidenceReplacement when delivery need not repeat
→ choose ReplacementDispatch when custody/recipient must repeat

ClaimRequirementGapRecorded
→ relink qualifying evidence, replace evidence/dispatch,
   request waiver, or correct approved configuration
```

The process never resets or deletes failed/rejected attempts.

## 7. At-least-once and out-of-order handling

The process assumes:

```text
at-least-once technical delivery
local aggregate event order
no universal cross-aggregate order
worker restart at any point
```

Process-inbox results are:

```text
Applied
Duplicate
DeferredAwaitingPrerequisite
IgnoredIrrelevant
RejectedUnsupported
FailedTechnical
```

A unique `(process_id, source_event_id)` constraint prevents duplicate semantic effects.

A cross-module observation that arrives before its prerequisite is stored and re-evaluated; it is not silently discarded.

## 8. Retry and technical blocking

Technical classification:

```text
Transient
ConcurrencyReconcile
PermanentConfiguration
PermanentContract
SecurityViolation
DataCorruption
Unknown
```

Only transient and bounded concurrency-reconciliation cases retry automatically.

Every retry preserves:

```text
source_event_id
reaction_id
command_id
idempotency_key
canonical command fingerprint
```

Retry exhaustion, missing configuration or unsupported contract moves execution health to `TechnicalBlocked`. Inconsistent persisted identities/history moves it to `Corrupted` and freezes automatic processing.

## 9. Timers

Process timers observe waiting and create attention. They do not choose corrections, cancel the process, waive requirements or approve evidence.

Canonical timer classes:

```text
dispatch creation
dispatch assignment
collection
delivery
evidence submission
evidence verification
correction decision
replacement creation
Claim binding
Claim evaluation
```

The database timer record is the source of truth; Cron is only the wake-up mechanism.

## 10. Failure containment

```text
Outbox failure
→ source business event remains accepted
→ process/projection may lag

Process reaction failure
→ execution health retries or blocks
→ aggregate truth remains unchanged

Projection failure
→ business/process truth remains correct
→ UI exposes stale/failed projection

Notification failure
→ awareness may be delayed
→ contractual truth remains unchanged
```

## 11. Recovery

Read operations:

```text
tugas processes inspect
tugas processes timeline
tugas processes verify
tugas processes deferred-events
tugas processes issued-commands
tugas processes timers
```

Controlled operations:

```text
tugas processes retry-technical-step --dry-run
tugas processes release-dead-letter --dry-run
tugas processes reconcile --dry-run
tugas processes resume --dry-run
tugas processes cancel --reason ... --dry-run
```

Recovery may release accepted events, attach an existing command receipt, recreate a missing technical timer or rebuild the process projection from accepted evidence. It may not manufacture a professional business fact or directly edit business rows.

## 12. Approval boundary

Operational approval is still required for:

```text
correction-selection authority
process-cancellation authority
retry-profile thresholds
dead-letter release authority
corruption reconstruction approval
Claim-binding ownership
```
