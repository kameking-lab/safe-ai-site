#!/usr/bin/env python3
"""Strict structural inspection for every fall-prevention PDF artifact."""

from __future__ import annotations

import json
from pathlib import Path

from pypdf import PdfReader
from pypdf.generic import TextStringObject


WEB_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = WEB_ROOT / "src" / "data" / "safety-seminars"
DOWNLOAD_DIR = (
    WEB_ROOT
    / "public"
    / "training"
    / "safety-seminars"
    / "fall-prevention"
    / "downloads"
)

EXPECTED_PAGES = {
    "fall-prevention-training.pdf": 20,
    "fall-prevention-instructor-script.pdf": 21,
    "fall-prevention-handout.pdf": 1,
    "fall-prevention-field-checklist.pdf": 2,
    "fall-prevention-quiz-and-answers.pdf": 4,
    "fall-prevention-sources.pdf": 7,
}


def main() -> int:
    training = json.loads((DATA_DIR / "fall-prevention.json").read_text(encoding="utf-8"))
    claims = json.loads((DATA_DIR / "claims.json").read_text(encoding="utf-8"))
    sources = json.loads((DATA_DIR / "source-registry.json").read_text(encoding="utf-8"))
    claim_by_id = {claim["claimId"]: claim for claim in claims}
    source_index = {
        source["sourceId"]: index for index, source in enumerate(sources, start=1)
    }

    results: list[dict[str, object]] = []
    readers: dict[str, PdfReader] = {}
    for filename, expected_pages in EXPECTED_PAGES.items():
        path = DOWNLOAD_DIR / filename
        reader = PdfReader(str(path), strict=True)
        readers[filename] = reader
        root = reader.trailer["/Root"]
        language = root.get("/Lang")
        if not isinstance(language, TextStringObject) or str(language) != "ja-JP":
            raise ValueError(f"{filename}: invalid /Lang {language!r}")
        if len(reader.pages) != expected_pages:
            raise ValueError(
                f"{filename}: expected {expected_pages} pages, got {len(reader.pages)}"
            )
        if not (reader.metadata or {}).get("/Title"):
            raise ValueError(f"{filename}: missing title metadata")
        results.append(
            {
                "file": filename,
                "pages": len(reader.pages),
                "language": str(language),
                "title": (reader.metadata or {}).get("/Title"),
            }
        )

    training_title = (readers["fall-prevention-training.pdf"].metadata or {}).get(
        "/Title"
    )
    if training_title != training["title"]:
        raise ValueError(f"training title mismatch: {training_title!r}")

    handout_text = "".join(
        page.extract_text() or ""
        for page in readers["fall-prevention-handout.pdf"].pages
    ).replace(" ", "")
    source_ids: list[str] = []
    for claim_id in ("CLM-STAT-002", "CLM-STAT-003", "CLM-STAT-009"):
        for source_id in claim_by_id[claim_id]["sourceIds"]:
            if source_id not in source_ids:
                source_ids.append(source_id)
    expected_refs = "".join(f"[{source_index[source_id]}]" for source_id in source_ids)
    if expected_refs not in handout_text:
        raise ValueError(f"handout statistics refs missing: {expected_refs}")

    print(
        json.dumps(
            {
                "status": "pass",
                "strict": True,
                "files": results,
                "handoutStatisticsRefs": expected_refs,
            },
            ensure_ascii=False,
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
