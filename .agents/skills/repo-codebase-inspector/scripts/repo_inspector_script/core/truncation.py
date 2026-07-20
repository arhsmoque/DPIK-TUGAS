"""Balanced list truncation applied before TOON encoding.

The vendored TOON encoder (vendor/toon_format) has no notion of an item-count
budget -- it encodes whatever structure it is given. `repo_inspector_script`
still wants a `--max-items` knob to cap array sizes in the packed payload, so
that budgeting is done here as a pure pre-processing step over plain
dict/list data, and the encoder never has to know about it.
"""

from typing import Any, List, Tuple


def truncate_for_pack(data: Any, max_items: int) -> Tuple[Any, List[str]]:
    """Recursively cap list lengths to max_items using balanced head/tail truncation.

    Returns (truncated_data, notes) where notes describes each truncation applied,
    e.g. "centroid.core/parser.py: array balanced-truncated from 11 to 5 items".
    """
    notes: List[str] = []
    truncated = _walk(data, max_items, notes, path="")
    return truncated, notes


def _walk(node: Any, max_items: int, notes: List[str], path: str) -> Any:
    if isinstance(node, dict):
        return {k: _walk(v, max_items, notes, f"{path}.{k}" if path else str(k)) for k, v in node.items()}

    if isinstance(node, list):
        walked = [_walk(item, max_items, notes, f"{path}[{i}]") for i, item in enumerate(node)]
        if max_items is None or len(walked) <= max_items:
            return walked
        notes.append(f"{path or '<root>'}: array balanced-truncated from {len(walked)} to {max_items} items")
        head = (max_items + 1) // 2
        tail = max_items - head
        return walked[:head] + walked[len(walked) - tail:] if tail else walked[:head]

    return node
