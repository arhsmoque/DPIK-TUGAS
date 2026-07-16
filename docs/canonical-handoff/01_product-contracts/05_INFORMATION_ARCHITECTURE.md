# 05 — Information Architecture

## One internal application

Use one permission-aware application shell.

Separate only the external delivery surface because its trust boundary differs.

## Primary navigation

```text
My Attention
My Work
Projects
Review
Submissions
Claims
Management
Administration
```

Visibility is permission-aware.

## Project workspace

```text
Overview
Work
Deliverables
Submissions
Claims
Activity
Members
```

## Canonical routes

```text
/attention
/work
/projects
/projects/:projectId
/projects/:projectId/work/:workThreadId
/projects/:projectId/deliverables/:deliverableId
/projects/:projectId/submissions/:submissionId
/projects/:projectId/claims/:claimPackageId
/review
/submissions
/dispatches/:dispatchAttemptId
/receipt-verification
/receipt-evidence/:receiptEvidenceAttemptId
/claims
/management/attention
/administration/staff              — bulk CSV/TXT roster import + individual add/remove
/administration/capabilities       — grant/revoke capability bundles, with basis
/administration/configuration
/administration/dev-console        — platform status (Supabase, Cloudflare, keep-alive job) + feedback triage
/delivery/access/:opaqueToken
```

## Every operational surface shows

```text
project
record reference
current condition
owner
next action
due or waiting deadline
blocking reason
data freshness
```

## Read models

```text
GetMyAttention
ListMyWork
GetProjectWorkspace
GetWorkThread
GetDeliverableReviewWorkspace
GetReviewQueue
ListSubmissionRegister
GetSubmissionWorkspace
GetDispatchStatus
GetReceiptVerificationQueue
GetClaimReadiness
GetManagementAttention
```

## State language

Never use colour alone.

Good:

```text
Claim Blocked
Verified acknowledgement missing.
Owner: Document Control
Overdue by 2 days.
```

## External delivery projection

Expose only:

```text
destination
recipient contact
package summary
delivery instruction
proof requirement
permitted actions
expiry
```

Exclude project navigation, technical documents, claims and unrelated records.
