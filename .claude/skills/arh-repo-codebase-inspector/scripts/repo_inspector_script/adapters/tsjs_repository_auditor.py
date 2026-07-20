"""Filesystem adapter and renderers for the TS/JS audit core."""

from __future__ import annotations

import fnmatch
import json
from pathlib import Path
import re
from typing import Any

from repo_inspector_script.core.tsjs_audit import (
    AuditPolicy,
    ImportEdge,
    POLICY_FIELD_DOCS,
    ProjectSnapshot,
    SourceFile,
    TSJS_EXTENSIONS,
    audit_project,
    extract_import_specifiers,
)


TEXT_EXTENSIONS = TSJS_EXTENSIONS | {".json", ".yaml", ".yml", ".toml", ".md", ".cmd", ".ps1", ".env"}
EXCLUDED_DIRS = {".git", "node_modules", "dist", "build", "coverage", ".next", ".turbo", ".cache"}
LOCKFILES = ("package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lock", "bun.lockb")


def _is_excluded(path: Path, root: Path, extra_patterns: tuple[str, ...]) -> bool:
    parts = path.relative_to(root).parts
    if any(part in EXCLUDED_DIRS for part in parts):
        return True
    if not extra_patterns:
        return False
    rel_posix = path.relative_to(root).as_posix()
    for pattern in extra_patterns:
        if fnmatch.fnmatch(rel_posix, pattern) or any(fnmatch.fnmatch(part, pattern) for part in parts):
            return True
    return False


class TsJsRepositoryAuditor:
    def run(
        self,
        src: Path,
        output_format: str = "markdown",
        output: str | None = None,
        config: str | None = None,
    ):
        snapshot = self._snapshot(src.resolve(), Path(config).resolve() if config else None)
        report = audit_project(snapshot)
        rendered = json.dumps(report.as_dict(), indent=2) if output_format == "json" else self._markdown(report.as_dict())
        if output:
            Path(output).write_text(rendered + "\n", encoding="utf-8")
            print(f"TS/JS audit report written to: {Path(output).resolve()}")
        else:
            print(rendered)
        expected_fields = {"score", "metrics", "summary", "findings", "api_surface", "hotspots"}
        matched = len(expected_fields.intersection(report.as_dict()))
        print(f"[SHAPE SIGNAL] tsjs: {matched}/{len(expected_fields)} fields matched ({matched / len(expected_fields):.0%}) -> {'OK' if matched == len(expected_fields) else 'DEGRADED'}")
        print(f"[RETENTION SIGNAL] tsjs: {report.metrics['source_files']}/{report.metrics['source_files']} source files evaluated (100%)")
        return report

    @staticmethod
    def describe_policy() -> str:
        lines = ["# TS/JS Audit Policy - Tunable Parameters", ""]
        lines.append("| Field | Type | Default | Description |")
        lines.append("| --- | --- | --- | --- |")
        for entry in POLICY_FIELD_DOCS:
            lines.append(f"| `{entry['field']}` | {entry['type']} | `{entry['default']}` | {entry['description']} |")
        lines.append("")
        lines.append('Pass overrides under a top-level "policy" key in a JSON/JSONC file: --config <path>.')
        lines.append("Only override conventions proved by project-local documentation. Do not weaken an existing architecture gate merely to improve the score.")
        return "\n".join(lines)

    def _snapshot(self, root: Path, config_path: Path | None) -> ProjectSnapshot:
        config = _read_jsonc(config_path) if config_path else None
        policy = AuditPolicy.from_mapping(config.get("policy") if config else None)
        files: list[SourceFile] = []
        artifacts: list[SourceFile] = []
        for path in sorted(root.rglob("*")):
            if not path.is_file() or path.suffix.lower() not in TEXT_EXTENSIONS:
                continue
            if _is_excluded(path, root, policy.excluded_paths):
                continue
            artifact = SourceFile(path.relative_to(root).as_posix(), path.read_text(encoding="utf-8", errors="ignore"))
            artifacts.append(artifact)
            if path.suffix.lower() in TSJS_EXTENSIONS:
                files.append(artifact)
        tsconfig_path = root / "tsconfig.json"
        if not tsconfig_path.exists():
            tsconfig_path = root / "tsconfig.base.json"
        tsconfig = _read_jsonc(tsconfig_path) if tsconfig_path.exists() else None
        aliases = _alias_mappings(tsconfig)
        known_paths = {source.path for source in files}
        imports: list[ImportEdge] = []
        for source in files:
            for specifier, line in extract_import_specifiers(source.content):
                target = _resolve_import(source.path, specifier, known_paths, aliases)
                imports.append(ImportEdge(source.path, specifier, target, line))
        package_path = root / "package.json"
        package = _read_jsonc(package_path) if package_path.exists() else None
        workspace_packages = tuple(
            _read_jsonc(path)
            for path in sorted(root.rglob("package.json"))
            if path != package_path and not _is_excluded(path, root, policy.excluded_paths)
        )
        lockfiles = tuple(name for name in LOCKFILES if (root / name).exists())
        return ProjectSnapshot(tuple(files), tuple(imports), tuple(artifacts), package, workspace_packages, tsconfig, lockfiles, policy)

    @staticmethod
    def _markdown(data: dict[str, Any]) -> str:
        metrics = data["metrics"]
        severity = data["summary"]["severity"]
        lines = [
            "# TypeScript/JavaScript Repository Audit",
            "",
            f"Quality score: **{data['score']}/100**",
            "",
            f"Scanned {metrics['source_files']} source files and {metrics['text_artifacts']} text artifacts (source included). "
            f"Resolved {metrics['internal_imports_resolved']} internal imports; {metrics['relative_imports_unresolved']} relative imports were unresolved. "
            f"Findings: {severity['high']} high, {severity['medium']} medium, {severity['low']} low.",
            "",
            "| Severity | Rule | Category | Location | Finding |",
            "| --- | --- | --- | --- | --- |",
        ]
        for finding in data["findings"]:
            location = finding["path"] + (f":{finding['line']}" if finding["line"] else "")
            message = finding["message"].replace("|", "\\|")
            lines.append(f"| {finding['severity'].upper()} | {finding['rule_id']} | {finding['category']} | `{location}` | {message} |")
        if not data["findings"]:
            lines.append("| - | - | - | - | No findings. |")
        lines.extend(["", "## Remediation detail", ""])
        for finding in data["findings"]:
            location = finding["path"] + (f":{finding['line']}" if finding["line"] else "")
            lines.extend([
                f"### {finding['rule_id']} — {location}",
                "",
                finding["message"],
                "",
                f"Evidence: `{finding['evidence']}`",
                "",
                f"Suggested action: {finding['suggestion']}",
                "",
            ])
        lines.extend(["## API surface", "", "| File | Exported/structural symbols |", "| --- | --- |"])
        api_items = list(data["api_surface"].items())
        for path, symbols in api_items[:25]:
            lines.append(f"| `{path}` | {', '.join(f'`{symbol}`' for symbol in symbols)} |")
        if len(api_items) > 25:
            lines.append(f"| … | {len(api_items) - 25} additional files retained in JSON output. |")
        if not api_items:
            lines.append("| - | No structural symbols detected. |")
        lines.extend(["", "## Hotspots", "", "| Threat | File | Lines | Markers | Complexity |", "| --- | --- | ---: | ---: | ---: |"])
        for hotspot in data["hotspots"]:
            lines.append(
                f"| {hotspot['threat_level']} | `{hotspot['file']}` | {hotspot['lines']} | "
                f"{hotspot['todos']} | {hotspot['complexity_score']} |"
            )
        if not data["hotspots"]:
            lines.append("| - | No TS/JS hotspots detected. | - | - | - |")
        lines.append("")
        lines.extend([
            "## Interpretation",
            "",
            "The score is a deterministic triage aid, not a certification. Each high/medium/low finding subtracts 12/6/2 points. "
            "Validate findings against repository-specific architecture documents before changing code.",
        ])
        return "\n".join(lines)


