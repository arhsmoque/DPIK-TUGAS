# Dispatch

Owns one custody journey per Dispatch Attempt. Delivery does not verify receipt evidence
(`receipt-evidence` owns that separate truth) — `Delivered` here means the custodian reports the
package reached the destination, nothing about whether the intended recipient has been proven to
have accepted it.

A failed attempt is never reused or reset; `CreateReplacementDispatchAttempt` starts a new
`Prepared` attempt carrying `replacesDispatchAttemptId`, so the failure stays in history
(BOM-DISP-002) rather than being silently overwritten.

A custodian may be an external courier or a DPIK staff member delivering informally — either way
this module grants no project access; an internal custodian's identity is optionally recorded for
reimbursement only (BOM 5.7 / 10.2).
