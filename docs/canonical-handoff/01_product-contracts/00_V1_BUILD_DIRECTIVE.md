# 00 — TUGAS V1 Build Directive

## Mission

Transform the current TUGAS repository into a secure, auditable modular monolith that makes accountable work traceable from obligation through technical review, formal submission, physical delivery, verified acknowledgement and claim-ready closure.

## Product position

TUGAS is DPIK's accountability, review and submission-evidence layer.

It is not:

- a Gmail, Outlook or WhatsApp replacement
- a document authoring or full document-management system
- Primavera or Microsoft Project
- an accounting or claim-valuation engine
- a courier-routing platform
- a generic workflow builder
- a commercial SaaS platform in V1

## Repository strategy

Retain React, Vite, Supabase and Cloudflare unless a proven blocker requires replacement.

Use a brownfield migration:

```text
discover
→ classify
→ secure
→ isolate
→ migrate
→ prove
→ retire legacy
```

## Mandatory V1 capabilities

1. Real authenticated users.
2. Organisation and project memberships.
3. Explicit permissions and role bundles.
4. Work Threads with owners, due commitments, progress and blockers.
5. Deliverable revisions and controlled internal review.
6. Submission Register with exact manifest snapshots.
7. Dispatch Attempts with custody history.
8. One-dispatch temporary external access.
9. Receipt Evidence Attempts with human verification.
10. Claim Requirements and derived readiness.
11. QS verification.
12. Management Attention.
13. Append-only business events.
14. Transactional outbox and projections.
15. Health, recovery and audit controls.

## Mutation contract

Every command contains:

```text
command_id
command_type
actor_id
organisation_id
project_id
aggregate_id
expected_version
idempotency_key
issued_at
payload
```

Execution:

```text
authenticate
→ resolve membership
→ check permission
→ check relationship
→ check separation of duty
→ load aggregate
→ check version
→ evaluate guard
→ mutate
→ append event
→ write outbox
→ commit
→ return authorised projection
```

## Required proofs

The release candidate must produce:

```text
RLS isolation report
authorization test report
five-path workflow report
idempotency report
projection consistency report
temporary-access security report
migration report
pilot readiness report
rollback plan
```

## Completion gate

V1 is not complete until:

- all mandatory scenarios pass
- cross-project access is denied
- typed-email and anonymous mutation paths are removed
- revisions and attempts remain historical
- delivery does not imply verification
- verification does not imply QS verification
- management sees explicit consequence and ownership
- two real pilot cycles complete successfully
