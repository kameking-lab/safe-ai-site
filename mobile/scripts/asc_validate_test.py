"""Prevent uploading a subscription listing without both description links."""
import shutil
import tempfile
import unittest
from pathlib import Path

from asc_validate import ROOT, validate

EULA = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
PRIVACY = "https://www.anzen-ai-portal.jp/privacy"


class DescriptionLinksTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(dir=ROOT)
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        shutil.copytree(ROOT / "fastlane/metadata", self.root / "fastlane/metadata")
        self.description = self.root / "fastlane/metadata/ja/description.txt"

    def test_current_listing(self):
        validate(root=self.root)

    def test_each_link_required_in_description(self):
        original = self.description.read_text(encoding="utf-8")
        for url in (EULA, PRIVACY):
            with self.subTest(url=url):
                self.description.write_text(original.replace(url, ""), encoding="utf-8")
                with self.assertRaisesRegex(ValueError, "Description must include"):
                    validate(root=self.root)

    def test_url_prefix_is_not_a_valid_link(self):
        original = self.description.read_text(encoding="utf-8")
        self.description.write_text(original.replace(PRIVACY, PRIVACY + "-invalid"), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "Privacy Policy"):
            validate(root=self.root)


if __name__ == "__main__":
    unittest.main()
