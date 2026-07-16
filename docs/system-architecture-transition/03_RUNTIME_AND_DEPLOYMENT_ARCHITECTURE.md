# Turn 3 — Runtime and Deployment Architecture

Status: `RUNTIME AND DEPLOYMENT MODEL ESTABLISHED`

## Central decision

```text
one modular-monolith codebase
one coordinated release
one canonical PostgreSQL business store
three isolated runtime adapters
```

### `tugas-internal`

```text
internal SPA
verified Supabase identity
actor-context resolution
authenticated commands and queries
application authorization
permission-shaped results
```

### `tugas-delivery`

```text
separate minimal delivery SPA
opaque capability exchange
one Dispatch projection
permitted delivery actions
signed evidence-upload intents
stricter browser security policy
```

### `tugas-jobs`

```text
transactional outbox
Process Manager reactions
due timers
projection updates
dead letters
orphaned upload cleanup
health breadcrumbs
```

Runtime separation preserves trust and secret isolation; it does not create microservices. The runtimes share domain/application modules, release identity and one business data platform.

## Synchronous versus asynchronous

Synchronous:

```text
one user command
→ one aggregate decision
→ one atomic local commit
```

Asynchronous:

```text
accepted event
→ transactional outbox
→ jobs runtime
→ Process Manager, projection or external effect
```

The command transaction atomically records:

```text
aggregate snapshot
Domain Events
outbox records
command receipt
idempotency record
```

## Data clients

```text
UserContextQueryClient
→ publishable key + verified user token
→ RLS-bound projection reads

ServerCommandPersistenceClient
→ backend-only secret key
→ purpose-specific atomic commit functions
```

Secret-key clients are server-only and narrow because they bypass RLS. Separate backend keys are used for internal, delivery and jobs runtimes.

## Temporary capability exchange

```text
raw opaque token URL
→ validate capability
→ secure HttpOnly delivery-session cookie
→ redirect to clean URL
```

The raw token is not persisted, logged or retained in navigation history longer than necessary.

## Database-backed jobs first

```text
command transaction
→ PostgreSQL outbox/timer/process record
→ Cloudflare Cron wake-up
→ bounded lease
→ idempotent processing
```

Cron is a wake-up mechanism, not business time authority. Cloudflare Queues, Cloudflare Workflows and Temporal remain deferred behind ports.

## Evidence upload

```text
authorize upload intent
→ allocate immutable Evidence Item path
→ issue signed upload URL
→ direct binary upload
→ confirm object metadata
→ accept Evidence Item
→ later submit for verification
→ human verification
```

A technically valid upload URL cannot extend expired business authority. Evidence objects are not overwritten; replacement creates new identity.

## Environments

```text
local
CI
preview
pilot
production
```

Pilot and production use dedicated Supabase projects, storage namespaces, Worker names and secrets. Preview and CI never use production data or production credentials.

## Coordinated deployment

```text
1. freeze release candidate
2. run CI and qualification
3. verify backup/recovery point
4. apply expand-only migration
5. verify migration and RLS
6. deploy jobs paused
7. deploy internal runtime
8. deploy delivery runtime
9. run readiness checks
10. enable jobs
11. run smoke tests
12. observe outbox/process/projections
13. accept release
```

## Failure containment

```text
Internal runtime unavailable
→ users cannot act; accepted truth remains

Delivery runtime unavailable
→ custodian retries; Dispatch truth remains

Jobs runtime unavailable
→ outbox, timers and projections accumulate durably

Cron delayed
→ next run claims all due work

Storage upload confirmed late
→ object remains unconfirmed until authorized command

Projection failure
→ aggregate truth remains; UI exposes stale projection
```
