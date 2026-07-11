#!/usr/bin/env python3
"""化学物質DB クライアント用スリム検索索引の生成 ETL（速度改善・2026-07-11）

/chemical-database・/chemical-ra のクライアントバンドルに同梱されていた
concentration-limits.json(2.0MB) + chemicals-mhlw/compact.json(1.1MB) を置き換える
検索・一覧・判定用の最小索引 src/data/chemical-slim-index.json を生成する。

lib/mhlw-chemicals.ts の mergeByCas + applyConcentrationOverrides と同一の統合結果
（一覧・検索・RA判定に必要な射影）になることを src/lib/mhlw-chemicals-slim.test.ts が
CI で全件検証する。ロジックを変えた場合はテストが落ちる＝ここだけの独自進化はできない。

実行: python3 scripts/etl/build-chemical-slim-index.py   (web/ から)
"""
import json
from pathlib import Path

WEB = Path(__file__).resolve().parents[2]
COMPACT = WEB / "src/data/chemicals-mhlw/compact.json"
CL = WEB / "src/data/concentration-limits.json"
OUT = WEB / "src/data/chemical-slim-index.json"

CAS_RE = __import__("re").compile(r"^\d{2,7}-\d{2,3}-\d{1,2}$")


def is_placeholder(name):
    t = (name or "").strip()
    return t in ("", "－", "-", "—")


def pick_primary(names):
    good = [n for n in names if not is_placeholder(n)]
    if not good:
        return "（物質名不明）"
    return sorted(good, key=lambda n: -len(n))[0]


def flags_bits(flags):
    return (
        (1 if flags["carcinogenic"] else 0)
        | (2 if flags["concentration"] else 0)
        | (4 if flags["skin"] else 0)
        | (8 if flags["label_sds"] else 0)
    )


def determine_tier(entry):
    if not entry:
        return "none"
    for k in ("twa", "stel", "ceiling"):
        if (entry.get(k) or {}).get("source") == "MHLW_177":
            return "mhlw_177"
    er = entry.get("externalRefs") or {}
    if er.get("acgih") or er.get("jsoh"):
        return "external_only"
    return "reference"


