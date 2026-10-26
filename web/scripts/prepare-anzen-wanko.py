"""Extract exact approved pixels; never redraw or modify the source export."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
from PIL import Image

parser = argparse.ArgumentParser()
parser.add_argument("source", type=Path)
args = parser.parse_args()
root = Path(__file__).resolve().parents[2]
source_bytes = args.source.read_bytes()
source_sha = hashlib.sha256(source_bytes).hexdigest()
assert source_sha == "9dc5c0e94f210f03178d6bd9eb05b84d92fc2def2500686b4ea143c0fcd66534"
source = Image.open(args.source)
assert source.format == "PNG" and source.size == (1536, 2288)
rgba = source.convert("RGBA")
pixel_sha = hashlib.sha256(rgba.tobytes()).hexdigest()
assert pixel_sha == "8b52dae75d277b49292df2a6c1f53bff358630043cecf7e99572d790be96ff41"
evidence = root / "docs" / "astra-pet-source"
evidence.mkdir(parents=True, exist_ok=True)
original = evidence / "pets-export-v1.png"
shutil.copyfile(args.source, original)
assert original.read_bytes() == source_bytes
output = root / "web" / "public" / "mascot" / "anzen-wanko-v1"
output.mkdir(parents=True, exist_ok=True)
assets = []
for name, row, count in [("static", 0, 1), ("idle", 0, 6), ("waving", 3, 4), ("activework", 7, 6), ("review", 8, 6)]:
    crop = rgba.crop((0, row * 208, count * 192, (row + 1) * 208))
    target = output / f"{name}.webp"
    crop.save(target, "WEBP", lossless=True, exact=True, method=6)
    with Image.open(target) as result:
        assert result.convert("RGBA").tobytes() == crop.tobytes()
    assets.append({"file": str(target.relative_to(root)).replace("\\", "/"), "row": row, "frames": count,
                   "bytes": target.stat().st_size, "sha256": hashlib.sha256(target.read_bytes()).hexdigest()})
manifest = {"origin": "Official ChatGPT Pets export; NOT Library materialization", "pet_id": "pet_6aded2b5968881918e325e8a1d2b006f",
            "approved_library_id": "libfile_82391e23c5b88191a72ad5f4b0047aa9", "approved_library_version": 1,
            "approved_library_webp_sha256": "0e647b0f1d597834ac642e195768251e2a0e789461189a9b43aa20f38d2b738e",
            "source_file": "pets-export-v1.png", "source_format": "PNG", "source_bytes": len(source_bytes), "source_sha256": source_sha,
            "width": 1536, "height": 2288, "mode": "RGBA", "rgba_sha256": pixel_sha,
            "identity_evidence": "Parent confirmed approved Library v1 WEBP and persisted Pets PNG have identical decoded RGBA pixels on 2026-10-26.",
            "derivation": "Unscaled 192x208 grid crops encoded as lossless WebP, decoded pixel equality asserted for each derivative.", "assets": assets}
(evidence / "provenance.json").write_bytes((json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
print(json.dumps(assets, indent=2))
