# -*- coding: utf-8 -*-
"""生成画像の機械加工: 白背景除去(必要時) → 透過トリム → リサイズ → アルファ付きwebp。

使い方:
  py -3.12 scripts/imagegen/process.py --src scripts/imagegen/output/bow/bow_01.png \
      --dest web/public/mascot/mascot-bow.webp --max 480
  py -3.12 scripts/imagegen/process.py --src <png> --dest <webp> --max 480 --dewhite

- --max: 長辺の上限px（表示サイズの2倍を指定。CLS/重量予算のため）
- --dewhite: 背景が透過でなく白ベタの場合に、外周フラッドフィルで白→透過化
  （キャラ内部の白は保護される。ステッカー風の太アウトライン前提）
- 出力は webp lossless ではなく quality=90（アルファ保持）。重量を報告する。
"""
import argparse, os, sys
from collections import deque
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def dewhite(im, thresh=245):
    """外周からのフラッドフィルで「背景の白」だけを透過化。内部の白は残す。"""
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    seen = [[False] * w for _ in range(h)]
    q = deque()
    for x in range(w):
        q.append((x, 0)); q.append((x, h - 1))
    for y in range(h):
        q.append((0, y)); q.append((w - 1, y))
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[y][x]:
            continue
        seen[y][x] = True
        r, g, b, a = px[x, y]
        if r >= thresh and g >= thresh and b >= thresh:
            px[x, y] = (r, g, b, 0)
            q.extend([(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)])
    return im


def has_real_alpha(im):
    if im.mode != "RGBA":
        return False
    lo, hi = im.getchannel("A").getextrema()
    return lo < 250


def process(src, dest, max_px, force_dewhite, pad=8, quality=90):
    im = Image.open(src).convert("RGBA")
    if force_dewhite or not has_real_alpha(im):
        im = dewhite(im)
        print(f"  dewhite applied (alpha was {'absent' if not force_dewhite else 'forced'})")
    bbox = im.getchannel("A").getbbox()
    if bbox:
        l, t, r, b = bbox
        l = max(0, l - pad); t = max(0, t - pad)
        r = min(im.width, r + pad); b = min(im.height, b + pad)
        im = im.crop((l, t, r, b))
    if max(im.size) > max_px:
        ratio = max_px / max(im.size)
        im = im.resize((round(im.width * ratio), round(im.height * ratio)), Image.LANCZOS)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    im.save(dest, "WEBP", quality=quality, method=6)
    kb = os.path.getsize(dest) / 1024
    print(f"  {os.path.relpath(dest, ROOT)}  {im.width}x{im.height}  {kb:.1f}KB")
    return im.size, kb


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--dest", required=True)
    ap.add_argument("--max", type=int, default=480)
    ap.add_argument("--dewhite", action="store_true")
    ap.add_argument("--budget-kb", type=float, default=60.0)
    ap.add_argument("--quality", type=int, default=90)
    args = ap.parse_args()
    src = args.src if os.path.isabs(args.src) else os.path.join(ROOT, args.src)
    dest = args.dest if os.path.isabs(args.dest) else os.path.join(ROOT, args.dest)
    size, kb = process(src, dest, args.max, args.dewhite, quality=args.quality)
    if kb > args.budget_kb:
        print(f"  WARN: 重量予算超過 {kb:.1f}KB > {args.budget_kb}KB")
        sys.exit(2)


if __name__ == "__main__":
    main()
