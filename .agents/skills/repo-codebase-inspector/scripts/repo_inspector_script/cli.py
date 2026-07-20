import os
import sys
import argparse
from pathlib import Path

# Ensure local module packages are in python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from repo_inspector_script.adapters.token_aware_directory_mapper import TokenAwareDirectoryMapper
from repo_inspector_script.adapters.api_surface_extractor import ApiSurfaceExtractor
from repo_inspector_script.adapters.codebase_hotspot_scanner import CodebaseHotspotScanner
from repo_inspector_script.adapters.documentation_gist_extractor import DocumentationGistExtractor
from repo_inspector_script.adapters.repo_docs_codebase_extractor import RepoDocsCodebaseExtractor
from repo_inspector_script.adapters.tsjs_repository_auditor import TsJsRepositoryAuditor

def main():
    parser = argparse.ArgumentParser(
        description="repo-inspector-script: Conductor wrapper for token-efficient codebase intelligence."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    # 1. Map (Token-Aware Directory Mapper) Command
    map_parser = subparsers.add_parser("map", help="Budget-aware directory tree mapping (TokenAwareDirectoryMapper).")
    map_parser.add_argument("--src", type=str, required=True, help="Repo folder path.")
    map_parser.add_argument("--budget", type=int, default=4000, help="Max token budget threshold.")
    map_parser.add_argument("--depth", type=int, default=3, help="Max walk depth.")

    # 2. Centroid (API Surface Extractor) Command
    centroid_parser = subparsers.add_parser("centroid", help="Extract AST public API symbol lever entrypoints (ApiSurfaceExtractor).")
    centroid_parser.add_argument("--src", type=str, required=True, help="Repo folder path.")

    # 3. Risk (Codebase Hotspot Scanner) Command
    risk_parser = subparsers.add_parser("risk", help="Extract risk register, dead code, hotspots, and red flags (CodebaseHotspotScanner).")
    risk_parser.add_argument("--src", type=str, required=True, help="Repo folder path.")

    # 4. Pack (Repo Docs Codebase Extractor) Command
    pack_parser = subparsers.add_parser("pack", help="Compress repo symbols and docs into packed TOON payload (RepoDocsCodebaseExtractor).")
    pack_parser.add_argument("--src", type=str, required=True, help="Repo folder path.")
    pack_parser.add_argument("--max-items", type=int, default=10, help="Limits arrays to preserve tokens.")
    pack_parser.add_argument("--output", type=str, help="Output file path (default: stdout).")

    # 5. Docs (Documentation Gist Extractor) Command
    docs_parser = subparsers.add_parser("docs", help="Extract readme summary outlines and codeblock references (DocumentationGistExtractor).")
    docs_parser.add_argument("--src", type=str, required=True, help="Repo folder path.")

    # 6. TypeScript/JavaScript Architecture and Portability Audit
    tsjs_parser = subparsers.add_parser("tsjs", help="Audit TS/JS architecture, imports, portability, security, and project configuration.")
    tsjs_parser.add_argument("--src", type=str, required=True, help="Repo folder path.")
    tsjs_parser.add_argument("--format", choices=("markdown", "json"), default="markdown", help="Report format.")
    tsjs_parser.add_argument("--output", type=str, help="Output path (default: stdout).")
    tsjs_parser.add_argument("--config", type=str, help="Optional JSON/JSONC policy file.")

    # 7. TS/JS Audit Policy Discovery (no --src required)
    subparsers.add_parser(
        "tsjs-policy",
        help="List every tunable tsjs AuditPolicy field (name, type, default, description) so a --config file can be written without reading source.",
    )

    args = parser.parse_args()

    if args.command == "tsjs-policy":
        print(TsJsRepositoryAuditor.describe_policy())
        return

    src_path = Path(args.src)
    if not src_path.exists():
        print(f"[ERROR] Source folder does not exist: {src_path}")
        sys.exit(1)

    if args.command == "map":
        adapter = TokenAwareDirectoryMapper()
        adapter.run(src_path, args.budget, args.depth)

    elif args.command == "centroid":
        adapter = ApiSurfaceExtractor()
        adapter.run(src_path)

    elif args.command == "risk":
        adapter = CodebaseHotspotScanner()
        adapter.run(src_path)

    elif args.command == "docs":
        adapter = DocumentationGistExtractor()
        adapter.run(src_path)

    elif args.command == "pack":
        adapter = RepoDocsCodebaseExtractor()
        adapter.run(src_path, args.max_items, args.output)

    elif args.command == "tsjs":
        adapter = TsJsRepositoryAuditor()
        adapter.run(src_path, args.format, args.output, args.config)

if __name__ == "__main__":
    main()
