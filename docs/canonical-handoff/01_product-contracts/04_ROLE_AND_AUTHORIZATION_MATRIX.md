# 04 — Roles and Authorization Matrix

## Governing principle: fixed process, flexible personnel

This matrix does not assume a clean org chart. It is written for an SME engineering team where the same person legitimately holds different capabilities on different projects, competence is earned by tenure and skill rather than paper qualification, and small teams double up out of necessity — a drafter promoted to Engineer by demonstrated design skill, a drafter seconded to Inspector of Works to save cost, an HQ Engineer acting as Assistant Resident Engineer and facing the client directly on one project while staying HQ-side on another, a Liaison Officer fronting permit matters with the authority, staff volunteering as ad hoc couriers for petty cash instead of hiring Lalamove.

A generic task-delegation tool hardcodes permission to a job-title field on the user account, which only works if the org chart is clean and static. It does not fit this team. Nor is the answer a generic no-code workflow builder — that makes the *process* configurable too, which is exactly the chaos this product exists to prevent (see `00_V1_BUILD_DIRECTIVE.md`: "not a generic workflow builder").

The resolution: **the workflow stays canonical and non-configurable — Deliverable cannot skip review, Submission cannot skip a signatory, Receipt Evidence cannot self-verify without being flagged — but *who* is permitted to act within that fixed workflow is a flexible, per-project, reason-carrying grant, not a fixed title.**

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

`professional authority` is established by an internal grant (see Capability grant record below), not by verifying an external credential. Where a specific client or regulator contractually requires a credential-holding signatory on a specific document, that is a property of the Claim Requirement or Submission for that client, evaluated at the document level — it is not a constraint on who may hold a capability bundle system-wide.

## Capability bundles, not job titles

A bundle is a named grouping of the stable permissions below. Any identity may hold any combination of bundles, scoped per organisation or per project, for as long as the grant is active. Holding a bundle on one project implies nothing about another.

| Bundle | Main authority | Typical (not exclusive) holder |
|---|---|---|
| Management | Management attention view and exceptional override | Managing Director, Organisation Director |
| Work Owner | Work assignment, due dates, accountability, outcome acceptance | HOD, Project Manager |
| Preparer / Assignee | Progress, blockers, Deliverable and BQ preparation | Site Engineer, HQ Engineer, drafter, Inspector of Works |
| Reviewer | Internal review, revision request, technical approval or rejection | Whoever the org has actually granted this to — title not required |
| Dispatch / Document Control | Submission manifest preparation, dispatch coordination, temporary delivery access issuance | HQ Engineer, admin staff, Liaison Officer (authority-facing submissions) |
| Evidence Verifier | Receipt evidence verification | Anyone except the identity that uploaded the specific evidence being verified |
| QS / Claim Authority | Claim requirement evaluation, waiver, ReadyForQSReview, QSVerified | QS |
| Administration | Identity, membership and security configuration | Whoever the org designates — need not be Management |
| Audit | Read-only audit access | Anyone granted it |

Liaison Officer work (fronting permit matters with an authority) is not a new module — it is the Dispatch/Document Control bundle scoped to submissions whose recipient is an authority rather than a client. `Submission` recipients are generically typed (client or authority) for this reason; permit-specific tracking screens remain a V2 surface deferred behind this V1 data shape (see `13_V2_DEFERRED_REGISTER.md`).

## The one bundle that is not like the others: Authorized Signatory

Everyone may write the report, prepare the BQ, and hold Reviewer authority. Exactly one capability does not follow the flexible-grant pattern above: **final authorization to release a formal Submission outside the company carries one signatory, full stop — the Managing Director.** This is not a bundle granted the way the others are; it is a single versioned organisational fact, held in the Configuration module:

```text
authorized_signatory: <identity>
effective_from: <date>
superseded_by: <identity or null>
```

Internal technical approval (`deliverable.approve`, held by any granted Reviewer) and formal external authorization (`submission.approve_dispatch`, gated to the current Authorized Signatory) are already separate truths in this contract's independent-truths model (`01_PRODUCT_CONTRACT.md` §2: Document approval ≠ Formal package identity) — this section just names the authority behind the second one explicitly, and requires it be recorded with succession history rather than implied.

## Capability grant record

Every bundle assignment is a row, not a column on the user:

```text
granted_to
bundle
scope              — organisation-wide or one project
granted_by         — who made the call
granted_at
basis              — free text: "10 years design experience, promoted 2019",
                      "seconded to save cost", "PE license #1234" — whichever is true
revoked_at         — nullable
```

`basis` is deliberately free text, not a credential-verification field. It exists so the reason a person holds a capability is recorded institutional memory (per `01_ALL_PLANS_CONSOLIDATED.md` — audit history is part of the domain), not something only the Managing Director remembers.

## Separation of duties

Separation of duty is enforced by **record relationship, not role exclusivity**. The system asks "is the actor on this command the same actor already recorded against the fact this action depends on," never "does this person's title permit this action category." A Reviewer may approve a colleague's Deliverable on Monday and prepare their own on Tuesday — same bundle, different records, no conflict.

1. An identity cannot approve a Deliverable Revision it authored, when independent review is required for that Revision.
2. An identity cannot verify Receipt Evidence it uploaded.
3. Administration does not imply professional approval authority.
4. Delivery-custodian access is a one-Dispatch capability, not project membership — this applies identically whether the custodian is an external courier or DPIK staff delivering informally on the way home; an internal custodian's identity may optionally be recorded on the Dispatch Attempt for the company's own reimbursement purposes, without granting that person any broader access.
5. Only the current Authorized Signatory may execute `submission.approve_dispatch`; this is not delegable through the ordinary capability-grant mechanism.
6. Where a genuinely single person must both prepare and approve (no second qualified identity exists), the system permits the action rather than blocking work, but records it as `self_approved: true` / `self_verified: true`, visible on the record and on the Claim Readiness view — flagged, not silently allowed, and not treated as independent review.
7. Management overrides use explicit named commands and reasons, and are themselves audited.

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
