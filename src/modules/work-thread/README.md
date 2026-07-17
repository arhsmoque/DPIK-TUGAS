# Work Thread

Owns the accountability lifecycle that begins with an instruction or obligation. WP-100 implements
the first three canonical transitions as a pure event-sourced domain:

```text
WT-01 CreateWorkThread       nonexistent → Unassigned
WT-02 AssignWork             Unassigned → AwaitingAcknowledgement
WT-03 AcknowledgeAssignment  AwaitingAcknowledgement → Assigned
```

The legacy `todo → doing → done` cycle was inspected but intentionally not salvaged: it permits
generic status mutation, uses typed email as identity, and cannot preserve assignment acceptance.
Its list bucketing/search behavior may still be reconsidered later for projections, where it fits.

