#!/usr/bin/env python3
"""
MHLW Monthly Preliminary Accident Statistics Downloader
========================================================
Source: 厚生労働省「労働災害発生状況速報値」
URL:    https://anzeninfo.mhlw.go.jp/information/sokuhou.html

This script downloads and parses the monthly preliminary (速報) Excel files
published by MHLW. It extracts aggregate statistics (NOT individual case records
because individual case data / open data is NOT available for years where the
confirmed annual report has not yet been published).

Output:
  - data/aggregates-mhlw/summary-YYYY-preliminary.json  (aggregate stats)

Usage:
  python parse-mhlw-preliminary.py --year 2025
  python parse-mhlw-preliminary.py --year 2026
  python parse-mhlw-preliminary.py --all

NOTE: This data is AGGREGATE ONLY. Individual case records (個票) for 2025+
are not publicly available until MHLW publishes the annual confirmed open data
(労働者死傷病報告 オープンデータ). Check:
  https://anzeninfo.mhlw.go.jp/user/anzen/tok/anst00.html

When confirmed data becomes available, use parse-opendata-deaths.py instead.

Data licensing: 政府標準利用規約（第2.0版）= CC BY 4.0 互換
Attribution required: 厚生労働省「労働災害発生状況速報値」
"""

import argparse
import json
import os
import sys
import urllib.request
import zipfile
import io
import re
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path

# ── Config ─────────────────────────────────────────────────────────────────────

BASE_URL = "https://www.mhlw.go.jp/bunya/roudoukijun/anzeneisei11/rousai-hassei/xls/"

# File naming convention: RR-MM.xlsx where RR = 2-digit calendar year, MM = report month
# Example: 25-15.xlsx = 2025 data through March 2026 (month 15 from Jan 2025)
#          26-04.xlsx = 2026 data through April 2026 (month 4 of 2026)
YEAR_FILE_MAP = {
    2025: "25-15.xlsx",  # R7 full year 2025 through March 2026
    2026: "26-04.xlsx",  # R8 2026 through April 2026
}

OUTPUT_DIR = Path(__file__).parent.parent.parent / "src" / "data" / "aggregates-mhlw"

# ── Helpers ─────────────────────────────────────────────────────────────────────

def extract_zip_entry(buf: bytes, target_name: str) -> bytes | None:
    """Extract a file from a ZIP (xlsx) archive by name."""
    try:
        with zipfile.ZipFile(io.BytesIO(buf)) as zf:
            with zf.open(target_name) as f:
                return f.read()
    except (KeyError, Exception):
        return None


