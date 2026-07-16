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
