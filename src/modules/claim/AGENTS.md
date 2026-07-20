# Claim module guidance

- Own claim requirements, evidence linkage, waiver requester/approver separation, derived
  readiness, QS verification, and the Open/Submitted/Closed/Cancelled lifecycle.
- Never add a command that sets `readiness` directly. It is always computed by `deriveReadiness()`
  in `evolve.ts` from the current requirement set -- see `claim.ts` for why.
- Model every mutation as a named command producing accepted events; never expose a generic status
  setter.
- Keep `decide` and `evolve` pure and provider-free.
- `LinkClaimEvidence` records a structural reference (kind + id) to a Receipt Evidence or
  Deliverable fact. This module does not import `@modules/receipt-evidence` or
  `@modules/deliverable` internals to verify the reference -- resolving and verifying it before
  linking is an application-layer concern (Authoritative Fact Reference pattern).
- Export cross-module contracts only through `index.ts`.
