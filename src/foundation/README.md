# src/foundation

The shared kernel every module's domain/application layer depends on. Framework/provider-free, enforced by `npm run test:architecture` (`checkFoundation`) across the whole tree, not just a `domain/` subfolder — a leak here reaches every module transitively.

```text
ids/        branded identifiers (Brand<T,B>), createId/parseId, one type per aggregate
result/     Result<T,E>, ok/err/map/flatMap/match, fromThrowable for adapter boundaries
envelopes/  CommandEnvelope, DomainEventEnvelope, correlation/causation helpers,
            buildCommand/buildEvent (wire ClockPort + IdPort + canonical hashing)
ports/      ClockPort (SystemClock/FixedClock), IdPort (RandomIdPort/SequentialIdPort)
hashing/    canonicalStringify (order-independent), hashPayload (SHA-256) --
            backs the default idempotency-key derivation in buildCommand
```

`FixedClock` and `SequentialIdPort` are test doubles — importing them from application/adapter code is itself an architecture violation in spirit (not yet mechanically enforced; see `docs/decisions/0003-foundation-contracts.md` for why that's deferred rather than added now).

Owned by WP-010. First consumer: WP-020 (Identity Access, Project Context).
