# DPIK TUGAS Opportunities — KIV

The filename preserves the operator-requested spelling. These are keep-in-view opportunities, not current authorization. Promote an item only when its activation gate is met; record implementation decisions in `docs/decisions/`.

| Opportunity                                     | Value                                                                                                  | Activation gate                                                                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Trusted cloud-agent verification workflow       | Gives every agent reproducible build, linked migration-history, database-lint, and evidence output     | Token rotated; trusted-event/fork threat model approved; workflow gets least-privilege secrets only                          |
| Preview deployment with Supabase Auth redirects | Replaces machine-bound startup with a shareable non-production operator path                           | WP-130 security gates pass and operator authorizes a hosting target/redirect URLs                                            |
| Command idempotency receipts                    | Makes duplicate requests and lost responses safe and observable                                        | Command envelope and retention policy agreed; database uniqueness and replay semantics specified                             |
| Domain/RPC contract harness                     | Prevents TypeScript domain rules and SQL RPC guards from drifting                                      | Reference transitions stabilized and both adapters can run against the same acceptance vectors                               |
| Outbox worker and projection health             | Enables reliable asynchronous projections with retry/dead-letter visibility                            | Delivery semantics, retry ownership, and operational alert thresholds agreed                                                 |
| Legacy schema/policy retirement plan            | Reduces collision and security debt without risking brownfield data                                    | Inventory, backup/restore proof, owner sign-off, and explicit production authority                                           |
| Automated two-actor browser fixtures            | Makes RLS, separation-of-duty, stale-version, and recovery proof repeatable                            | Safe test-account lifecycle and email-link strategy available in CI                                                          |
| Operator health console                         | Shows application, Supabase, migration, outbox, and projection status without command typing           | Health contracts and safe diagnostic endpoints defined                                                                       |
| Staff roster and capability bootstrap           | Removes one-off identity setup while preserving reasoned grants                                        | Source roster, identity matching, approval owner, and audit requirements confirmed                                           |
| Publishable-key migration review                | Keeps browser configuration aligned with Supabase's current public-key model                           | Provider compatibility checked; staged rotation and rollback plan approved                                                   |
| Local database reproducibility                  | Enables safe shadow diffs, dumps, recovery drills, and offline development                             | Docker Desktop or an approved PostgreSQL/Supabase-compatible alternative is available                                        |
| Capacitor Android in-house shell                | Gives staff a dedicated app icon and full-screen task experience while reusing React/Vite and Supabase | WP-130 passes; responsive touch UX is proven; package ID, signing-key custody, update channel, and device count are approved |

## Android in-house direction — 2026-07-18

Capacitor is the preferred first Android path, not a separate Kotlin rewrite. It can wrap the existing modern web application and add native APIs only where they create real value. Start with an installable pilot shell; keep domain and Supabase behavior shared with the browser build.

Before implementation, decide:

- stable package ID, recommended `my.com.dpik.tugas` subject to DPIK ownership confirmation;
- release signing-key generation, encrypted custody, backup, and recovery owner—the same key is required for future APK updates;
- whether distribution is direct signed APK, a managed-device/enterprise store, or Android Developer Console registration;
- update mechanism and minimum supported Android/WebView version;
- deep-link/magic-link callback behavior, network-loss UX, file/camera permissions, notification need, and secure session storage;
- phone-first navigation and touch layout rather than merely shrinking the desktop screen.

For a small device fleet, a signed APK on a private company download page is workable, but users must approve installs from that source. Managed devices are cleaner if DPIK later adopts mobile-device management. Android's 2026 developer-verification program is beginning regional enforcement and expands globally from 2027, so package registration and signing-key custody should be designed now even without Play Store publication.

Official grounding: [Capacitor documentation](https://capacitorjs.com/docs), [Android alternative distribution](https://developer.android.com/distribute/marketing-tools/alternative-distribution), [Android app signing](https://developer.android.com/studio/publish/app-signing), and [Android developer verification](https://developer.android.com/developer-verification).

## Suggested order after blockers clear

1. Rotate the exposed management token and make cloud verification safe.
2. Complete WP-130 two-user, RLS, concurrency, idempotency, and recovery proof.
3. Add a trusted preview environment and automated browser qualification.
4. Implement outbox delivery and operator health visibility.
5. Plan legacy retirement and canonical Project-table convergence only with production authority.
