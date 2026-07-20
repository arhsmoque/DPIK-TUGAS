# Submission module guidance

- Own submission identity, manifest freezing, and dispatch authorization -- nothing about custody,
  evidence, or claim readiness (those are `dispatch`, `receipt-evidence`, and `claim`).
- Model every mutation as a named command producing accepted events; never expose a generic status
  setter.
- Keep `decide` and `evolve` pure and provider-free.
- The manifest is append-only once items are added; `PrepareSubmission` freezes it (no further
  `AddManifestItem` in any later status). A later Deliverable revision never rewrites what an
  already-Prepared manifest named -- see `SupersedeSubmission` for the correct way to issue a
  replacement.
- Export cross-module contracts only through `index.ts`. This module references Deliverable
  revisions by id + a copied label/reference snapshot, not by importing `@modules/deliverable`
  internals -- the manifest is a frozen fact, not a live join.
