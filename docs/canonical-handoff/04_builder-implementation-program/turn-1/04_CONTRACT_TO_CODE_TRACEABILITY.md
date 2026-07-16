# Contract-to-Code Traceability

| Contract | Code target | Required proof |
|---|---|---|
| `WT-01 CreateWorkThread` | Work Thread domain/application | accepted + rejection + event evolution |
| `WT-02 AssignWork` | Work Thread domain/application | eligible member + due policy + negative actor |
| `WT-03 AcknowledgeAssignment` | Work Thread domain/application | current-assignee relation |
| command envelope | foundation | runtime schema + canonical hash |
| Domain Event envelope | foundation/persistence | append-only and aggregate-version uniqueness |
| actor-context contract | Identity Access | current membership and scope |
| one-command/one-aggregate | architecture tests | prohibited cross-module mutation |
| My Work projection | Attention Projections | freshness and permission shaping |
| internal Worker route | internal app | auth, authorization, command receipt |
| RLS matrix | Supabase tests | anonymous/cross-Project/inactive denied |

## Status vocabulary

```text
NOT_STARTED
SCAFFOLDED
IMPLEMENTED
VERIFIED
MISMATCH
BLOCKED_BY_APPROVAL
```

Code review alone cannot produce `VERIFIED`; executable evidence is required.
