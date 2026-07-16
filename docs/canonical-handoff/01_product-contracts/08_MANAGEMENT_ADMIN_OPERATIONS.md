# 08 — Management, Administration and Operations

## Authority boundaries

### Management

Sees material interventions and records explicit decisions.

### Administration

Manages identity, membership, roles and governed configuration.

Staff roster entry is bulk, not one-by-one: an Admin uploads a CSV/TXT list of known staff emails, previewed dry-run style (new / already-member / malformed) before committing. This replaces the per-person *approval* step, not the *authentication* step — every listed person still authenticates for real (Supabase Auth) on first login. Import is additive-only; a shorter re-upload never revokes anyone, since removing access must always be a deliberate, separate, audited action rather than an implicit side effect of an incomplete spreadsheet. The bulk-import event is a valid `basis` on the record `04_ROLE_AND_AUTHORIZATION_MATRIX.md` requires for any default bundle granted alongside it.

### Development / Feedback

Basic in V1, one page, two sections — no uptime graphs, no live streaming, just current status plus a timestamp and a link out to the real dashboard for anything deeper:

**Platform status** (polled, cached, not real-time):

```text
Supabase        — reachable? (trivial health-check query), last checked, Healthy/Degraded/Unknown
Cloudflare       — last deployment id, deployed_at, deployed_by, success/failed
Keep-alive job   — last successful ping, next scheduled run, consecutive-failure count
```

The keep-alive job exists because a Supabase free-tier project auto-pauses after inactivity; it is a scheduled task on the same Cloudflare Cron wake-up already used for the outbox/timer scheduler (`03_system-architecture-transition` Turn 3), doing nothing but a trivial query on an interval well under the pause threshold. Its failure is exactly the kind of thing that must not go silently unnoticed, so its last-run outcome is a first-class row here, not a fact only visible in Cloudflare's own logs. None of this needs new tables — Supabase status, deployment records and keep-alive pings are all written as rows to the already-listed `operational_events` table, tagged by kind, and this page just reads the latest of each.

**Feedback**: the in-app problem-reporting loop — any staff member can report an issue from within the app; developers see it triaged here alongside system-caught exceptions, distinguished by `source: system | user_report`, with acknowledge, filter-by-acknowledged, and copy-logs-for-debugging actions. This is distinct from Operations below — it is the *feedback and bug-fixing* loop for the product itself, not technical recovery of a running process. The legacy app already built and used this pattern (`app_errors` table, `ReportIssueDialog`, Admin → Errors tab); it ports forward under this repository's RLS and module boundaries rather than legacy's anonymous-writable policy.

### Operations

Observes health and performs safe technical recovery.

None may silently rewrite business history.

## Management Attention

Categories:

```text
Claim Blocked
Submission at Risk
Delivery Failure
Proof Outstanding
Evidence Rejected
Material Work Overdue
Critical Blocker
Review Delay
Responsibility Gap
Decision Required
Delegation Negotiation In Progress
System Degradation
```

`Delegation Negotiation In Progress` covers both a pending Recall Request and a pending Renegotiation Request on a Work Thread (`03_DOMAIN_AND_STATE_MODEL.md`) — this is the visibility mechanism that makes an off-platform WhatsApp negotiation unnecessary: management sees that a negotiation is happening, who raised it, and why, without being a party to it.

Every item shows:

```text
problem
consequence
owner
age
next action
decision authority
evidence
```

## Configuration versioning

Version:

```text
role bundles
evidence profiles
claim templates
escalation policies
temporary-access policy
notification policy
```

Lifecycle:

```text
Draft
Active
Superseded
Disabled
Retired
```

## Operational Control

Observe:

```text
authentication
API
database
storage
outbox worker
process manager
projection worker
timer scheduler
notification worker
temporary-access endpoint
```

Health:

```text
Healthy
Delayed
Degraded
Blocked
Failed
Maintenance
Unknown
```

## Safe recovery

```text
RetryTechnicalOperation
RebuildProjection
ReplayOutboxMessage
Re-evaluateTimer
ResumeWorker
VerifyConsistency
ExportDiagnosticTrace
```

Safe recovery must not approve Deliverables, verify Evidence or force Claim readiness.

## Operator and agent parity

Each recurring control has:

```text
UI control
CLI command
same authorization
same parameters
same result envelope
same audit trail
```

## Audit

Maintain distinguishable:

```text
business audit
security audit
operational audit
```

Correlate through:

```text
command_id
event_id
correlation_id
causation_id
process_id
```
