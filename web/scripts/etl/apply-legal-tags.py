#!/usr/bin/env python3
"""concentration-limits.json の法令タグを正本スナップショット由来に更新する ETL（O11）

- prtr1/prtr2: kakanho-prtr-snapshot.json（NITE公式・2021(R3)改正政令）から全置換。
  従来の ra-law-db ミラー（2008年改正の旧リスト・398物質）を廃止。
- poison-control: other-laws-cas-index.ts（e-Gov突合済み索引）の毒劇法該当CASに付与。
  索引で「非該当確認済み」のCASからは除去。索引未収載の既存タグは維持（未確認扱い）。
- cscl1/cscl2: 索引の化審法第一種/第二種特定化学物質から全置換。

タグの正当性は src/data/legal/substance-legal-audit.test.ts（vitest・CI常設）が
TypeScript 側で全件突合する。本スクリプトの索引パースが崩れた場合もそこで検知される。

実行: python3 scripts/etl/apply-legal-tags.py   (web/ から)
"""
import json
import re
from datetime import date
from pathlib import Path

WEB = Path(__file__).resolve().parents[2]
CL_PATH = WEB / "src/data/concentration-limits.json"
INDEX_PATH = WEB / "src/data/legal/other-laws-cas-index.ts"
KAKANHO_PATH = WEB / "src/data/legal/kakanho-prtr-snapshot.json"


def parse_index():
    """other-laws-cas-index.ts から CAS→(毒劇該当, 化審refs, 明示エントリ) を抽出"""
    src = INDEX_PATH.read_text(encoding="utf-8")
    body = src.split("OTHER_LAWS_CAS_INDEX: readonly OtherLawsIndexEntry[] = [", 1)[1]
    body = body.split("\n];", 1)[0]
    entries = {}
    for block in re.finditer(r"\{\n((?:    .*\n)+?)  \},", body + "\n"):
        b = block.group(1)
        cas_m = re.search(r'cas: "([^"]+)"', b)
        if not cas_m:
            continue
        cas = cas_m.group(1)
        dokugeki = re.findall(r'\{ table: "(hyo\d|rei\d)", go: "([^"]+)"', b)
        kashinho = re.findall(r"\{ clazz: (\d), go: \"([^\"]+)\"", b)
        dokugeki_none = "dokugekiNone: true" in b
        entries[cas] = {"dokugeki": dokugeki, "kashinho": kashinho, "dokugekiNone": dokugeki_none}
    if len(entries) < 200:
        raise SystemExit(f"索引パース件数が異常: {len(entries)}（フォーマット変更の可能性）")
    return entries


