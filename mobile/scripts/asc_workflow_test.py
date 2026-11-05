"""Offline workflow isolation, secret boundaries and exact tag export."""
import os
from pathlib import Path
import shutil
import subprocess
import unittest
import yaml

ROOT = Path(__file__).resolve().parents[1]
RUBY = os.environ.get('ASC_TEST_RUBY') or shutil.which('ruby')


class WorkflowTest(unittest.TestCase):
    def test_existing_ipa_workflow_is_unchanged(self):
        original = subprocess.check_output(['git', 'show', '5f078c1701d359acbf12ae18db3ada52eec3358c:codemagic.yaml'], cwd=ROOT, text=True, encoding='utf-8')
        current = yaml.safe_load((ROOT.parent / 'codemagic.yaml').read_text(encoding='utf-8'))
        self.assertEqual(yaml.safe_load(original)['workflows']['anzen-ios-app-store'], current['workflows']['anzen-ios-app-store'])

    def test_listing_is_tag_only_and_validates_before_upload(self):
        listing = yaml.safe_load((ROOT.parent / 'codemagic.yaml').read_text(encoding='utf-8'))['workflows']['anzen-asc-metadata']
        self.assertEqual(listing['triggering']['events'], ['tag'])
        self.assertEqual(listing['triggering']['tag_patterns'], [{'pattern': 'asc-anzen-*', 'include': True}])
        self.assertFalse(listing['triggering']['cancel_previous_builds'])
        self.assertEqual(listing['integrations']['app_store_connect'], 'App Store Key')
        self.assertNotIn('groups', listing['environment'])
        self.assertEqual(listing['environment']['vars']['APP_STORE_APPLE_ID'], '6831079439')
        self.assertEqual(listing['environment']['vars']['SUBMIT_FOR_REVIEW'], 'false')
        self.assertNotIn('publishing', listing)
        scripts = '\n'.join(step['script'] for step in listing['scripts'])
        for forbidden in ('asc_capture', 'ios:prepare', 'npm run build', 'simctl', 'APP_STORE_CONNECT_PRIVATE_KEY'):
            self.assertNotIn(forbidden, scripts)
        self.assertLess(scripts.index('asc_validate.py --screenshots'), scripts.index('bundle install'))
        self.assertLess(scripts.index('asc_repository_check.mjs'), scripts.index('bundle install'))
        self.assertLess(scripts.index('asc_auth.py --check'), scripts.index('bundle exec fastlane'))
        lane = (ROOT / 'fastlane/Fastfile').read_text(encoding='utf-8')
        self.assertIn('submit_for_review: false', lane)
        self.assertIn('automatic_release: false', lane)
        self.assertNotIn('app_review_information:', lane)

    def test_capture_has_no_response_or_storage_fabrication(self):
        source = (ROOT / 'scripts/asc_capture_windows.mjs').read_text(encoding='utf-8')
        for forbidden in ('route.fulfill', 'setItem(', 'document.cookie', 'CapacitorCustomPlatform', 'request.post', 'fetch('):
            self.assertNotIn(forbidden, source)
        self.assertIn('route.abort()', source)
        self.assertIn("!['GET', 'HEAD'].includes(request.method())", source)


@unittest.skipUnless(RUBY, 'Set ASC_TEST_RUBY or put Ruby on PATH')
class TagExportTest(unittest.TestCase):
    def run_export(self, **values):
        env = {k: v for k, v in os.environ.items() if not k.startswith('ASC_') and k not in ('CM_TAG', 'SUBMIT_FOR_REVIEW')}
        env.update(APP_STORE_APPLE_ID='6831079439', CM_TAG='asc-anzen-v1.0.0-blatest-r01')
        env.update(values)
        return subprocess.run([RUBY, str(ROOT / 'scripts/asc_config.rb')], env=env, text=True, capture_output=True)

    def test_export_only_public_values(self):
        r = self.run_export(ASC_REVIEW_EMAIL='private@example.invalid')
        self.assertEqual(r.returncode, 0, r.stderr)
        self.assertEqual(r.stdout.splitlines(), ['ASC_APP_VERSION=1.0.0', 'ASC_BUILD_NUMBER=latest', 'SUBMIT_FOR_REVIEW=false'])
        self.assertNotIn('private@', r.stdout + r.stderr)

    def test_invalid_request_exports_nothing(self):
        for values in ({'SUBMIT_FOR_REVIEW': 'true'}, {'APP_STORE_APPLE_ID': '123'}, {'CM_TAG': 'asc-anzen-submit-v1.0.0-b17-r01'}, {'CM_TAG': 'asc-anzen-v1.0.1-b17-r01'}):
            with self.subTest(values=values):
                r = self.run_export(**values)
                self.assertNotEqual(r.returncode, 0)
                self.assertEqual(r.stdout, '')


if __name__ == '__main__':
    unittest.main()
