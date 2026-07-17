# Identity Access module guidance

- Own authenticated internal identity and the identity-provider boundary.
- Do not infer identity from typed email, request payloads, or UI state.
- Provider-specific code belongs under `adapters/`; domain and application code remain provider-free.
- Export cross-module contracts only through `index.ts`.
- Authentication establishes identity only. It does not establish organisation membership,
  Project membership, permission, professional authority, or record relationship.
