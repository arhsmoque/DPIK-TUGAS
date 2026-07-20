# Submission

Owns the formal issue package identity: an exact, frozen manifest of approved Deliverable
revisions bound for one recipient (client or authority), gated behind the Authorized Signatory
before it may proceed to dispatch.

Per `05_LOCAL_TRANSITION_MATRICES.md`: `InDelivery`, `ReceiptPending`, `Acknowledged` and
`ClaimLinked` are deliberately **not** Submission states — those belong to Dispatch, Receipt
Evidence and Claim, which is why legacy's flat `drafted → sent → received` Transmittal status was
refactored into four separate modules here rather than ported as one aggregate. A Submission being
`ReadyForDispatch` says nothing about whether any Dispatch Attempt has happened yet.

`ApproveSubmissionForDispatch` records a credential reference but does not verify it — validating
that the actor currently holds the Authorized Signatory (PEPC) capability is an application-layer /
Configuration concern (`04_ROLE_AND_AUTHORIZATION_MATRIX.md`), not something the pure domain checks.
