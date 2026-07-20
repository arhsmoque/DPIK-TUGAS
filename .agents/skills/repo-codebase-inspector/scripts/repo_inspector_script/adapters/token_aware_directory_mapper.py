import json
from pathlib import Path
from repo_inspector_script.core.repo_scanner_parser import RepoScannerParser
from repo_inspector_script.core.shape_signal import evaluate_map_shape, evaluate_map_retention

class TokenAwareDirectoryMapper:
    """Purpose: Walks the repository to map directory paths and estimate their token counts."""
    def run(self, src: Path, budget: int, depth: int):
        intel = RepoScannerParser(src)
        data, exceeded = intel.generate_map(max_depth=depth, budget=budget)

        print("\n================ PANORAMA DIRECTORY TREE ================")
        print(json.dumps(data["tree"], indent=2))
        print(f"Total estimated size: {data['total_tokens']:,} tokens")
        if exceeded:
            print(f"[ALERT] Token budget limit of {budget} tokens EXCEEDED during mapping recursion!")
        else:
            print("[PASS] Tree maps safely within budget constraints.")

        print(evaluate_map_shape(data).line())
        print(evaluate_map_retention(data["coverage"]).line())
        return data
