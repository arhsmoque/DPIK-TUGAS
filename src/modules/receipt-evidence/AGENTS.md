# Receipt Evidence module guidance

- Own evidence item collection, submission for verification, the verify/reject decision, withdrawal,
  and invalidation of a prior verification. Nothing about Dispatch custody or Claim readiness.
- Model every mutation as a named command producing accepted events; never expose a generic status
  setter.
- Keep `decide` and `evolve` pure and provider-free.
- A replacement attempt (`CreateReplacementReceiptEvidenceAttempt`) is required when correction
  needs new physical proof; do not reset or reopen a Rejected/Withdrawn attempt in place.
- Export cross-module contracts only through `index.ts`.
