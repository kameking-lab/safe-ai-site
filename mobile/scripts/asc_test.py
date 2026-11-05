import hashlib
import json
from pathlib import Path
import shutil
import struct
import tempfile
import unittest

from asc_validate import ROOT, jpeg_size, validate


def jpeg(width, height):
    # Minimal JPEG header fixture for the header parser; never an upload artifact.
    return b'\xff\xd8\xff\xc0' + struct.pack('>HBHHB', 17, 8, height, width, 3) + b'\x01\x11\x00\x02\x11\x00\x03\x11\x00\xff\xd9'


class AscValidationTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        for directory in ('fastlane/metadata', 'asc'):
            shutil.copytree(ROOT / directory, self.root / directory)
        self.directory = self.root / 'fastlane/screenshots/ja'
        self.directory.mkdir(parents=True)
        config = json.loads((self.root / 'asc/capture.json').read_text())
        entries = []
        for device in config['devices']:
            for screen in config['screens']:
                path = self.directory / f"{screen}-{device['slug']}.jpg"
                path.write_bytes(jpeg(device['width'], device['height']))
                entries.append({'file': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
        (self.directory.parent / 'manifest.json').write_text(json.dumps({'images': entries}))

    def tearDown(self):
        self.temp.cleanup()

    def test_valid_sets(self):
        validate(True, self.root)

    def test_missing_frame_rejected(self):
        next(self.directory.iterdir()).unlink()
        with self.assertRaisesRegex(ValueError, 'exactly 5'):
            validate(True, self.root)

    def test_changed_image_rejected(self):
        path = next(self.directory.iterdir())
        # A valid dimension header must not permit changed bytes after capture.
        path.write_bytes(path.read_bytes()[:-2] + b'altered\xff\xd9')
        with self.assertRaisesRegex(ValueError, 'Changed image'):
            validate(True, self.root)

    def test_wrong_dimensions_rejected(self):
        next(self.directory.iterdir()).write_bytes(jpeg(1242, 2208))
        with self.assertRaisesRegex(ValueError, 'Wrong screenshot size'):
            validate(True, self.root)

    def test_credential_file_rejected(self):
        p = self.root / 'fastlane/metadata/review_information/demo_password.txt'
        p.parent.mkdir(exist_ok=True)
        p.write_text('placeholder')
        with self.assertRaisesRegex(ValueError, 'Unexpected'):
            validate(root=self.root)

    def test_keyword_bytes_rejected(self):
        (self.root / 'fastlane/metadata/ja/keywords.txt').write_text('語' * 34, encoding='utf-8')
        with self.assertRaisesRegex(ValueError, '100 UTF-8 bytes'):
            validate(root=self.root)

    def test_truncated_jpeg_rejected(self):
        p = next(self.directory.iterdir())
        p.write_bytes(p.read_bytes()[:-2])
        with self.assertRaises(ValueError):
            jpeg_size(p)


if __name__ == '__main__':
    unittest.main()
