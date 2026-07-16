# Five-Path Design Proof

Status: `DESIGN_PROOF_COMPLETE — EXECUTION PENDING`

## Proof standard

Each path has named actors, commands, accepted events, aggregate owners, Process Manager reactions, timers, correction decisions, final assertions, negative assertions and executable Gherkin.

Design proof establishes causal completeness. It is not runtime evidence.

## Path 1 — Happy Path

```text
Work Thread assigned/acknowledged
→ exact Deliverable Revision approved
→ exact Revision placed in prepared Submission
→ Submission approved for dispatch
→ Dispatch D1 collected and delivered
→ Evidence E1 submitted and verified
→ Claim Requirements satisfied
→ Claim Package ReadyForQSReview
→ Process CompletedReadyForQSReview
```

Final independent truths:

```text
Work Thread: Closed
Deliverable R1: Approved
Submission: ReadyForDispatch
Dispatch D1: Delivered
Receipt Evidence E1: Verified
Claim: ReadyForQSReview
```

`QSVerified` is a later professional decision.

## Path 2 — Internal Revision

```text
R1 InReview
→ RevisionRequired
→ new immutable R2
→ R2 InReview
→ R2 Approved
→ Submission manifest references R2 only
```

R1 is not edited, deleted or retrospectively approved. `Resubmitted` is an action, not a durable state.

## Path 3 — Delivery Rejection and Re-dispatch

```text
D1 Delivered
→ E1 Rejected
→ CorrectionDecisionRequired
→ authorized ReplacementDispatch choice
→ new D2 and E2
→ D2 Delivered
→ E2 Verified
→ Claim ready
```

D1 remains Delivered and E1 remains Rejected. Re-dispatch is a human-selected business correction, not technical retry.

## Path 4 — Expiry and Overdue

```text
Work Thread InProgress
→ due timer
→ WorkBecameOverdue
→ lifecycle remains InProgress

Delivery Access A1 Active
→ expiry timer
→ A1 Expired
→ Dispatch remains Assigned
→ new Access A2 issued
→ delivery continues
```

Duplicate timer delivery is idempotent.

## Path 5 — Claim Gap

```text
Deliverable approved
Submission exists
Dispatch delivered
mandatory receipt evidence rejected
→ ClaimRequirementGapRecorded
→ Claim remains EvidenceIncomplete
→ gap shows owner, reason and next action
→ replacement evidence verified
→ requirement satisfied
→ ReadyForQSReview
```

General completion, delivery or evidence upload cannot satisfy a mandatory Claim Requirement.

## Execution evidence required

```text
release/configuration identity
command receipts
Domain Event lineage
Process Manager timeline
timer history
projection checkpoints
RLS/database assertions
Playwright trace
mismatch result MATCHED
```
