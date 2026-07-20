"""Runtime self-check the tool emits on every execution.

Two different questions, kept separate on purpose:

1. Shape signal -- "did this run produce the structure callers depend on?"
   A structural schema check (keys, types, item shape) against a baseline
   recorded from known-good runs. Answers: has this command's output shape
   drifted/regressed since the baseline was captured?

2. Retention signal -- "did compressing the repo lose so much that an agent
   consuming this output will have to go re-read the raw files anyway?"
   That's a content-sufficiency question, not a structural one: centroid is
   never intentionally truncated, so its retention should sit at ~1.0 or
   something upstream broke; map/pack ARE intentionally budget-truncated, so
   partial retention is expected but must be visible, not silently implied
   as "done."

Both signals are cheap (pure post-processing over data already produced) and
print one line each so this can never be mistaken for the primary output.
"""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Tuple
import ast
import re
from repo_inspector_script.core.tsjs_audit import TSJS_EXTENSIONS

# ---------------------------------------------------------------------------
# 1. Shape signal
# ---------------------------------------------------------------------------

RISK_ENTRY_FIELDS = {
    "file": str, "lines": int, "size_bytes": int,
    "todos": int, "complexity_score": int, "threat_level": str,
}
DOCS_ENTRY_FIELDS = {
    "file": str, "headings": list, "key_bullets": list, "codeblocks_count": int,
}
MAP_TOP_FIELDS = {"tree": dict, "total_tokens": int, "coverage": dict}
PACK_TOP_FIELDS = {"centroid": dict, "risk_register": list, "docs": list}


@dataclass
class ShapeReport:
    command: str
    matched: int
    expected: int
    issues: List[str] = field(default_factory=list)

    @property
    def ratio(self) -> float:
        return 1.0 if self.expected == 0 else self.matched / self.expected

    def line(self) -> str:
        pct = self.ratio * 100
        flag = "OK" if self.ratio >= 0.99 else ("DEGRADED" if self.ratio >= 0.7 else "BROKEN")
        note = f" | issues: {'; '.join(self.issues[:3])}" if self.issues else ""
        return f"[SHAPE SIGNAL] {self.command}: {self.matched}/{self.expected} fields matched ({pct:.0f}%) -> {flag}{note}"


def _check_fields(record: Dict[str, Any], schema: Dict[str, type]) -> Tuple[int, int, List[str]]:
    matched, issues = 0, []
    for key, expected_type in schema.items():
        if key not in record:
            issues.append(f"missing '{key}'")
            continue
        if not isinstance(record[key], expected_type):
            issues.append(f"'{key}' wrong type ({type(record[key]).__name__})")
            continue
        matched += 1
    return matched, len(schema), issues


def evaluate_map_shape(data: Dict[str, Any]) -> ShapeReport:
    matched, expected, issues = _check_fields(data, MAP_TOP_FIELDS)
    return ShapeReport("map", matched, expected, issues)


def evaluate_centroid_shape(centroid: Dict[str, List[str]]) -> ShapeReport:
    """Dynamic dict[str, list[str]] -- validate entry-type conformance, not fixed keys."""
    total = len(centroid)
    matched = 0
    issues = []
    for path, symbols in centroid.items():
        if isinstance(symbols, list) and all(isinstance(s, str) for s in symbols):
            matched += 1
        else:
            issues.append(f"'{path}' not list[str]")
    if total == 0:
        return ShapeReport("centroid", 1, 1, [])  # vacuous: no code files found, not a defect
    return ShapeReport("centroid", matched, total, issues)


def evaluate_list_shape(command: str, entries: List[Dict[str, Any]], schema: Dict[str, type]) -> ShapeReport:
    if not entries:
        return ShapeReport(command, 1, 1, [])  # vacuous: nothing to validate
    matched = 0
    issues = []
    for entry in entries:
        m, e, entry_issues = _check_fields(entry, schema)
        if m == e:
            matched += 1
        else:
            issues.extend(f"{entry.get('file', '?')}: {i}" for i in entry_issues)
    return ShapeReport(command, matched, len(entries), issues)


def evaluate_pack_shape(data: Dict[str, Any]) -> ShapeReport:
    matched, expected, issues = _check_fields(data, PACK_TOP_FIELDS)
    return ShapeReport("pack", matched, expected, issues)


# ---------------------------------------------------------------------------
# 2. Context-retention signal
# ---------------------------------------------------------------------------

