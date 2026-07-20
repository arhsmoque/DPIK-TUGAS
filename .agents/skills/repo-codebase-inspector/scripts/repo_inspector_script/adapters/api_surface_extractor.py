import json
from pathlib import Path
from repo_inspector_script.core.repo_scanner_parser import RepoScannerParser
from repo_inspector_script.core.shape_signal import evaluate_centroid_shape, evaluate_centroid_retention

class ApiSurfaceExtractor:
    """Purpose: Extracts public classes, function signatures, and method entrypoints."""
    def run(self, src: Path):
        intel = RepoScannerParser(src)
        centroids = intel.get_centroid()

        print("\n================ API LEVER ENTRYPOINTS (CENTROID) ================")
        print(json.dumps(centroids, indent=2))
        print(evaluate_centroid_shape(centroids).line())
        print(evaluate_centroid_retention(src, centroids).line())
        return centroids
