from pathlib import Path
from repo_inspector_script.core.repo_scanner_parser import RepoScannerParser
from repo_inspector_script.core.shape_signal import (
    evaluate_list_shape, evaluate_capped_list_retention, RISK_ENTRY_FIELDS,
)

class CodebaseHotspotScanner:
    """Purpose: Scans files for size, complexity spikes, and marker comments like TODO/FIXME."""
    def run(self, src: Path):
        intel = RepoScannerParser(src)
        risks = intel.scan_risk_register()

        print("\n================ RISK REGISTER (HOTSPOTS) ================")
        print(f"{'Hotspot File':<40} | {'Lines':<6} | {'Todos':<5} | {'Complexity':<10} | {'Threat':<8}")
        print("-" * 75)
        for r in risks:
            print(f"{r['file']:<40} | {r['lines']:<6} | {r['todos']:<5} | {r['complexity_score']:<10} | {r['threat_level']:<8}")

        print(evaluate_list_shape("risk", risks, RISK_ENTRY_FIELDS).line())
        print(evaluate_capped_list_retention("risk", intel.last_risk_candidates_total, RepoScannerParser.RISK_REGISTER_CAP).line())
        return risks
