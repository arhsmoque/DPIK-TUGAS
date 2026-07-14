# Turn 5 — Local Aggregate Transition Matrices

Status: `LOCAL TRANSITION MODEL COMPLETE — OPERATIONAL APPROVAL PENDING`

## Transition grammar

```text
current aggregate facts
+ named command or time trigger
+ actor/capability
+ authority proof
+ governing configuration
→ guards
→ accepted Domain Event(s)
→ evolved aggregate
```

Every final implementation transition must carry actor, source, authority, guards, event, destination, evidence, rejection, temporal rule, correction and audit consequence.

## Work Thread

Lifecycle:

```text
Unassigned
→ AwaitingAcknowledgement
→ Assigned
→ InProgress
→ AwaitingAcceptance
→ Closed

Any active lifecycle
→ Cancelled
```

Orthogonal conditions:

```text
has_open_blocker
overdue
```

Key transitions:

| ID | Command/trigger | From | Event | To |
|---|---|---|---|---|
| WT-01 | CreateWorkThread | nonexistent | WorkThreadCreated | Unassigned |
| WT-02 | AssignWork | Unassigned | WorkAssigned | AwaitingAcknowledgement |
| WT-03 | AcknowledgeAssignment | AwaitingAcknowledgement | AssignmentAcknowledged | Assigned |
| WT-04 | StartWork | Assigned | WorkStarted | InProgress |
| WT-06 | DeclareBlocker | active | WorkBlocked | lifecycle unchanged |
| WT-08 | ChangeDueCommitment | active | DueCommitmentChanged | lifecycle unchanged |
| WT-09 | EvaluateWorkOverdue | active | WorkBecameOverdue | lifecycle unchanged |
| WT-10 | ReportOutcomeReady | InProgress | WorkOutcomeReady | AwaitingAcceptance |
| WT-11 | AcceptWorkOutcome | AwaitingAcceptance | WorkAccepted | Closed |
| WT-12 | RequestFurtherWork | AwaitingAcceptance | FurtherWorkRequested | InProgress |
| WT-13 | ReassignWork | active assigned | WorkReassigned | AwaitingAcknowledgement |
| WT-14 | CancelWorkThread | active | WorkCancelled | Cancelled |

Due changes preserve every earlier commitment. Closed and Cancelled are terminal in the first release; follow-up creates a new linked Work Thread.

## Deliverable

```text
Draft
→ InReview
→ RevisionRequired
→ Draft with new Revision
→ InReview
→ Approved

InReview → Rejected
Draft/InReview/RevisionRequired/Rejected → Withdrawn
```

Key transitions:

| ID | Command | Event | Result |
|---|---|---|---|
| DL-01 | CreateDeliverable | DeliverableCreated | Draft |
| DL-02 | PrepareDeliverableRevision | DeliverableRevisionPrepared | new immutable Revision |
| DL-03 | AppointDeliverableReviewer | DeliverableReviewerAppointed | reviewer relationship |
| DL-04 | SubmitDeliverableForReview | DeliverableSubmittedForReview | InReview |
| DL-06 | RequestDeliverableRevision | DeliverableRevisionRequested | RevisionRequired |
| DL-07 | ApproveDeliverableRevision | DeliverableApproved | Approved exact Revision |
| DL-08 | RejectDeliverableRevision | DeliverableRejected | Rejected |
| DL-09 | WithdrawDeliverable | DeliverableWithdrawn | Withdrawn |

`Resubmitted` is an action/event, not a durable state. A new Revision never rewrites an earlier approved Revision or an existing Submission manifest.

## Submission

```text
Draft
→ Prepared
→ ReadyForDispatch

Draft/Prepared/ReadyForDispatch → Cancelled
Prepared/ReadyForDispatch → Superseded
```

Key transitions:

| ID | Command | Event | Result |
|---|---|---|---|
| SB-01 | CreateSubmission | SubmissionCreated | Draft |
| SB-02 | AddManifestItem | SubmissionManifestItemAdded | exact approved Revision reference |
| SB-05 | PrepareSubmission | SubmissionPrepared | Prepared frozen snapshot |
| SB-06 | ReturnSubmissionToDraft | SubmissionReturnedToDraft | Draft |
| SB-07 | ApproveSubmissionForDispatch | SubmissionApprovedForDispatch | ReadyForDispatch |
| SB-08 | CancelSubmission | SubmissionCancelled | Cancelled |
| SB-09 | SupersedeSubmission | SubmissionSuperseded | Superseded |

`InDelivery`, `ReceiptPending`, `Acknowledged` and `ClaimLinked` are not Submission states. They belong to Dispatch, Receipt Evidence, Claim or joined projections.

## Dispatch Attempt

```text
Prepared
→ Assigned
→ InTransit
→ Delivered

Assigned/InTransit → Failed
Prepared/Assigned → Cancelled
```

Key transitions:

| ID | Command | Event | Result |
|---|---|---|---|
| DP-01 | CreateDispatchAttempt | DispatchAttemptCreated | Prepared |
| DP-02 | AssignDispatch | DispatchAssigned | Assigned |
| DP-03 | ConfirmPackageCollection | PackageCollected | InTransit |
| DP-04 | ReportPackageDelivery | PackageDelivered | Delivered |
| DP-05 | ReportDeliveryFailure | DeliveryFailed | Failed |
| DP-06 | CancelDispatchAttempt | DispatchCancelled | Cancelled |
| DP-07 | CreateReplacementDispatchAttempt | ReplacementDispatchCreated | new Prepared Attempt |

