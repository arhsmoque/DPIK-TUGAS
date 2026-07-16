# 09 — Database and RLS Directive

## Required tables

```text
organisations
users
organisation_memberships
projects
project_memberships
permissions
role_bundles
role_bundle_permissions
organisation_role_assignments
project_role_assignments

work_threads
work_due_commitments
work_blockers
work_updates

deliverables
deliverable_revisions
review_decisions

submissions
submission_manifest_items

dispatch_attempts
temporary_delivery_access

receipt_evidence_attempts
receipt_evidence_items

claim_packages
claim_requirements

formal_submission_processes
domain_events
outbox_messages

my_attention_projection
my_work_projection
review_queue_projection
submission_register_projection
receipt_verification_projection
claim_readiness_projection
management_attention_projection

security_events
operational_events
configuration_versions
```

## Common columns

Project-scoped tables include:

```text
organisation_id
project_id
created_at
created_by
updated_at
updated_by
version
```

## Protected fields

Client code must not freely write:

```text
organisation_id
project_id
version
approved_revision_id
review_state
submission_state
dispatch_state
verification_state
verified_by
readiness_state
requirement satisfaction
token_hash
domain event actor
domain event time
```

## RLS doctrine

1. Enable RLS on every exposed table.
2. Deny by default.
3. Check active organisation membership.
4. Check active project membership.
5. Check explicit permission.
6. Check record relationship where required.
7. Keep service-role secrets server-side.
8. Remove broad anonymous policies.
9. Never trust client-supplied project scope.
10. Test negative cases.

## Suggested helpers

```text
is_active_organisation_member(user_id, organisation_id)
is_active_project_member(user_id, project_id)
has_permission(user_id, permission_code, organisation_id, project_id)
is_assigned_actor(user_id, record_type, record_id)
```

Review security-definer privileges and search paths carefully.

## Mutation boundary

Preferred:

```text
UI
→ server application command
→ authorization
→ domain guard
→ database transaction
```

The browser must not directly update aggregate state.

## Atomic commit

One transaction writes:

```text
aggregate change
domain event
outbox message
```

## Optimistic concurrency

Every aggregate uses integer `version`.

Zero rows updated under the expected-version condition returns:

```text
stale_record_version
```

## Temporary capability

Store token hash only.

The public endpoint resolves the token server-side and returns one minimal Dispatch projection.

## Migration order

1. Inventory schema and RLS.
2. Back up.
3. Introduce real authentication.
4. Add organisation/project scope.
5. Add membership and permissions.
6. lock anonymous access.
7. Create canonical aggregates.
8. Migrate legacy records with source trace.
9. Add event journal and outbox.
10. Add projections.
11. Add temporary access.
12. Prove RLS.
13. Retire legacy mutation routes.
14. Preserve rollback until pilot acceptance.
