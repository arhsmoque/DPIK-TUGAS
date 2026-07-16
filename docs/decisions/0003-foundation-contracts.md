# 0003 — Foundation contracts (WP-010)

Status: Accepted
Date: 2026-07-16

## Decision

`src/foundation/` implements the WP-010 deliverables literally: branded identifiers (`Brand<T,B>`, one type per aggregate rather than raw `string` everywhere), `Result<T,E>` with `fromThrowable` as the one sanctioned escape hatch for adapter code converting exceptions, `CommandEnvelope`/`DomainEventEnvelope` generic over aggregate id type (so a command can't be built against the wrong aggregate and have TypeScript stay quiet about it), `ClockPort`/`IdPort` with test doubles (`FixedClock`, `SequentialIdPort`), correlation/causation helpers, and canonical payload hashing (order-independent key sort, SHA-256) backing the default idempotency-key derivation in `buildCommand`.

`buildCommand`/`buildEvent` exist as more than type definitions on purpose: WP-010 is meant to be load-bearing infrastructure the first real module (WP-020) calls, not a types-only package nobody exercises until much later. Idempotency key defaults to a canonical hash of `commandType + aggregateId + payload`; callers with a natural business key (e.g. "one AssignWork per acknowledgement window") can supply their own, since the hash-default only dedupes exact-payload repeats, not business-meaning repeats with a different payload shape.

## Deferred: mechanically blocking test-double imports from application/adapter code

`FixedClock` and `SequentialIdPort` are documented as test-only, but `check-architecture.mjs` does not yet fail a build that imports them from `src/modules/*/application/`. Reason: the checker currently only distinguishes `domain` from everything else by folder name; blocking test-double imports needs it to also recognize `application`/`adapters` layers specifically, which is a small addition better done once WP-020 gives it real files to validate against rather than only fixtures. Tracked here rather than silently skipped.

## Consequence

`src/modules/` remains empty; this is pure foundation. The architecture gate now checks two trees (`src/modules`, `src/foundation`) instead of one -- `checkFoundation` enforces the whole foundation tree stays framework/provider-free, since a leak here would reach every module transitively rather than being contained to one module's domain layer.