One Attempt equals one custody journey. Delivered never moves backward. Package delivery does not verify receipt evidence.

## Delivery Access

```text
Issue → Active
Active → Completed
Active → Expired
Active → Revoked
Active → Active with new token generation on rotation
```

| ID | Command/trigger | Event | Result |
|---|---|---|---|
| DA-01 | IssueDeliveryAccess | DeliveryAccessIssued | Active |
| DA-02 | RotateDeliveryAccess | DeliveryAccessRotated | Active, old generation invalid |
| DA-04 | CompleteDeliveryAccess | DeliveryAccessCompleted | Completed |
| DA-05 | ExpireDeliveryAccess | DeliveryAccessExpired | Expired |
| DA-06 | RevokeDeliveryAccess | DeliveryAccessRevoked | Revoked |

One capability scopes one Dispatch. Raw tokens are not stored. Terminal capability states cannot act.

## Receipt Evidence Attempt

```text
Collecting
→ PendingVerification
→ Verified

PendingVerification → Rejected
Collecting/PendingVerification → Withdrawn
Verified → Invalidated
```

| ID | Command | Event | Result |
|---|---|---|---|
| RE-01 | CreateReceiptEvidenceAttempt | ReceiptEvidenceAttemptCreated | Collecting |
| RE-02 | UploadReceiptEvidenceItem | ReceiptEvidenceItemUploaded | remains Collecting |
| RE-04 | SubmitReceiptEvidenceForVerification | ReceiptEvidenceSubmittedForVerification | PendingVerification |
| RE-05 | VerifyReceiptEvidence | ReceiptEvidenceVerified | Verified |
| RE-06 | RejectReceiptEvidence | ReceiptEvidenceRejected | Rejected |
| RE-07 | WithdrawReceiptEvidence | ReceiptEvidenceWithdrawn | Withdrawn |
| RE-08 | InvalidateReceiptEvidenceVerification | ReceiptEvidenceVerificationInvalidated | Invalidated |
| RE-09 | CreateReplacementReceiptEvidenceAttempt | ReplacementReceiptEvidenceCreated | new Collecting Attempt |

The verifier decides on an exact frozen submitted item set. Rejected, Withdrawn and Invalidated Attempts never qualify a Claim Requirement. Re-dispatch is required only when correction needs a new physical journey.

## Claim Package

Lifecycle:

```text
Open → Submitted → Closed
Open → Cancelled
Submitted/Closed → Open only through explicit correction
```

Readiness:

```text
EvidenceIncomplete ↔ ReadyForQSReview → QSVerified
Any qualifying state → Invalidated after source-fact invalidation
```

Key transitions:

| ID | Command | Event | Result |
|---|---|---|---|
| CL-01 | CreateClaimPackage | ClaimPackageCreated | Open + EvidenceIncomplete |
| CL-02 | AddClaimRequirement | ClaimRequirementAdded | Unsatisfied requirement |
| CL-03 | LinkClaimEvidence | ClaimEvidenceLinked | readiness recalculated |
| CL-04 | EvaluateClaimRequirement | RequirementSatisfied or GapRecorded | requirement state |
| CL-05 | RequestClaimRequirementWaiver | WaiverRequested | pending request |
| CL-06 | ApproveClaimRequirementWaiver | ClaimRequirementWaived | Waived |
| CL-08 | RecalculateClaimReadiness | ReadyForQSReview or EvidenceIncomplete | derived readiness |
| CL-09 | VerifyClaimPackage | ClaimPackageQSVerified | QSVerified |
| CL-10 | RecordClaimSubmission | ClaimSubmissionRecorded | Submitted |
| CL-11 | CloseClaimPackage | ClaimPackageClosed | Closed |
| CL-12 | InvalidateClaimEvidence | ClaimRequirementInvalidated | Invalidated readiness |
| CL-13 | ReopenClaimPackageForCorrection | ClaimPackageReopenedForCorrection | Open + EvidenceIncomplete |

`ClaimReady` is retired as ambiguous. `ReadyForQSReview` is deterministic evidence completeness. `QSVerified` is the human professional decision.

## Configuration Profile

```text
Draft
→ Validated
→ Approved
→ Active
→ Superseded
→ Retired

Validated → Draft for amendment
```

Activation is atomic inside one ConfigurationProfile:

```text
new version: Approved → Active
prior active version: Active → Superseded
```

Approved and active versions are immutable. Business records remain bound to the exact version they accepted.

## Authority baseline pending approval

Recommended defaults:

```text
assigned reviewer approves exact Revision
uploader and Receipt Evidence verifier are separate
Claim waiver requester and approver are separate
QS verification is distinct from readiness calculation
configuration author, approver and activator are separated
```

## Time

Timer types are fixed while durations remain configuration-bound. Timer evaluation uses stored due/expiry facts, deterministic timer identity and idempotent commands. Cron is not the business trigger authority.

## Approval status

The matrices are sufficient for schema derivation, TypeScript scaffolding, transition tests, UI action mapping and Turn 6 Process Manager design. They are not approval to seed production authority profiles, client evidence criteria or SLA durations.
