# Receipt Evidence

Owns whether submitted proof sufficiently demonstrates receipt of an intended package by the
intended recipient. Delivery (`dispatch`) and receipt-evidence sufficiency are separate truths
(BOM-DISP-003) — a Dispatch Attempt being `Delivered` implies nothing here.

`VerifyReceiptEvidence` refuses a verifier who is also an uploader unless `selfVerified: true` is
explicit, mirroring `deliverable`'s `selfApproved` pattern (role matrix separation-of-duty exception
#2: "an identity cannot verify Receipt Evidence it uploaded").

Rejected, Withdrawn, and Invalidated attempts never satisfy a Claim Requirement (BOM-EVID-002) —
`claim` reads this module's state, it never re-derives that rule itself.
