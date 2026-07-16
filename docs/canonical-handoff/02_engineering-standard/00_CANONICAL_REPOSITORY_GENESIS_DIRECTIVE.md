# DPIK TUGAS — Canonical Repository Genesis Directive

```text
Repository: DPIK-TUGAS-APP
Repository role: Canonical product repository
Release posture: First production release
Development model: Controlled greenfield implementation
Legacy reference: DPIK-TUGAS-LEGACY-PLAN
Authority: Governing directive for repository inception, salvage, migration and implementation
```

---

## 1. Decision

Create a new repository named:

```text
DPIK-TUGAS-APP
```

Rename the current repository to:

```text
DPIK-TUGAS-LEGACY-PLAN
```

The new repository is the canonical home of the TUGAS product from its first production-oriented implementation.

The renamed repository is not a previous production version. It is a pre-production planning, prototyping and discovery artefact retained for evidence, reference and selective salvage.

The new repository must not be described as:

```text
TUGAS V2
TUGAS Next
TUGAS Rebuild
TUGAS Replacement
TUGAS Revamp
```

It is simply:

> **DPIK TUGAS**

---

## 2. Governing interpretation

The prior repository did not establish a production product contract.

It therefore does not define:

- the canonical domain;
- the canonical database;
- the canonical workflow;
- the canonical UI;
- the canonical authorization model;
- the canonical release lineage.

The new repository begins the canonical product lineage.

Where the accompanying design bundle uses the term `V1`, interpret it as:

> **the bounded scope of the first production release**

It does not mean that the new repository is a revision of the legacy prototype.

The repository name and product identity remain unversioned:

```text
DPIK-TUGAS-APP
```

Release tags may later use semantic versions after a real release baseline exists.

---

## 3. Core doctrine

> **Greenfield architecture, brownfield evidence.**

And:

> **Preserve proven value, not accidental structure.**

The project starts from a clean architectural foundation while preserving useful operational knowledge, data, design assets and tested behaviour from the legacy repository.

The clean start must not become an excuse to:

- ignore operational evidence;
- rebuild speculative platform features;
- introduce unnecessary abstractions;
- reproduce the old application under new filenames;
- discard useful working assets without inspection.

---

## 4. Repository roles

### 4.1 `DPIK-TUGAS-APP`

This is the sole canonical product repository.

It owns:

```text
product contracts
approved workflow contracts
domain model
authorization model
database migrations
RLS policies
application code
UI code
tests
operational controls
deployment configuration
release history
production documentation
```

### 4.2 `DPIK-TUGAS-LEGACY-PLAN`

This is a read-mostly historical reference.

It may be used for:

```text
behaviour discovery
data-shape discovery
visual reference
copy and terminology reference
asset recovery
edge-case discovery
migration mapping
historical rationale
```

It must not become:

```text
a runtime dependency
a package dependency
a submodule dependency
the source of canonical state names
the source of canonical authorization
the source of canonical schema design
a parallel active product
```

---

## 5. No literal mirror rule

Do not create the new repository by copying the complete legacy tree and then deleting unwanted code.

Do not fork the legacy repository as the canonical starting point.

Do not preserve legacy Git history inside the new repository merely for convenience.

Create a clean repository with a new Git history.

The legacy repository should remain independently available so that:

- provenance is preserved;
- original code can be inspected;
- migration decisions can be traced;
- the new repository is not structurally constrained by old assumptions.

The new repository may contain selected copied artefacts only after they pass the salvage protocol in this directive.

---

## 6. Source-of-truth order

When sources disagree, use this precedence:

```text
1. This Repository Genesis Directive
2. Approved Product Contract
3. Approved Canonical Workflow and transition matrices
4. Domain and state model
5. Authorization and RLS directive
6. Information architecture and surface directives
7. Executable acceptance scenarios
8. Current canonical implementation
9. Legacy repository evidence
```

The legacy repository may reveal an overlooked requirement.

It may not silently override an approved contract.

When legacy evidence reveals a genuine conflict:

```text
record the conflict
→ return to the governing contract
→ obtain an explicit decision
→ update the contract
→ then implement
```

