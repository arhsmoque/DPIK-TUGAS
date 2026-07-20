# Dispatch module guidance

- Own one custody journey per Dispatch Attempt: assignment, collection, delivery/failure, and
  cancellation. Nothing about receipt-evidence sufficiency (that's `receipt-evidence`).
- Model every mutation as a named command producing accepted events; never expose a generic status
  setter.
- Keep `decide` and `evolve` pure and provider-free.
- `Delivered` never moves backward. A failed or cancelled attempt is terminal; recovery always
  creates a new attempt via `CreateReplacementDispatchAttempt`, never a reset of the old one.
- Export cross-module contracts only through `index.ts`.
