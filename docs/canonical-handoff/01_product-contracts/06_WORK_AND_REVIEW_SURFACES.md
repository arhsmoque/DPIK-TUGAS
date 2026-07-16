# 06 — Work and Review Surfaces

## Surface set

```text
My Work
Create Work Thread
Work Thread Detail
Create Deliverable
Deliverable Review Workspace
Review Queue
```

## Work Thread detail

Required regions:

```text
record header
expected outcome
source
assignment
due commitments
structured updates
blocker
related Deliverables
outcome acceptance
activity history
```

## Structured updates

Allowed types:

```text
Progress
Blocker
Question
Clarification
Decision
Commitment note
```

Avoid chat-like noise.

## Assignment path

```text
WorkAssigned
→ AssignmentAcknowledged
→ WorkStarted
```

Reassignment preserves previous ownership, reason and time.

## Due commitment

Changing a due date creates a new commitment and preserves:

```text
original due date
new due date
approver
reason
overdue history
```

## Blocker

Required:

```text
blocked outcome
reason
required resolver
effect
needed-by time
```

## Deliverable Revision

Contains:

```text
revision ID
human label
repository reference
prepared by
prepared at
change summary
supersedes revision
fingerprint where practical
```

## Review decision

Contains:

```text
exact revision
reviewer
decision
comments
time
authority snapshot
```

## Revision path

```text
Draft
→ InReview
→ RevisionRequired
→ Resubmitted
→ Approved
```

Earlier revisions and decisions remain immutable.

## Approval meaning

Approval means internal technical acceptance only.

It does not mean:

```text
client submitted
physically delivered
receipt verified
claim ready
```

## Review Queue priority

```text
overdue review
claim-linked review
oldest waiting
submission deadline
```

## Prohibited

- generic "Done" checkbox
- one status dropdown
- approval through chat comment
- revision overwrite
- silent deadline change
- self-approval through admin access