def main():
    compact = json.loads(COMPACT.read_text(encoding="utf-8"))
    cl = json.loads(CL.read_text(encoding="utf-8"))
    subs = cl["substances"]

    # --- mergeByCas 相当 ---
    by_cas, no_cas = {}, []
    for e in compact["entries"]:
        if e.get("cas"):
            by_cas.setdefault(e["cas"], []).append(e)
        else:
            no_cas.append(e)

    merged = []
    for cas, arr in by_cas.items():
        names = list(dict.fromkeys([e["name"] for e in arr if e.get("name")]))
        primary = pick_primary(names)
        flags = {
            "carcinogenic": any(e["category"] == "carcinogenic" for e in arr),
            "concentration": any(e["category"] == "concentration" for e in arr),
            "skin": any(e["category"] == "skin" for e in arr),
            "label_sds": any(e["category"] == "label_sds" for e in arr),
        }
        details = {}
        for e in arr:
            if e.get("details"):
                details.update(e["details"])
        merged.append({
            "cas": cas,
            "primaryName": primary,
            "aliases": [n for n in names if n != primary and not is_placeholder(n)],
            "flags": flags,
            "details": details,
        })

    by_name = {}
    for e in no_cas:
        if is_placeholder(e.get("name")):
            continue
        by_name.setdefault(e["name"].strip(), []).append(e)
    for name, arr in by_name.items():
        flags = {
            "carcinogenic": any(e["category"] == "carcinogenic" for e in arr),
            "concentration": any(e["category"] == "concentration" for e in arr),
            "skin": any(e["category"] == "skin" for e in arr),
            "label_sds": any(e["category"] == "label_sds" for e in arr),
        }
        details = {}
        for e in arr:
            if e.get("details"):
                details.update(e["details"])
        merged.append({
            "cas": None,
            "primaryName": name,
            "aliases": [],
            "flags": flags,
            "details": details,
        })

    # CASあり優先 → 名称順（TS 側 localeCompare(ja) と同順にするためソートはTS側テストが吸収。
    # 索引自体の順序は検索スコアで並べ替えるため一覧初期表示にのみ影響）
    # TSの Array.prototype.sort + localeCompare("ja") は ICU 依存のため、
    # ここでは (casなしを後ろ, primaryName コードポイント) で決定的に並べ、TS側も同じ比較で再ソートする。
    merged.sort(key=lambda m: (0 if m["cas"] else 1, m["primaryName"]))

    # --- applyConcentrationOverrides 相当 ---
    handled = set()
    for m in merged:
        if not m["cas"]:
            m["tier"] = "none"
            continue
        entry = subs.get(m["cas"])
        if not entry:
            m["tier"] = "none"
            continue
        handled.add(m["cas"])
        tier = determine_tier(entry)
        m["tier"] = tier
        if tier == "mhlw_177":
            m["flags"]["concentration"] = True
        m["limits"] = entry
        if (entry.get("carcinogenicity") or {}).get("iarc") in ("1", "2A"):
            m["flags"]["carcinogenic"] = True

    for cas, entry in subs.items():
        if cas in handled or not CAS_RE.match(cas):
            continue
        tier = determine_tier(entry)
        is_carc = (entry.get("carcinogenicity") or {}).get("iarc") in ("1", "2A")
        merged.append({
            "cas": cas,
            "primaryName": entry.get("name") or f"CAS {cas}",
            "aliases": [entry["nameEn"]] if entry.get("nameEn") else [],
            "flags": {
                "carcinogenic": is_carc,
                "concentration": tier == "mhlw_177",
                "skin": False,
                "label_sds": False,
            },
            "details": {},
            "tier": tier,
            "limits": entry,
        })

    # --- スリム射影 ---
    slim = []
    for m in merged:
        limits = m.get("limits") or {}
        er = limits.get("externalRefs") or {}
        x = (1 if er.get("acgih") else 0) | (2 if er.get("jsoh") else 0)
        s = {
            "c": m["cas"],
            "n": m["primaryName"],
            "f": flags_bits(m["flags"]),
            "tier": m["tier"],
        }
        if m["aliases"]:
            s["a"] = m["aliases"]
        for k_src, k_dst in (("twa", "twa"), ("stel", "stel"), ("ceiling", "ceil")):
            if limits.get(k_src):
                s[k_dst] = limits[k_src]
        if limits.get("regulationTags"):
            s["t"] = limits["regulationTags"]
        if limits.get("iarcGroup"):
            s["iarc"] = limits["iarcGroup"]
        if limits.get("mhlwSdsUrl"):
            s["sds"] = limits["mhlwSdsUrl"]
        if limits.get("prtrLawReferences"):
            s["pr"] = limits["prtrLawReferences"]
        if limits.get("chashinLawReferences"):
            s["cr"] = limits["chashinLawReferences"]
        if limits.get("niteChripUrl"):
            s["ch"] = 1
        if x:
            s["x"] = x
        d = m.get("details") or {}
        if d.get("limit8h"):
            s["dl8"] = d["limit8h"]
        if d.get("limitShort"):
            s["dls"] = d["limitShort"]
        if d.get("link"):
            s["link"] = d["link"]
        if d.get("uses"):
            s["uses"] = d["uses"]
        slim.append(s)

    out = {
        "meta": {
            "sourceVersion": cl.get("version"),
            "count": len(slim),
            "note": "生成物・手書き禁止。scripts/etl/build-chemical-slim-index.py が再生成",
        },
        "entries": slim,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"書き出し: {OUT} entries={len(slim)} bytes={OUT.stat().st_size//1024}KB")


if __name__ == "__main__":
    main()
