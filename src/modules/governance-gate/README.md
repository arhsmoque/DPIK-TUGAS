# Governance gate

Gives the operator an absolute veto over any blocking gate in the app, instead of that gate
existing only as prose in `AGENTS.md`/`gaps-findings.md` with no way to actually defer it.

First concrete instance: the "Operational approval is unsigned" gate (`gate_type =
'operational_approval'`), seeded once per project.

## Lifecycle

`Open -> Deferred -> Open` (via `ReconsiderGateDeferral`, the "change my mind" path) and
`Open | Deferred -> Approved` (formal sign-off, the strictly stronger state -- legal from either,
clears any active deferral).

Deferring is the operator's "run it anyway" override: logged (who, why, when), visibly warned about
wherever the gate would have blocked, and never auto-expires. Approving is a distinct, separately
assignable authority (see `governance.approve_gate:<gate_type>`, wired into a role bundle via the
existing `grant_role_bundle` mechanism -- no new grant system).

## Adding a new gate type

1. Add a `GateType` literal in `domain/governance-gate.ts`.
2. Seed one `governance_gates` row per project for the new type (forward migration).
3. Seed one new `governance.approve_gate:<type>` permission and a matching `role_bundles` row.

No new table, command, or RPC.
