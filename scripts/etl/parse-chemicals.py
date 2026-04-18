"""化学物質リストを統合 JSONL に変換する。

入力 (mhlw-data/chemicals/):
  001064830.xlsx           ... がん原性物質リスト (30年保存対象)
  1113_noudokijyun_all.xlsx ... 濃度基準値 179物質
  hifu_20251010.xlsx       ... 皮膚等障害化学物質 + 不浸透性保護具対象
  label_sds_list_20250401.xlsx ... ラベル表示・SDS交付対象物質
  PDF (shishin.pdf 等)     ... 告示・指針（フェーズ 2）

出力:
  web/src/data/chemicals-mhlw/chemicals.jsonl

各行のフォーマット:
  {
    "sourceFile": str,        # 元ファイル名
    "sheet": str,             # シート名
    "category": str,          # 'carcinogenic' | 'concentration' | 'skin' | 'label_sds' | 'other'
    "appliedDate": str|null,  # 適用日 (filename/sheet から推定)
    "substance": str,         # 物質名
    "casRn": str|null,
    "attributes": {...}       # その他のキー=シートの列名
  }

戦略:
  - 各ファイルを開き、全シートを走査
  - "CAS" または "物質名" または "名称" を含むヘッダー行を検出
  - その下の行をデータとして取り、キー=ヘッダー / 値=セル で dict 化
  - 物質名っぽい列を推定し "substance" に正規化
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
    utf8_stdio,
    write_jsonl,
)

SRC_DIR = MHLW_DATA_DIR / "chemicals"
DST_DIR = WEB_DATA_DIR / "chemicals-mhlw"

FILE_CATEGORY = {
    "001064830.xlsx": "carcinogenic",
    "1113_noudokijyun_all.xlsx": "concentration",
    "hifu_20251010.xlsx": "skin",
    "label_sds_list_20250401.xlsx": "label_sds",
}

NAME_HEADER_KEYWORDS = ("物質名", "名称", "品名")
CAS_HEADER_KEYWORDS = ("CAS",)


def _find_header_row(rows: list[tuple]) -> tuple[int, list[str]] | None:
    """ヘッダー行を推定。行内に物質名キー or CAS キーがあるセルを探す。"""
    for i, row in enumerate(rows[:40]):
        cells = [str(c).strip() if c is not None else "" for c in row]
        has_name = any(any(k in c for k in NAME_HEADER_KEYWORDS) for c in cells)
        has_cas = any(any(k in c for k in CAS_HEADER_KEYWORDS) for c in cells)
        if has_name or has_cas:
            headers = [c if c else f"col{j}" for j, c in enumerate(cells)]
            return i, headers
    return None


def _row_is_empty(row: tuple) -> bool:
    return all(c is None or (isinstance(c, str) and not c.strip()) for c in row)


def _extract_applied_date(filename: str, sheet_name: str) -> str | None:
    # R5.4.1適用分, R6.4.1適用分, R7.4.1施行, R8.4.1施行 等
    m = re.search(r"[Rr](\d+)\.(\d+)\.(\d+)", sheet_name)
    if m:
        return f"R{m.group(1)}.{m.group(2)}.{m.group(3)}"
    # hifu_20251010 → 2025-10-10
    m = re.search(r"(\d{4})(\d{2})(\d{2})", filename)
    if m:
        return f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
    m = re.search(r"(\d{8})", filename)
    if m:
        d = m.group(1)
        return f"{d[:4]}-{d[4:6]}-{d[6:8]}"
    return None


def parse_file(path: Path) -> list[dict]:
    import openpyxl

    category = FILE_CATEGORY.get(path.name, "other")
    wb = openpyxl.load_workbook(str(path), read_only=True, data_only=True)
    records: list[dict] = []

    for ws in wb.worksheets:
        rows = list(ws.iter_rows(values_only=True))
        hit = _find_header_row(rows)
        if hit is None:
            continue
        header_idx, headers = hit
        applied = _extract_applied_date(path.name, ws.title)

        # 物質名 / CAS 列のインデックスを推定
        name_col = None
        cas_col = None
        for j, h in enumerate(headers):
            if name_col is None and any(k in h for k in NAME_HEADER_KEYWORDS):
                name_col = j
            if cas_col is None and any(k in h for k in CAS_HEADER_KEYWORDS):
                cas_col = j

        for row in rows[header_idx + 1 :]:
            if _row_is_empty(row):
                continue
            # 物質名が空なら見出し的な行とみなしスキップ
            name_val = None
            if name_col is not None and name_col < len(row):
                name_val = norm(row[name_col])
            if not name_val:
                # 最初の列に意味のある値（物質名候補）があるか確認
                first = norm(row[0]) if row else None
                if not first or (isinstance(first, str) and len(first) > 60):
                    continue
                name_val = first if isinstance(first, str) else None
            if not name_val:
                continue

            cas = None
            if cas_col is not None and cas_col < len(row):
                cas = norm(row[cas_col])
                if cas is not None:
                    cas = str(cas)

            attrs: dict = {}
            for j, h in enumerate(headers):
                if j >= len(row):
                    break
                v = norm(row[j])
                if v is None:
                    continue
                attrs[h] = v if isinstance(v, (int, float, bool)) else str(v)

            records.append(
                {
                    "sourceFile": path.name,
                    "sheet": ws.title,
                    "category": category,
                    "appliedDate": applied,
                    "substance": str(name_val),
                    "casRn": cas,
                    "attributes": attrs,
                }
            )
    wb.close()
    return records


def main() -> int:
    utf8_stdio()
    ap = argparse.ArgumentParser(description="chemicals → JSONL ETL")
    ap.add_argument("--only", help="部分一致で 1 ファイルだけ処理")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not SRC_DIR.exists():
        log(f"[err] source not found: {SRC_DIR}")
        return 2

    ensure_dir(DST_DIR)
    all_records: list[dict] = []

    for path in sorted(SRC_DIR.iterdir()):
        if not path.is_file() or not path.name.lower().endswith(".xlsx"):
            if path.is_file() and path.name.lower().endswith(".pdf"):
                log(f"[skip] {path.name}: PDF (phase 2)")
            continue
        if args.only and args.only not in path.name:
            continue
        try:
            recs = parse_file(path)
        except Exception as e:
            log(f"[err] {path.name}: {e}")
            continue
        log(f"[ok] {path.name} → {len(recs)} records")
        all_records.extend(recs)

    out = DST_DIR / "chemicals.jsonl"
    if args.dry_run:
        log(f"[done] (dry) total={len(all_records)} → {out}")
    else:
        n = write_jsonl(out, all_records)
        log(f"[done] total={n} → {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
