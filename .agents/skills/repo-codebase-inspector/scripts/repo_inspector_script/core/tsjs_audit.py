"""Pure TypeScript/JavaScript audit rules.

The filesystem adapter builds a ProjectSnapshot. This module evaluates that immutable
snapshot without performing I/O so rule behavior stays deterministic and testable.
"""

from __future__ import annotations

from dataclasses import dataclass, field
import re
from pathlib import PurePosixPath
from typing import Any, Iterable


SEVERITY_WEIGHT = {"high": 12, "medium": 6, "low": 2}
TSJS_EXTENSIONS = frozenset({".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".mjs", ".cjs"})
DOC_EXTENSIONS = frozenset({".md"})
MARKER_WORDS = ("TODO", "FIXME", "BUG", "HACK")
_MARKER_WORD_RE = re.compile(r"\b(" + "|".join(MARKER_WORDS) + r")\b", re.IGNORECASE)


@dataclass(frozen=True)
class SourceFile:
    path: str
    content: str

    @property
    def lines(self) -> list[str]:
        return self.content.splitlines()

    @property
    def is_test(self) -> bool:
        lowered = self.path.lower()
        return bool(re.search(r"(?:^|/)(?:tests?|__tests__)/", lowered)) or bool(
            re.search(r"\.(?:test|spec)\.[cm]?[jt]sx?$", lowered)
        )


@dataclass(frozen=True)
class ImportEdge:
    source: str
    specifier: str
    target: str | None
    line: int


@dataclass(frozen=True)
class AuditPolicy:
    module_root: str = "src/modules"
    public_entrypoint: str = "index"
    domain_segments: tuple[str, ...] = ("domain",)
    application_segments: tuple[str, ...] = ("application", "use-cases", "usecases")
    outer_segments: tuple[str, ...] = (
        "adapter",
        "adapters",
        "infrastructure",
        "ui",
        "http",
        "persistence",
    )
    max_file_lines: int = 400
    excluded_paths: tuple[str, ...] = ()

    @classmethod
    def from_mapping(cls, value: dict[str, Any] | None) -> "AuditPolicy":
        if not value:
            return cls()
        list_fields = {
            "domain_segments",
            "application_segments",
            "outer_segments",
            "excluded_paths",
        }
        kwargs: dict[str, Any] = {}
        for key in cls.__dataclass_fields__:
            if key not in value:
                continue
            kwargs[key] = tuple(value[key]) if key in list_fields else value[key]
        return cls(**kwargs)


POLICY_FIELD_DOCS: tuple[dict[str, str], ...] = (
    {
        "field": "module_root",
        "type": "str",
        "default": "src/modules",
        "description": "Base folder under which per-module directories live. Used to derive each file's module name for cross-module boundary rules (ARC004).",
    },
    {
        "field": "public_entrypoint",
        "type": "str",
        "default": "index",
        "description": "Filename (without extension) that counts as a module's public surface. Cross-module imports that bypass this file trigger ARC004.",
    },
    {
        "field": "domain_segments",
        "type": "list[str]",
        "default": "[\"domain\"]",
        "description": "Path segment names that mark a file as domain layer. Domain files importing outer/application layers trigger ARC002.",
    },
    {
        "field": "application_segments",
        "type": "list[str]",
        "default": "[\"application\", \"use-cases\", \"usecases\"]",
        "description": "Path segment names that mark a file as application layer. Application files importing outer layers directly trigger ARC003.",
    },
    {
        "field": "outer_segments",
        "type": "list[str]",
        "default": "[\"adapter\", \"adapters\", \"infrastructure\", \"ui\", \"http\", \"persistence\"]",
        "description": "Path segment names that mark a file as outer/infrastructure layer, for ARC002/ARC003 direction checks.",
    },
    {
        "field": "max_file_lines",
        "type": "int",
        "default": "400",
        "description": "Line-count ceiling for non-test source files before QUAL001 fires. Raise for repositories with intentionally large cohesive files (e.g. generated code, transition tables).",
    },
    {
        "field": "excluded_paths",
        "type": "list[str]",
        "default": "[]",
        "description": "Extra directory names or glob patterns to skip during the scan, on top of the built-in EXCLUDED_DIRS (.git, node_modules, dist, build, coverage, .next, .turbo, .cache). Matched against both the full relative path and each path segment. Use this to exclude candidate-research folders, journals, vendored archives, or other non-product subtrees that would otherwise pollute findings (PORT001, QUAL001, hotspots) with doc/script noise.",
    },
)


@dataclass(frozen=True)
class ProjectSnapshot:
    files: tuple[SourceFile, ...]
    imports: tuple[ImportEdge, ...]
    artifacts: tuple[SourceFile, ...]
    package: dict[str, Any] | None = None
    workspace_packages: tuple[dict[str, Any], ...] = ()
    tsconfig: dict[str, Any] | None = None
    lockfiles: tuple[str, ...] = ()
    policy: AuditPolicy = field(default_factory=AuditPolicy)


@dataclass(frozen=True)
class Finding:
    rule_id: str
    category: str
    severity: str
    path: str
    line: int | None
    message: str
    evidence: str
    suggestion: str

    def as_dict(self) -> dict[str, Any]:
        return {
            "rule_id": self.rule_id,
            "category": self.category,
            "severity": self.severity,
            "path": self.path,
            "line": self.line,
            "message": self.message,
            "evidence": self.evidence,
            "suggestion": self.suggestion,
        }


@dataclass(frozen=True)
class Hotspot:
    file: str
    lines: int
    size_bytes: int
    todos: int
    complexity_score: int
    threat_level: str

    def as_dict(self) -> dict[str, Any]:
        return {
            "file": self.file,
            "lines": self.lines,
            "size_bytes": self.size_bytes,
            "todos": self.todos,
            "complexity_score": self.complexity_score,
            "threat_level": self.threat_level,
        }


@dataclass(frozen=True)
class AuditReport:
    score: int
    findings: tuple[Finding, ...]
    metrics: dict[str, int]
    api_surface: dict[str, tuple[str, ...]]
    hotspots: tuple[Hotspot, ...]

    def as_dict(self) -> dict[str, Any]:
        return {
            "score": self.score,
            "metrics": self.metrics,
            "summary": _summary(self.findings),
            "findings": [finding.as_dict() for finding in self.findings],
            "api_surface": {path: list(symbols) for path, symbols in self.api_surface.items()},
            "hotspots": [hotspot.as_dict() for hotspot in self.hotspots],
        }


_IMPORT_PATTERNS = (
    re.compile(r"^[ \t]*import[ \t]+(?:type[ \t]+)?(?:[\w\s{},*$]+?[ \t]+from[ \t]+)?(?P<quote>['\"])(?P<specifier>[^'\"]+)(?P=quote)", re.MULTILINE),
    re.compile(r"^[ \t]*export[ \t]+(?:type[ \t]+)?[\w\s{},*$]+?[ \t]+from[ \t]+(?P<quote>['\"])(?P<specifier>[^'\"]+)(?P=quote)", re.MULTILINE),
    re.compile(r"\brequire\s*\(\s*(?P<quote>['\"])(?P<specifier>[^'\"]+)(?P=quote)\s*\)"),
    re.compile(r"\bimport\s*\(\s*(?P<quote>['\"])(?P<specifier>[^'\"]+)(?P=quote)\s*\)"),
)
_WINDOWS_PATH_RE = re.compile(r"(?<![A-Za-z0-9])[A-Za-z]:[\\/][^\s'\"`<>|]+")
_HOME_PATH_RE = re.compile(r"(?<![A-Za-z0-9])/(?:Users|home)/[^\s'\"`<>|]+")
_LOCAL_URL_RE = re.compile(r"(?P<quote>['\"])(?:https?://)?(?:localhost|127\.0\.0\.1)(?::\d+)?(?:/[^'\"]*)?(?P=quote)")
_SECRET_PATTERNS = (
    ("GitHub token", re.compile(r"\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b")),
    ("Slack token", re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{20,}\b")),
    ("private key", re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----")),
    (
        "credential assignment",
        re.compile(
            r"(?i)\b(?:api[_-]?key|access[_-]?token|auth[_-]?token|password|passwd|secret)\b\s*[:=]\s*['\"]([^'\"]{12,})['\"]"
        ),
    ),
)
_UNSAFE_PATTERNS = (
    ("eval", re.compile(r"\beval\s*\(")),
    ("dynamic Function", re.compile(r"\bnew\s+Function\s*\(")),
)
_NODE_BUILTINS = {
    "assert", "buffer", "child_process", "cluster", "console", "crypto", "dgram", "diagnostics_channel",
    "dns", "domain", "events", "fs", "http", "http2", "https", "module", "net", "os", "path",
    "perf_hooks", "process", "punycode", "querystring", "readline", "repl", "stream", "string_decoder",
    "timers", "tls", "trace_events", "tty", "url", "util", "v8", "vm", "wasi", "worker_threads", "zlib",
}


def extract_import_specifiers(content: str) -> list[tuple[str, int]]:
    """Return import specifiers and one-based source lines without parsing an AST."""
    results: list[tuple[str, int]] = []
    seen: set[tuple[str, int]] = set()
    for pattern in _IMPORT_PATTERNS:
        for match in pattern.finditer(content):
            line = content.count("\n", 0, match.start()) + 1
            item = (match.group("specifier"), line)
            if item not in seen:
                results.append(item)
                seen.add(item)
    return results


def extract_tsjs_symbols(content: str) -> list[str]:
    """Extract a bounded structural API outline from TS/JS source without an external parser."""
    masked = _mask_js_noncode(content)
    symbols: list[str] = []
    seen: set[tuple[str, str]] = set()
    declarations = (
        ("class/interface", re.compile(r"\b(?:export\s+)?(?:default\s+)?(?:abstract\s+)?(?:class|interface|type|enum)\s+(?P<name>[A-Za-z_$][\w$]*)")),
        ("function", re.compile(r"\b(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s+(?P<name>[A-Za-z_$][\w$]*)\s*\(")),
        ("function", re.compile(r"\bexport\s+(?:declare\s+)?const\s+(?P<name>[A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>")),
    )
    for kind, pattern in declarations:
        for match in pattern.finditer(masked):
            key = (kind, match.group("name"))
            if key in seen:
                continue
            seen.add(key)
            suffix = "()" if kind == "function" else ""
            symbols.append(f"{kind} {match.group('name')}{suffix}")
    method_pattern = re.compile(r"\b(?:public\s+|protected\s+|private\s+|static\s+|async\s+)*(?P<name>[A-Za-z_$][\w$]*)\s*\([^)]*\)\s*(?::|\{)")
    excluded = {"if", "for", "while", "switch", "catch", "function", "constructor"}
    known_names = {name for _, name in seen}
    for match in method_pattern.finditer(masked):
        name = match.group("name")
        if name in excluded or name in known_names:
            continue
        symbols.append(f"method {name}()")
        known_names.add(name)
    return symbols[:50]


def analyze_tsjs_hotspot(source: SourceFile) -> Hotspot | None:
    """Build the legacy risk-register shape from TS/JS-specific parsing primitives."""
    line_count = len(source.lines)
    comments = _extract_js_comments(source.content)
    todos = sum(len(_MARKER_WORD_RE.findall(comment)) for comment in comments)
    masked = _mask_js_noncode(source.content)
    complexity = len(re.findall(r"\b(?:class|interface|function)\b", masked))
    if line_count <= 200 and todos == 0:
        return None
    return Hotspot(
        file=source.path,
        lines=line_count,
        size_bytes=len(source.content),
        todos=todos,
        complexity_score=complexity,
        threat_level="High" if line_count > 400 or todos > 5 else "Medium",
    )


def audit_project(snapshot: ProjectSnapshot) -> AuditReport:
    findings: list[Finding] = []
    findings.extend(_audit_source_files(snapshot))
    findings.extend(_audit_architecture(snapshot))
    findings.extend(_audit_cycles(snapshot.imports))
    findings.extend(_audit_dependencies(snapshot))
    findings.extend(_audit_configuration(snapshot))
    findings = _deduplicate(findings)
    findings.sort(key=lambda f: (-SEVERITY_WEIGHT[f.severity], f.category, f.path, f.line or 0, f.rule_id))
    score = max(0, 100 - sum(SEVERITY_WEIGHT[f.severity] for f in findings))
    resolved = sum(1 for edge in snapshot.imports if edge.target)
    unresolved_relative = sum(
        1 for edge in snapshot.imports
        if edge.specifier.startswith(".") and not edge.target
        and PurePosixPath(edge.specifier).suffix.lower() in {"", ".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".mjs", ".cjs"}
    )
    api_surface = {
        source.path: tuple(symbols)
        for source in snapshot.files
        if (symbols := extract_tsjs_symbols(source.content))
    }
    hotspots = tuple(sorted(
        (hotspot for source in snapshot.files if (hotspot := analyze_tsjs_hotspot(source))),
        key=lambda item: (item.threat_level == "High", item.complexity_score, item.lines),
        reverse=True,
    )[:10])
    metrics = {
        "source_files": len(snapshot.files),
        "text_artifacts": len(snapshot.artifacts),
        "imports": len(snapshot.imports),
        "internal_imports_resolved": resolved,
        "relative_imports_unresolved": unresolved_relative,
        "findings": len(findings),
        "symbols": sum(len(symbols) for symbols in api_surface.values()),
        "hotspots": len(hotspots),
    }
    return AuditReport(
        score=score,
        findings=tuple(findings),
        metrics=metrics,
        api_surface=api_surface,
        hotspots=hotspots,
    )


def _audit_source_files(snapshot: ProjectSnapshot) -> list[Finding]:
    findings: list[Finding] = []
    for artifact in snapshot.artifacts:
        is_doc = PurePosixPath(artifact.path).suffix.lower() in DOC_EXTENSIONS
        severity = "low" if is_doc else "medium"
        for regex, label in ((_WINDOWS_PATH_RE, "absolute Windows path"), (_HOME_PATH_RE, "absolute home-directory path")):
            for match in regex.finditer(artifact.content):
                findings.append(Finding(
                    "PORT001", "portability", severity, artifact.path, _line_number(artifact.content, match.start()),
                    f"Hardcoded {label} couples the repository to one machine.", "<redacted machine path>",
                    "Resolve the location from configuration, an environment variable, or the caller.",
                ))
    for source in snapshot.files:
        if not source.is_test and len(source.lines) > snapshot.policy.max_file_lines:
            findings.append(Finding(
                "QUAL001", "maintainability", "medium", source.path, None,
                f"Source file has {len(source.lines)} lines; the configured limit is {snapshot.policy.max_file_lines}.",
                f"{len(source.lines)} lines", "Split by responsibility while preserving the public API.",
            ))
        if source.is_test:
            continue
        for match in _LOCAL_URL_RE.finditer(source.content):
            line_text = source.lines[_line_number(source.content, match.start()) - 1]
            if "process.env" in line_text or "import.meta.env" in line_text:
                continue
            findings.append(Finding(
                "PORT002", "portability", "low", source.path, _line_number(source.content, match.start()),
                "A machine-local endpoint is embedded in runtime source.", "<redacted local endpoint>",
                "Keep the endpoint in environment-aware configuration; document any development fallback.",
            ))
        for label, regex in _SECRET_PATTERNS:
            for match in regex.finditer(source.content):
                raw = match.group(0).lower()
                if any(marker in raw for marker in ("example", "placeholder", "changeme", "process.env")):
                    continue
                findings.append(Finding(
                    "SEC001", "security", "high", source.path, _line_number(source.content, match.start()),
                    f"Potential hardcoded {label} detected.", f"<{label} redacted>",
                    "Remove the value, rotate it if real, and load it through the declared credential boundary.",
                ))
        for label, regex in _UNSAFE_PATTERNS:
            masked = _mask_js_noncode(source.content)
            for match in regex.finditer(masked):
                findings.append(Finding(
                    "SEC002", "security", "high", source.path, _line_number(source.content, match.start()),
                    f"Potentially unsafe {label} call requires manual validation.", label,
                    "Replace with a constrained API or prove that all inputs are trusted and bounded.",
                ))
        for edge in (e for e in snapshot.imports if e.source == source.path):
            if edge.specifier.startswith("../../../"):
                findings.append(Finding(
                    "QUAL002", "maintainability", "low", source.path, edge.line,
                    "Deep relative import makes boundaries and moves fragile.", edge.specifier,
                    "Use a declared path alias or a package/module public entrypoint.",
                ))
    by_stem: dict[str, list[SourceFile]] = {}
    for source in snapshot.files:
        suffix = PurePosixPath(source.path).suffix.lower()
        if suffix in {".js", ".mjs", ".cjs"}:
            by_stem.setdefault(source.path[:-len(suffix)], []).append(source)
    for stem, variants in by_stem.items():
        normalized = {re.sub(r"\s+", "", variant.content) for variant in variants}
        if len(variants) > 1 and len(normalized) == 1:
            findings.append(Finding(
                "QUAL003", "maintainability", "medium", stem, None,
                "Equivalent JavaScript is duplicated across module-format variants.",
                ", ".join(variant.path for variant in variants),
                "Generate compatibility variants from one source or publish one canonical module format.",
            ))
    return findings


def _audit_architecture(snapshot: ProjectSnapshot) -> list[Finding]:
    findings: list[Finding] = []
    policy = snapshot.policy
    outer = set(policy.outer_segments)
    applications = set(policy.application_segments)
    domains = set(policy.domain_segments)
    for edge in snapshot.imports:
        source_file = next((source for source in snapshot.files if source.path == edge.source), None)
        if source_file and source_file.is_test:
            continue
        source_parts = PurePosixPath(edge.source).parts
        target_parts = PurePosixPath(edge.target).parts if edge.target else ()
        source_layer = _first_segment(source_parts, domains | applications | outer)
        target_layer = _first_segment(target_parts, domains | applications | outer)
        if source_layer in domains:
            if edge.target is None and not edge.specifier.startswith((".", "@foundation/")) and not _is_node_builtin(edge.specifier):
                findings.append(Finding(
                    "ARC001", "architecture", "high", edge.source, edge.line,
                    "Domain code imports an external runtime package.", edge.specifier,
                    "Depend on a domain-owned port and move the provider import to an adapter.",
                ))
            elif target_layer in applications | outer:
                findings.append(Finding(
                    "ARC002", "architecture", "high", edge.source, edge.line,
                    f"Domain code depends outward on the {target_layer} layer.", edge.specifier,
                    "Invert the dependency through a domain-owned interface.",
                ))
        elif source_layer in applications and target_layer in outer:
            findings.append(Finding(
                "ARC003", "architecture", "medium", edge.source, edge.line,
                f"Application code depends directly on the {target_layer} layer.", edge.specifier,
                "Inject a port into the application service and implement it in the outer layer.",
            ))

        source_module = _module_name(edge.source, policy.module_root)
        target_module = _module_name(edge.target, policy.module_root) if edge.target else None
        if source_module and target_module and source_module != target_module:
            target_path = PurePosixPath(edge.target or "")
            module_prefix = PurePosixPath(policy.module_root) / target_module
            relative = target_path.relative_to(module_prefix)
            if relative.stem != policy.public_entrypoint or len(relative.parts) != 1:
                findings.append(Finding(
                    "ARC004", "architecture", "high", edge.source, edge.line,
                    f"Module '{source_module}' bypasses module '{target_module}' public entrypoint.", edge.specifier,
                    f"Import from the '{target_module}' module public index instead of an internal path.",
                ))
    return findings


def _audit_cycles(edges: Iterable[ImportEdge]) -> list[Finding]:
    graph: dict[str, set[str]] = {}
    edge_lines: dict[tuple[str, str], int] = {}
    for edge in edges:
        if not edge.target:
            continue
        graph.setdefault(edge.source, set()).add(edge.target)
        graph.setdefault(edge.target, set())
        edge_lines[(edge.source, edge.target)] = edge.line
    findings: list[Finding] = []
    for component in _strongly_connected_components(graph):
        if len(component) < 2:
            continue
        cycle = sorted(component)
        first = cycle[0]
        next_target = next((target for target in graph[first] if target in component), cycle[1])
        findings.append(Finding(
            "ARC005", "architecture", "high", first, edge_lines.get((first, next_target)),
            f"Circular import component contains {len(component)} files.", " -> ".join(cycle),
            "Break the cycle by extracting a stable abstraction or moving shared types inward.",
        ))
    return findings


def _audit_configuration(snapshot: ProjectSnapshot) -> list[Finding]:
    findings: list[Finding] = []
    package = snapshot.package
    tsconfig = snapshot.tsconfig
    if package is None:
        findings.append(Finding("CFG001", "configuration", "medium", "package.json", None,
                                "No package.json was found.", "missing package.json",
                                "Add a package manifest that declares scripts and dependency ownership."))
    else:
        scripts = package.get("scripts", {}) if isinstance(package.get("scripts", {}), dict) else {}
        for required in ("lint", "test"):
            if required not in scripts:
                findings.append(Finding("CFG002", "configuration", "low", "package.json", None,
                                        f"No '{required}' quality-gate script is declared.", f"missing scripts.{required}",
                                        f"Add a deterministic '{required}' script suitable for CI."))
        if not any(name in scripts for name in ("typecheck", "check", "build")):
            findings.append(Finding("CFG002", "configuration", "low", "package.json", None,
                                    "No TypeScript/build validation script is declared.", "missing type/build gate",
                                    "Add a no-emit typecheck or a build script suitable for CI."))
    if tsconfig is None:
        findings.append(Finding("CFG003", "configuration", "medium", "tsconfig.json", None,
                                "No root tsconfig.json was found.", "missing tsconfig.json",
                                "Add an explicit compiler contract, or document why this is JavaScript-only."))
    else:
        options = tsconfig.get("compilerOptions", {}) if isinstance(tsconfig.get("compilerOptions", {}), dict) else {}
        if options.get("strict") is not True:
            findings.append(Finding("CFG004", "configuration", "high", "tsconfig.json", None,
                                    "TypeScript strict mode is not enabled.", "compilerOptions.strict != true",
                                    "Enable strict mode and address errors incrementally."))
        if options.get("allowJs") is True and options.get("checkJs") is not True:
            findings.append(Finding("CFG005", "configuration", "medium", "tsconfig.json", None,
                                    "JavaScript is included but checkJs is disabled, leaving a type-safety blind spot.",
                                    "allowJs=true, checkJs!=true",
                                    "Enable checkJs or exclude runtime JavaScript from the TypeScript project deliberately."))
    if len(snapshot.lockfiles) > 1:
        findings.append(Finding("CFG006", "configuration", "medium", ", ".join(snapshot.lockfiles), None,
                                "Multiple package-manager lockfiles make dependency resolution ambiguous.",
                                ", ".join(snapshot.lockfiles), "Choose one package manager and remove stale lockfiles."))
    return findings


def _audit_dependencies(snapshot: ProjectSnapshot) -> list[Finding]:
    if not snapshot.package:
        return []
    dependency_groups = []
    manifests = (snapshot.package,) + snapshot.workspace_packages
    for key in ("dependencies", "devDependencies", "peerDependencies", "optionalDependencies"):
        combined: dict[str, Any] = {}
        for manifest in manifests:
            value = manifest.get(key, {})
            if isinstance(value, dict):
                combined.update(value)
        dependency_groups.append(combined)
    declared = set().union(*(set(group) for group in dependency_groups))
    declared.update(
        manifest["name"] for manifest in snapshot.workspace_packages
        if isinstance(manifest.get("name"), str)
    )
    root_runtime = snapshot.package.get("dependencies", {})
    runtime = set(root_runtime) if isinstance(root_runtime, dict) else set()
    imported: set[str] = set()
    first_use: dict[str, ImportEdge] = {}
    for edge in snapshot.imports:
        if edge.target or edge.specifier.startswith(".") or _is_node_builtin(edge.specifier):
            continue
        package_name = _external_package_name(edge.specifier)
        imported.add(package_name)
        first_use.setdefault(package_name, edge)
    findings: list[Finding] = []
    for package_name in sorted(imported - declared):
        edge = first_use[package_name]
        findings.append(Finding(
            "DEP001", "dependencies", "high", edge.source, edge.line,
            f"Imported package '{package_name}' is not declared in package.json.", edge.specifier,
            "Declare the package in the appropriate dependency group or remove the import.",
        ))
    for package_name in sorted(runtime - imported):
        findings.append(Finding(
            "DEP002", "dependencies", "medium", "package.json", None,
            f"Runtime dependency '{package_name}' has no static import in the scanned source.", package_name,
            "Confirm dynamic/config-driven use; otherwise remove the unused runtime dependency.",
        ))
    return findings


def _line_number(content: str, offset: int) -> int:
    return content.count("\n", 0, offset) + 1


def _first_segment(parts: tuple[str, ...], candidates: set[str]) -> str | None:
    return next((part.lower() for part in parts if part.lower() in candidates), None)


def _module_name(path: str | None, module_root: str) -> str | None:
    if not path:
        return None
    parts = PurePosixPath(path).parts
    root_parts = PurePosixPath(module_root).parts
    for index in range(len(parts) - len(root_parts)):
        if parts[index:index + len(root_parts)] == root_parts and index + len(root_parts) < len(parts):
            return parts[index + len(root_parts)]
    return None


def _is_node_builtin(specifier: str) -> bool:
    return specifier.startswith("node:") or specifier.split("/")[0] in _NODE_BUILTINS


def _external_package_name(specifier: str) -> str:
    parts = specifier.split("/")
    return "/".join(parts[:2]) if specifier.startswith("@") else parts[0]


def _mask_js_noncode(content: str) -> str:
    """Mask strings, comments, templates, and obvious regex literals while preserving lines."""
    chars = list(content)
    state = "code"
    quote = ""
    escaped = False
    previous_code = ""
    index = 0
    while index < len(chars):
        char = chars[index]
        nxt = chars[index + 1] if index + 1 < len(chars) else ""
        if state == "line_comment":
            if char == "\n":
                state = "code"
            else:
                chars[index] = " "
        elif state == "block_comment":
            if char == "*" and nxt == "/":
                chars[index] = chars[index + 1] = " "
                index += 1
                state = "code"
            elif char != "\n":
                chars[index] = " "
        elif state in {"string", "regex"}:
            if char == "\n" and state == "string" and quote != "`":
                state = "code"
                escaped = False
            else:
                if not escaped and char == quote:
                    state = "code"
                escaped = (not escaped and char == "\\")
                if char != "\n":
                    chars[index] = " "
        else:
            if char == "/" and nxt == "/":
                chars[index] = chars[index + 1] = " "
                index += 1
                state = "line_comment"
            elif char == "/" and nxt == "*":
                chars[index] = chars[index + 1] = " "
                index += 1
                state = "block_comment"
            elif char in {"'", '"', "`"}:
                quote = char
                chars[index] = " "
                state = "string"
                escaped = False
            elif char == "/" and previous_code in {"", "=", ":", "(", "[", "{", ",", ";", "!", "?", "|", "&"}:
                quote = "/"
                chars[index] = " "
                state = "regex"
                escaped = False
            elif not char.isspace():
                previous_code = char
        index += 1
    return "".join(chars)


def _extract_js_comments(content: str) -> list[str]:
    """Extract real line/block comments while ignoring comment markers inside literals."""
    comments: list[str] = []
    state = "code"
    quote = ""
    escaped = False
    previous_code = ""
    index = 0
    while index < len(content):
        char = content[index]
        nxt = content[index + 1] if index + 1 < len(content) else ""
        if state == "string":
            if char == "\n" and quote != "`":
                state = "code"
                escaped = False
            elif not escaped and char == quote:
                state = "code"
            escaped = (not escaped and char == "\\")
        elif state == "regex":
            if not escaped and char == "/":
                state = "code"
            escaped = (not escaped and char == "\\")
        else:
            if char == "/" and nxt == "/":
                end = content.find("\n", index + 2)
                end = len(content) if end == -1 else end
                comments.append(content[index:end])
                index = end - 1
            elif char == "/" and nxt == "*":
                end = content.find("*/", index + 2)
                end = len(content) - 2 if end == -1 else end
                comments.append(content[index:end + 2])
                index = end + 1
            elif char in {"'", '"', "`"}:
                state = "string"
                quote = char
                escaped = False
            elif char == "/" and previous_code in {"", "=", ":", "(", "[", "{", ",", ";", "!", "?", "|", "&"}:
                state = "regex"
                escaped = False
            elif not char.isspace():
                previous_code = char
        index += 1
    return comments


def _deduplicate(findings: Iterable[Finding]) -> list[Finding]:
    unique: dict[tuple[str, str, int | None, str], Finding] = {}
    for finding in findings:
        unique[(finding.rule_id, finding.path, finding.line, finding.message)] = finding
    return list(unique.values())


def _summary(findings: Iterable[Finding]) -> dict[str, dict[str, int]]:
    by_severity: dict[str, int] = {"high": 0, "medium": 0, "low": 0}
    by_category: dict[str, int] = {}
    for finding in findings:
        by_severity[finding.severity] += 1
        by_category[finding.category] = by_category.get(finding.category, 0) + 1
    return {"severity": by_severity, "category": by_category}


def _strongly_connected_components(graph: dict[str, set[str]]) -> list[set[str]]:
    index = 0
    stack: list[str] = []
    indices: dict[str, int] = {}
    lowlinks: dict[str, int] = {}
    on_stack: set[str] = set()
    components: list[set[str]] = []

    def visit(node: str) -> None:
        nonlocal index
        indices[node] = index
        lowlinks[node] = index
        index += 1
        stack.append(node)
        on_stack.add(node)
        for target in graph.get(node, set()):
            if target not in indices:
                visit(target)
                lowlinks[node] = min(lowlinks[node], lowlinks[target])
            elif target in on_stack:
                lowlinks[node] = min(lowlinks[node], indices[target])
        if lowlinks[node] == indices[node]:
            component: set[str] = set()
            while stack:
                member = stack.pop()
                on_stack.remove(member)
                component.add(member)
                if member == node:
                    break
            components.append(component)

    for node in graph:
        if node not in indices:
            visit(node)
    return components
