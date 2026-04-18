"""労働者死傷病報告 (shisho-db) を JSONL に変換する。

入力: mhlw-data/shisho-db/sisyou_db_{era}{yy}_{mm}.(xls|xlsx)
出力: web/src/data/accidents-mhlw/{YYYY}-{MM}.jsonl

各ファイルのシートは 22 列固定:
  ID, 年号, 年, 月, 発生時間, 災害状況,
  業種コード大, 業種名大, 業種コード中, 業種名中, 業種コード小, 業種名小,
  事業場規模,
  起因物コード大, 起因物名大, 起因物コード中, 起因物名中, 起因物コード小, 起因物名小,
  事故の型コード, 事故の型名,
  年齢

h18〜h24 は .xls 形式（xlrd 必要）、h25 以降は .xlsx 形式（openpyxl で可）。
h18〜h24 は xlrd が無い環境ではスキップし警告を出す。
"""
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path
from typing import Iterator

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

SRC_DIR = MHLW_DATA_DIR / "shisho-db"
DST_DIR = WEB_DATA_DIR / "accidents-mhlw"

FILENAME_RE = re.compile(
    r"^sisyou_db_(?P<era>[hr])(?P<yy>\d{2})_(?P<mm>\d{2})\.(?P<ext>xlsx?)$",
    re.IGNORECASE,
)


def _iter_xlsx_rows(path: Path) -> Iterator[tuple]:
    import openpyxl

    wb = openpyxl.load_workbook(str(path), read_only=True, data_only=True)
    ws = wb.active
    for row in ws.iter_rows(values_only=True):
        yield row
    wb.close()


def _iter_xls_rows(path: Path) -> Iterator[tuple]:
    # xlrd は 2.x 系で .xlsx を落としたため .xls 限定。
    # 未インストールなら呼び出し側で検知。
    import xlrd  # type: ignore

    book = xlrd.open_workbook(str(path))
    sheet = book.sheet_by_index(0)
    for r in range(sheet.nrows):
        yield tuple(sheet.cell_value(r, c) for c in range(sheet.ncols))


def _is_header_row(row: tuple) -> bool:
    # 1 列目が "ID" または空、かつ 2 列目が "年号" なら見出し。
    return (
        len(row) >= 2
        and isinstance(row[1], str)
        and row[1].strip() == "年号"
    )


def _is_data_row(row: tuple) -> bool:
    if len(row) < 22:
        return False
    first = row[0]
    if isinstance(first, int) and first > 0:
        return True
    if isinstance(first, float) and first > 0:
        return True
    if isinstance(first, str) and first.strip().isdigit():
        return True
    return False


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
        if not s:
            return None
        try:
            return int(s)
        except ValueError:
            return None
    return None


def _to_str(v) -> str | None:
    n = norm(v)
    if n is None:
        return None
    return str(n)


def parse_file(path: Path) -> list[dict]:
    m = FILENAME_RE.match(path.name)
    if not m:
        log(f"[skip] unexpected filename: {path.name}")
        return []
    era_char = m.group("era").lower()
    yy = int(m.group("yy"))
    mm = int(m.group("mm"))
    seireki = seireki_from_filename_prefix(f"{era_char}{yy:02d}")
    ext = m.group("ext").lower()

    try:
        if ext == "xlsx":
            rows = _iter_xlsx_rows(path)
        else:
            rows = _iter_xls_rows(path)
    except ModuleNotFoundError as e:
        log(f"[skip] {path.name}: {e} (install xlrd to parse .xls)")
        return []
    except Exception as e:
        log(f"[err] {path.name}: {e}")
        return []

    records: list[dict] = []
    for row in rows:
        if _is_header_row(row) or not _is_data_row(row):
            continue
        rec = {
            "id": f"{seireki}-{mm:02d}-{_to_int(row[0]):06d}" if _to_int(row[0]) else None,
            "source": "mhlw/shisho-db",
            "year": seireki,
            "month": mm,
            "era": _to_str(row[1]),
            "eraYear": _to_int(row[2]),
            "occurrenceTime": _to_str(row[4]),
            "description": _to_str(row[5]),
            "industry": {
                "majorCode": _to_int(row[6]),
                "majorName": _to_str(row[7]),
                "mediumCode": _to_int(row[8]),
                "mediumName": _to_str(row[9]),
                "minorCode": _to_int(row[10]),
                "minorName": _to_str(row[11]),
            },
            "workplaceSize": _to_str(row[12]),
            "cause": {
                "majorCode": _to_int(row[13]),
                "majorName": _to_str(row[14]),
                "mediumCode": _to_int(row[15]),
                "mediumName": _to_str(row[16]),
                "minorCode": _to_int(row[17]),
                "minorName": _to_str(row[18]),
            },
            "accidentType": {
                "code": _to_int(row[19]),
                "name": _to_str(row[20]),
            },
            "age": _to_int(row[21]),
        }
        records.append(rec)
    return records


def main() -> int:
    utf8_stdio()
    ap = argparse.ArgumentParser(description="shisho-db → JSONL ETL")
    ap.add_argument(
        "--only",
        help="部分一致する 1 ファイルのみ処理 (例: r03_12)",
    )
    ap.add_argument(
        "--dry-run",
        action="store_true",
        help="書き込みせずレコード件数だけ報告",
    )
    args = ap.parse_args()

    if not SRC_DIR.exists():
        log(f"[err] source not found: {SRC_DIR}")
        return 2

    ensure_dir(DST_DIR)

    files = sorted(SRC_DIR.iterdir())
    total_files = 0
    total_rows = 0
    skipped = 0

    for path in files:
        if not path.is_file():
            continue
        if args.only and args.only not in path.name:
            continue
        m = FILENAME_RE.match(path.name)
        if not m:
            skipped += 1
            continue
        records = parse_file(path)
        if not records:
            skipped += 1
            continue
        seireki = seireki_from_filename_prefix(
            f"{m.group('era').lower()}{int(m.group('yy')):02d}"
        )
        mm = int(m.group("mm"))
        out = DST_DIR / f"{seireki}-{mm:02d}.jsonl"
        if args.dry_run:
            log(f"[ok] (dry) {path.name} → {len(records)} rows → {out.name}")
        else:
            n = write_jsonl(out, records)
            log(f"[ok] {path.name} → {n} rows → {out.name}")
        total_files += 1
        total_rows += len(records)

    log(f"[done] files={total_files} rows={total_rows} skipped={skipped}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
