# Deliverable module guidance

- Own revision identity, submission, internal review decisions, and withdrawal.
- Model every mutation as a named command producing accepted events; never expose a generic status
  setter.
- Keep `decide` and `evolve` pure and provider-free. Candidate permission and Project eligibility
  checks happen in the application layer, matching `work-thread`'s convention.
- Rejected decisions emit no accepted event and leave prior state untouched.
- Revision history lives in append-only events; never overwrite or reinterpret an earlier revision's
  own facts. Superseding only ever adds a forward pointer (`supersededBy`) on the prior revision.
- Export cross-module contracts only through `index.ts`.
- `deliverable.approve` (this module) and `submission.approve_dispatch` (future `submission` module)
  are separate truths (`01_PRODUCT_CONTRACT.md` independent-truths model) — do not conflate them.
