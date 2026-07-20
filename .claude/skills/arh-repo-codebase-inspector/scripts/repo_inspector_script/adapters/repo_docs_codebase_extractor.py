import sys
from pathlib import Path

from repo_inspector_script.core.repo_scanner_parser import RepoScannerParser
from repo_inspector_script.core.truncation import truncate_for_pack
from repo_inspector_script.core.shape_signal import (
    evaluate_pack_shape, evaluate_centroid_retention, evaluate_capped_list_retention,
)

_VENDOR_PATH = Path(__file__).parent.parent / "vendor"
if str(_VENDOR_PATH) not in sys.path:
    sys.path.insert(0, str(_VENDOR_PATH))

from toon_format import encode as toon_encode  # noqa: E402  (vendored, path set above)


class RepoDocsCodebaseExtractor:
    """Purpose: Compiles centroids, hotspots, and document summaries into a token-compressed TOON layout."""
    def run(self, src: Path, max_items: int, output_file: str = None):
        intel = RepoScannerParser(src)
        data = {
            "centroid": intel.get_centroid(),
            "risk_register": intel.scan_risk_register(),
            "docs": intel.extract_doc_gists()
        }

        packed = self._serialize(data, max_items)

        if output_file:
            Path(output_file).write_text(packed, encoding="utf-8")
            print(f"Extraction payload saved successfully to: {output_file}")
        else:
            print("\n================ REPO DOCS CODEBASE EXTRACTION PAYLOAD ================")
            print(packed)

        print(evaluate_pack_shape(data).line())
        print(evaluate_centroid_retention(src, data["centroid"]).line())
        risk_retention = evaluate_capped_list_retention(
            "pack.risk_register", intel.last_risk_candidates_total, RepoScannerParser.RISK_REGISTER_CAP
        )
        print(risk_retention.line())
        if max_items is not None and max_items < 10 ** 9:
            print(
                f"[RETENTION SIGNAL] pack.max_items={max_items}: arrays longer than this were "
                f"balanced-truncated in the TOON body above (see '# Truncated:' header lines)."
            )

        return data, packed

    def _serialize(self, data: dict, max_items: int) -> str:
        truncated, notes = truncate_for_pack(data, max_items)
        body = toon_encode(truncated)

        header_lines = ["# TOON Object Notation"]
        for note in notes:
            header_lines.append(f"# Truncated: {note}")
        header_lines.append("# ---")
        return "\n".join(header_lines) + "\n" + body
