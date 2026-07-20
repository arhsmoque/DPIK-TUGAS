# Governance gate module guidance

- Owns the Open/Deferred/Approved lifecycle for any blocking gate in the app. One row per
  `(project, gate_type)` -- see `governance_gates`.
- Approving a gate is the strictly stronger state: `ApproveGate` is legal from both `Open` and
  `Deferred`, and clears any active deferral. There is no separate "reconsider before approving"
  step.
- Deferral is the operator's absolute-veto override ("run it anyway, at my own risk"), not a second
  approval path. It never expires and is never silently cleared by anything other than
  `ReconsiderGateDeferral` or `ApproveGate`.
- There is no `CreateGate` command. Gate rows are seeded directly by migration -- adding a new gate
  type is a new `GateType` literal plus one seeded `governance_gates` row and one new
  `governance.approve_gate:<type>` permission, not new code.
- Authorization (who may defer/reconsider/approve) is enforced entirely at the SQL RPC layer via
  `has_project_permission`, not in `decide.ts`.
- Keep `decide` and `evolve` pure and provider-free.
- Export cross-module contracts only through `index.ts`.
