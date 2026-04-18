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
    "articleNumber": str|null,   # 抽出できた場合のみ。例: "第三条" / "附則" / "別表第三"
    "heading": str|null,         # 条文見出し
    "text": str,                 # 条文本文
  }

PDF パーサは pdfplumber を使用。縦書きページは列単位で再構成（右→左）。
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

# 条文番号（漢数字 + 半角数字 + 「条の」枝番）
ARTICLE_RE = re.compile(
    r"(第[一二三四五六七八九十百千〇零\d]+条(?:の[一二三四五六七八九十\d]+)?)"
)
# 附則 / 別表 / 経過措置 などの見出し（条文番号がないが章セクション扱い）
SUPPL_RE = re.compile(
    r"(附\s*則(?:第[一二三四五六七八九十百千〇零\d]+項)?|別表(?:第[一二三四五六七八九十百千〇零\d]+)?|附\s*錄|経過措置)"
)
# 縦書き判定用
CJK_RE = re.compile(r"[\u3040-\u30ff\u4e00-\u9fff]")


def _is_vertical_text(text: str) -> bool:
    """既定 extract_text の結果から縦書きページを推定。

    縦書き PDF の単純抽出は単一文字+空白が並ぶため、CJK 文字直後が
    空白の比率が高ければ縦書きと判定する。
    """
    if not text:
        return False
    cjk = list(CJK_RE.finditer(text))
    if len(cjk) < 20:
        return False
    isolated = 0
    for m in cjk:
        end = m.end()
        if end < len(text) and text[end] in " \t":
            isolated += 1
    return isolated / len(cjk) > 0.5


def _extract_vertical(page) -> str:
    """縦書きページ：列ごとに右→左、列内は上→下で結合。"""
    chars = page.chars
    if not chars:
        return ""
    cols: dict[int, list] = {}
    for c in chars:
        col_key = round(c["x0"] / 8) * 8
        cols.setdefault(col_key, []).append(c)
    out: list[str] = []
    for col_x in sorted(cols.keys(), reverse=True):
        col_chars = sorted(cols[col_x], key=lambda c: c["top"])
        out.append("".join(c["text"] for c in col_chars))
    return "\n".join(out)


def _load_pdf_pages(path: Path) -> list[str] | None:
    """各ページのテキストを返す。縦書きは列順で再構成。"""
    try:
        import pdfplumber  # type: ignore
    except ModuleNotFoundError:
        # フォールバック: pypdf（縦書きは正しく取れない）
        try:
            import pypdf  # type: ignore

            reader = pypdf.PdfReader(str(path))
            return [page.extract_text() or "" for page in reader.pages]
        except ModuleNotFoundError:
            return None

    pages: list[str] = []
    with pdfplumber.open(str(path)) as pdf:
        for p in pdf.pages:
            text = p.extract_text() or ""
            if _is_vertical_text(text):
                text = _extract_vertical(p)
            pages.append(text)
    return pages


def split_articles(text: str) -> list[tuple[str | None, str]]:
    """条文見出し / 附則 / 別表 で本文を分割。"""
    if not text.strip():
        return []
    # 全マッチを収集（条文 + 附則/別表）
    candidates: list[tuple[int, str]] = []
    for m in ARTICLE_RE.finditer(text):
        candidates.append((m.start(), m.group(1)))
    for m in SUPPL_RE.finditer(text):
        # 附則 を 第○条 と重複検出しないように、ARTICLE_RE と同じ位置は捨てる
        if not any(s == m.start() for s, _ in candidates):
            candidates.append((m.start(), re.sub(r"\s+", "", m.group(1))))
    candidates.sort()

    if not candidates:
        return [(None, text.strip())]

    chunks: list[tuple[str | None, str]] = []
    # マッチ位置より前の前文を最初に保存（あれば）
    if candidates[0][0] > 0:
        prelude = text[: candidates[0][0]].strip()
        if prelude:
            chunks.append((None, prelude))
    for i, (start, label) in enumerate(candidates):
        end = candidates[i + 1][0] if i + 1 < len(candidates) else len(text)
        body = text[start:end].strip()
        chunks.append((label, body))
    return chunks


def parse_pdf(path: Path) -> list[dict]:
    pages = _load_pdf_pages(path)
    if pages is None:
        log(f"[skip] {path.name}: install pdfplumber or pypdf")
        return []
    records: list[dict] = []
    last_article: str | None = None  # ページを跨ぐ条文継続
    for page_no, text in enumerate(pages, start=1):
        chunks = split_articles(text)
        if not chunks:
            continue
        # 先頭が None（前文）の場合、前ページの条文の続きとして紐付ける
        if chunks[0][0] is None and last_article is not None:
            chunks[0] = (last_article, chunks[0][1])
        for article, body in chunks:
            heading: str | None = None
            if article and not article.startswith(("附則", "別表", "附錄", "経過措置")):
                # 条文見出し直後の括弧書きを heading として取る
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
            if article:
                last_article = article
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
        with_article = sum(1 for r in recs if r.get("articleNumber"))
        log(f"[ok] {path.name} → {len(recs)} records (with article: {with_article})")
        all_records.extend(recs)
        manifest[path.name] = {
            "records": len(recs),
            "withArticle": with_article,
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
        total_with = sum(1 for r in all_records if r.get("articleNumber"))
        log(f"[done] total={len(all_records)} (with article: {total_with}) → {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
