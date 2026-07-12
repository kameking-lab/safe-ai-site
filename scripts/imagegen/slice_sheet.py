# -*- coding: utf-8 -*-
"""アイコンシート（グリッド生成画像）を個別アイコンに機械分割する。

使い方:
  py -3.12 scripts/imagegen/slice_sheet.py --src <シートpng> --grid 3x3 \
      --names ky,meeting,chemical,chat,accident,law,signage,court,new \
      --outdir scripts/imagegen/output/icons

- 各セルを均等分割→セル内側マージンを落とす→アルファでトリム→個別pngで保存。
- 生成グリッドはセル境界が数px揺れるため、内側マージン(既定4%)で吸収する。
- 分割後は必ず目視キュレーション（タッチ統一・小サイズ視認性）を行うこと。
"""
import argparse, os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--grid", default="3x3", help="列x行 (例 3x3, 4x4)")
    ap.add_argument("--names", required=True, help="カンマ区切り。左上から行優先で命名")
    ap.add_argument("--outdir", required=True)
    ap.add_argument("--margin", type=float, default=0.04, help="セル内側マージン比率")
    args = ap.parse_args()

    src = args.src if os.path.isabs(args.src) else os.path.join(ROOT, args.src)
    outdir = args.outdir if os.path.isabs(args.outdir) else os.path.join(ROOT, args.outdir)
    os.makedirs(outdir, exist_ok=True)
    cols, rows = (int(x) for x in args.grid.lower().split("x"))
    names = [n.strip() for n in args.names.split(",")]

    im = Image.open(src).convert("RGBA")
    cw, ch = im.width / cols, im.height / rows
    mx, my = cw * args.margin, ch * args.margin
    idx = 0
    for r in range(rows):
        for c in range(cols):
            if idx >= len(names):
                break
            box = (round(c * cw + mx), round(r * ch + my),
                   round((c + 1) * cw - mx), round((r + 1) * ch - my))
            cell = im.crop(box)
            bbox = cell.getchannel("A").getbbox()
            if bbox:
                cell = cell.crop(bbox)
            outp = os.path.join(outdir, f"icon-{names[idx]}.png")
            cell.save(outp, "PNG")
            print(f"  {os.path.basename(outp)}  {cell.width}x{cell.height}")
            idx += 1
    print(f"sliced {idx} icons -> {outdir}")


if __name__ == "__main__":
    main()
