"""法令 / 指針 PDF をテキスト抽出し、条文単位で JSONL に分割する。

入力 (mhlw-data/laws/):
  000946000.pdf 等 11 本の法令・告示・指針 PDF

出力:
  web/src/data/laws-mhlw/articles.jsonl
  web/src/data/laws-mhlw/_manifest.json  ... ファイル名→タイトル対応（手動メモ可）

出力レコード:
  {
    "sourceFile": str,
    "page": int,
    "articleNumber": str|null,   # 抽出できた場合のみ。例: "第三条"
    "heading": str|null,         # 条文見出し
    "text": str,                 # 条文本文
  }

PDF パーサは pypdf か pdfplumber を使う（import フェイルセーフ）。
未インストールの場合は `[skip]` を出してエラーにせず終了。
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import (  # type: ignore
    MHLW_DATA_DIR,
    WEB_DATA_DIR,
    ensure_dir,
    log,
    utf8_stdio,
    write_jsonl,
)

SRC_DIR = MHLW_DATA_DIR / "laws"
DST_DIR = WEB_DATA_DIR / "laws-mhlw"

# 「第一条」「第二十三条」のように漢数字ベースで条文を検出
ARTICLE_RE = re.compile(
    r"(第[一二三四五六七八九十百千〇零\d]+条(?:の[一二三四五六七八九十\d]+)?)"
)


def _load_pdf_text(path: Path) -> list[str] | None:
    """各ページのテキストを返す。ライブラリ無しなら None。"""
    try:
        import pypdf  # type: ignore

        reader = pypdf.PdfReader(str(path))
        return [page.extract_text() or "" for page in reader.pages]
    except ModuleNotFoundError:
        pass
    try:
        import pdfplumber  # type: ignore

        pages: list[str] = []
        with pdfplumber.open(str(path)) as pdf:
            for p in pdf.pages:
                pages.append(p.extract_text() or "")
        return pages
    except ModuleNotFoundError:
        return None


def split_articles(text: str) -> list[tuple[str | None, str]]:
    """条文見出し行で本文を分割。該当なしなら全文 1 レコード。"""
    if not text.strip():
        return []
    chunks: list[tuple[str | None, str]] = []
    matches = list(ARTICLE_RE.finditer(text))
    if not matches:
        return [(None, text.strip())]
    for i, m in enumerate(matches):
        start = m.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[start:end].strip()
        chunks.append((m.group(1), body))
    return chunks


def parse_pdf(path: Path) -> list[dict]:
    pages = _load_pdf_text(path)
    if pages is None:
        log(f"[skip] {path.name}: install pypdf or pdfplumber")
        return []
    records: list[dict] = []
    for page_no, text in enumerate(pages, start=1):
        for article, body in split_articles(text):
            heading = None
            if article:
                # 条文見出し末尾の括弧書きを heading として取る
                m = re.search(r"（([^）]+)）", body[: len(article) + 40])
                if m:
                    heading = m.group(1)
            records.append(
                {
                    "sourceFile": path.name,
                    "page": page_no,
                    "articleNumber": article,
                    "heading": heading,
                    "text": body,
                }
            )
    return records


def main() -> int:
    utf8_stdio()
    ap = argparse.ArgumentParser(description="laws PDF → JSONL ETL")
    ap.add_argument("--only")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not SRC_DIR.exists():
        log(f"[err] source not found: {SRC_DIR}")
        return 2

    ensure_dir(DST_DIR)
    all_records: list[dict] = []
    manifest: dict[str, dict] = {}

    for path in sorted(SRC_DIR.iterdir()):
        if not path.is_file() or not path.name.lower().endswith(".pdf"):
            continue
        if args.only and args.only not in path.name:
            continue
        try:
            recs = parse_pdf(path)
        except Exception as e:
            log(f"[err] {path.name}: {e}")
            continue
        log(f"[ok] {path.name} → {len(recs)} records")
        all_records.extend(recs)
        manifest[path.name] = {
            "records": len(recs),
            "title": None,
        }

    out = DST_DIR / "articles.jsonl"
    manifest_path = DST_DIR / "_manifest.json"
    if args.dry_run:
        log(f"[done] (dry) total={len(all_records)} → {out}")
    else:
        write_jsonl(out, all_records)
        manifest_path.write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        log(f"[done] total={len(all_records)} → {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