---

## 7. Initial repository contents

The new repository should begin with:

```text
README.md
AGENTS.md
00_CANONICAL_REPOSITORY_GENESIS_DIRECTIVE.md
00_V1_BUILD_DIRECTIVE.md
01_PRODUCT_CONTRACT.md
02_CANONICAL_WORKFLOW.md
03_DOMAIN_AND_STATE_MODEL.md
04_ROLE_AND_AUTHORIZATION_MATRIX.md
05_INFORMATION_ARCHITECTURE.md
06_WORK_AND_REVIEW_SURFACES.md
07_SUBMISSION_DELIVERY_CLAIM_SURFACES.md
08_MANAGEMENT_ADMIN_OPERATIONS.md
09_DATABASE_AND_RLS_DIRECTIVE.md
10_REPOSITORY_MODULE_MAP.md
11_IMPLEMENTATION_SEQUENCE.md
12_V1_ACCEPTANCE_SCENARIOS.md
13_V2_DEFERRED_REGISTER.md
lab.config.json
```

The `V1` wording in existing filenames is an internal release-scope label. It does not make the new repository a revision of the old repository.

A later documentation cleanup may rename `V1` to `INITIAL_RELEASE` without changing meaning.

---

## 8. Canonical first commit

The first commit should contain only:

```text
repository identity
governing directives
product and workflow contracts
agent instructions
license or confidentiality notice
minimal README
empty target module structure where useful
```

Suggested commit message:

```text
chore: establish canonical TUGAS product repository
```

Suggested initial tag:

```text
product-genesis
```

Do not place unfinished legacy application code in the first commit.

The first commit should make the product's purpose, boundaries and authority clear before implementation begins.

---

## 9. Legacy repository freeze

Before implementation begins:

1. Rename the current repository to `DPIK-TUGAS-LEGACY-PLAN`.
2. Add a top-level notice stating that it is non-canonical and pre-production.
3. Tag its final reference state.
4. Record its last known schema, routes and deployment.
5. Stop feature development there.
6. Permit only archival corrections or critical evidence-preservation work.

Suggested tag:

```text
legacy-plan-baseline
```

Suggested legacy README notice:

```markdown
# DPIK TUGAS Legacy Plan

This repository contains pre-production planning and prototype work.

It is retained for historical reference, migration evidence and selective
asset recovery.

The canonical product repository is:

DPIK-TUGAS-APP

Do not add new product features here.
```

---

## 10. Salvage protocol

No code or asset is copied merely because it already exists.

Every candidate must be classified as one of:

```text
PORT AS-IS
PORT WITH ADAPTER
REIMPLEMENT FROM CONTRACT
REFERENCE ONLY
REJECT
```

### 10.1 `PORT AS-IS`

Use only when the artefact is:

- isolated;
- understandable;
- tested or demonstrably stable;
- free from legacy authentication and state assumptions;
- aligned with the new architecture;
- cheaper to preserve than recreate.

Likely candidates:

```text
logos
icons
static images
generic pure utilities
proven design tokens
accessible isolated controls
```

### 10.2 `PORT WITH ADAPTER`

Use when the behaviour is valuable but coupled to legacy infrastructure.

Examples:

```text
generic file viewer
date formatting
search presentation
notification presentation
```

The adapter must isolate the legacy assumption.

### 10.3 `REIMPLEMENT FROM CONTRACT`

Use when the product intent is useful but the implementation conflicts with the canonical design.

Likely candidates:

```text
authentication
task-state handling
review workflow
submission tracking
claim status
database mutation
administration
```

### 10.4 `REFERENCE ONLY`

Use when the artefact helps explain:

```text
visual preference
user habit
terminology
known edge case
information density
```

but should not be copied.

### 10.5 `REJECT`

Use when the artefact is:

```text
unsafe
contradictory
unreachable
duplicated
obsolete
unmaintainable
based on anonymous access
based on direct UI state mutation
```

---

## 11. Salvage record

Every ported artefact must record:

```text
legacy repository path
legacy commit or tag
classification
reason for preservation
dependencies
security review
changes made
tests added
canonical destination
```

