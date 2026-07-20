# Copyright (c) 2025 TOON Format Organization
# SPDX-License-Identifier: MIT
"""TOON Format for Python (vendored subset).

Token-Oriented Object Notation (TOON) is a compact, human-readable serialization
format optimized for LLM contexts. Vendored from the `flow-toon-format` PyPI
package (MIT licensed, see LICENSE in this directory) to avoid a runtime pip
dependency and the workspace-relative sibling-path import this replaced.

Only the encode path is vendored; repo_inspector_script never decodes TOON.
"""

from .encoder import encode
from .types import EncodeOptions

__version__ = "0.9.0-beta.1"
__all__ = ["encode", "EncodeOptions"]
