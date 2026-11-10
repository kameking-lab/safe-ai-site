"""Offline validation, including image dimensions, complete sets and capture hashes."""
import argparse
import hashlib
import json
import re
from pathlib import Path
import struct

ROOT = Path(__file__).resolve().parents[1]


def jpeg_size(path):
    data = path.read_bytes()
    if data[:2] != b"\xff\xd8" or data[-2:] != b"\xff\xd9":
        raise ValueError("Not a complete JPEG: " + path.name)
    offset = 2
    while offset < len(data):
        if data[offset] != 255:
            raise ValueError("Invalid JPEG marker")
        while data[offset] == 255:
            offset += 1
        marker = data[offset]
        offset += 1
        if marker in (0xD8, 0xD9):
            continue
        size = struct.unpack(">H", data[offset:offset + 2])[0]
        if size < 2:
            raise ValueError("Invalid JPEG segment")
        if marker in (0xC0, 0xC1, 0xC2):
            height, width = struct.unpack(">HH", data[offset + 3:offset + 7])
            if data[offset + 7] != 3:
                raise ValueError("Screenshots must be RGB JPEG (no alpha)")
            return width, height
        if marker == 0xDA:
            break
        offset += size
    raise ValueError("JPEG dimensions missing")


def validate(screenshots=False, root=ROOT):
    metadata = root / "fastlane/metadata/ja"
    limits = {"name": 30, "subtitle": 30, "description": 4000, "promotional_text": 170}
    for field, limit in limits.items():
        value = (metadata / (field + ".txt")).read_text(encoding="utf-8").rstrip("\n")
        if not value or len(value) > limit:
            raise ValueError("Invalid length: " + field)
        if field == "description":
            urls = set(re.findall(r"https://[^\s<>]+", value))
            if not urls.intersection({"https://www.apple.com/legal/internet-services/itunes/dev/stdeula/", "https://www.anzen-ai-portal.jp/terms"}):
                raise ValueError("Description must include Terms of Use (EULA) URL")
            if "https://www.anzen-ai-portal.jp/privacy" not in urls:
                raise ValueError("Description must include Privacy Policy URL")
    keywords = (metadata / "keywords.txt").read_text(encoding="utf-8").rstrip("\n")
    if not keywords or len(keywords.encode()) > 100:
        raise ValueError("Keywords exceed 100 UTF-8 bytes")
    for field, expected_url in {"privacy_url": "https://www.anzen-ai-portal.jp/privacy", "support_url": "https://www.anzen-ai-portal.jp/contact"}.items():
        if (metadata / (field + ".txt")).read_text().strip() != expected_url:
            raise ValueError("Unexpected URL")
    # No plaintext credential/contact placeholders may leak into deliver metadata.
    allowed = {"ja/" + name + ".txt" for name in (*limits, "keywords", "support_url", "privacy_url")}
    allowed.add("primary_category.txt")
    allowed.add("secondary_category.txt")
    files = {p.relative_to(root / "fastlane/metadata").as_posix() for p in (root / "fastlane/metadata").rglob("*") if p.is_file()}
    if files != allowed:
        raise ValueError("Unexpected or missing metadata files: " + str(files.symmetric_difference(allowed)))
    if not screenshots:
        return
    config = json.loads((root / "asc/capture.json").read_text(encoding="utf-8"))
    directory = root / "fastlane/screenshots/ja"
    manifest = json.loads((directory.parent / "manifest.json").read_text(encoding="utf-8"))
    expected = {f"{screen}-{device['slug']}.jpg": (device["width"], device["height"])
                for screen in config["screens"] for device in config["devices"]}
    actual = {p.name for p in directory.iterdir() if p.is_file()}
    if actual != set(expected):
        raise ValueError("Require exactly 5 screenshots in each configured iPhone/iPad size")
    entries = manifest["images"]
    if len(entries) != len(expected) or {e["file"] for e in entries} != set(expected):
        raise ValueError("Capture manifest doesn't match images")
    for entry in entries:
        path = directory / entry["file"]
        if jpeg_size(path) != expected[path.name]:
            raise ValueError("Wrong screenshot size: " + path.name)
        if hashlib.sha256(path.read_bytes()).hexdigest() != entry["sha256"]:
            raise ValueError("Changed image after capture: " + path.name)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--screenshots", action="store_true")
    args = parser.parse_args()
    validate(args.screenshots)
    print("ASC metadata" + (" and 15 screenshots" if args.screenshots else "") + " validation PASS")