FOLLOWUP_THRESHOLD = 0.6  # below this fraction fully-retained, warn a re-dive is likely


@dataclass
class RetentionReport:
    command: str
    retained: int
    total: int
    note: str = ""

    @property
    def ratio(self) -> float:
        return 1.0 if self.total == 0 else self.retained / self.total

    @property
    def likely_requires_followup(self) -> bool:
        return self.ratio < FOLLOWUP_THRESHOLD

    def line(self) -> str:
        pct = self.ratio * 100
        tag = " | LIKELY_REQUIRES_FOLLOWUP: agent may need to re-read raw files for truncated paths" \
            if self.likely_requires_followup else ""
        note = f" | {self.note}" if self.note else ""
        return f"[RETENTION SIGNAL] {self.command}: {self.retained}/{self.total} fully retained ({pct:.0f}%){note}{tag}"


def _raw_python_symbol_count(filepath: Path) -> int:
    """Independent ground-truth count, deliberately not sharing code with ASTSymbolExtractor
    so a future regression in the extractor can't also corrupt the count it's checked against."""
    try:
        tree = ast.parse(filepath.read_text(encoding="utf-8"))
    except Exception:
        return 0
    count = 0
    def_types = (ast.FunctionDef, ast.AsyncFunctionDef)
    for node in tree.body:
        if isinstance(node, ast.ClassDef):
            count += 1 + sum(1 for n in node.body if isinstance(n, def_types))
        elif isinstance(node, def_types):
            count += 1
    return count


def _raw_tsjs_symbol_count(filepath: Path) -> int:
    """Independent, conservative declaration count for TS/JS retention accounting."""
    try:
        content = filepath.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return 0
    declarations = re.findall(
        r"\b(?:class|interface|type|enum)\s+[A-Za-z_$][\w$]*|"
        r"\b(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(|"
        r"\bexport\s+(?:declare\s+)?const\s+[A-Za-z_$][\w$]*\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>",
        content,
    )
    visible_methods = re.findall(
        r"\b(?:public|protected|private)\s+(?:static\s+|async\s+)*(?:[A-Za-z_$][\w$]*\s*)\([^)]*\)\s*(?::|\{)",
        content,
    )
    return len(declarations) + len(visible_methods)


def evaluate_centroid_retention(root_path: Path, centroid: Dict[str, List[str]]) -> RetentionReport:
    """centroid is never intentionally budget-truncated; exposed symbols should equal ground truth."""
    exposed_total = 0
    ground_truth_total = 0
    for rel_path, symbols in centroid.items():
        filepath = root_path / rel_path
        if filepath.suffix == ".py":
            # a "class Foo(m1, m2)" entry represents 1 class + len(methods) symbols
            exposed = 0
            for s in symbols:
                if s.startswith("class "):
                    inner = s[s.find("(") + 1: s.rfind(")")] if "(" in s else ""
                    methods = [m for m in inner.split(", ") if m]
                    exposed += 1 + len(methods)
                else:
                    exposed += 1
            exposed_total += exposed
            ground_truth_total += _raw_python_symbol_count(filepath)
        elif filepath.suffix.lower() in TSJS_EXTENSIONS:
            exposed_total += len(symbols)
            ground_truth_total += _raw_tsjs_symbol_count(filepath)
        else:
            continue
    extra = max(0, exposed_total - ground_truth_total)
    note = f"{extra} extra heuristic symbols emitted beyond conservative ground truth" if extra else ""
    return RetentionReport("centroid", min(exposed_total, ground_truth_total), ground_truth_total, note)


def evaluate_map_retention(coverage: Dict[str, int]) -> RetentionReport:
    total = coverage.get("files_total", 0)
    full = coverage.get("files_full", 0)
    collapsed = coverage.get("dirs_collapsed", 0)
    note = f"{collapsed} directories collapsed to path-only" if collapsed else ""
    return RetentionReport("map", full, total, note)


def evaluate_capped_list_retention(command: str, raw_count: int, cap: int) -> RetentionReport:
    """risk/docs apply a fixed [:N] cap; surface when real results exceed it instead of staying silent."""
    retained = min(raw_count, cap)
    note = f"{raw_count - cap} lower-ranked entries exist beyond the cap" if raw_count > cap else ""
    return RetentionReport(command, retained, raw_count, note)