def main():
    cl = json.loads(CL_PATH.read_text(encoding="utf-8"))
    subs = cl["substances"]
    index = parse_index()
    kakanho = json.loads(KAKANHO_PATH.read_text(encoding="utf-8"))
    prtr_by_cas = {}
    for e in kakanho["entries"]:
        for cas in e["cas"]:
            prtr_by_cas.setdefault(cas, set()).add(e["clazz"])

    stats = {
        "prtr_removed": 0, "prtr_added": 0, "prtr1": 0, "prtr2": 0,
        "poison_added": 0, "poison_removed": 0, "poison_kept_unverified": 0,
        "cscl_removed": 0, "cscl_added": 0,
    }
    poison_added_cas = []
    for cas, e in subs.items():
        tags = list(e.get("regulationTags") or [])
        before = set(tags)
        # --- PRTR 全置換（タグ・URL・法令参照を一体で更新） ---
        tags = [t for t in tags if t not in ("prtr1", "prtr2")]
        prtr_classes = sorted(prtr_by_cas.get(cas, ()))
        for clazz in prtr_classes:
            tags.append(f"prtr{clazz}")
        if prtr_classes:
            e["prtrUrl"] = "https://www.env.go.jp/chemi/prtr/risk0.html"
            e["prtrLawReferences"] = [
                f"化管法施行令 412CO0000000138 別表第{'一' if c == 1 else '二'}（2021(R3)改正）"
                for c in prtr_classes
            ]
        else:
            e.pop("prtrUrl", None)
            e.pop("prtrLawReferences", None)
        # --- 化審法 全置換 ---
        tags = [t for t in tags if t not in ("cscl1", "cscl2")]
        idx = index.get(cas)
        if idx:
            for clazz, _go in idx["kashinho"]:
                tag = f"cscl{clazz}"
                if tag not in tags:
                    tags.append(tag)
        # --- 毒劇法 ---
        if idx is not None and idx["dokugeki"]:
            if "poison-control" not in tags:
                tags.append("poison-control")
                stats["poison_added"] += 1
                poison_added_cas.append(cas)
        elif idx is not None and idx["dokugekiNone"]:
            # 正本と突合して非該当を確認済み → ミラー由来の偽陽性タグを除去
            if "poison-control" in tags:
                tags.remove("poison-control")
                stats["poison_removed"] += 1
        elif "poison-control" in tags:
            # 索引未収載（未突合）の既存タグは維持＝UI側で「未確認」を明示
            stats["poison_kept_unverified"] += 1
        after = set(tags)
        stats["prtr_removed"] += len({"prtr1", "prtr2"} & (before - after))
        stats["prtr_added"] += len({"prtr1", "prtr2"} & (after - before))
        stats["cscl_removed"] += len({"cscl1", "cscl2"} & (before - after))
        stats["cscl_added"] += len({"cscl1", "cscl2"} & (after - before))
        if "prtr1" in after: stats["prtr1"] += 1
        if "prtr2" in after: stats["prtr2"] += 1
        e["regulationTags"] = tags

    # メタデータ更新
    cl["version"] = "3.4.0-official-prtr-dokugeki-kashinho"
    cl["prtrImport"] = {
        "importedAt": date.today().isoformat(),
        "source": "NITE 改正後化管法指定化学物質一覧（2021(R3)改正政令・2023-04-01施行）",
        "sourceUrl": kakanho["meta"]["sourceUrl"],
        "sourceSha256": kakanho["meta"]["sourceSha256"],
        "class1Count": kakanho["meta"]["class1Count"],
        "class2Count": kakanho["meta"]["class2Count"],
        "class1Tagged": stats["prtr1"],
        "class2Tagged": stats["prtr2"],
        "note": "旧 ra-law-db ミラー（2008年改正リスト）を公式CAS収載リストで全置換",
    }
    cl["dokugekiVerify"] = {
        "verifiedAt": date.today().isoformat(),
        "source": "e-Gov 毒物及び劇物取締法(325AC0000000303)別表＋毒物及び劇物指定令(340CO0000000002)",
        "index": "src/data/legal/other-laws-cas-index.ts",
        "added": stats["poison_added"],
        "removedFalsePositives": stats["poison_removed"],
        "keptUnverified": stats["poison_kept_unverified"],
        "note": "索引未収載の既存タグはミラー由来のまま未確認扱い（UI側で明示）",
    }
    chashin = cl.get("chashinImport") or {}
    chashin["csclReplacedAt"] = date.today().isoformat()
    chashin["csclSource"] = "e-Gov 化審法施行令(349CO0000000202)第1条・第2条（第一種40/第二種24）"
    cl["chashinImport"] = chashin

    # summary 再集計
    summary = cl.get("summary") or {}
    summary["withPrtr"] = sum(1 for e in subs.values() if {"prtr1", "prtr2"} & set(e.get("regulationTags") or []))
    cl["summary"] = summary
    cl["generatedAt"] = cl.get("generatedAt")  # ベース生成日時は維持

    CL_PATH.write_text(json.dumps(cl, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("更新:", CL_PATH)
    print(json.dumps(stats, ensure_ascii=False, indent=1))
    print("毒劇法タグ追加CAS:", ", ".join(poison_added_cas[:40]), "..." if len(poison_added_cas) > 40 else "")


if __name__ == "__main__":
    main()
