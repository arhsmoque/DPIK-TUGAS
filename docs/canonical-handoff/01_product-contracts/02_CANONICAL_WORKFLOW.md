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
