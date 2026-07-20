---
name: arh-repo-codebase-inspector
description: Strategic repository intelligence before heavy code lifting. Explore unknown repositories, compress code and documentation context, identify hotspots, and audit TypeScript/JavaScript architecture, dependency direction, circular imports, hardcoded machine paths or secrets, package hygiene, and compiler quality gates. Use for repository orientation, refactor planning, forensic review, or clean-design audits.
---

# ARH Repo Codebase Inspector

This skill dictates how to explore, index, and audit a repository programmatically before performing any heavy-lifting file writes or modifications. It relies on the conductor tool `repo_inspector_script`, bundled inside this skill package at `.claude/skills/arh-repo-codebase-inspector/scripts/repo_inspector_script/cli.py`, which leverages the core scanner engine `RepoScannerParser`. The tool is fully self-contained (a vendored MIT-licensed TOON encoder ships under `scripts/repo_inspector_script/vendor/`) — it has no dependency on any sibling workspace folder.

Every command prints two extra lines after its normal output: a `[SHAPE SIGNAL]` (does this run's output still match the structural schema recorded as the baseline — degradation tripwire) and a `[RETENTION SIGNAL]` (how much of the underlying repo content survived compression, and whether the compression was severe enough that re-reading raw files is likely necessary). Treat a `LIKELY_REQUIRES_FOLLOWUP` retention flag as a signal to re-run with a narrower `--src` or a larger `--budget`/`--max-items`, not as something to silently work around by re-reading files yourself.

---

## 🛠️ Tool Architecture: Composite vs. Surgical

The inspector wrapper splits operations into **one composite packer**, **five surgical extractors**, and **one interactive console**:

### 1. The Composite Extractor (`RepoDocsCodebaseExtractor`)
- **Adapter**: `RepoDocsCodebaseExtractor` (`pack` command)
- **Role**: Combines API symbols, hotspot metrics, and markdown documentation outlines into a single, token-efficient TOON context pack.
- **When to Use**: 
  - When starting a new agent session on a medium-to-large project to establish immediate, unified repository-wide orientation.
  - When the context window is **approaching token exhaustion (>60% full)** and you need to discard loose files while preserving the overall codebase index.

### 2. The Surgical Extractors (Targeted Tools)
- **Role**: Bypasses full repository scans to run lightweight, high-SNR extractions for targeted queries, preventing token waste.
- **Adapters**:
  - `TokenAwareDirectoryMapper` (`map` command)
  - `ApiSurfaceExtractor` (`centroid` command)
  - `CodebaseHotspotScanner` (`risk` command)
  - `DocumentationGistExtractor` (`docs` command)
  - `TsJsRepositoryAuditor` (`tsjs` command)

### 3. The Interactive Dashboard (Human-in-the-Loop) — 🚧 not wired up yet, see Scenario 6
- **Role**: Launches a local web dashboard presenting visual, human-readable directory trees, gotchas callouts, risk registers, and API centroid tables.
- **When to Use**: When a human operator needs to audit multiple codebases, drag and drop folders, and verify codebase profiles at a glance.

---

## 🧭 Scenario-to-Execution Mapping (The 6 Triggers)

When encountering one of the following scenarios, execute the mapped surgical, composite, or dashboard command immediately.

### Scenario 1: The "Cold Start" (Unknown Repository, >15 files)
- **Goal**: Generate a token-cost-aware directory map of the repository.
- **Tool Type**: 🟢 **Surgical**
- **Action**: Run `TokenAwareDirectoryMapper` to map directory scopes.
- **Command**:
  ```bash
  python .claude/skills/arh-repo-codebase-inspector/scripts/repo_inspector_script/cli.py map --src {{arh.uid.workspace}} --budget 4000 --depth 3
  ```
- **Fidelity Rule**: If the budget is exceeded, stop traversing and ask the operator to narrow down to a specific subdirectory target.

### Scenario 2: The "Grand Refactor" (Sweeping Code Changes)
- **Goal**: Retrieve method signatures, interface boundaries, and class entrypoints before touching implementation code.
- **Tool Type**: 🟢 **Surgical**
- **Action**: Run `ApiSurfaceExtractor` to extract the codebase centroids.
- **Command**:
  ```bash
  python .claude/skills/arh-repo-codebase-inspector/scripts/repo_inspector_script/cli.py centroid --src {{arh.uid.workspace}}
  ```
- **Fidelity Rule**: Use extracted signatures to locate which classes are safe to call, preventing signature mismatch bugs during refactoring.

### Scenario 3: Token Exhaustion Proximity (>60% Context Window Full)
- **Goal**: Compress repository context into a single-file TOON payload.
- **Tool Type**: 🔵 **Composite**
- **Action**: Compile and compress indicators using the `RepoDocsCodebaseExtractor` adapter.
- **Command**:
  ```bash
  python .claude/skills/arh-repo-codebase-inspector/scripts/repo_inspector_script/cli.py pack --src {{arh.uid.workspace}} --max-items 5 --output context_pack.toon
  ```
- **Fidelity Rule**: Pass this packed `.toon` file into the next conversation step instead of scanning the disk repeatedly.

### Scenario 4: The "Forensic Audit" (Performance or Refactor Hazard Review)
- **Goal**: Detect hotspots, TODOs/FIXMEs, dead code, and complexity spikes.
- **Tool Type**: 🟢 **Surgical**
- **Action**: Run `CodebaseHotspotScanner` to identify complexity red flags.
- **Command**:
  ```bash
  python .claude/skills/arh-repo-codebase-inspector/scripts/repo_inspector_script/cli.py risk --src {{arh.uid.workspace}}
  ```
- **Fidelity Rule**: Focus modifications on low-risk files. Avoid editing files classified as "High" threat level unless explicitly instructed.

### Scenario 5: Search Ambiguity (50+ Raw Grep Matches)
- **Goal**: Isolate project guidelines, business model documentation, and structural constraints.
- **Tool Type**: 🟢 **Surgical**
- **Action**: Run `DocumentationGistExtractor` to parse Markdown outline gists.
- **Command**:
  ```bash
  python .claude/skills/arh-repo-codebase-inspector/scripts/repo_inspector_script/cli.py docs --src {{arh.uid.workspace}}
  ```

### Scenario 6: Human-in-the-Loop Audit (Operator Review) — 🚧 NOT WIRED UP YET
- **Goal**: Spin up a visual web console for drag-and-drop scans, interactive directory trees, and browsable HTML reports.
- **Tool Type**: 🟣 **Interactive Dashboard**
- **Status**: A dashboard server (`gui_service.py`, port 8345) and a `static/` asset folder exist under this skill's `scripts/repo_inspector_script/` tree, but `cli.py` has no `gui` subcommand wired to them yet, and `static/index.html` doesn't exist — running this today will fail. There is also a stray nested duplicate of the whole package at `scripts/repo_inspector_script/repo_inspector_script/` left over from that work. Do not treat this scenario as available until an operator explicitly resumes and finishes it; don't invoke `cli.py gui`.

### Scenario 7: Tool Evaluation & Cherry-Picking (Auditing Candidate Repos Before Building)
- **Goal**: Before hand-rolling a new capability for this tool (or any other), profile a batch of candidate OSS repos — language, purpose, dependency footprint — cheaply enough to decide cherry-pick vs. reject without deep-diving into any of their implementations.
- **Tool Type**: 🟢 **Surgical**, applied in a loop, one candidate repo at a time.
- **Action**: For each candidate repo, run `map` (shallow depth, small budget) plus a bounded `README.md` head-read to get language + purpose; run `docs` if the candidate ships its own AGENTS.md/README structure worth indexing. Do **not** read the candidate's source implementation at this stage — that's a separate, deliberate decision once a candidate looks promising.
  ```bash
  python .claude/skills/arh-repo-codebase-inspector/scripts/repo_inspector_script/cli.py map --src <candidate_repo> --budget 1500 --depth 2
  ```
- **Fidelity Rule**: Judge every candidate against this tool's standing constraints before recommending cherry-pick: zero external binary dependencies (rules out anything requiring a compiled parser/runtime — tree-sitter, napi, or a separate Go/Rust binary, unless only the *concept* is being ported, not the code) and Ports & Adapters decoupling (does the candidate's capability slot into an existing adapter, or does it require a new one).
- **Record the outcome**: log every candidate — cherry-picked, rejected, or newly found and not yet evaluated — in `tool-build-journal.md` (full inventory + corrections ledger) and log any capability gaps or friction the audit surfaces in `capability-friction-evidence.yaml` (strengths/frictions/open architecture proposals, machine-readable for the next agent). Both files live alongside this SKILL.md and `DEVELOPER_JOURNAL.md` in this skill's own directory — update them in place, don't create parallel copies.
- **Persistent catalog**: the per-audit files above are narrative; `C:\00_ARH\_arh-build-laboratory\` is the durable, cross-project catalog every future build should check *first*, before a fresh websearch. Source archives can be deleted once cataloged — the record (language, dependency class, source URL, pinned ref, capability domains, evidence) survives independently, and `pinned_ref` is what makes redownloading for a closer look reproducible later.
  - `arh-buildlab-ingest.py --src <folder> [--mode scan-only|absorb]` — unattended cataloging. Point it at any folder (an operator's download pile, an already-cloned repo, nested arbitrarily deep); it extracts archives, derives language/dependency-class/source-url/pinned-ref deterministically, and writes `candidates/<slug>/arh-buildlab-candidate.meta.yaml` + `.notes.md` (verdict starts `pending-review`). `scan-only` (default) never touches the source; `absorb` deletes it after cataloging — `absorb` is destructive and must be operator-directed, never run by an agent on its own initiative.
  - `arh-buildlab-catalog-build.py` — rebuilds `arh-buildlab-catalog-raw.sqlite3` from every `meta.yaml` on disk. Disposable index, not a source of truth — delete and re-run any time.
  - `arh-buildlab-catalog-promote.py` — copies every reviewed row (`verdict != pending-review`, which includes `rejected` as well as `cherry-picked` — a documented rejection is exactly what stops a future build from re-researching the same dead end) into `arh-buildlab-catalog-refined.sqlite3`.
  - **Hard rule**: when deciding what to reuse for a new composite build, query only `arh-buildlab-catalog-refined.sqlite3`. Only the curation/review pass opens `-raw` directly — its `pending-review` rows are unreviewed noise, not vetted candidates.

### Scenario 8: TypeScript/JavaScript Clean-Design Audit
- **Goal**: Produce a deterministic repository audit covering API-surface symbols, TODO/complexity hotspots, architecture direction, module-public-entrypoint bypasses, circular imports, machine-specific paths, redacted secret indicators, dependency declarations, compiler strictness, package-manager hygiene, and oversized sources.
- **Tool Type**: 🟢 **Surgical**
- **Action**: Run the TS/JS auditor and write Markdown evidence outside the audited repository unless the operator explicitly requests an in-repo artifact.
  ```bash
  python .claude/skills/arh-repo-codebase-inspector/scripts/repo_inspector_script/cli.py tsjs --src <repo> --output <audit-report.md>
  ```
- **Policy**: Defaults recognize `src/modules/<module>/{domain,application,adapters,infrastructure}` and require cross-module imports to use `<module>/index.*`. For a different repository shape, pass `--config <json-or-jsonc>` rather than changing the reusable defaults. Run `tsjs-policy` (no `--src` needed) to list every tunable field with type/default/description before writing a `--config` file. Read [references/tsjs-audit.md](references/tsjs-audit.md) before interpreting or customizing this command.
- **Doc-heavy repos**: if a repo carries non-product subtrees (candidate-research folders, journals, vendored archives), the score-tanking noise is usually `PORT001` hits inside those `.md` files. `PORT001` already fires at `low` severity on documentation vs `medium` on source — this is automatic, no config needed. If a whole subtree should be out of scope entirely, add it to `policy.excluded_paths` in `--config` (glob or bare directory name); this is a per-repo call since only the operator knows which subtree isn't shipped code.
- **Fidelity Rule**: Treat the numeric score as triage, not certification. Validate every finding against project-local `AGENTS.md`, architecture decisions, framework conventions, and intentional development fallbacks before proposing code changes.

---

## 📦 Deliverables Format Protocol

After executing the mapping or packing commands, present the results to the user (or record in your workspace) using this high-signal layout:

1. **Context Budget**: `"Spent X tokens to scan repo."`
2. **Panorama & Centroid**: Core directory shapes and symbol entrypoints.
3. **No-Go Zones**: Explicitly declare folders/files ignored (e.g., `tests/`, `node_modules/`, `dev-dependencies`).
4. **Actionable Step**: Suggest exactly ONE file to edit or inspect next.

---

## ⚙️ Tuning Parameters Reference

The `repo_inspector_script` CLI command flags can be customized to adjust the signal/noise threshold:

| Flag | Applicable Commands | Type | Default | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `--src` | All commands | Path | *Required* | Path to the repository source directory to scan. |
| `--budget` | `map` | Integer | `4000` | Estimated token size limit. Traversal halts if exceeded. |
| `--depth` | `map` | Integer | `3` | Maximum folder depth to walk during directory mapping. |
| `--max-items` | `pack` | Integer | `10` | Limits repeating array items (e.g., symbols) in TOON packing. |
| `--output` | `pack` | Path | *stdout* | Destination path to write the packed TOON extraction payload. |
| `--format` | `tsjs` | `markdown` or `json` | `markdown` | Select human-readable or machine-readable audit output. |
| `--output` | `tsjs` | Path | *stdout* | Destination for the audit report. Prefer `$ARH_IO` for evidence. |
| `--config` | `tsjs` | Path | *none* | Optional JSON/JSONC policy override for repository-specific layer names, thresholds, and excluded paths. |

Run `python .claude/skills/arh-repo-codebase-inspector/scripts/repo_inspector_script/cli.py tsjs-policy` at any time to print the full list of tunable `tsjs` policy fields (name, type, default, description) — no `--src` required. Use it to discover what's configurable before hand-writing a `--config` file.
