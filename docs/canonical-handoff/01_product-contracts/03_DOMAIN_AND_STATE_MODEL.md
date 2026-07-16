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

#### Work Thread — delegation negotiation (orthogonal, not lifecycle states)

A generic delegation tool only supports silent, unilateral reassignment. That default pushes negotiation off-platform into WhatsApp, which is the exact failure mode this product exists to close. Two symmetric, reason-carrying conditions sit alongside `Blocked`/`Overdue`:

```text
RecallRequested        — an upstream Work Owner (broader reach than this assignment)
                          proposes reassignment. Work continues; nothing changes yet.

RenegotiationRequested — the current assignee requests revision (emergency, overload,
                          needs extension/resource) or a straight reassignment.
                          Self-service: holding the assignment is enough to raise this,
                          no additional permission required.
```

Either condition opens a structured Decision-required discussion (reusing the existing comment classification, not a new discussion system) and resolves explicitly — it never silently mutates the assignment:

```text
RecallRequested
  → ConfirmRecall  → AssignWork(new assignee); history of the request is kept regardless
  → RetractRecall  → assignment unchanged; the request itself stays in history

RenegotiationRequested
  → TermsAdjusted             — due date or scope changed, same assignee, negotiation closes
  → DelegationCancelled(reason_code, reason_detail: free text for "Other")
      → AssignWork(new assignee)     — delegator picks directly
      → ReleasedToOpenPool           — Work Thread returns to Unassigned; any eligible
                                        project member may ClaimWork (self-assign)
      → EscalatedForReassignment     — routed to the upstream Work Owner to resolve
```

Both conditions surface on Management Attention as "Negotiation in progress" for as long as they're open — upper management sees that a negotiation is happening even without being a party to it. A retracted recall or a resolved renegotiation is not deleted; it stays visible history, since "this assignment was questioned/renegotiated and how it resolved" is itself accountability signal, not noise to discard.

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
