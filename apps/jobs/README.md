# apps/jobs

Background/operational runtime — not served to a browser. Currently: the outbox publisher.

## Outbox publisher (`src/outbox-publisher.mjs`)

Implements the "notify + deep link" transport: polls `public.outbox_messages` for events not yet
published, resolves who should hear about it, and sends a notification containing a deep link back
into TUGAS. The actionable step always happens through an authenticated TUGAS session — the
notification is a pointer, never a command channel. See `docs/decisions/` for why (email-reply-driven
actions were deferred, not chosen; weaker identity proof than a TUGAS session).

### Configuration

| Env var | Required | Purpose |
|---|---|---|
| `SUPABASE_URL` | yes | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Server-side only, never browser code — see root `AGENTS.md` |
| `APP_BASE_URL` | no (defaults to `http://127.0.0.1:4173`) | Used to build the deep link in each notification |
| `RESEND_API_KEY`, `NOTIFY_FROM_ADDRESS` | no | When both are set, notifications actually send via Resend. Without them, the worker runs against a console notifier that logs what it would have sent and does nothing else — safe to run with no provider configured. |

No email provider is configured in this environment. Until one is, this worker is a complete,
tested no-op with respect to actually delivering mail — the plumbing (recipient resolution,
templating, retry, dead-lettering) is real and covered by `src/notify.test.mjs`; only the send step
is inert.

### Running

```
node apps/jobs/src/outbox-publisher.mjs            # single pass
node apps/jobs/src/outbox-publisher.mjs --watch     # poll every 60s
node apps/jobs/src/outbox-publisher.mjs --watch --interval-ms 30000
```

Not yet wired into a scheduler (cron, GitHub Actions, etc.) — that's a deployment decision, not a
code gap: pick a schedule once the app has a real hosting target (see `gaps-findings.md`).

### Retry and dead-lettering

Failed sends increment `attempt_count` and are retried on the next pass. After 5 failed attempts a
message is logged as dead-lettered to stderr and stops being retried automatically — it stays
`published_at IS NULL` in the table so it remains visible for manual follow-up rather than silently
disappearing.
