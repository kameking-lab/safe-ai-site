"""ETL 共通ユーティリティ。和暦変換・パス解決・JSONL 書き出し。"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Iterable, Any


REPO_ROOT = Path(__file__).resolve().parents[2]


def _resolve_mhlw_data_dir() -> Path:
    """mhlw-data/ の実体を探す。

    worktree で作業している場合、mhlw-data/ は .gitignore により
    worktree 内には存在せず、メインの作業ツリー直下にある。
    候補を順に探し、存在するものを返す。見つからなければ
    REPO_ROOT / 'mhlw-data' を返す（エラーは呼び出し側で）。
    """
    env = os.environ.get("MHLW_DATA_DIR")
    if env:
        p = Path(env).expanduser()
        if p.exists():
            return p

    candidates = [REPO_ROOT / "mhlw-data"]
    # .claude/worktrees/xxx/ から主作業ツリー (safe-ai-site/) まで遡る
    current = REPO_ROOT
    for _ in range(6):
        current = current.parent
        if current == current.parent:
            break
        candidates.append(current / "mhlw-data")

    for c in candidates:
        if c.exists():
            return c
    return REPO_ROOT / "mhlw-data"


MHLW_DATA_DIR = _resolve_mhlw_data_dir()
WEB_DATA_DIR = REPO_ROOT / "web" / "src" / "data"


ERA_OFFSET = {
    "明治": 1867,
    "大正": 1911,
    "昭和": 1925,
    "平成": 1988,
    "令和": 2018,
    "meiji": 1867,
    "taisho": 1911,
    "showa": 1925,
    "heisei": 1988,
    "reiwa": 2018,
    "m": 1867,
    "t": 1911,
    "s": 1925,
    "h": 1988,
    "r": 2018,
}


def wareki_to_seireki(era: str, year: int) -> int:
    """和暦 → 西暦。era は '令和' / 'reiwa' / 'r' など。"""
    key = era.strip().lower() if era else ""
    key_jp = era.strip() if era else ""
    offset = ERA_OFFSET.get(key_jp) or ERA_OFFSET.get(key)
    if offset is None:
        raise ValueError(f"unknown era: {era!r}")
    return offset + int(year)


def seireki_from_filename_prefix(prefix: str) -> int | None:
    """'r03' → 2021、'h18' → 2006 のように先頭 3 文字から西暦を返す。"""
    if not prefix or len(prefix) < 2:
        return None
    era_char = prefix[0].lower()
    num_str = prefix[1:]
    try:
        year_in_era = int(num_str)
    except ValueError:
        return None
    offset = ERA_OFFSET.get(era_char)
    if offset is None:
        return None
    return offset + year_in_era


def ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def write_jsonl(path: Path, records: Iterable[dict[str, Any]]) -> int:
    """JSONL 書き出し。戻り値は書き込んだ行数。"""
    ensure_dir(path.parent)
    count = 0
    with path.open("w", encoding="utf-8") as f:
        for rec in records:
            f.write(json.dumps(rec, ensure_ascii=False))
            f.write("\n")
            count += 1
    return count


def log(msg: str) -> None:
    sys.stderr.write(msg + "\n")
    sys.stderr.flush()


def utf8_stdio() -> None:
    """Windows コンソールでの文字化け回避。"""
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass


def norm(v: Any) -> Any:
    """空文字・全角スペース・前後空白を正規化。"""
    if v is None:
        return None
    if isinstance(v, str):
        s = v.replace("\u3000", " ").strip()
        return s if s else None
    return v
