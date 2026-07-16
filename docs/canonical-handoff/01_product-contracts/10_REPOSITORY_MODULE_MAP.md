# 10 — Repository Module Map

## Target structure

```text
src/
  domain/
    project/
    identity-access/
    work-thread/
    deliverable/
    submission/
    dispatch/
    receipt-evidence/
    claim/
    management/
    configuration/
    shared/

  application/
    commands/
    queries/
    authorization/
    policies/
    process-managers/
    projections/
    management/
    administration/
    operations/

  ports/
    repositories/
    authentication/
    authorization/
    event-journal/
    outbox/
    clock/
    object-storage/
    notifications/
    workflow-coordinator/
    health/

  adapters/
    web/
    supabase/
    storage/
    notifications/
    scheduler/
    operations-cli/

  ui/
    shell/
    attention/
    work/
    deliverables/
    review/
    submissions/
    dispatch/
    external-delivery/
    receipt-evidence/
    claims/
    management/
    administration/
    operations/

supabase/
  migrations/
  policies/
  functions/
  seed/

tests/
  domain/
  application/
  authorization/
  rls/
  integration/
  workflow/
  ui/
```

## Dependency rules

```text
domain imports no adapter or UI
application imports domain and ports
ports define interfaces
adapters implement ports
UI calls application use cases
```

## Brownfield mapping

For each existing file:

```text
classify active/legacy/duplicate/dead/unknown
map inbound and outbound imports
identify runtime route
identify data mutation
identify auth assumption
identify target module
decide preserve/adapt/replace/retire
```

## Migration units

```text
identity-access kernel
project membership kernel
Work Thread kernel
Deliverable review kernel
Submission kernel
Dispatch capability
Receipt verification
Claim readiness
attention projections
management/admin/operations
legacy retirement
```

No direct UI-to-Supabase domain mutation.
