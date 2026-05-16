"""Convert MHLW 死傷病報告 open data to deaths-mhlw JSONL (death records only).

Input:
  MHLW open data Excel: opendata_R{YY}_shisyobyo.xlsx
    - Col 0:  管轄局 (prefecture bureau)
    - Col 1:  災害発生年（西暦）
    - Col 4:  災害発生月
    - Col 5:  災害発生時間（時）
    - Col 6:  業種（大分類）（コード）
    - Col 7:  業種（大分類）（分類名）
    - Col 8:  業種（中分類）（コード）
    - Col 9:  業種（中分類）（分類名）
    - Col 10: 業種（小分類）（コード）
    - Col 11: 業種（小分類）（分類名）
    - Col 12: 事業場規模（人）
    - Col 13: 起因物（大分類）（コード）
    - Col 14: 起因物（大分類）（分類名）
    - Col 15: 起因物（中分類）（コード）
    - Col 16: 起因物（中分類）（分類名）
    - Col 17: 起因物（小分類）（コード）
    - Col 18: 起因物（小分類）（分類名）
    - Col 19: 事故の型（コード）
    - Col 20: 事故の型（分類名）
    - Col 29: 休業期間 ("死亡" = death record)
    - Col 30: 年齢（歳）
    - Col 31: 性別

Output:
  web/src/data/deaths-mhlw/records-{YYYY}.jsonl
  Same schema as records parsed by parse-deaths.py (sibou_db_r*.xlsx).

Usage:
  py scripts/etl/parse-opendata-deaths.py --input C:/path/to/opendata_R06_shisyobyo.xlsx
  py scripts/etl/parse-opendata-deaths.py --input C:/path/to/opendata_R06_shisyobyo.xlsx --dry-run
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import (  # type: ignore
    WEB_DATA_DIR,
    ensure_dir,
    log,
    norm,
    utf8_stdio,
)

DST_DIR = WEB_DATA_DIR / "deaths-mhlw"

COL_PREFECTURE = 0
COL_YEAR_SEIREKI = 1
COL_MONTH = 4
COL_TIME = 5
COL_IND_MAJ_CODE = 6
COL_IND_MAJ_NAME = 7
COL_IND_MED_CODE = 8
COL_IND_MED_NAME = 9
COL_IND_MIN_CODE = 10
COL_IND_MIN_NAME = 11
COL_WORKPLACE_SIZE = 12
COL_CAUSE_MAJ_CODE = 13
COL_CAUSE_MAJ_NAME = 14
COL_CAUSE_MED_CODE = 15
COL_CAUSE_MED_NAME = 16
COL_CAUSE_MIN_CODE = 17
COL_CAUSE_MIN_NAME = 18
COL_TYPE_CODE = 19
COL_TYPE_NAME = 20
COL_KYUGYOKIKAN = 29
COL_AGE = 30
COL_GENDER = 31

DEATH_MARKER = "死亡"


def _to_int(v) -> int | None:
    if v is None:
        return None
    if isinstance(v, (int, float)):
        try:
            return int(v)
        except (ValueError, OverflowError):
            return None
    if isinstance(v, str):
        s = v.strip()
        try:
            return int(s)
        except ValueError:
            return None
    return None


def _to_str(v) -> str | None:
    n = norm(v)
    return str(n) if n is not None else None


def parse_opendata(path: Path) -> list[dict]:
    import openpyxl

    log(f"Opening: {path}")
    wb = openpyxl.load_workbook(str(path), read_only=True, data_only=True)
    ws = wb.active

    records: list[dict] = []
    row_num = 0
    skipped_header = False

    for row in ws.iter_rows(values_only=True):
        row_num += 1
        if not skipped_header:
            skipped_header = True
            continue

        if len(row) <= COL_GENDER:
            continue

        # Filter for death records only
        if row[COL_KYUGYOKIKAN] != DEATH_MARKER:
            continue

        year = _to_int(row[COL_YEAR_SEIREKI])
        if not year:
            continue

        seq = len(records) + 1
        rec = {
            "id": f"{year}-D-{seq:06d}",
            "source": "mhlw/opendata-shisyobyo",
            "year": year,
            "month": _to_int(row[COL_MONTH]),
            "occurrenceTime": _to_str(row[COL_TIME]),
            "description": None,
            "prefecture": _to_str(row[COL_PREFECTURE]),
            "industry": {
                "majorCode": _to_int(row[COL_IND_MAJ_CODE]),
                "majorName": _to_str(row[COL_IND_MAJ_NAME]),
                "mediumCode": _to_int(row[COL_IND_MED_CODE]),
                "mediumName": _to_str(row[COL_IND_MED_NAME]),
                "minorCode": _to_int(row[COL_IND_MIN_CODE]),
                "minorName": _to_str(row[COL_IND_MIN_NAME]),
            },
            "workplaceSize": _to_str(row[COL_WORKPLACE_SIZE]),
            "cause": {
                "majorCode": _to_int(row[COL_CAUSE_MAJ_CODE]),
                "majorName": _to_str(row[COL_CAUSE_MAJ_NAME]),
                "mediumCode": _to_int(row[COL_CAUSE_MED_CODE]),
                "mediumName": _to_str(row[COL_CAUSE_MED_NAME]),
                "minorCode": _to_int(row[COL_CAUSE_MIN_CODE]),
                "minorName": _to_str(row[COL_CAUSE_MIN_NAME]),
            },
            "accidentType": {
                "code": _to_int(row[COL_TYPE_CODE]),
                "name": _to_str(row[COL_TYPE_NAME]),
            },
            "age": _to_str(row[COL_AGE]),
            "gender": _to_str(row[COL_GENDER]),
        }
        records.append(rec)

    wb.close()
    log(f"Parsed {len(records)} death records out of {row_num - 1} total rows")
    return records


def main() -> int:
    utf8_stdio()
    ap = argparse.ArgumentParser(description="MHLW opendata deaths ETL")
    ap.add_argument("--input", required=True, help="Path to opendata_R0N_shisyobyo.xlsx")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    src = Path(args.input)
    if not src.exists():
        log(f"[err] file not found: {src}")
        return 2

    records = parse_opendata(src)
    if not records:
        log("[warn] no death records found")
        return 1

    years = set(r["year"] for r in records)
    log(f"Years found: {sorted(years)}")

    for year in sorted(years):
        yr_records = [r for r in records if r["year"] == year]
        out = DST_DIR / f"records-{year}.jsonl"

        if out.exists():
            log(f"[warn] {out.name} already exists — will overwrite")

        if args.dry_run:
            log(f"[dry] {year}: {len(yr_records)} records → {out.name}")
            continue

        ensure_dir(DST_DIR)
        with out.open("w", encoding="utf-8") as f:
            for rec in yr_records:
                f.write(json.dumps(rec, ensure_ascii=False) + "\n")
        log(f"[ok] {year}: {len(yr_records)} records → {out.name}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
