# 0006 — Non-production startup

Status: Accepted for startup qualification  
Date: 2026-07-18

## Decision

The first executable startup is the authorized A1 path:

```text
Supabase magic-link authentication
→ resolve DPIK Tugas Project context
→ CreateWorkThread
→ AssignWork
→ AcknowledgeAssignment
→ My Work
```

Protected mutations are security-definer RPC commands. Browser roles have no table mutation grants;
RLS shapes reads. Each accepted command atomically updates the Work Thread, appends one Domain Event
and writes one outbox message. Authority rows are marked proposed and not production-approved.

The retained legacy `public.projects` table uses bigint identifiers. The canonical UUID Project
table is temporarily named `public.tugas_projects` to prevent destructive conversion or ambiguous
ownership. It will receive the canonical name only during an approved legacy-retirement migration.

Browser configuration is loaded from `$ARH_VAULT` by the launcher and injected only into the Vite
process. No credential value is committed to the repository or written to evidence.

