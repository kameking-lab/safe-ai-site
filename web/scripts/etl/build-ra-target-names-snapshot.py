#!/usr/bin/env python3
"""RA対象物（表示・通知対象物質）名称スナップショット生成 ETL（P1-9・2026-07-11）

リスクアセスメント対象物（安衛法57条・57条の2の表示・通知対象物）の現行の正本:
  - 安衛令 別表第9（347CO0000000318）: 群指定（「マンガン及びその無機化合物」等）
  - 安衛則 別表第2（347M50002000032）: 個別名称の列挙（2,276物質・裾切値表）
を e-Gov法令API v2 から取得し、名称ベースの該否判定層
web/src/data/legal/ra-target-names-snapshot.json を再生成する。

用途: CASレス告示名（溶接ヒューム等）・群指定名の「RA対象物か」を名称突合で
designated / not-designated / unverified の3値に確定する（#874 で断定を避けた箇所の解消）。

実行: python3 scripts/etl/build-ra-target-names-snapshot.py   (web/ から)
"""
import hashlib
import json
import urllib.request
from datetime import date
from pathlib import Path

API = "https://laws.e-gov.go.jp/api/2/law_data/"
ANEI_REI = "347CO0000000318"   # 労働安全衛生法施行令
ANEI_KISOKU = "347M50002000032"  # 労働安全衛生規則
OUT = Path(__file__).resolve().parents[2] / "src/data/legal/ra-target-names-snapshot.json"
UA = {"User-Agent": "safe-ai-site-etl", "Accept": "application/json"}

KANJI_DIGITS = {"〇": 0, "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}


def fetch(law_id: str):
    req = urllib.request.Request(API + law_id, headers=UA)
    with urllib.request.urlopen(req) as res:
        raw = res.read()
    return raw, json.loads(raw)


def text_of(node) -> str:
    if isinstance(node, str):
        return node
    if isinstance(node, dict):
        if node.get("tag") == "Rt":  # ルビ（振り仮名）は本文に混入させない
            return ""
        return "".join(text_of(c) for c in node.get("children", []))
    if isinstance(node, list):
        return "".join(text_of(c) for c in node)
    return ""


def find_appdx(node, title_match: str, out: list):
    if isinstance(node, dict):
        if node.get("tag") == "AppdxTable":
            title = "".join(
                text_of(c)
                for c in node.get("children", [])
                if isinstance(c, dict) and c.get("tag") == "AppdxTableTitle"
            )
            if title_match in title:
                out.append(node)
        for c in node.get("children", []) if isinstance(node.get("children"), list) else []:
            find_appdx(c, title_match, out)
    elif isinstance(node, list):
        for c in node:
            find_appdx(c, title_match, out)


def kanji_to_int(s: str) -> int:
    """「三十四」等の漢数字（〜99）を int へ"""
    if not s:
        raise ValueError("empty")
    if "十" in s:
        tens, _, ones = s.partition("十")
        t = KANJI_DIGITS[tens] if tens else 1
        o = KANJI_DIGITS[ones] if ones else 0
        return t * 10 + o
    v = 0
    for ch in s:
        v = v * 10 + KANJI_DIGITS[ch]
    return v


def parse_beppyo9(appdx) -> list:
    """令別表第9: Item 列挙（ItemTitle=漢数字号・本文=群名称）"""
    entries = []

    def walk(node):
        if isinstance(node, dict):
            if node.get("tag") == "Item":
                title = ""
                body = ""
                for c in node.get("children", []):
                    if isinstance(c, dict) and c.get("tag") == "ItemTitle":
                        title = text_of(c)
                    elif isinstance(c, dict) and c.get("tag") == "ItemSentence":
                        body = text_of(c)
                if title and body:
                    entries.append({"go": str(kanji_to_int(title)), "name": body.strip()})
                return
            for c in node.get("children", []) if isinstance(node.get("children"), list) else []:
                walk(c)
        elif isinstance(node, list):
            for c in node:
                walk(c)

    walk(appdx)
    return entries


def parse_beppyo2(appdx) -> list:
    """安衛則別表第2: TableRow（項番号/物/備考）"""
    entries = []

    def walk(node):
        if isinstance(node, dict):
            if node.get("tag") == "TableRow":
                cols = [text_of(c).strip() for c in node.get("children", []) if isinstance(c, dict)]
                if len(cols) >= 2 and cols[0] not in ("項", ""):
                    entries.append({
                        "item": cols[0],
                        "name": cols[1],
                        **({"note": cols[2]} if len(cols) > 2 and cols[2] else {}),
                    })
                return
            for c in node.get("children", []) if isinstance(node.get("children"), list) else []:
                walk(c)
        elif isinstance(node, list):
            for c in node:
                walk(c)

    walk(appdx)
    return entries


def main() -> None:
    rei_raw, rei = fetch(ANEI_REI)
    kisoku_raw, kisoku = fetch(ANEI_KISOKU)

    out9 = []
    find_appdx(rei.get("law_full_text", rei), "別表第九", out9)
    if not out9:
        raise SystemExit("安衛令 別表第9 が見つからない")
    beppyo9 = parse_beppyo9(out9[0])

    out2 = []
    find_appdx(kisoku.get("law_full_text", kisoku), "別表第２", out2)
    if not out2:
        raise SystemExit("安衛則 別表第2 が見つからない")
    beppyo2 = parse_beppyo2(out2[0])

    if len(beppyo9) < 20 or len(beppyo2) < 2000:
        raise SystemExit(f"件数が想定外: 別表第9={len(beppyo9)} 別表第2={len(beppyo2)}（構造変更の疑い）")

    out = {
        "meta": {
            "retrievedAt": date.today().isoformat(),
            "reiBeppyo9": {
                "lawId": ANEI_REI,
                "revisionId": rei.get("revision_info", {}).get("law_revision_id"),
                "sha256": hashlib.sha256(rei_raw).hexdigest(),
                "count": len(beppyo9),
            },
            "kisokuBeppyo2": {
                "lawId": ANEI_KISOKU,
                "revisionId": kisoku.get("revision_info", {}).get("law_revision_id"),
                "sha256": hashlib.sha256(kisoku_raw).hexdigest(),
                "count": len(beppyo2),
            },
        },
        "reiBeppyo9": beppyo9,
        "kisokuBeppyo2": beppyo2,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"書き出し: {OUT} 別表第9={len(beppyo9)} 別表第2={len(beppyo2)}")


if __name__ == "__main__":
    main()
