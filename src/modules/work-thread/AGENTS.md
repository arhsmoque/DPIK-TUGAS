# Work Thread module guidance

- Own responsibility, assignment, acknowledgement, execution, due commitments, blockers, outcome
  acceptance, and closure.
- Model every mutation as a named command producing accepted events; never expose a generic status
  setter.
- Keep `decide` and `evolve` pure and provider-free. Authentication, membership, and candidate
  permission checks happen in the application layer before domain decisions.
- Rejected decisions emit no accepted event and leave prior state untouched.
- Assignment history lives in append-only events; never overwrite or reinterpret old assignments.
- Export cross-module contracts only through `index.ts`.
