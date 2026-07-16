# Implementation Authorization

Status: `CONDITIONAL BUILD AUTHORIZATION — PILOT AND PRODUCTION BLOCKED`

## A0 — Documentation and scaffolding

Authorized:

```text
module structure
architecture tests
strict TypeScript foundation
runtime schemas
local Supabase/test harness
telemetry and CLI skeleton
```

## A1 — Reference slice

Authorized under non-production proposed fixtures:

```text
Authenticate
→ resolve Project
→ CreateWorkThread
→ AssignWork
→ AcknowledgeAssignment
→ My Work query
```

## A2 — Full bounded workflow

Conditionally authorized for non-production implementation when:

- state/event names follow the contracts;
- unresolved authority remains configuration/port-bound;
- fixtures are marked `proposed_default` and `not_production_approved`;
- client evidence profiles are not represented as approved;
- all five paths become executable release tests.

## A3 — Pilot

Blocked until authority, evidence profiles and timer values are signed; migrations/security/recovery pass; and all five paths execute as MATCHED.

## A4 — Production

Blocked until pilot exit criteria and formal release approval.

## Production blockers

```text
unapproved professional authority
unapproved client evidence criteria
critical RLS failure
mutable historical Revision/Attempt
hidden multi-aggregate mutation
five-path mismatch
critical dead letter
stale state hidden from the UI
missing recovery evidence
```