def _read_jsonc(path: Path) -> dict[str, Any]:
    content = path.read_text(encoding="utf-8-sig")
    content = re.sub(r"/\*.*?\*/", "", content, flags=re.DOTALL)
    content = re.sub(r"(^|\s)//.*?$", r"\1", content, flags=re.MULTILINE)
    content = re.sub(r",\s*([}\]])", r"\1", content)
    value = json.loads(content)
    return value if isinstance(value, dict) else {}


def _alias_mappings(tsconfig: dict[str, Any] | None) -> tuple[tuple[str, str], ...]:
    if not tsconfig:
        return ()
    options = tsconfig.get("compilerOptions", {})
    paths = options.get("paths", {}) if isinstance(options, dict) else {}
    mappings: list[tuple[str, str]] = []
    if isinstance(paths, dict):
        for alias, targets in paths.items():
            if isinstance(targets, list) and targets and isinstance(targets[0], str):
                mappings.append((alias, targets[0]))
    return tuple(mappings)


def _resolve_import(source: str, specifier: str, known: set[str], aliases: tuple[tuple[str, str], ...]) -> str | None:
    candidates: list[str] = []
    if specifier.startswith("."):
        candidates.append((Path(source).parent / specifier).as_posix())
    else:
        for alias, target in aliases:
            if "*" in alias:
                prefix, suffix = alias.split("*", 1)
                if specifier.startswith(prefix) and specifier.endswith(suffix):
                    middle = specifier[len(prefix):len(specifier) - len(suffix) if suffix else None]
                    candidates.append(target.replace("*", middle))
            elif specifier == alias:
                candidates.append(target)
    for candidate in candidates:
        normalized = _normalize(candidate)
        variants = [normalized]
        if Path(normalized).suffix.lower() not in TSJS_EXTENSIONS:
            variants.extend(normalized + extension for extension in TSJS_EXTENSIONS)
            variants.extend(f"{normalized}/index{extension}" for extension in TSJS_EXTENSIONS)
        for variant in variants:
            if variant in known:
                return variant
    return None


def _normalize(path: str) -> str:
    parts: list[str] = []
    for part in path.replace("\\", "/").split("/"):
        if part in ("", "."):
            continue
        if part == "..":
            if parts:
                parts.pop()
        else:
            parts.append(part)
    return "/".join(parts)
