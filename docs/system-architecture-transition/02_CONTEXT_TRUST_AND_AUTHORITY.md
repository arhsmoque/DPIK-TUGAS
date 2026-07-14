# Turn 2 — System Context, Trust and Authority

Status: `CONTEXT AND TRUST MODEL ESTABLISHED`

## Actors

Internal:

```text
Director / Management
Project Manager
Engineer / Assignee
Technical Reviewer
Administration / Document Control
Dispatch Coordinator
QS / Finance Verifier
System Administrator
```

Temporary external:

```text
Temporary External Delivery Custodian
```

The external custodian receives one time-limited capability for one Dispatch Attempt, not an internal account or Project membership.

## System-of-record map

| Information | Canonical authority |
|---|---|
| Communication content | Gmail, Outlook, WhatsApp or meeting record |
| Structured obligation and owner | TUGAS Work Thread |
| Authoritative document file | Drive or SharePoint |
| Revision identity and review decision | TUGAS Deliverable |
| Formal issued package | TUGAS Submission |
| Physical custody journey | TUGAS Dispatch Attempt |
| Evidence binary | Approved object storage/repository |
| Evidence verification | TUGAS Receipt Evidence |
| Claim Requirement satisfaction | TUGAS Claim |
| Authentication session | Supabase Auth |
| Professional authority | TUGAS authorization and owning-module guard |
| Business audit | TUGAS Domain Event journal |

## Authorization conjunction

```text
authenticated identity
+ active organisation membership
+ active Project membership
+ candidate permission
+ record relationship
+ professional authority
+ separation-of-duty compliance
+ aggregate guard
```

Authentication proves identity. Permission grants a candidate capability. Relationship and professional authority determine whether the capability may be exercised on the exact record.

## Trust zones

```text
Z0 Public / untrusted
Z1 Internal authenticated device
Z2 Temporary external delivery session
Z3 Application runtime
Z4 Domain and Process Manager
Z5 Data and object storage
Z6 Operations and diagnostics
Z7 External communication/document/provider systems
```

The browser is never trusted to enforce authorization or transitions.

## Internal versus delivery access

| Concern | Internal application | External delivery |
|---|---|---|
| Identity | Authenticated user | Opaque capability/session |
| Scope | Organisation + Project membership | One Dispatch Attempt |
| Navigation | Permission-shaped | Delivery flow only |
| Commands | Permission + relationship + authority | Explicit capability action set |
| Lifetime | Authentication policy | Short, Dispatch-specific |
| Revocation | Identity/membership/session | Capability revocation |
| Data | Role/Project scoped | Minimum needed for delivery |

## Capability requirements

```text
one Dispatch Attempt
explicit permitted actions
time-limited
revocable
completable
no list or search
raw token never stored or logged
```

## Separation rules

```text
System Administrator
≠ Technical Reviewer
≠ Receipt Evidence Verifier
≠ QS Verifier
```

Administration and technical privilege do not imply professional authority.

## External-system boundary

An external observation enters through:

```text
boundary validation
→ application authorization
→ owning aggregate decision
→ accepted Domain Event
```

External provider status never writes canonical business state directly.

Examples:

```text
email sent ≠ formal acknowledgement
file uploaded ≠ evidence verified
courier delivered ≠ receipt evidence verified
OCR suggestion ≠ professional decision
```

## Authority decisions still requiring DPIK approval

1. Who accepts a Work Thread outcome?
2. Who appoints and replaces reviewers?
3. May a PM technically approve?
4. Who approves a Submission for dispatch?
5. Who verifies Receipt Evidence for each client/Project?
6. Can uploader and verifier ever be the same person?
7. Who may waive a Claim Requirement?
8. Who performs or reverses QS verification?
9. Who approves and activates configuration?
