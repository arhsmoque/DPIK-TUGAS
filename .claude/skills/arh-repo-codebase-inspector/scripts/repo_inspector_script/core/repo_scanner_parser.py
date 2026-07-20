import os
import io
import ast
import re
import tokenize
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
from repo_inspector_script.core.tsjs_audit import (
    SourceFile,
    TSJS_EXTENSIONS,
    analyze_tsjs_hotspot,
    extract_tsjs_symbols,
)

def estimate_tokens(text: str) -> int:
    char_count = len(text)
    if char_count == 0:
        return 0
    punctuation = sum(1 for c in text if c in '{}[]:," \n\t')
    other_chars = char_count - punctuation
    return int((punctuation * 1.0) + (other_chars / 3.5))

# Extensions/dirs that carry the actual behavior of a repo. Walked and token-budgeted
# before docs/config so a tight budget spends itself on code, not prose.
_CODE_EXTENSIONS = {
    ".py", ".go", ".rs", ".java", ".c", ".h",
    ".cpp", ".hpp", ".cs", ".rb", ".php", ".kt", ".swift", ".scala",
} | set(TSJS_EXTENSIONS)
_LOW_PRIORITY_DIRS = {"docs", "doc", "test", "tests", "examples", "sample", "samples", "fixtures"}
_LOW_PRIORITY_EXTENSIONS = {".md", ".txt", ".rst", ".json", ".yaml", ".yml", ".toml", ".ini", ".cfg"}

MARKER_WORDS = ("TODO", "FIXME", "BUG", "HACK")
_MARKER_WORD_RE = re.compile(r"\b(" + "|".join(MARKER_WORDS) + r")\b")
_LINE_COMMENT_MARKER_RE = re.compile(
    r"(?://|#)[^\n]{0,40}?\b(" + "|".join(MARKER_WORDS) + r")\b"
)
_BLOCK_COMMENT_MARKER_RE = re.compile(
    r"/\*.*?\*/", re.DOTALL
)


def _priority_key(name: str, is_dir: bool) -> Tuple[int, str]:
    """Lower sorts first. Code before generic before docs/config/tests."""
    if is_dir:
        rank = 2 if name.lower() in _LOW_PRIORITY_DIRS else 0
        return (rank, name)
    ext = Path(name).suffix.lower()
    if ext in _CODE_EXTENSIONS:
        rank = 0
    elif ext in _LOW_PRIORITY_EXTENSIONS:
        rank = 2
    else:
        rank = 1
    return (rank, name)


class ASTSymbolExtractor:
    """Extracts high-level signatures and symbols from codebase files."""

    def extract_python(self, filepath: Path) -> List[str]:
        symbols: List[str] = []
        try:
            content = filepath.read_text(encoding="utf-8")
            tree = ast.parse(content)
        except Exception:
            return symbols

        def_types = (ast.FunctionDef, ast.AsyncFunctionDef)

        # Walk only module-level statements. Do NOT use ast.walk() here: it
        # flattens the whole tree, so class methods and nested closures show
        # up a second time as "top-level" defs (ast never sets node.parent).
        for node in tree.body:
            if isinstance(node, ast.ClassDef):
                methods = [n.name for n in node.body if isinstance(n, def_types)]
                methods_str = f"({', '.join(methods)})" if methods else ""
                symbols.append(f"class {node.name}{methods_str}")
            elif isinstance(node, def_types):
                symbols.append(f"def {node.name}()")
        return symbols

    def extract_regex(self, filepath: Path) -> List[str]:
        symbols = []
        try:
            content = filepath.read_text(encoding="utf-8")
            class_matches = re.finditer(r"\b(?:class|interface|type)\s+(?P<name>\w+)", content)
            for m in class_matches:
                symbols.append(f"class/interface {m.group('name')}")

            method_matches = re.finditer(r"\b(?:public|export)?\s*(?P<name>\w+)\s*\([^)]*\)\s*[:{]", content)
            for m in method_matches:
                name = m.group("name")
                if name not in ("if", "for", "while", "switch", "catch", "class", "interface", "function"):
                    symbols.append(f"method {name}()")
        except Exception:
            pass
        return symbols[:30]


def _count_python_marker_comments(content: str) -> int:
    """Count TODO/FIXME/BUG/HACK only inside real comment tokens, not string/list literals."""
    count = 0
    try:
        tokens = tokenize.generate_tokens(io.StringIO(content).readline)
        for tok in tokens:
            if tok.type == tokenize.COMMENT:
                count += len(_MARKER_WORD_RE.findall(tok.string.upper()))
    except (tokenize.TokenizeError, IndentationError, SyntaxError, ValueError):
        # Fall back to comment-anchored regex if the file doesn't tokenize cleanly.
        for line in content.splitlines():
            if _LINE_COMMENT_MARKER_RE.search(line):
                count += 1
    return count


def _count_c_style_marker_comments(content: str) -> int:
    """Count markers anchored to //, #, or /* */ comment syntax, not arbitrary substrings."""
    count = 0
    for line in content.splitlines():
        if _LINE_COMMENT_MARKER_RE.search(line):
            count += 1
    for block in _BLOCK_COMMENT_MARKER_RE.findall(content):
        count += len(_MARKER_WORD_RE.findall(block.upper()))
    return count


