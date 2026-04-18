"""事故 / 死亡災害データから軽量な事前集計 JSON を生成する。

生の JSONL (accidents-mhlw/) は 400MB 超で GitHub/Vercel デプロイ不可。
代わりに以下の集計を web/src/data/aggregates-mhlw/ に書き出し、
`/analytics` や `/accidents` の統計表示で使う。

出力:
  aggregates-mhlw/accidents-by-year.json        年×事故型数
  aggregates-mhlw/accidents-by-industry.json    年×業種（大）
  aggregates-mhlw/accidents-by-type-industry.json 事故型×業種（大）
  aggregates-mhlw/accidents-by-month.json       年月ごとの件数
  aggregates-mhlw/accidents-by-age.json         年×年齢帯
  aggregates-mhlw/deaths-by-year.json           死亡災害: 年×事故型
  aggregates-mhlw/meta.json                     生成日時、総件数など
"""
from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import WEB_DATA_DIR, ensure_dir, log, utf8_stdio  # type: ignore


DST_DIR = WEB_DATA_DIR / "aggregates-mhlw"


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


def age_bucket(age: int | None) -> str:
    if age is None:
        return "unknown"
    if age < 20:
        return "-19"
    if age < 30:
        return "20-29"
    if age < 40:
        return "30-39"
    if age < 50:
        return "40-49"
    if age < 60:
        return "50-59"
    if age < 70:
        return "60-69"
    return "70+"


def build_accidents() -> dict:
    root = WEB_DATA_DIR / "accidents-mhlw"
    if not root.exists():
        return {"total": 0}

    by_year_type: dict[int, Counter] = defaultdict(Counter)
    by_year_industry: dict[int, Counter] = defaultdict(Counter)
    by_type_industry: dict[str, Counter] = defaultdict(Counter)
    by_month: dict[str, int] = defaultdict(int)
    by_year_age: dict[int, Counter] = defaultdict(Counter)
    total = 0

    for p in sorted(root.glob("*.jsonl")):
        for rec in iter_jsonl(p):
            total += 1
            y = rec.get("year")
            m = rec.get("month")
            at = (rec.get("accidentType") or {}).get("name") or "(不明)"
            ind = (rec.get("industry") or {}).get("majorName") or "(不明)"
            if isinstance(y, int):
                by_year_type[y][at] += 1
                by_year_industry[y][ind] += 1
                by_year_age[y][age_bucket(rec.get("age"))] += 1
            by_type_industry[at][ind] += 1
            if isinstance(y, int) and isinstance(m, int):
                by_month[f"{y}-{m:02d}"] += 1

    ensure_dir(DST_DIR)

    (DST_DIR / "accidents-by-year.json").write_text(
        json.dumps(
            {str(y): dict(c) for y, c in sorted(by_year_type.items())},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    (DST_DIR / "accidents-by-industry.json").write_text(
        json.dumps(
            {str(y): dict(c) for y, c in sorted(by_year_industry.items())},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    (DST_DIR / "accidents-by-type-industry.json").write_text(
        json.dumps(
            {t: dict(c) for t, c in sorted(by_type_industry.items())},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    (DST_DIR / "accidents-by-month.json").write_text(
        json.dumps(dict(sorted(by_month.items())), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (DST_DIR / "accidents-by-age.json").write_text(
        json.dumps(
            {str(y): dict(c) for y, c in sorted(by_year_age.items())},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    log(f"[ok] accidents aggregates: total={total:,}")
    return {"total": total, "years": sorted(by_year_type.keys())}


def build_deaths() -> dict:
    root = WEB_DATA_DIR / "deaths-mhlw"
    if not root.exists():
        return {"total": 0}
    by_year_type: dict[int, Counter] = defaultdict(Counter)
    by_year_industry: dict[int, Counter] = defaultdict(Counter)
    total = 0
    for p in sorted(root.glob("records-*.jsonl")):
        for rec in iter_jsonl(p):
            total += 1
            y = rec.get("year")
            at = (rec.get("accidentType") or {}).get("name") or "(不明)"
            ind = (rec.get("industry") or {}).get("majorName") or "(不明)"
            if isinstance(y, int):
                by_year_type[y][at] += 1
                by_year_industry[y][ind] += 1

    ensure_dir(DST_DIR)
    (DST_DIR / "deaths-by-year.json").write_text(
        json.dumps(
            {str(y): dict(c) for y, c in sorted(by_year_type.items())},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    (DST_DIR / "deaths-by-industry.json").write_text(
        json.dumps(
            {str(y): dict(c) for y, c in sorted(by_year_industry.items())},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    log(f"[ok] deaths aggregates: total={total:,}")
    return {"total": total, "years": sorted(by_year_type.keys())}


def main() -> int:
    utf8_stdio()
    ensure_dir(DST_DIR)
    a_stats = build_accidents()
    d_stats = build_deaths()
    meta = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "accidents": a_stats,
        "deaths": d_stats,
    }
    (DST_DIR / "meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    log(f"[done] wrote aggregates to {DST_DIR}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
