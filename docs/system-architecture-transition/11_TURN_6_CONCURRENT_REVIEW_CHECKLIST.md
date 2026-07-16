# Turn 6 Concurrent Review Checklist

Status: `PENDING OPERATIONAL REVIEW`

## Process boundary

- [ ] Start on `SubmissionApprovedForDispatch`.
- [ ] Complete on `ClaimPackageReadyForQSReview`.
- [ ] QS verification remains a later professional decision.
- [ ] Process identity includes Submission and Claim scope.
- [ ] Verified receipt without Claim binding waits explicitly.

## Automatic coordination

- [ ] Create Receipt Evidence Attempt after Dispatch assignment.
- [ ] Evaluate Claim Requirements after Evidence verification.
- [ ] Recalculate Claim readiness deterministically.
- [ ] Invalidate exact Claim links after accepted source invalidation.
- [ ] Do not automatically create or assign Dispatch.
- [ ] Do not automatically create replacement aggregates.
- [ ] Do not perform professional approval automatically.

## Correction model

- [ ] Delivery failure normally requires replacement Dispatch.
- [ ] Evidence rejection may use evidence-only replacement when delivery need not repeat.
- [ ] Correction-selection authorities are identified.
- [ ] Replacement aggregates remain human-created.
- [ ] Timers escalate but never choose correction.

## Delivery and ordering

- [ ] At-least-once event delivery is assumed.
- [ ] Duplicate source events produce one semantic effect.
- [ ] Local aggregate events apply in aggregate-version order.
- [ ] Cross-module observations may be deferred.
- [ ] Missing observations are recovered from accepted source events.

## Retry and execution health

- [ ] Business rejection never enters technical retry.
- [ ] Retry preserves reaction and command identity.
- [ ] `TechnicalBlocked` differs from `Corrupted`.
- [ ] Retry profile and dead-letter authority are named.
- [ ] Lost responses resolve through command receipts.

## Recovery

- [ ] Operator recovery uses named application use cases.
- [ ] Mutating recovery supports dry-run and audit.
- [ ] Process reconstruction uses accepted evidence only.
- [ ] Direct business-row editing is prohibited.
- [ ] Process cancellation requires business authority, not operator privilege alone.

## Authority assignments

```text
Evidence replacement choice:
Replacement Dispatch choice:
Claim evidence correction choice:
Process cancellation:
Technical dead-letter release:
Corruption reconstruction approval:
```

## Review sign-off

| Role | Reviewer | Decision | Notes |
|---|---|---|---|
| Product Owner |  | Pending |  |
| PM representative |  | Pending |  |
| Administration / Document Control |  | Pending |  |
| Dispatch Coordinator |  | Pending |  |
| Receipt Evidence Verifier |  | Pending |  |
| QS / Finance |  | Pending |  |
| System / Operations owner |  | Pending |  |
