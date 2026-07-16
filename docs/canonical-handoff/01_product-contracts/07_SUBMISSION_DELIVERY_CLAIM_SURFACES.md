# 07 — Submission, Delivery and Claim Surfaces

## Four truth bands

Every Submission surface displays:

```text
Document condition
Custody condition
Evidence condition
Claim effect
```

Example:

```text
Document: Receipt pending
Custody: Delivered
Evidence: Rejected
Claim: Blocked
```

## Submission Register entry

Shows:

```text
reference
project
manifest
recipient
latest Dispatch Attempt
latest Evidence Attempt
Claim relationship
blocking reason
owner
next action
```

## Submission manifest

Manifest items bind to exact Deliverable Revision IDs.

Later revisions never replace the manifest automatically.

## Dispatch Attempt

One attempt equals one custody journey.

Required data:

```text
custodian
destination
recipient contact
package summary
assigned time
collected time
delivered or failed time
failure reason
replacement relationship
```

## External delivery

Permitted:

```text
confirm collection
report delivery
report failure
upload proof
```

No project membership or browsing.

## Receipt Evidence

Evidence types:

```text
stamped cover letter
signed acknowledgement
client document-control receipt
official email acknowledgement
courier proof
delivery photograph
recipient confirmation
```

Upload produces `PendingVerification`.

Verifier decides:

```text
VerifyReceiptEvidence
RejectReceiptEvidence
```

## Rejection correction

Evidence-only correction:

```text
UploadReplacementReceiptEvidence
```

Physical correction:

```text
CreateReplacementDispatchAttempt
```

Original attempts remain unchanged.

## Claim Package

Displays each mandatory requirement and qualifying evidence.

Readiness:

```text
all mandatory requirements Satisfied or authorised Waived
→ ReadyForQSReview
```

Human QS then verifies.

## Prohibited

- Delivered equals claim-ready
- courier verifies proof
- rejected proof replaced in place
- failed Dispatch reset
- manifest edited after issue
- claim readiness checkbox
- generic attachment pile
