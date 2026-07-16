# Decision Status Register Through Turn 5

## Accepted architecture decisions

```text
controlled greenfield canonical repository
module-first modular monolith
hexagonal dependency direction
current-state tables plus append-only Domain Events
transactional outbox
optimistic concurrency and command receipts
one command mutates one aggregate by default
Authoritative Fact References for cross-module facts
separate internal, delivery and jobs runtimes
project-scoped authorization and RLS
immutable Revision/Attempt/configuration history
asynchronous projections with visible freshness
database-backed Process Manager first
```

## Accepted transition refinements

```text
Work Thread Blocked and Overdue are orthogonal conditions
Deliverable Resubmitted is not a durable state
Submission excludes custody, evidence and Claim states
one Dispatch Attempt equals one custody journey
Delivery Access is a separate Dispatch-owned aggregate
Receipt Evidence has Collecting before PendingVerification
Verified Receipt Evidence may later become Invalidated
Claim lifecycle and readiness are separate axes
ClaimReady is replaced by ReadyForQSReview and QSVerified
ConfigurationProfile owns version entities
```

## Proposed operational decisions requiring approval

```text
PM technical approval only when explicitly appointed and policy permits
uploader/verifier separation by default
Claim waiver requester and approver separated
QS/Finance authority model
Submission approval authority
configuration author/approver/operator separation
client-specific evidence criteria
business-day calendars and timeout durations
```

## Deferred

```text
automatic Gmail/Outlook/WhatsApp ingestion
OCR/stamp/signature recognition
courier provider APIs and live tracking
Temporal or Cloudflare Workflows runtime
Cloudflare Queues after the database outbox
client portal
claim valuation
native offline-first mobile
generic workflow/rules engine
microservices
```

## Pending programme work

```text
Turn 6:
Formal Submission Process Manager matrix
out-of-order and duplicate event handling
technical retry policy
business-correction routing
process cancellation and restart
failure propagation

Turn 7:
Happy Path
Internal Revision
Delivery Rejection and re-dispatch
Expiry/Overdue
Claim Gap
operational sign-off
final consolidated bundle
```

## Current gate

```text
LOCAL TRANSITION MODEL COMPLETE
OPERATIONAL APPROVAL PENDING
FINAL RELEASE AUTHORIZATION BLOCKED
```