Suggested register:

```text
migration/legacy-salvage-register.md
```

Example:

```markdown
## Date formatting utility

Legacy source:
src/utils/date.js

Legacy reference:
legacy-plan-baseline

Classification:
PORT AS-IS

Reason:
Pure function, no runtime coupling, existing tests pass.

Canonical destination:
src/domain/shared/date-format.ts

Validation:
Unit tests ported and expanded.
```

---

## 12. No parity-by-default rule

The new application is not required to recreate every legacy screen, field or behaviour.

The implementation target is:

```text
approved product capability
```

not:

```text
legacy feature parity
```

A legacy capability is carried forward only when it:

- supports the approved product contract;
- belongs inside the first production scope;
- has a valid transition and authority;
- passes the salvage decision.

Absence from the new application is not a regression when the legacy element was accidental, unsafe, duplicated or outside scope.

---

## 13. No legacy debugging programme

Do not spend significant effort making the legacy application clean enough to become the new foundation.

Investigate legacy code only when needed to:

```text
understand behaviour
extract data
identify hidden edge cases
recover proven assets
confirm user expectations
plan migration
```

Legacy bugs do not automatically become new-repository work items.

A legacy bug becomes relevant only when:

- the affected behaviour exists in the approved first release; and
- the new implementation could reproduce the same fault.

The correct response is usually a new acceptance test, not a repair to the old architecture.

---

## 14. New UI rule

The new UI is derived from:

```text
approved workflow
approved read model
approved command
approved authority
approved state language
```

It is not derived from the visual arrangement of the legacy application.

Legacy screenshots may be used to identify:

- useful density;
- familiar labels;
- practical navigation;
- proven control placement.

They must not determine:

- aggregate boundaries;
- authorization;
- state transitions;
- database shape.

The UI should feel like the canonical first product, not a reskinned prototype.

---

## 15. New data model rule

The canonical database is designed from the approved domain and transition contracts.

Do not preserve the legacy schema merely to reduce migration effort.

Do not create permanent canonical columns solely because they existed in the legacy database.

Legacy data must be mapped into the new model through an explicit migration layer.

Migration is allowed to be lossy only when:

- the lost field has no approved product meaning;
- the loss is documented;
- the source remains retained;
- no contractual or audit evidence is destroyed.

---

## 16. Data migration contract

Every migrated record should retain, where applicable:

```text
legacy_source_repository
legacy_source_table
legacy_source_id
legacy_source_version
migration_batch_id
migration_status
migration_warning
migrated_at
migrated_by
```

Do not infer missing facts silently.

Examples:

```text
unknown assignee
unknown due date
ambiguous status
missing project relationship
```

must remain explicit migration gaps.

Use:

```text
UNMAPPED
UNKNOWN
REQUIRES_REVIEW
NOT_APPLICABLE
```

rather than fabricated values.

---

## 17. Canonical architecture

The new repository begins with:

```text
domain
→ application
→ ports
→ adapters
→ UI
```

The new implementation must not inherit:

```text
direct UI-to-database mutation
typed-email identity
anonymous core access
one status field for multiple aggregates
oversized application components
implicit professional authority
```

The preferred deployment shape remains a modular monolith.

Do not introduce distributed services merely because the repository is greenfield.

---

## 18. First vertical slice

Do not begin by reproducing every legacy page.

Build one complete, secure, observable chain:

```text
Authenticate
→ open Project
→ create Work Thread
→ assign and acknowledge
→ prepare Deliverable Revision
→ submit for review
→ approve exact revision
→ create Submission
→ create and assign Dispatch Attempt
→ report delivery
→ upload Receipt Evidence
→ verify evidence
→ satisfy Claim Requirement
→ show Ready for QS Review
→ QS verifies Claim Package
```

Then prove:

```text
Internal Revision
Delivery Rejection
Expiry/Overdue
Claim Gap
```

Only after the five paths pass should secondary administration, reporting and convenience features expand.

---

## 19. Turn 2 gate remains binding

A greenfield repository does not remove the operational-validation gate.

