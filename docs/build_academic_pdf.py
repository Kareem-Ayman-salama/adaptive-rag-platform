"""Build academic PDF documentation for DocuMind AI."""

from __future__ import annotations

import build_project_pdf as builder

builder.SOURCE = builder.ROOT / "docs" / "ACADEMIC_PROJECT_DOCUMENTATION.md"
builder.OUT = builder.ROOT / "docs" / "DocuMind_AI_Academic_Documentation.pdf"


if __name__ == "__main__":
    builder.main()
