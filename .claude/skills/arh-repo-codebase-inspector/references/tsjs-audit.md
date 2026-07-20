# TypeScript/JavaScript Audit Reference

## Contents

- Audit scope
- Factored intelligence signals
- Rule catalog
- Policy configuration
- Interpretation workflow
- Known limits

## Audit scope

The `tsjs` command is a read-only, standard-library audit. It scans TypeScript and JavaScript source plus common text/config artifacts while excluding generated/vendor directories. It resolves relative imports and root `tsconfig.json` path aliases, builds an internal import graph, extracts structural/API symbols, retains the strongest TODO/complexity hotspots, and emits Markdown or JSON. Potential credentials and machine paths are never printed verbatim.

The implementation keeps filesystem collection in `adapters/tsjs_repository_auditor.py` and deterministic rules/data models in `core/tsjs_audit.py`.

The legacy `centroid` and `risk` commands delegate TS/JS symbol and hotspot work to this same core. They remain backward-compatible entrypoints; do not reintroduce separate TS/JS regexes in `repo_scanner_parser.py`.

## Factored intelligence signals

- `api_surface`: classes, interfaces, type/enum declarations, named functions, exported arrow functions, and method entrypoints. Markdown shows the first 25 files; JSON retains the complete map.
- `hotspots`: the ten strongest files over 200 lines or containing real `TODO`/`FIXME`/`BUG`/`HACK` comments, using the legacy risk-register fields.
- `metrics.symbols` and `metrics.hotspots`: cheap counts for automation and regression checks.

These signals do not change the audit score. Findings remain the scored action surface; API and hotspot sections provide orientation and corroborating evidence.

## Rule catalog

| Rule | Meaning |
| --- | --- |
| `ARC001` | Non-test domain source imports an external runtime package. |
| `ARC002` | Domain source depends on an outer/application layer. |
| `ARC003` | Application source depends directly on an outer layer. |
| `ARC004` | One module imports another module's internals instead of its public index. |
| `ARC005` | Internal import graph contains a circular component. |
| `PORT001` | A text artifact contains an absolute Windows or user-home path; evidence is redacted. Fires at `medium` on source/config files and `low` on `.md` documentation, since a hardcoded path in prose is lower-risk than one baked into runtime code. |
| `PORT002` | Runtime source embeds a local-only endpoint without an environment-based expression on that line. |
| `SEC001` | A strong credential pattern appears in non-test source; evidence is redacted. |
| `SEC002` | Runtime source uses `eval` or dynamic `Function`. |
| `DEP001` | An external package import is undeclared. |
| `DEP002` | A runtime dependency has no static import; validate dynamic/config-driven use before removal. |
| `QUAL001` | A non-test source exceeds the configured line threshold. |
| `QUAL002` | An import traverses three or more parent directories. |
| `QUAL003` | Equivalent JavaScript is duplicated across sibling module-format variants. |
| `CFG001`–`CFG006` | Package manifest, quality scripts, TypeScript strictness/checkJs, and lockfile hygiene. |

## Policy configuration

Pass `--config <path>` with JSON or JSONC. Put overrides under `policy`:

```json
{
  "policy": {
    "module_root": "src/features",
    "public_entrypoint": "public",
    "domain_segments": ["domain", "core"],
    "application_segments": ["application", "use-cases"],
    "outer_segments": ["adapters", "infrastructure", "ui"],
    "max_file_lines": 450,
    "excluded_paths": ["_frontend-skill-candidates", "docs/archive/**"]
  }
}
```

Run `python cli.py tsjs-policy` (no `--src` required) to print every tunable field — name, type, default, description — at runtime, so a `--config` file can be written without reading the source. Use this before hand-writing a policy override.

Only override conventions proved by project-local documentation. Do not weaken a repository's existing architecture gate merely to improve the score. `excluded_paths` is the one exception worth reaching for readily: it exists specifically to keep non-product subtrees (candidate-research folders, journals, vendored archives) from polluting findings with doc/script noise — that's a scope correction, not a gate weakening.

## Interpretation workflow

1. Read project-local instructions and architecture decisions.
2. Run the audit to `$ARH_IO` or another external evidence path.
3. Validate high findings first, then medium findings; classify each as confirmed, accepted design, or false positive.
4. Run the repository's own typecheck, lint, test, architecture, and build gates.
5. Report confirmed findings separately from accepted or heuristic signals.

The score subtracts 12, 6, or 2 points for each high, medium, or low finding. It is deliberately simple and explainable.

## Known limits

- Import extraction is conservative regex, not a TypeScript compiler AST. Computed dynamic imports and package `exports` conditions may be unresolved.
- Only the root `tsconfig.json` path mapping is loaded; extended or per-package configs are not merged yet.
- Unused runtime dependencies are static-import candidates, not proof of dead code.
- File length is a hotspot signal, not a mandate to split cohesive domain transition tables.
- Security rules are indicators, not a replacement for a dedicated SAST or package-vulnerability database.
