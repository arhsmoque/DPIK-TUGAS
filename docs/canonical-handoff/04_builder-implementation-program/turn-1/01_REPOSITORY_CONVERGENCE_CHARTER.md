# Repository Convergence Charter

## Canonical inputs

```text
Product Contract
→ required product outcomes and exclusions

System Architecture and Transition Pack
→ system boundaries, ownership, transitions and Process Manager

Canonical Engineering Bundle
→ code structure, testing, diagnostics and operations

Repository
→ implementation under proof

Legacy repository
→ evidence and migration source only
```

## Greenfield rule

```text
Greenfield architecture.
Brownfield evidence.
```

Retain proven behavior, fixtures, assets and utilities only after classification.

Do not inherit legacy status vocabulary, direct Supabase business mutation, fake authorization, giant App/Admin components, cross-module table ownership or screen-defined workflow.

## Repository target shape

```text
apps/
  internal/
  delivery/
  jobs/

src/
  foundation/
  modules/
  composition/

supabase/
  migrations/
  seed/
  tests/

tests/
  architecture/
  contracts/
  integration/
  browser/
  five-path/

docs/
  product/
  architecture/
  engineering/
  decisions/
  operations/
  evidence/

scripts/
  verify/
  generate/
  diagnostics/
```

## Repository rules

1. Every module exposes a public `index.ts`.
2. Cross-module imports use public contracts only.
3. Browser code cannot mutate protected business tables.
4. One command handler targets one aggregate.
5. Every accepted mutation produces a command receipt and Domain Event.
6. Every temporary fixture is marked `proposed_default`.
7. Every PR names the contracts it implements.
8. Every session touching files leaves a validated trace.
9. The repository remains runnable after each merged PR.
10. No premature generic workflow, rules or plugin framework.

## First implementation boundary

```text
Authenticate
→ resolve current Project membership
→ CreateWorkThread
→ AssignWork
→ AcknowledgeAssignment
→ query My Work
```

It must prove the architecture in miniature before the repository broadens.
