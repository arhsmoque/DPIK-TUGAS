# DPIK TUGAS Opportunities — KIV

The filename preserves the operator-requested spelling. These are keep-in-view opportunities, not current authorization. Promote an item only when its activation gate is met; record implementation decisions in `docs/decisions/`.

| Opportunity                                     | Value                                                                                              | Activation gate                                                                                     |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Trusted cloud-agent verification workflow       | Gives every agent reproducible build, linked migration-history, database-lint, and evidence output | Token rotated; trusted-event/fork threat model approved; workflow gets least-privilege secrets only |
| Preview deployment with Supabase Auth redirects | Replaces machine-bound startup with a shareable non-production operator path                       | WP-130 security gates pass and operator authorizes a hosting target/redirect URLs                   |
| Command idempotency receipts                    | Makes duplicate requests and lost responses safe and observable                                    | Command envelope and retention policy agreed; database uniqueness and replay semantics specified    |
| Domain/RPC contract harness                     | Prevents TypeScript domain rules and SQL RPC guards from drifting                                  | Reference transitions stabilized and both adapters can run against the same acceptance vectors      |
| Outbox worker and projection health             | Enables reliable asynchronous projections with retry/dead-letter visibility                        | Delivery semantics, retry ownership, and operational alert thresholds agreed                        |
| Legacy schema/policy retirement plan            | Reduces collision and security debt without risking brownfield data                                | Inventory, backup/restore proof, owner sign-off, and explicit production authority                  |
| Automated two-actor browser fixtures            | Makes RLS, separation-of-duty, stale-version, and recovery proof repeatable                        | Safe test-account lifecycle and email-link strategy available in CI                                 |
| Operator health console                         | Shows application, Supabase, migration, outbox, and projection status without command typing       | Health contracts and safe diagnostic endpoints defined                                              |
| Staff roster and capability bootstrap           | Removes one-off identity setup while preserving reasoned grants                                    | Source roster, identity matching, approval owner, and audit requirements confirmed                  |
| Publishable-key migration review                | Keeps browser configuration aligned with Supabase's current public-key model                       | Provider compatibility checked; staged rotation and rollback plan approved                          |
| Local database reproducibility                  | Enables safe shadow diffs, dumps, recovery drills, and offline development                         | Docker Desktop or an approved PostgreSQL/Supabase-compatible alternative is available               |

## Suggested order after blockers clear

1. Rotate the exposed management token and make cloud verification safe.
2. Complete WP-130 two-user, RLS, concurrency, idempotency, and recovery proof.
3. Add a trusted preview environment and automated browser qualification.
4. Implement outbox delivery and operator health visibility.
5. Plan legacy retirement and canonical Project-table convergence only with production authority.
