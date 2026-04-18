"""パース結果のサマリと簡易バリデーション。

- accidents-mhlw / deaths-mhlw / chemicals-mhlw / laws-mhlw をスキャン
- 総件数、必須フィールド欠損率、CAS 重複、年月異常値 を標準出力に
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import WEB_DATA_DIR, utf8_stdio  # type: ignore


def iter_jsonl(path: Path):
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                continue


def summarize_accidents() -> None:
    root = WEB_DATA_DIR / "accidents-mhlw"
    if not root.exists():
        print("accidents-mhlw: (none)")
        return
    files = sorted(p for p in root.glob("*.jsonl"))
    total = 0
    missing = Counter()
    required = ["id", "year", "month", "description", "industry", "accidentType"]
    year_counter: Counter = Counter()
    industries: set = set()
    accident_types: set = set()
    bad_year_month = 0
    for p in files:
        for rec in iter_jsonl(p):
            total += 1
            for k in required:
                if rec.get(k) in (None, "", [], {}):
                    missing[k] += 1
            y = rec.get("year")
            m = rec.get("month")
            if not (isinstance(y, int) and 2006 <= y <= 2026):
                bad_year_month += 1
            elif not (isinstance(m, int) and 1 <= m <= 12):
                bad_year_month += 1
            if isinstance(y, int):
                year_counter[y] += 1
            ind = rec.get("industry") or {}
            if ind.get("majorName"):
                industries.add(ind["majorName"])
            at = rec.get("accidentType") or {}
            if at.get("name"):
                accident_types.add(at["name"])

    print("=== accidents-mhlw ===")
    print(f"files       : {len(files)}")
    print(f"records     : {total:,}")
    print(f"year range  : {min(year_counter) if year_counter else '-'}-{max(year_counter) if year_counter else '-'}")
    print(f"industries  : {len(industries)} unique major")
    print(f"accidentTyp : {len(accident_types)} unique")
    print(f"bad year/mm : {bad_year_month}")
    print("missing fields (count / %):")
    for k in required:
        c = missing[k]
        pct = 100.0 * c / total if total else 0
        print(f"  {k:14s}: {c:>8,}  ({pct:5.2f}%)")
    print("records by year (top):")
    for y, c in sorted(year_counter.items()):
        print(f"  {y}: {c:>7,}")


def summarize_deaths() -> None:
    root = WEB_DATA_DIR / "deaths-mhlw"
    if not root.exists():
        print("deaths-mhlw: (none)")
        return
    files = sorted(p for p in root.glob("records-*.jsonl"))
    total = 0
    missing = Counter()
    required = ["id", "year", "month", "description", "accidentType"]
    year_counter: Counter = Counter()
    for p in files:
        for rec in iter_jsonl(p):
            total += 1
            for k in required:
                if rec.get(k) in (None, "", [], {}):
                    missing[k] += 1
            y = rec.get("year")
            if isinstance(y, int):
                year_counter[y] += 1
    print()
    print("=== deaths-mhlw ===")
    print(f"files       : {len(files)}")
    print(f"records     : {total:,}")
    print(f"year range  : {min(year_counter) if year_counter else '-'}-{max(year_counter) if year_counter else '-'}")
    print("missing fields (count / %):")
    for k in required:
        c = missing[k]
        pct = 100.0 * c / total if total else 0
        print(f"  {k:14s}: {c:>6,}  ({pct:5.2f}%)")


def summarize_chemicals() -> None:
    path = WEB_DATA_DIR / "chemicals-mhlw" / "chemicals.jsonl"
    if not path.exists():
        print("chemicals-mhlw: (none)")
        return
    total = 0
    missing = Counter()
    required = ["substance", "category", "sourceFile"]
    cas_counter: Counter = Counter()
    category_counter: Counter = Counter()
    valid_cas = 0
    for rec in iter_jsonl(path):
        total += 1
        for k in required:
            if rec.get(k) in (None, "", [], {}):
                missing[k] += 1
        cas = rec.get("casRn")
        # CAS RN は数字-数字-数字 形式。長すぎる説明文は除外
        if cas and isinstance(cas, str) and len(cas) <= 20 and "-" in cas:
            cas_counter[cas] += 1
            valid_cas += 1
        cat = rec.get("category")
        if cat:
            category_counter[cat] += 1
    print()
    print("=== chemicals-mhlw ===")
    print(f"records         : {total:,}")
    print(f"valid CAS rows  : {valid_cas:,}")
    print(f"unique CAS      : {len(cas_counter):,}")
    print(f"CAS dupes       : {sum(1 for v in cas_counter.values() if v > 1)} CAS appear in >1 list")
    print("by category:")
    for c, n in sorted(category_counter.items(), key=lambda x: -x[1]):
        print(f"  {c:20s}: {n:>4}")
    print("missing fields (count / %):")
    for k in required:
        c = missing[k]
        pct = 100.0 * c / total if total else 0
        print(f"  {k:14s}: {c:>6,}  ({pct:5.2f}%)")


def summarize_laws() -> None:
    path = WEB_DATA_DIR / "laws-mhlw" / "articles.jsonl"
    if not path.exists():
        print("laws-mhlw: (none)")
        return
    total = 0
    missing = Counter()
    required = ["articleNumber", "text"]
    by_source: Counter = Counter()
    for rec in iter_jsonl(path):
        total += 1
        for k in required:
            if rec.get(k) in (None, "", [], {}):
                missing[k] += 1
        src = rec.get("sourceFile")
        if src:
            by_source[src] += 1
    print()
    print("=== laws-mhlw ===")
    print(f"articles    : {total:,}")
    print("articles by source file:")
    for s, c in sorted(by_source.items()):
        print(f"  {s:24s}: {c:>4}")
    print("missing fields (count / %):")
    for k in required:
        c = missing[k]
        pct = 100.0 * c / total if total else 0
        print(f"  {k:14s}: {c:>4}  ({pct:5.2f}%)")


def main() -> int:
    utf8_stdio()
    summarize_accidents()
    summarize_deaths()
    summarize_chemicals()
    summarize_laws()
    return 0


if __name__ == "__main__":
    sys.exit(main())
