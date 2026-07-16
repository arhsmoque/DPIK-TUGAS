# 08 — Management, Administration and Operations

## Authority boundaries

### Management

Sees material interventions and records explicit decisions.

### Administration

Manages identity, membership, roles and governed configuration.

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
System Degradation
```

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