def parse_shared_strings(buf: bytes) -> list[str]:
    """Parse xl/sharedStrings.xml from an xlsx file buffer."""
    xml_data = extract_zip_entry(buf, "xl/sharedStrings.xml")
    if not xml_data:
        return []
    strings = []
    root = ET.fromstring(xml_data.decode("utf-8"))
    ns = {"ns": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    for si in root.findall(".//ns:si", ns):
        parts = []
        for t in si.findall(".//ns:t", ns):
            parts.append(t.text or "")
        strings.append("".join(parts))
    return strings


def parse_sheet_values(buf: bytes, sheet_num: int, shared_strings: list[str]) -> list[list]:
    """Parse a worksheet and return row data as list of lists."""
    xml_data = extract_zip_entry(buf, f"xl/worksheets/sheet{sheet_num}.xml")
    if not xml_data:
        return []
    root = ET.fromstring(xml_data.decode("utf-8"))
    ns = {"ns": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    rows_data = []
    for row in root.findall(".//ns:row", ns):
        cells = []
        for cell in row.findall("ns:c", ns):
            t = cell.get("t", "")
            v_elem = cell.find("ns:v", ns)
            if v_elem is None or v_elem.text is None:
                cells.append(None)
                continue
            if t == "s":
                idx = int(v_elem.text)
                cells.append(shared_strings[idx] if idx < len(shared_strings) else "")
            else:
                try:
                    val = float(v_elem.text)
                    cells.append(int(val) if val == int(val) else val)
                except ValueError:
                    cells.append(v_elem.text)
        rows_data.append(cells)
    return rows_data


def get_sheet_names(buf: bytes) -> list[str]:
    """Get sheet names from xl/workbook.xml."""
    xml_data = extract_zip_entry(buf, "xl/workbook.xml")
    if not xml_data:
        return []
    root = ET.fromstring(xml_data.decode("utf-8"))
    ns = {"ns": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
    return [s.get("name", "") for s in root.findall(".//ns:sheet", ns)]


def download_xlsx(year: int) -> bytes | None:
    """Download the preliminary Excel file for the given year."""
    filename = YEAR_FILE_MAP.get(year)
    if not filename:
        print(f"No file mapping for year {year}", file=sys.stderr)
        return None
    url = BASE_URL + filename
    print(f"Downloading {url} ...")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (research)"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.read()
    except Exception as e:
        print(f"Download failed: {e}", file=sys.stderr)
        return None


# ── Industry map (MHLW standard codes) ────────────────────────────────────────

INDUSTRY_KEYS_JP = [
    "全産業", "製造業", "鉱業", "建設業", "交通運輸事業", "陸上貨物運送事業",
    "港湾運送業", "林業", "農業、畜産・水産業", "第三次産業",
    "商業", "金融・広告", "通信", "保健衛生業", "接客・娯楽", "清掃・と畜", "警備業",
]

# ── Main extraction ────────────────────────────────────────────────────────────

def extract_stats(buf: bytes, year: int) -> dict:
    """Extract key aggregate statistics from the xlsx buffer."""
    shared = parse_shared_strings(buf)
    sheet_names = get_sheet_names(buf)
    print(f"  Sheets: {sheet_names[:6]}")

    result = {
        "year": year,
        "source": {
            "site": "厚生労働省 労働災害発生状況速報値",
            "url": "https://anzeninfo.mhlw.go.jp/information/sokuhou.html",
            "license": "政府標準利用規約（第2.0版）CC BY 4.0互換",
            "filename": YEAR_FILE_MAP[year],
        },
        "extracted_at": datetime.now().strftime("%Y-%m-%d"),
        "data_type": "aggregate_preliminary",
        "note": "Individual case records (個票) are NOT available. This is aggregate statistics only.",
        "industries": {},
        "accident_types": {},
        "monthly": {},
    }

    # Sheet 2 = 死亡災害(業種別) — find total and per-industry deaths
    sheet2 = parse_sheet_values(buf, 2, shared)
    industry_deaths = {}
    for row in sheet2:
        vals = [v for v in row if v is not None]
        if len(vals) >= 2:
            name = vals[0] if isinstance(vals[0], str) else None
            if name and name in INDUSTRY_KEYS_JP:
                deaths = vals[1] if isinstance(vals[1], (int, float)) else None
                if deaths is not None:
                    industry_deaths[name] = int(deaths)
    result["industries"] = industry_deaths

    return result


def run(year: int):
    """Download and parse preliminary data for the given year."""
    buf = download_xlsx(year)
    if not buf:
        print(f"Skipping year {year} — download failed.")
        return

    stats = extract_stats(buf, year)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUTPUT_DIR / f"summary-{year}-preliminary.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)
    print(f"Saved: {out_path}")
    print(f"  全産業死亡者数: {stats['industries'].get('全産業', 'N/A')}人")


def main():
    parser = argparse.ArgumentParser(description="Download MHLW preliminary accident stats")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--year", type=int, choices=list(YEAR_FILE_MAP.keys()), help="Target calendar year")
    group.add_argument("--all", action="store_true", help="Download all available years")
    args = parser.parse_args()

    if args.all:
        for y in YEAR_FILE_MAP:
            run(y)
    else:
        run(args.year)


if __name__ == "__main__":
    main()
