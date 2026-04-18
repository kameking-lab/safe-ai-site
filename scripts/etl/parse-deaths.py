"""死亡災害データを JSONL に変換する。

入力 (mhlw-data/deaths/):
  (A) sibou_db_r0N.xlsx  ... 個別の死亡災害レコード（年次、19列）
  (B) r{N}_16_sibou*.xlsx / NN-NN.xlsx ... 業種×局 / 業種×事故型の集計 (cross-tab)
  (C) PDF (R5_roudousaigaibunseki.pdf 等) ... 年次分析報告書（フェーズ 2 で処理）

出力:
  web/src/data/deaths-mhlw/records-{YYYY}.jsonl     ... (A) 個別
  web/src/data/deaths-mhlw/aggregate-{YYYY}.json    ... (B) 集計（フェーズ 2 で実装）

フェーズ 0 では (A) のみ実装。(B)(C) は将来対応。
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import (  # type: ignore
    MHLW_DATA_DIR,
    WEB_DATA_DIR,
    ensure_dir,
    log,
    norm,
    seireki_from_filename_prefix,
    utf8_stdio,
    write_jsonl,
)

SRC_DIR = MHLW_DATA_DIR / "deaths"
DST_DIR = WEB_DATA_DIR / "deaths-mhlw"

DETAIL_RE = re.compile(r"^sibou_db_(?P<era>[hr])(?P<yy>\d{2})\.xlsx$", re.IGNORECASE)


def _to_int(v):
    if v is None:
        return None
    if isinstance(v, (int, float)):
        try:
            return int(v)
        except (ValueError, OverflowError):
            return None
    if isinstance(v, str):
        s = v.strip().lstrip("0") or "0"
        try:
            return int(s)
        except ValueError:
            return None
    return None


def _to_str(v):
    n = norm(v)
    return str(n) if n is not None else None


def _is_data_row(row: tuple) -> bool:
    if len(row) < 19:
        return False
    v = row[0]
    if isinstance(v, (int, float)) and v > 0:
        return True
    if isinstance(v, str) and v.strip().isdigit():
        return True
    return False


def parse_detail(path: Path, seireki: int) -> list[dict]:
    import openpyxl

    wb = openpyxl.load_workbook(str(path), read_only=True, data_only=True)
    records: list[dict] = []
    for ws in wb.worksheets:
        for row in ws.iter_rows(values_only=True):
            if not _is_data_row(row):
                continue
            rec = {
                "id": f"{seireki}-D-{_to_int(row[0]):06d}" if _to_int(row[0]) else None,
                "source": "mhlw/deaths-db",
                "year": seireki,
                "month": _to_int(row[1]),
                "occurrenceTime": _to_str(row[2]),
                "description": _to_str(row[3]),
                "industry": {
                    "majorCode": _to_int(row[4]),
                    "majorName": _to_str(row[5]),
                    "mediumCode": _to_int(row[6]),
                    "mediumName": _to_str(row[7]),
                    "minorCode": _to_int(row[8]),
                    "minorName": _to_str(row[9]),
                },
                "workplaceSize": _to_str(row[10]),
                "cause": {
                    "majorCode": _to_int(row[11]),
                    "majorName": _to_str(row[12]),
                    "mediumCode": _to_int(row[13]),
                    "mediumName": _to_str(row[14]),
                    "minorCode": _to_int(row[15]),
                    "minorName": _to_str(row[16]),
                },
                "accidentType": {
                    "code": _to_int(row[17]),
                    "name": _to_str(row[18]),
                },
            }
            records.append(rec)
        break  # 主シートのみ
    wb.close()
    return records


def main() -> int:
    utf8_stdio()
    ap = argparse.ArgumentParser(description="deaths → JSONL ETL")
    ap.add_argument("--only", help="部分一致する 1 ファイルだけ処理")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not SRC_DIR.exists():
        log(f"[err] source not found: {SRC_DIR}")
        return 2

    ensure_dir(DST_DIR)

    total_files = 0
    total_rows = 0
    skipped_agg = 0
    skipped_pdf = 0

    for path in sorted(SRC_DIR.iterdir()):
        if not path.is_file():
            continue
        name = path.name
        if args.only and args.only not in name:
            continue
        m = DETAIL_RE.match(name)
        if m:
            seireki = seireki_from_filename_prefix(
                f"{m.group('era').lower()}{int(m.group('yy')):02d}"
            )
            try:
                records = parse_detail(path, seireki)
            except Exception as e:
                log(f"[err] {name}: {e}")
                continue
            if not records:
                log(f"[skip] {name}: 0 rows")
                continue
            out = DST_DIR / f"records-{seireki}.jsonl"
            if args.dry_run:
                log(f"[ok] (dry) {name} → {len(records)} rows → {out.name}")
            else:
                n = write_jsonl(out, records)
                log(f"[ok] {name} → {n} rows → {out.name}")
            total_files += 1
            total_rows += len(records)
            continue

        if name.lower().endswith(".pdf"):
            skipped_pdf += 1
            log(f"[skip] {name}: PDF (phase 2)")
            continue
        if name.lower().endswith(".xlsx"):
            skipped_agg += 1
            log(f"[skip] {name}: aggregate cross-tab (phase 2)")
            continue

    log(
        f"[done] detail_files={total_files} rows={total_rows} "
        f"skipped_agg={skipped_agg} skipped_pdf={skipped_pdf}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
