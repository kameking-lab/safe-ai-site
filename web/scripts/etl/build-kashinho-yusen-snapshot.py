#!/usr/bin/env python3
"""化審法 優先評価化学物質スナップショット生成 ETL（P1-8・2026-07-11）

化審法データベース J-CHECK（厚労省・経産省・環境省・NITE 共同運営）の
優先評価化学物質リスト（list7.action?category=230）から、
通し番号・官報公示整理番号・官報公示名称・公示日と、各物質詳細
（list5.action?category=230&tno=N）の CAS RN を機械抽出して
web/src/data/legal/kashinho-yusen-snapshot.json を再生成する。

第一種特定(40)・第二種特定(24)のみだった化審法域の knownLimitation
（優先評価=未取込→全物質「未確認」表示）を解消する正本。
※ 監視化学物質(36)は未取込のまま＝非該当の断定はしない。
※ J-CHECK 免責: 官報公示整理番号とCAS RNの関連は最終確認されたものではない
   （snapshot meta に注記として保持し、UI 側の文言も断定を避ける）。

実行: python3 scripts/etl/build-kashinho-yusen-snapshot.py   (web/ から)
"""
import hashlib
import html as htmllib
import json
import re
import time
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

BASE = "https://www.nite.go.jp/chem/jcheck/"
LIST_URL = BASE + "list7.action"
DETAIL_URL = BASE + "list5.action"
OUT = Path(__file__).resolve().parents[2] / "src/data/legal/kashinho-yusen-snapshot.json"
CAS_RE = re.compile(r"^\d{2,7}-\d{2,3}-\d{1,2}$")
UA = {"User-Agent": "safe-ai-site-etl (labor-safety portal; contact via repo)"}


def post(url: str, params: dict) -> bytes:
    data = urllib.parse.urlencode(params).encode()
    req = urllib.request.Request(url, data=data, headers=UA)
    with urllib.request.urlopen(req) as res:
        return res.read()


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req) as res:
        return res.read()


def strip_tags(s: str) -> str:
    return re.sub(r"\s+", " ", htmllib.unescape(re.sub(r"<[^>]+>", " ", s))).strip()


def drop_comments(raw: str) -> str:
    """行内 HTML コメント（旧マークアップの </tr> を含む）を除去してから行解析する"""
    return re.sub(r"<!--.*?-->", "", raw, flags=re.S)


def parse_list_page(raw: str):
    """一覧ページの <tr> から (tno, 通し番号, 官報公示整理番号[], 名称, 公示日) を抽出"""
    rows = []
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", drop_comments(raw), re.S):
        m = re.search(r"list5\.action\?category=230&(?:amp;)?tno=(\d+)", tr)
        if not m:
            continue
        tds = [strip_tags(td) for td in re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)]
        if len(tds) < 4:
            continue
        # 列: 通し番号 / 官報公示整理番号(空白区切りで複数可) / 官報公示名称 / 官報公示日 / 備考
        no = tds[0]
        if not re.fullmatch(r"\d+", no):
            continue
        gazette = [g for g in tds[1].split() if re.fullmatch(r"\d+-\d+", g)]
        name = tds[2]
        pubdate = tds[3]
        rows.append({
            "tno": int(m.group(1)),
            "no": int(no),
            "gazetteIds": gazette,
            "name": name,
            "designatedOn": pubdate,
        })
    return rows


def parse_detail_cas(raw: str):
    """詳細ページの CAS RN 列を抽出"""
    cas = []
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", drop_comments(raw), re.S):
        tds = [strip_tags(td) for td in re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)]
        for td in tds:
            if CAS_RE.fullmatch(td):
                cas.append(td)
    return sorted(set(cas))


def main() -> None:
    hasher = hashlib.sha256()
    entries = []
    seen_tno = set()
    page = 1
    last_page = 1
    while page <= last_page:
        raw_b = post(LIST_URL, {
            "category": 230, "request_locale": "ja",
            "dispPage": page, "lastPage": max(last_page, page), "sortKey": "num",
            "operationPage": "disp", "inputPage": page, "pageSize": 100,
        })
        hasher.update(raw_b)
        raw = raw_b.decode("utf-8", errors="replace")
        m = re.search(r'name="lastPage" value="(\d+)"', raw)
        if m:
            last_page = int(m.group(1))
        rows = parse_list_page(raw)
        if not rows:
            raise SystemExit(f"一覧 {page} ページ目の行が抽出できない（サイト構造変更の疑い）")
        for r in rows:
            if r["tno"] in seen_tno:
                continue
            seen_tno.add(r["tno"])
            entries.append(r)
        page += 1
        time.sleep(0.3)

    for e in entries:
        raw_b = get(f"{DETAIL_URL}?category=230&tno={e['tno']}&request_locale=ja")
        hasher.update(raw_b)
        e["cas"] = parse_detail_cas(raw_b.decode("utf-8", errors="replace"))
        time.sleep(0.2)

    entries.sort(key=lambda e: e["no"])
    cas_mapped = sum(len(e["cas"]) for e in entries)
    out = {
        "meta": {
            "retrievedAt": date.today().isoformat(),
            "sourceUrl": LIST_URL + "?category=230&request_locale=ja",
            "source": "化審法データベース J-CHECK（厚労省・経産省・環境省・NITE）優先評価化学物質リスト",
            "sourceSha256": hasher.hexdigest(),
            "substanceCount": len(entries),
            "casMappedCount": cas_mapped,
            "casDisclaimer": "官報公示整理番号とCAS RNの関連は最終的に確認されたものではない（J-CHECK免責）",
        },
        "entries": entries,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"書き出し: {OUT} substances={len(entries)} casMapped={cas_mapped}")


if __name__ == "__main__":
    main()
