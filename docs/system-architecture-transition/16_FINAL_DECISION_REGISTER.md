# Final Decision Register

## Locked

- TUGAS is the accountability and submission-evidence platform.
- Architecture is a domain-driven modular monolith with internal hexagonal boundaries.
- One business truth has one owner.
- One command mutates one aggregate by default.
- Current-state tables coexist with append-only Domain Events.
- Work Thread Blocked/Overdue are orthogonal conditions.
- Deliverable review targets an exact immutable Revision.
- Submission does not own custody, evidence or Claim state.
- One Dispatch Attempt is one custody journey.
- Delivery Access scopes one Dispatch.
- Evidence upload, submission and verification are separate.
- Claim readiness and QS verification are separate.
- Process starts at SubmissionApprovedForDispatch and completes at ReadyForQSReview.
- Business rejection is never technical retry.
- Five-path design proof and execution proof are distinct gates.

## Pending operational decisions

```text
professional role/delegate assignments
reviewer competency and PM approval rule
Submission and evidence approval authority
waiver and QS authority
timer values
client evidence criteria
retention periods
pilot Project and cutover date
```

## Programme status

```text
architecture: complete
transition specification: complete as proposed baseline
five-path design proof: complete
operational approval: pending
execution proof: pending
pilot/production: not authorized
```
