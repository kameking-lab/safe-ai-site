#!/usr/bin/env python3
"""
規制法律 (PRTR / 化審法 / 毒劇法 / 化学兵器禁止法 / 廃掃法) のオープンデータをパース

  $ python3 scripts/chemical-data-import/parse-regulatory-laws.py

入力 (GitHub ミラー: github.com/Ameyanagi/ra-law-db):
  - scripts/chemical-data-import/tmp/law_entries.jsonl
  - scripts/chemical-data-import/tmp/cas_mappings.jsonl

出力:
  - web/src/data/chemicals-prtr/regulatory.jsonl         (PRTR 第一種/第二種)
  - web/src/data/chemicals-chashin/regulatory.jsonl      (化審法・毒劇法・化学兵器禁止法・廃掃法)
  - web/src/data/chemicals-prtr/manifest.json
  - web/src/data/chemicals-chashin/manifest.json

元データは政府公開法令 (e-Gov 経由 NITE/環境省/経産省/厚労省 所管) のため、
出典明記のうえ自由利用可。
"""

import csv
import hashlib
import json
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC_DIR = ROOT / "scripts" / "chemical-data-import" / "tmp"
ENTRIES_PATH = SRC_DIR / "law_entries.jsonl"
MAPPINGS_PATH = SRC_DIR / "cas_mappings.jsonl"

OUT_PRTR_DIR = ROOT / "web" / "src" / "data" / "chemicals-prtr"
OUT_CHASHIN_DIR = ROOT / "web" / "src" / "data" / "chemicals-chashin"

OFFICIAL_REFS = {
    "prtr1": "https://www.env.go.jp/chemi/prtr/risk0.html",
    "prtr2": "https://www.env.go.jp/chemi/prtr/risk0.html",
    "cscl": "https://www.meti.go.jp/policy/chemical_management/kasinhou/",
    "poison_control": "https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000051379.html",
    "cwc": "https://www.meti.go.jp/policy/anpo/law/cwc_law.html",
    "waste": "https://www.env.go.jp/recycle/waste/sp_contr/index.html",
}

REGULATION_LABEL_JA = {
    "prtr1": "化管法 第一種指定化学物質 (PRTR 第一種)",
    "prtr2": "化管法 第二種指定化学物質 (PRTR 第二種)",
    "cscl": "化審法 特定化学物質 (CSCL)",
    "poison_control": "毒物及び劇物取締法",
    "cwc": "化学兵器禁止法",
    "waste": "廃棄物処理法 (特定有害産業廃棄物)",
}

PRTR_TYPES = {"prtr1", "prtr2"}
CHASHIN_TYPES = {"cscl", "poison_control", "cwc", "waste"}

CAS_PATTERN_LOOSE = __import__("re").compile(r"^\d{2,7}-\d{2,3}-\d{1,2}$")


