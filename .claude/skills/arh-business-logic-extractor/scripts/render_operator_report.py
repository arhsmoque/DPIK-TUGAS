"""
render_operator_report.py — aggregate every business-logic markdown doc under a bl_root
into one self-contained, offline-viewable HTML report for an operator.

No network dependency: mermaid state-diagram blocks are parsed into a plain arrow list
(A -> B (trigger)) rather than rendered graphically, so the report needs no JS runtime or
CDN fetch to be useful. The raw mermaid source is kept in a <details> block for anyone who
wants to paste it into a full renderer.

Stateless: always rebuilds the whole report from whatever markdown currently exists under
bl_root. Run again after adding more BL docs; nothing here tracks prior runs.
"""
from __future__ import annotations

import argparse
import html
import re
from dataclasses import dataclass, field
from pathlib import Path

SECTION_RE = re.compile(r"^##\s+(\d{1,2})\.\s+(.+)$", re.MULTILINE)
MERMAID_RE = re.compile(r"```mermaid\s*\n(.*?)```", re.DOTALL)
TRANSITION_RE = re.compile(r"^\s*([A-Za-z0-9_\[\]*]+)\s*-->\s*([A-Za-z0-9_\[\]*]+)\s*(?::\s*(.+))?$", re.MULTILINE)
TABLE_ROW_RE = re.compile(r"^\|(.+)\|\s*$", re.MULTILINE)


@dataclass
class BlDoc:
    path: Path
    state: str
    category: str
    name: str
    purpose: str = ""
    decision_rows: list = field(default_factory=list)
    transitions: list = field(default_factory=list)
    mermaid_blocks: list = field(default_factory=list)
    ambiguities: list = field(default_factory=list)


def classify(path: Path, bl_root: Path) -> tuple[str, str]:
    rel = path.relative_to(bl_root)
    parts = rel.parts
    state = parts[0] if len(parts) > 1 else "current"
    category = parts[1] if len(parts) > 2 else "uncategorized"
    return state, category


def extract_section(text: str, num: int) -> str:
    matches = list(SECTION_RE.finditer(text))
    for i, m in enumerate(matches):
        if int(m.group(1)) == num:
            start = m.end()
            end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
            return text[start:end].strip()
    return ""


def parse_decision_table(section_text: str) -> list[tuple[str, str]]:
    rows = TABLE_ROW_RE.findall(section_text)
    parsed = []
    for row in rows:
        cells = [c.strip().strip("*") for c in row.split("|")]
        if len(cells) < 2:
            continue
        if set(cells[0]) <= {"-", " "}:
            continue
        if cells[0].lower() in ("condition", "event"):
            continue
        parsed.append((cells[0], cells[1]))
    return parsed


def parse_ambiguities(section_text: str) -> list[str]:
    out = []
    for line in section_text.splitlines():
        stripped = line.strip()
        if stripped[:1] in (">", "-") and "**" in stripped and ("⚠" in stripped or "?" in stripped):
            out.append(stripped.lstrip("->").strip())
    return out


def parse_doc(path: Path, bl_root: Path) -> BlDoc:
    text = path.read_text(encoding="utf-8", errors="replace")
    state, category = classify(path, bl_root)
    doc = BlDoc(path=path, state=state, category=category, name=path.stem)
    doc.purpose = extract_section(text, 1)[:400]
    doc.decision_rows = parse_decision_table(extract_section(text, 5))
    doc.ambiguities = parse_ambiguities(extract_section(text, 10))

    for block in MERMAID_RE.findall(text):
        doc.mermaid_blocks.append(block.strip())
        for m in TRANSITION_RE.finditer(block):
            src, dst, trigger = m.group(1), m.group(2), (m.group(3) or "").strip()
            doc.transitions.append((src, dst, trigger))
    return doc


