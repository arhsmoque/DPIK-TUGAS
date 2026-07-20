# Claim

Owns claim requirement tracking and derived readiness. `ClaimReady` is deliberately not a thing
here (`05_LOCAL_TRANSITION_MATRICES.md` retires it as ambiguous) — `readiness` is always one of
`EvidenceIncomplete` / `ReadyForQSReview` / `QSVerified`, recomputed by `deriveReadiness()` after
every event that changes a requirement, never set directly by a command. This closes off an entire
bug class (a claim that reads "ready" while a requirement quietly isn't) by construction rather than
by discipline.

`ReadyForQSReview` is deterministic evidence completeness; `QSVerified` is the human professional
decision on top of it (BOM-CLAIM-002) — `VerifyClaimPackage` requires the former before it can
produce the latter.

Waiver requester and approver are separated (`ApproveClaimRequirementWaiver` rejects the requester
approving their own request) — this one has no self-approval escape hatch in this module, unlike
`deliverable`'s reviewer or `receipt-evidence`'s verifier, because BOM-CLAIM-003 does not describe an
equivalent single-person exception for claim waivers.
