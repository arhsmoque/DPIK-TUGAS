import json
from pathlib import Path
from repo_inspector_script.core.repo_scanner_parser import RepoScannerParser
from repo_inspector_script.core.shape_signal import evaluate_list_shape, DOCS_ENTRY_FIELDS

class DocumentationGistExtractor:
    """Purpose: Scans Markdown doc files to extract outline headings, list rules, and codeblock metrics."""
    def run(self, src: Path):
        intel = RepoScannerParser(src)
        docs = intel.extract_doc_gists()

        print("\n================ DOCUMENTATION GIST OUTLINES ================")
        print(json.dumps(docs, indent=2))
        print(evaluate_list_shape("docs", docs, DOCS_ENTRY_FIELDS).line())
        return docs