class RepoScannerParser:
    """Core domain logic to gather maps, symbols, risk metrics, and documentation summaries."""
    RISK_REGISTER_CAP = 10

    def __init__(self, root_path: Path):
        self.root_path = root_path
        self.exclude_dirs = [".git", "node_modules", "venv", "__pycache__", "build", "dist", ".gradle", ".idea"]
        # Set by scan_risk_register(): candidate count before the top-N cap is applied,
        # so callers can report how much was cut instead of only the capped result.
        self.last_risk_candidates_total = 0

    def generate_map(self, max_depth: int = 3, budget: int = 4000) -> Tuple[Dict[str, Any], bool]:
        tree = {}
        total_tokens = 0
        budget_exceeded = False
        coverage = {"files_total": 0, "files_full": 0, "files_truncated": 0, "dirs_collapsed": 0}

        def walk_dir(path: Path, current_depth: int) -> Dict[str, Any]:
            nonlocal total_tokens, budget_exceeded
            if current_depth > max_depth or budget_exceeded:
                coverage["dirs_collapsed"] += 1
                return {"_type": "dir", "_truncated": True}

            res = {}
            try:
                children = [c for c in path.iterdir() if c.name not in self.exclude_dirs]
                children.sort(key=lambda c: _priority_key(c.name, c.is_dir()))
                for child in children:
                    if child.is_dir():
                        res[child.name] = walk_dir(child, current_depth + 1)
                    elif child.is_file():
                        coverage["files_total"] += 1
                        try:
                            content = child.read_text(encoding="utf-8", errors="ignore")
                            tokens = estimate_tokens(content)
                        except Exception:
                            tokens = 0

                        total_tokens += tokens
                        if total_tokens > budget:
                            budget_exceeded = True
                            coverage["files_truncated"] += 1
                            res[child.name] = {"_type": "file", "_tokens": tokens, "_truncated": True}
                        else:
                            coverage["files_full"] += 1
                            res[child.name] = {"_type": "file", "_tokens": tokens}
            except PermissionError:
                pass
            return res

        tree = walk_dir(self.root_path, 1)
        return {"tree": tree, "total_tokens": total_tokens, "coverage": coverage}, budget_exceeded

    def get_centroid(self) -> Dict[str, List[str]]:
        extractor = ASTSymbolExtractor()
        centroid = {}
        for root, dirs, files in os.walk(self.root_path):
            dirs[:] = [d for d in dirs if d not in self.exclude_dirs]
            for file in files:
                filepath = Path(root) / file
                rel_path = filepath.relative_to(self.root_path)

                if filepath.suffix == ".py":
                    syms = extractor.extract_python(filepath)
                    if syms:
                        centroid[str(rel_path)] = syms
                elif filepath.suffix.lower() in TSJS_EXTENSIONS:
                    try:
                        content = filepath.read_text(encoding="utf-8", errors="ignore")
                    except Exception:
                        content = ""
                    syms = extract_tsjs_symbols(content)
                    if syms:
                        centroid[str(rel_path)] = syms
                elif filepath.suffix in (".java", ".go"):
                    syms = extractor.extract_regex(filepath)
                    if syms:
                        centroid[str(rel_path)] = syms
        return centroid

    def scan_risk_register(self) -> List[Dict[str, Any]]:
        risks = []
        for root, dirs, files in os.walk(self.root_path):
            dirs[:] = [d for d in dirs if d not in self.exclude_dirs]
            for file in files:
                filepath = Path(root) / file
                if filepath.suffix == ".py" or filepath.suffix.lower() in TSJS_EXTENSIONS or filepath.suffix in (".java", ".go"):
                    try:
                        content = filepath.read_text(encoding="utf-8", errors="ignore")
                        lines = content.splitlines()
                        size = len(content)

                        if filepath.suffix == ".py":
                            todos = _count_python_marker_comments(content)
                        elif filepath.suffix.lower() in TSJS_EXTENSIONS:
                            hotspot = analyze_tsjs_hotspot(SourceFile(str(filepath.relative_to(self.root_path)), content))
                            if hotspot:
                                risks.append(hotspot.as_dict())
                            continue
                        else:
                            todos = _count_c_style_marker_comments(content)
                        complexity_score = len(re.findall(r"\b(def|class|function|interface)\b", content))

                        if len(lines) > 200 or todos > 0:
                            risks.append({
                                "file": str(filepath.relative_to(self.root_path)),
                                "lines": len(lines),
                                "size_bytes": size,
                                "todos": todos,
                                "complexity_score": complexity_score,
                                "threat_level": "High" if len(lines) > 400 or todos > 5 else "Medium"
                            })
                    except Exception:
                        pass
        risks.sort(key=lambda x: (x["threat_level"] == "High", x["complexity_score"]), reverse=True)
        self.last_risk_candidates_total = len(risks)
        return risks[:self.RISK_REGISTER_CAP]

    def extract_doc_gists(self) -> List[Dict[str, Any]]:
        gists = []
        for root, dirs, files in os.walk(self.root_path):
            dirs[:] = [d for d in dirs if d not in self.exclude_dirs]
            for file in files:
                filepath = Path(root) / file
                if filepath.suffix == ".md":
                    try:
                        content = filepath.read_text(encoding="utf-8", errors="ignore")
                        headings = [line.strip("# ") for line in content.splitlines() if line.startswith(("# ", "## "))]
                        codeblocks = re.findall(r"```(?P<lang>\w+)?\n(?P<code>.*?)```", content, re.DOTALL)

                        key_bullets = []
                        for line in content.splitlines():
                            if line.strip().startswith(("-", "*", "1.")):
                                lower = line.lower()
                                if any(term in lower for term in ["gotcha", "feature", "limit", "install", "rule"]):
                                    key_bullets.append(line.strip("-*1. "))

                        gists.append({
                            "file": str(filepath.relative_to(self.root_path)),
                            "headings": headings[:15],
                            "key_bullets": key_bullets[:10],
                            "codeblocks_count": len(codeblocks)
                        })
                    except Exception:
                        pass
        return gists
