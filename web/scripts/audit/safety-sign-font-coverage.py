#!/usr/bin/env python3
"""Fail closed when a published safety-sign preset lacks a bundled glyph."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from fontTools.ttLib import TTFont


WEB_ROOT = Path(__file__).resolve().parents[2]
REGISTRY_PATH = WEB_ROOT / "src/data/safety-image-library/translation-registry.json"
FONT_ROOT = WEB_ROOT / "src/assets/safety-image-library/fonts"
JP_FONT = FONT_ROOT / "NotoSansCJKjp-Bold.otf"
SC_FONT = FONT_ROOT / "NotoSansCJKsc-Bold.otf"
LATIN_FONT = FONT_ROOT / "NotoSans-Bold.ttf"
FONT_CHAIN_BY_LANGUAGE = {
    "ja": (JP_FONT,),
    "en": (LATIN_FONT, JP_FONT),
    "vi": (LATIN_FONT, JP_FONT),
    "zh-CN": (SC_FONT, JP_FONT),
    "id": (LATIN_FONT, JP_FONT),
}
LANGUAGES = tuple(FONT_CHAIN_BY_LANGUAGE)


def cmap(path: Path) -> set[int]:
    if not path.is_file():
        raise FileNotFoundError(f"Bundled font is missing: {path}")
    font = TTFont(path, lazy=True)
    try:
        return set(font.getBestCmap() or {})
    finally:
        font.close()


def visible_codepoints(value: str) -> set[int]:
    return {ord(char) for char in value if not char.isspace()}


def main() -> int:
    root = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    items = root.get("items")
    if not isinstance(items, list) or len(items) != 100:
        raise ValueError("translation registry must contain exactly 100 items")
    map_by_path = {path: cmap(path) for chain in FONT_CHAIN_BY_LANGUAGE.values() for path in chain}
    maps = {
        language: set().union(*(map_by_path[path] for path in chain))
        for language, chain in FONT_CHAIN_BY_LANGUAGE.items()
    }
    missing: list[dict[str, object]] = []
    preset_count = 0
    for item in items:
        slug = item.get("slug")
        translations = item.get("translations")
        if not isinstance(slug, str) or not isinstance(translations, dict):
            raise ValueError("invalid translation registry item")
        numeric = item.get("numericTemplate")
        units = numeric.get("units", {}) if isinstance(numeric, dict) else {}
        for language in LANGUAGES:
            entry = translations.get(language)
            if not isinstance(entry, dict) or not isinstance(entry.get("text"), str):
                raise ValueError(f"{slug}/{language}: translation missing")
            unit = units.get(language) if isinstance(units, dict) else ""
            if unit is not None and not isinstance(unit, str):
                raise ValueError(f"{slug}/{language}: unit must be text or null")
            rendered = entry["text"].replace("{value}", "＿＿＿＿")
            required = visible_codepoints(rendered + (unit or ""))
            absent = sorted(required - maps[language])
            if absent:
                missing.append(
                    {
                        "slug": slug,
                        "language": language,
                        "codepoints": [f"U+{value:04X}" for value in absent],
                        "characters": "".join(chr(value) for value in absent),
                    }
                )
            preset_count += 1

    brand_missing = sorted(visible_codepoints("© 安全AIポータル") - maps["ja"])
    summary = {
        "status": "PASS" if not missing and not brand_missing else "FAIL",
        "themes": len(items),
        "languages": len(LANGUAGES),
        "presets": preset_count,
        "missingPresetGlyphs": missing,
        "missingBrandCodepoints": [f"U+{value:04X}" for value in brand_missing],
        "fontChains": {
            language: [path.name for path in chain]
            for language, chain in FONT_CHAIN_BY_LANGUAGE.items()
        },
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if summary["status"] == "PASS" else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:  # fail closed with a concise gate message
        print(json.dumps({"status": "FAIL", "error": str(error)}, ensure_ascii=False), file=sys.stderr)
        raise SystemExit(1)
