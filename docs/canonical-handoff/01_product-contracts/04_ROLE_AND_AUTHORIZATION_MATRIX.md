# 04 — Roles and Authorization Matrix

## Authorization formula

```text
Identity
∩ active organisation membership
∩ active project membership
∩ explicit permission
∩ record relationship
∩ professional authority
∩ separation-of-duty rule
∩ transition guard
∩ expected version
= accepted command
```

## Role bundles

| Role | Main authority |
|---|---|
| Organisation Director | Management attention and exceptional decision |
| Project Manager | Work assignment and accountability |
| Technical Assignee | Progress, blockers and Deliverable preparation |
| Technical Reviewer | Review, revision request, approval or rejection |
| Document Controller | Submission preparation and dispatch coordination |
| Dispatch Coordinator | Dispatch and temporary access |
| QS Verifier | Evidence verification and claim readiness |
| Finance Viewer | Claim visibility |
| System Administrator | Identity, membership and security configuration |
| Audit Viewer | Read-only audit |

## Separation of duties

1. A preparer cannot ordinarily approve when independent review is required.
2. Evidence upload and evidence verification are separate.
3. System administration does not imply professional approval.
4. Courier access is a one-dispatch capability, not membership.
5. Management overrides use explicit named commands and reasons.

## Stable permissions

```text
work.create
work.assign
work.acknowledge
work.update
work.change_due_date
work.accept
work.reopen

deliverable.create
deliverable.submit
deliverable.review
deliverable.approve
deliverable.reject

submission.prepare
submission.approve_dispatch
submission.cancel
submission.supersede

dispatch.create
dispatch.assign
dispatch.report_collection
dispatch.report_delivery
dispatch.report_failure
dispatch.create_replacement

receipt.upload
receipt.verify
receipt.reject

claim.create
claim.configure_requirements
claim.evaluate
claim.verify
claim.waive_requirement
claim.submit

management.read_attention
administration.manage_users
administration.manage_memberships
administration.manage_roles
security.revoke_temporary_access
```

## Rejection behaviour

A rejected command:

- leaves business state unchanged
- emits no accepted event
- returns a stable code
- records audit where required
- avoids exposing hidden record existence
