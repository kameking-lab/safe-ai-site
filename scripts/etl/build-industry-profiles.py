"""業種ごとの事故型 / 年齢分布を集計する。

入力: web/src/data/accidents-mhlw/*.jsonl (504K records)
出力:
  web/src/data/aggregates-mhlw/industry-profiles.json
    {
      "<業種>": {
        "total": int,
        "topTypes": [{"name": str, "count": int}, ...],   # トップ5
        "ageProfile": {"-19": int, "20-29": int, ...},
      },
      ...
    }
  web/src/data/aggregates-mhlw/industry-ranking.json
    [{"name": str, "count": int}, ...]                     # 件数降順
"""
from __future__ import annotations

import json
import os
import sys
from collections import Counter, defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import WEB_DATA_DIR, ensure_dir, log, utf8_stdio  # type: ignore


DST_DIR = WEB_DATA_DIR / "aggregates-mhlw"


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


def main() -> int:
    utf8_stdio()
    # accidents-mhlw のソースは worktree 内にも .gitignore 外にも存在しうる。
    # 環境変数 ACCIDENTS_MHLW_DIR を優先、無ければ web/src/data/accidents-mhlw、
    # それも無ければメイン作業ツリー側を探す。
    candidates: list[Path] = []
    env = os.environ.get("ACCIDENTS_MHLW_DIR")
    if env:
        candidates.append(Path(env).expanduser())
    candidates.append(WEB_DATA_DIR / "accidents-mhlw")
    # メインツリーへ遡る
    cur = WEB_DATA_DIR
    for _ in range(8):
        cur = cur.parent
        if cur == cur.parent:
            break
        candidates.append(cur / "safe-ai-site" / "web" / "src" / "data" / "accidents-mhlw")

    src: Path | None = None
    for c in candidates:
        if c.exists() and any(c.glob("*.jsonl")):
            src = c
            break
    if src is None:
        log("[err] accidents-mhlw raw data not found")
        return 2
    log(f"[info] reading from {src}")

    by_industry_type: dict[str, Counter] = defaultdict(Counter)
    by_industry_age: dict[str, Counter] = defaultdict(Counter)
    by_industry_total: Counter = Counter()
    total = 0

    for p in sorted(src.glob("*.jsonl")):
        for rec in iter_jsonl(p):
            total += 1
            ind = (rec.get("industry") or {}).get("majorName") or "(不明)"
            at = (rec.get("accidentType") or {}).get("name") or "(不明)"
            age = age_bucket(rec.get("age"))
            by_industry_total[ind] += 1
            by_industry_type[ind][at] += 1
            by_industry_age[ind][age] += 1
        if total % 50000 == 0:
            log(f"[progress] {total:,} records")

    # 不明・REF! 系を除外
    def keep(name: str) -> bool:
        return bool(name) and name not in ("#REF!", "(不明)", "分類不能")

    profiles: dict = {}
    for ind, total_n in by_industry_total.items():
        if not keep(ind):
            continue
        types = by_industry_type[ind]
        top_types = [
            {"name": n, "count": c}
            for n, c in types.most_common(50)
            if keep(n)
        ][:5]
        profiles[ind] = {
            "total": total_n,
            "topTypes": top_types,
            "ageProfile": dict(by_industry_age[ind]),
        }

    ranking = sorted(
        ({"name": n, "count": c} for n, c in by_industry_total.items() if keep(n)),
        key=lambda x: -x["count"],
    )

    ensure_dir(DST_DIR)
    (DST_DIR / "industry-profiles.json").write_text(
        json.dumps(profiles, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (DST_DIR / "industry-ranking.json").write_text(
        json.dumps(ranking, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    log(f"[done] industries={len(profiles)} total={total:,}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