Before final schema, API and screen implementation:

- PM validates work and review behaviour;
- QS/Finance validates evidence and claim readiness;
- Administration/Document Control validates submission, custody and proof return;
- Product Owner/Architecture approves the transition contracts.

Until approval, permitted work includes:

```text
repository setup
linting and test harnesses
architecture scaffolding
legacy inventory
salvage classification
data-export analysis
generic UI foundation
authentication spike
migration planning
```

Not permitted as final implementation:

```text
production state machines
final schema migrations
final role authority
final evidence rules
final claim-readiness logic
final workflow screens
```

---

## 20. Branch and release posture

Recommended branches:

```text
main
integration
feature/*
```

`main` represents the best known releasable canonical state.

Do not use branches named:

```text
legacy
rewrite
v2
new-app
```

as permanent architecture categories.

Before the first production release, use lifecycle labels such as:

```text
product genesis
internal prototype
pilot candidate
pilot release
first production release
```

After the first production release, adopt normal semantic release tags.

---

## 21. Naming doctrine

Use canonical product naming:

```text
DPIK TUGAS
DPIK-TUGAS-APP
```

Use the legacy name only when provenance matters:

```text
DPIK-TUGAS-LEGACY-PLAN
```

Avoid user-facing labels that reveal implementation history.

Users should not see:

```text
new TUGAS
old TUGAS
legacy task
V2 screen
replacement dashboard
```

They should see one product:

> **TUGAS**

---

## 22. Cutover doctrine

Do not run two writable systems indefinitely.

The cutover sequence is:

```text
freeze legacy baseline
→ classify and salvage
→ build canonical vertical slice
→ prove five paths
→ migrate selected data
→ shadow-test
→ pilot one project
→ freeze legacy mutation
→ perform final migration
→ cut over
→ retain rollback window
→ archive legacy runtime
```

During shadow operation, state explicitly which system is authoritative for each record class.

Before final cutover:

- reconcile records;
- export legacy data;
- test rollback;
- communicate the authority switch;
- prevent new writes to the legacy application.

---

## 23. Definition of canonical readiness

The new repository earns canonical runtime status when:

1. Turn 2 operational approval is recorded.
2. Real authentication and deny-by-default authorization work.
3. Cross-project RLS isolation is proven.
4. The five mandatory paths pass.
5. Revision and attempt history is preserved.
6. Temporary delivery access is isolated.
7. Claim readiness is derived and QS-verified.
8. Runtime health and recovery controls work.
9. Selected legacy data migration is reconciled.
10. One pilot project completes the required cycles.
11. Rollback is tested.
12. Management accepts cutover.

Before these conditions, the repository is canonically governed but not yet the production authority.

---

## 24. Agent startup instruction

Every agent beginning work in `DPIK-TUGAS-APP` must execute this sequence:

```text
1. Read AGENTS.md.
2. Read this Genesis Directive.
3. Read the Build Directive and Product Contract.
4. Check the Turn 2 approval record.
5. Inspect the current repository before editing.
6. Inspect the legacy repository only for a named evidence question.
7. Classify any proposed copied artefact.
8. State the intended aggregate, command, event and test.
9. Implement the smallest complete slice.
10. Leave a validated work trace.
```

The agent must not use the legacy repository as a design shortcut.

---

## 25. Governing decision statement

```markdown
## Canonical Repository Decision

DPIK-TUGAS-APP is the canonical repository for the first production
implementation of DPIK TUGAS.

DPIK-TUGAS-LEGACY-PLAN is a retained pre-production reference and
migration source. It is not a prior production release and does not
define the canonical product lineage.

The new product will use a controlled greenfield architecture informed
by brownfield evidence.

No complete legacy tree will be mirrored into the canonical repository.
Useful artefacts may be ported only after classification, provenance
recording, dependency review and validation.

The implementation target is the approved TUGAS product contract, not
legacy feature parity.
```

---

## 26. Final rule

> **The new repository begins clean, but it does not begin ignorant.**

And:

> **The legacy repository supplies evidence. The canonical contracts supply authority. The new implementation supplies the product.**
