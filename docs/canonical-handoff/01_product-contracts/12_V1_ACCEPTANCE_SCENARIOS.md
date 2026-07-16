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