def sha256_of(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def load_jsonl(path):
    out = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            out.append(json.loads(line))
    return out


def join_entries_and_mappings():
    """law_entries.jsonl と cas_mappings.jsonl を entry_id で JOIN"""
    entries = {e["entry_id"]: e for e in load_jsonl(ENTRIES_PATH)}
    joined = []
    for m in load_jsonl(MAPPINGS_PATH):
        eid = m["entry_id"]
        e = entries.get(eid)
        if not e:
            continue
        cas = (m.get("cas_number") or "").strip()
        if not CAS_PATTERN_LOOSE.match(cas):
            continue
        joined.append(
            {
                "cas": cas,
                "nameJa": e.get("normalized_name") or e.get("raw_name") or "",
                "regulationType": e["regulation_type"],
                "regulationClass": e.get("regulation_class", 0),
                "category": e.get("category"),
                "lawReference": e.get("law_reference"),
                "tableTitle": e.get("table_title"),
                "rawName": e.get("raw_name"),
                "matchMethod": m.get("match_method"),
                "matchConfidence": m.get("confidence"),
                "officialUrl": OFFICIAL_REFS.get(e["regulation_type"]),
            }
        )
    return joined


def aggregate_by_cas(rows):
    """同一 CAS の複数規制を 1 エントリにまとめる (regulationTypes に配列で持つ)"""
    by_cas = defaultdict(lambda: {"regulations": []})
    for r in rows:
        d = by_cas[r["cas"]]
        # 物質名は最初に取れたものを優先採用 (raw_name のほうが正式名に近い)
        if "nameJa" not in d:
            d["nameJa"] = r["nameJa"]
            d["rawName"] = r["rawName"]
        d["regulations"].append(
            {
                "type": r["regulationType"],
                "class": r["regulationClass"],
                "category": r["category"],
                "lawReference": r["lawReference"],
                "tableTitle": r["tableTitle"],
                "officialUrl": r["officialUrl"],
                "label": REGULATION_LABEL_JA.get(r["regulationType"], r["regulationType"]),
            }
        )
    return by_cas


def write_jsonl(path, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def write_manifest(path, *, types, total_rows, unique_cas, src_files):
    manifest = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sources": [
            {
                "kind": "github_mirror",
                "repository": "Ameyanagi/ra-law-db",
                "file": str(p.name),
                "sha256": sha256_of(p),
                "fileSize": p.stat().st_size,
            }
            for p in src_files
        ],
        "upstreamReference": "e-Gov 法令API 経由で取得された政府公開法令データ",
        "license": "政府公開法令データ (e-Gov api.elaws.e-gov.go.jp)、出典明記で自由利用可",
        "regulationTypes": sorted(types),
        "totalRows": total_rows,
        "uniqueCas": unique_cas,
        "regulationTypeLabels": {k: v for k, v in REGULATION_LABEL_JA.items() if k in types},
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
        f.write("\n")


def main():
    if not ENTRIES_PATH.exists() or not MAPPINGS_PATH.exists():
        print(
            f"[parse-regulatory-laws] 入力ファイル不在:\n  {ENTRIES_PATH}\n  {MAPPINGS_PATH}\n"
            "  事前に GitHub ミラーから取得:\n"
            "    curl -sL -o scripts/chemical-data-import/tmp/law_entries.jsonl \\\n"
            "      https://raw.githubusercontent.com/Ameyanagi/ra-law-db/main/parsed/law_entries.jsonl\n"
            "    curl -sL -o scripts/chemical-data-import/tmp/cas_mappings.jsonl \\\n"
            "      https://raw.githubusercontent.com/Ameyanagi/ra-law-db/main/mappings/cas_mappings.jsonl",
            file=sys.stderr,
        )
        sys.exit(1)

    rows = join_entries_and_mappings()
    print(f"[parse-regulatory-laws] joined rows (with CAS): {len(rows)}")

    type_counter = Counter(r["regulationType"] for r in rows)
    for t, n in sorted(type_counter.items(), key=lambda x: -x[1]):
        uniq = len({r["cas"] for r in rows if r["regulationType"] == t})
        print(f"  {t:18s} {n:4d} rows / {uniq:4d} unique CAS")

    # PRTR 用 JSONL
    prtr_rows = [r for r in rows if r["regulationType"] in PRTR_TYPES]
    prtr_by_cas = aggregate_by_cas(prtr_rows)
    prtr_jsonl = [
        {"cas": cas, **info} for cas, info in sorted(prtr_by_cas.items())
    ]
    write_jsonl(OUT_PRTR_DIR / "regulatory.jsonl", prtr_jsonl)
    write_manifest(
        OUT_PRTR_DIR / "manifest.json",
        types=sorted(PRTR_TYPES),
        total_rows=len(prtr_rows),
        unique_cas=len(prtr_by_cas),
        src_files=[ENTRIES_PATH, MAPPINGS_PATH],
    )
    print(
        f"[parse-regulatory-laws] PRTR → {OUT_PRTR_DIR.relative_to(ROOT)}/regulatory.jsonl "
        f"({len(prtr_by_cas)} 物質)"
    )

    # 化審法系 用 JSONL
    chashin_rows = [r for r in rows if r["regulationType"] in CHASHIN_TYPES]
    chashin_by_cas = aggregate_by_cas(chashin_rows)
    chashin_jsonl = [
        {"cas": cas, **info} for cas, info in sorted(chashin_by_cas.items())
    ]
    write_jsonl(OUT_CHASHIN_DIR / "regulatory.jsonl", chashin_jsonl)
    write_manifest(
        OUT_CHASHIN_DIR / "manifest.json",
        types=sorted(CHASHIN_TYPES),
        total_rows=len(chashin_rows),
        unique_cas=len(chashin_by_cas),
        src_files=[ENTRIES_PATH, MAPPINGS_PATH],
    )
    print(
        f"[parse-regulatory-laws] 化審法系 → {OUT_CHASHIN_DIR.relative_to(ROOT)}/regulatory.jsonl "
        f"({len(chashin_by_cas)} 物質)"
    )


if __name__ == "__main__":
    main()