def render_html(docs: list[BlDoc], bl_root: Path) -> str:
    def esc(s: str) -> str:
        return html.escape(s, quote=True)

    by_state: dict[str, list[BlDoc]] = {}
    for d in docs:
        by_state.setdefault(d.state, []).append(d)

    index_html = []
    for state in ("current", "proposal", "under_development", "historical"):
        state_docs = by_state.get(state, [])
        if not state_docs:
            continue
        index_html.append(f"<h3>{esc(state)}</h3><ul>")
        for d in sorted(state_docs, key=lambda x: (x.category, x.name)):
            index_html.append(
                f'<li><strong>{esc(d.category)}/{esc(d.name)}</strong> — {esc(d.purpose) or "<em>no purpose section found</em>"}</li>'
            )
        index_html.append("</ul>")

    decision_rows_html = []
    for d in docs:
        for cond, action in d.decision_rows:
            decision_rows_html.append(
                f"<tr><td>{esc(d.name)}</td><td>{esc(cond)}</td><td>{esc(action)}</td></tr>"
            )

    flow_html = []
    for d in docs:
        if not d.transitions and not d.mermaid_blocks:
            continue
        flow_html.append(f"<h4>{esc(d.name)}</h4>")
        if d.transitions:
            flow_html.append("<ul class='flow'>")
            for src, dst, trigger in d.transitions:
                label = f" ({esc(trigger)})" if trigger else ""
                flow_html.append(f"<li>{esc(src)} &rarr; {esc(dst)}{label}</li>")
            flow_html.append("</ul>")
        for block in d.mermaid_blocks:
            flow_html.append(f"<details><summary>raw mermaid source</summary><pre>{esc(block)}</pre></details>")

    ambiguity_html = []
    for d in docs:
        for item in d.ambiguities:
            ambiguity_html.append(f"<li><strong>{esc(d.name)}:</strong> {esc(item)}</li>")

    return f"""<!doctype html>
<html><head><meta charset="utf-8"><title>Business Logic Report — {esc(bl_root.name)}</title>
<style>
  body {{ font-family: system-ui, sans-serif; max-width: 960px; margin: 2rem auto; padding: 0 1rem; color: #1a1a1a; background: #fff; }}
  @media (prefers-color-scheme: dark) {{ body {{ color: #e6e6e6; background: #111; }} table {{ border-color: #444; }} th, td {{ border-color: #444; }} details {{ background: #1b1b1b; }} }}
  h1 {{ border-bottom: 2px solid currentColor; padding-bottom: .3rem; }}
  section {{ margin: 2rem 0; }}
  table {{ border-collapse: collapse; width: 100%; }}
  th, td {{ border: 1px solid #999; padding: .4rem .6rem; text-align: left; vertical-align: top; }}
  ul.flow {{ font-family: ui-monospace, monospace; }}
  details {{ margin: .5rem 0; padding: .3rem .6rem; border: 1px solid #999; border-radius: 4px; }}
  .ambiguities {{ background: #fff3cd; color: #664d03; padding: 1rem; border-radius: 6px; }}
  @media (prefers-color-scheme: dark) {{ .ambiguities {{ background: #3a2f00; color: #ffe08a; }} }}
</style></head>
<body>
<h1>Business Logic Report — {esc(bl_root.name)}</h1>
<p>{len(docs)} document(s) scanned under <code>{esc(str(bl_root))}</code>.</p>

<section class="ambiguities">
<h2>Open ambiguities — triage first</h2>
<ul>{"".join(ambiguity_html) or "<li>None recorded.</li>"}</ul>
</section>

<section>
<h2>Index</h2>
{"".join(index_html) or "<p>No documents found.</p>"}
</section>

<section>
<h2>Decision-rule rollup</h2>
<table><tr><th>Doc</th><th>Condition</th><th>Action</th></tr>
{"".join(decision_rows_html) or "<tr><td colspan=3>No decision-rule tables found.</td></tr>"}
</table>
</section>

<section>
<h2>Flows / state transitions</h2>
{"".join(flow_html) or "<p>No state-diagram blocks found.</p>"}
</section>
</body></html>
"""


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--bl-root", required=True, type=Path, help="Business-logic output root to scan.")
    parser.add_argument("--output", required=True, type=Path, help="Destination HTML path.")
    args = parser.parse_args()

    bl_root = args.bl_root.resolve()
    if not bl_root.exists():
        raise SystemExit(f"bl_root does not exist: {bl_root}")

    docs = [parse_doc(p, bl_root) for p in sorted(bl_root.rglob("*.md")) if p.name.lower() not in ("index.md", "glossary.md")]
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(render_html(docs, bl_root), encoding="utf-8")
    print(f"Wrote {args.output} ({len(docs)} doc(s), "
          f"{sum(len(d.decision_rows) for d in docs)} decision rows, "
          f"{sum(len(d.ambiguities) for d in docs)} ambiguities).")


if __name__ == "__main__":
    main()
