# Project Context module guidance

- Own organisation memberships, Project memberships, role bundles, assignments, and actor context.
- Candidate permission is necessary but never sufficient for a business command. Downstream handlers
  must still check relationship, professional authority, separation of duty, guards, and version.
- Resolve scope from repository facts; never trust client-supplied membership or role claims.
- Keep time-dependent membership and assignment evaluation explicit and deterministic.
- Export cross-module contracts only through `index.ts`.
