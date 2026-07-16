# Pull-Request and Branch Strategy

The final architecture PR must enter `main` before implementation branches are cut from the canonical base.

## Recommended sequence

```text
PR 3: build/repository-foundation
PR 4: build/identity-project-context
PR 5: build/work-thread-reference-slice
PR 6: build/deliverable-submission
PR 7: build/dispatch-delivery-access
PR 8: build/receipt-evidence-claim
PR 9: build/formal-submission-process-projections
PR 10: test/five-path-pilot-readiness
```

Each PR contains one reviewable capability and its proof.

## Required PR body

```text
Purpose
Contracts implemented
Modules/tables owned
Commands/events added
Authority assumptions
Migration impact
Tests and negative tests
Observability
Mismatch result
Known gaps
Rollback
```

## Merge gate

```text
architecture gates pass
typecheck passes
module tests pass
database tests pass where applicable
security negatives pass
trace/evidence attached
no undocumented transition
```
