# Concurrent Review Checklist

Use this PR to review the work in parallel before Turns 6 and 7 are finalized.

## Product/domain review

- [ ] The canonical chain matches DPIK operations.
- [ ] Document, custody, evidence and Claim truths are correctly separated.
- [ ] Work Thread lifecycle and orthogonal Blocker/Overdue conditions are valid.
- [ ] Deliverable Revision and review semantics match practice.
- [ ] Submission contains only formal-package states.
- [ ] Replacement Dispatch and Evidence Attempt behavior is correct.
- [ ] ReadyForQSReview and QSVerified terminology is accepted.

## Authority review

- [ ] Work-outcome acceptance authority is identified.
- [ ] Reviewer appointment and competency rules are identified.
- [ ] PM technical-approval rule is decided.
- [ ] Submission dispatch-approval authority is identified.
- [ ] Receipt Evidence verification authority is identified.
- [ ] Uploader/verifier separation policy is decided.
- [ ] Claim waiver requester/approver rules are decided.
- [ ] QS verification and reversal authority are decided.
- [ ] Configuration approval and activation authority are decided.

## Architecture review

- [ ] Modular-monolith boundary is accepted.
- [ ] Aggregate ownership is accepted.
- [ ] One-command/one-aggregate transaction boundary is accepted.
- [ ] Authoritative Fact Reference approach is accepted.
- [ ] Database schema separation is accepted.
- [ ] Event journal, outbox and projection boundaries are accepted.
- [ ] No hidden multi-aggregate transaction is introduced.

## Security review

- [ ] Application authorization plus RLS is accepted.
- [ ] Separate internal, delivery and jobs runtime adapters are accepted.
- [ ] One-Dispatch capability boundary is accepted.
- [ ] Raw-token handling is acceptable.
- [ ] Backend secret-key blast radius and component key separation are acceptable.
- [ ] Object-storage upload intent and confirmation flow is acceptable.

## Operations review

- [ ] Database-backed outbox/timers/process state is acceptable.
- [ ] Cron-as-wake-up posture is acceptable.
- [ ] Technical retry and business correction remain separate.
- [ ] Projection freshness and rebuild posture is acceptable.
- [ ] Coordinated deployment and jobs-pause sequence is acceptable.
- [ ] No direct database state-edit recovery is accepted.

## Builder review

- [ ] Existing repository can converge on the module boundaries.
- [ ] Proposed runtime topology fits the intended stack.
- [ ] Commit functions can remain mechanical rather than policy-bearing.
- [ ] Transition contracts can be represented as typed unions and decision functions.
- [ ] Architecture tests can prohibit UI persistence and cross-module imports.
- [ ] Turn 6 Process Manager can issue public commands without foreign-table mutation.

## Review response format

```text
Area:
Decision: ACCEPT / ACCEPT WITH CHANGE / REJECT / NEEDS EVIDENCE
Affected decision or transition ID:
Reason:
Required change:
Owner:
Blocking Turn 6 or Turn 7: YES / NO
```
