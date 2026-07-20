---
name: repo-codebase-inspector
description: Audit this repository's TypeScript/JavaScript for architecture-boundary violations, undeclared dependencies, hardcoded machine paths, oversized files, and missing quality gates. Use before or after any non-trivial code change, and always before opening a PR that touches src/ or apps/.
---

# Repo Codebase Inspector (DPIK TUGAS)

Self-contained, standard-library-only Python auditor. No pip install required -- runs directly via `uv run` or plain `python`. No network access, no dependency on any other tool in this repo.

## When to run it

- After adding, moving, or renaming source files under `src/` or `apps/`.
- Before opening a PR, alongside `npm run test:architecture` (this tool's `ARC00x` rules overlap with that gate's module-boundary check, but this tool additionally covers undeclared dependencies, hardcoded paths, oversized files, and missing compiler/lint gates that `test:architecture` does not check).
- After a cloud agent finishes a feature/change and wants a second, independent signal before handoff.

## Run it

```bash
cd .agents/skills/repo-codebase-inspector
uv run scripts/repo_inspector_script/cli.py tsjs --src ../../.. --output ../../../audit-latest.md
```

Or from repo root with plain Python (no uv required):

```bash
python .agents/skills/repo-codebase-inspector/scripts/repo_inspector_script/cli.py tsjs --src . --output audit-latest.md
```

Discover every tunable policy field before writing a `--config` override:

```bash
uv run scripts/repo_inspector_script/cli.py tsjs-policy
```

## Interpreting results

1. Read `Findings: N high, N medium, N low` and the table -- high first.
2. `PORT001` (hardcoded machine paths) fires at `low` severity on `.md` docs and `medium` on actual source/config -- treat medium PORT001 hits as real, low ones as advisory only.
3. Cross-check `ARC00x` findings against `npm run test:architecture` -- if that gate is green but this tool flags an `ARC00x`, treat it as corroborating evidence, not an automatic override; this repo's own architecture rule is authoritative for `src/modules/*` boundaries.
4. `QUAL001` (file over 400 lines) and hotspot complexity are triage signals, not mandates -- validate against `AGENTS.md` hard constraints before splitting a file.
5. Do not weaken this repo's existing gates (`npm run test:architecture`, `npm run typecheck`, `npm run lint`) to make this tool's score look better.

## Tuning for this repo

If a non-product subtree (a scratch/archive/candidate folder) starts polluting findings, exclude it via `--config`:

```json
{
  "policy": {
    "excluded_paths": ["path/to/non-product-folder"]
  }
}
```

Only exclude paths that are genuinely not shipped code -- run `tsjs-policy` to see every available field first.
