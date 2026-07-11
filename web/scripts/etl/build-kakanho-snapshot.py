#!/usr/bin/env python3
"""化管法（PRTR法）指定化学物質スナップショット生成 ETL（F2拡張・O11）

NITE 公式「改正後化管法指定化学物質と政府によるGHS分類実施状況の一覧リスト」
(R3_PRTR_SDS_GHS_LIST.xlsx) から、第一種(515)・第二種(134)指定化学物質の
政令番号・政令名称・CAS番号を機械抽出して
web/src/data/legal/kakanho-prtr-snapshot.json を再生成する。

従来の github.com/Ameyanagi/ra-law-db ミラー由来 prtr1/prtr2 タグ（398物質・
2008年改正の旧リスト）を置き換える正本。2021(R3)改正政令（2023-04-01施行）準拠。

実行: python3 scripts/etl/build-kakanho-snapshot.py   (web/ から)
依存: pip install openpyxl requests
"""
import hashlib
import io
import json
import re
import sys
from datetime import date
from pathlib import Path

import openpyxl

SOURCE_URL = "https://www.chem-info.nite.go.jp/chem/ghs/files/R3_PRTR_SDS_GHS_LIST.xlsx"
OUT = Path(__file__).resolve().parents[2] / "src/data/legal/kakanho-prtr-snapshot.json"
CAS_RE = re.compile(r"^\d{2,7}-\d{2,3}-\d{1,2}$")


def fetch(url: str) -> bytes:
    import urllib.request

    req = urllib.request.Request(url, headers={"User-Agent": "safe-ai-site-etl"})
    with urllib.request.urlopen(req) as res:
        return res.read()


def main() -> None:
    raw = fetch(SOURCE_URL)
    sha256 = hashlib.sha256(raw).hexdigest()
    wb = openpyxl.load_workbook(io.BytesIO(raw), read_only=True)
    ws = wb["新化管法指定化学物質と政府によるGHS分類実施状況"]
    rows = list(ws.iter_rows(values_only=True))
    header_i = next(
        i for i, r in enumerate(rows) if r[0] and "政令番号" in str(r[0]) and r[3] and "政令名称" in str(r[3])
    )
    entries = []
    for r in rows[header_i + 1 :]:
        if not r[0] or not str(r[0]).strip():
            continue
        seirei_no = str(r[0]).strip()  # 例 "1-001" / "2-134"
        if not re.match(r"^[12]-\d{3}$", seirei_no):
            raise SystemExit(f"政令番号の形式が想定外: {seirei_no!r}")
        name = str(r[3] or "").strip()
        alias = str(r[4] or "").strip()
        rep_cas = [c.strip() for c in str(r[5] or "").split("\n") if CAS_RE.match(c.strip())]
        member_cas = [c.strip() for c in str(r[7] or "").split("\n") if CAS_RE.match(c.strip())]
        cas = sorted(set(rep_cas) | set(member_cas))
        entries.append(
            {
                "seireiNo": seirei_no,
                "clazz": int(seirei_no[0]),
                "name": name,
                **({"alias": alias} if alias else {}),
                "cas": cas,
            }
        )
    n1 = sum(1 for e in entries if e["clazz"] == 1)
    n2 = sum(1 for e in entries if e["clazz"] == 2)
    # 公知の件数アンカー: 2021(R3)改正政令 = 第一種515・第二種134
    if n1 != 515 or n2 != 134:
        raise SystemExit(f"件数が公知の515/134と不一致: 第一種{n1}/第二種{n2}")
    cas_count = len({c for e in entries for c in e["cas"]})
    out = {
        "meta": {
            "retrievedAt": date.today().isoformat(),
            "sourceUrl": SOURCE_URL,
            "sourceSha256": sha256,
            "law": "化管法施行令（2021(R3)改正・2023-04-01施行）別表第一・別表第二",
            "publisher": "NITE 改正後化管法指定化学物質と政府によるGHS分類実施状況の一覧リスト",
            "class1Count": n1,
            "class2Count": n2,
            "casMappedCount": cas_count,
            "note": "CAS収載は参考（NITE注記）。群指定の全CASを網羅するものではない＝CAS非収載でも名称により該当しうる",
        },
        "entries": entries,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"書き出し: {OUT}")
    print(f"第一種 {n1} / 第二種 {n2} / ユニークCAS {cas_count}")


if __name__ == "__main__":
    sys.exit(main())
