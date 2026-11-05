"""Offline CM7 tests: temporary dummy identity only, no real Apple/keychain access."""
import base64
from datetime import datetime, timedelta, timezone
import hashlib
import io
import json
import os
from pathlib import Path
import plistlib
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import NameOID
import jwt
import asc_signing as signing


TEAM = "DUMMYTEAM1"
KEY = ec.generate_private_key(ec.SECP256R1())
NOW = datetime.now(timezone.utc)
SUBJECT = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "Dummy Distribution"),
                     x509.NameAttribute(NameOID.ORGANIZATIONAL_UNIT_NAME, TEAM)])
CERT = (x509.CertificateBuilder().subject_name(SUBJECT).issuer_name(SUBJECT)
        .public_key(KEY.public_key()).serial_number(12345)
        .not_valid_before(NOW - timedelta(days=1)).not_valid_after(NOW + timedelta(days=60))
        .sign(KEY, hashes.SHA256()).public_bytes(serialization.Encoding.DER))
IDENTITY = ("CERT1", CERT, TEAM)


def profile(bundle, **changes):
    values = {"UUID": "12345678-1234-1234-1234-123456789ABC", "TeamIdentifier": [TEAM],
              "ExpirationDate": (NOW + timedelta(days=30)).replace(tzinfo=None),
              "DeveloperCertificates": [CERT],
              "Entitlements": {"application-identifier": TEAM + "." + bundle,
                               "com.apple.developer.team-identifier": TEAM,
                               "get-task-allow": False, "aps-environment": "production"}}
    values.update(changes)
    return {"id": "PROFILE1", "attributes": {
        "profileType": "IOS_APP_STORE", "profileState": "ACTIVE", "uuid": values["UUID"],
        "profileContent": base64.b64encode(plistlib.dumps(values)).decode(),
        "expirationDate": (NOW + timedelta(days=30)).isoformat()}}


class FakeClient:
    def __init__(self, bundle, existing=None):
        self.bundle, self.existing, self.posts = bundle, existing, []

    def all(self, path, query=None):
        if path == "/v1/bundleIds":
            return [{"id": "BUNDLE1", "attributes": {"identifier": self.bundle, "platform": "IOS"}}]
        return [{"id": "PROFILE1"}] if self.existing else []

    def request(self, method, path, payload=None):
        if method == "POST":
            self.posts.append((path, payload))
            return {"data": profile(self.bundle)}
        return {"data": self.existing}


class SigningTests(unittest.TestCase):
    def test_official_integration_resolver_signs_without_disk_cache(self):
        pem = KEY.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                                serialization.NoEncryption()).decode()
        for source in (pem, "@env:CM7_DUMMY_PEM"):
            with self.subTest(source="dummy-pem-or-env"), patch.dict(os.environ, {
                "APP_STORE_CONNECT_KEY_IDENTIFIER": "DUMMYKEY01",
                "APP_STORE_CONNECT_ISSUER_ID": "00000000-0000-0000-0000-000000000001",
                "APP_STORE_CONNECT_PRIVATE_KEY": source, "CM7_DUMMY_PEM": pem,
            }):
                client = signing.auth_client()
                token = client.generate_auth_headers()["Authorization"].split()[1]
                claims = jwt.decode(token, KEY.public_key(), algorithms=["ES256"], audience="appstoreconnect-v1")
                self.assertEqual(claims["iss"], "00000000-0000-0000-0000-000000000001")
                self.assertFalse(client._jwt_manager._enable_cache)

    def test_matches_only_public_installed_distribution_fingerprint(self):
        row = {"id": "CERT1", "attributes": {"certificateType": "DISTRIBUTION",
                "certificateContent": base64.b64encode(CERT).decode()}}
        client = FakeClient(signing.BUNDLES[0])
        client.all = lambda *args: [row]
        self.assertEqual(signing.certificate_identity(client, {hashlib.sha1(CERT).hexdigest().upper()}), IDENTITY)
        with self.assertRaises(signing.SigningError):
            signing.certificate_identity(client, {"0" * 40})
        client.all = lambda *args: [row, row]
        with self.assertRaises(signing.SigningError):
            signing.certificate_identity(client, {hashlib.sha1(CERT).hexdigest().upper()})

    def test_creates_each_profile_with_existing_certificate_and_installs(self):
        for bundle in signing.BUNDLES:
            with self.subTest(bundle=bundle), tempfile.TemporaryDirectory() as folder:
                client = FakeClient(bundle)
                result = signing.prepare_profile(client, bundle, IDENTITY, Path(folder), plistlib.loads)
                path, payload = client.posts[0]
                self.assertEqual(path, "/v1/profiles")
                data = payload["data"]
                self.assertEqual(data["attributes"]["profileType"], "IOS_APP_STORE")
                self.assertEqual(data["relationships"], {
                    "bundleId": {"data": {"type": "bundleIds", "id": "BUNDLE1"}},
                    "certificates": {"data": [{"type": "certificates", "id": "CERT1"}]}})
                self.assertEqual(len(list(Path(folder).glob("*.mobileprovision"))), 1)
                self.assertNotIn("profileContent", json.dumps(result))

    def test_reuses_valid_profile_without_mutation(self):
        bundle = signing.BUNDLES[0]
        with tempfile.TemporaryDirectory() as folder:
            client = FakeClient(bundle, profile(bundle))
            signing.prepare_profile(client, bundle, IDENTITY, Path(folder), plistlib.loads)
            self.assertEqual(client.posts, [])

    def test_rejects_wrong_bundle_team_certificate_devices_expiry_and_debug(self):
        bundle = signing.BUNDLES[0]
        changes = [{"TeamIdentifier": ["OTHERTEAM"]}, {"DeveloperCertificates": [b"OTHER"]},
                   {"ProvisionedDevices": ["DEVICE"]}, {"ProvisionsAllDevices": True},
                   {"ExpirationDate": (NOW - timedelta(seconds=1)).replace(tzinfo=None)},
                   {"Entitlements": {"application-identifier": TEAM + ".other"}},
                   {"Entitlements": {"application-identifier": TEAM + "." + bundle,
                                     "com.apple.developer.team-identifier": TEAM, "get-task-allow": True}}]
        for change in changes:
            self.assertIsNone(signing.profile_content(profile(bundle, **change), bundle, CERT, TEAM, plistlib.loads))
        for field, value in (("profileType", "IOS_APP_ADHOC"), ("profileState", "INVALID")):
            row = profile(bundle)
            row["attributes"][field] = value
            self.assertIsNone(signing.profile_content(row, bundle, CERT, TEAM, plistlib.loads))

    def test_anzen_requires_production_push(self):
        bundle = signing.BUNDLES[1]
        row = profile(bundle)
        decoded = plistlib.loads(base64.b64decode(row["attributes"]["profileContent"]))
        decoded["Entitlements"]["aps-environment"] = "development"
        row = profile(bundle, Entitlements=decoded["Entitlements"])
        self.assertIsNone(signing.profile_content(row, bundle, CERT, TEAM, plistlib.loads))

    def test_unknown_bundle_is_not_registered(self):
        with tempfile.TemporaryDirectory() as folder:
            client = FakeClient("other.bundle")
            with self.assertRaises(signing.SigningError):
                signing.prepare_profile(client, signing.BUNDLES[0], IDENTITY, Path(folder), plistlib.loads)
            self.assertEqual(client.posts, [])

    def test_pagination_cross_origin_and_http_failure_do_not_expose_token(self):
        auth = type("Auth", (), {"generate_auth_headers": lambda self: {"Authorization": "Bearer DUMMY_SECRET"}})()
        client = signing.Client(auth)
        with self.assertRaises(signing.SigningError):
            client.request("GET", "https://attacker.invalid/v1/profiles")
        with patch.object(signing, "build_opener") as opener:
            opener.return_value.open.side_effect = HTTPError("https://private.invalid", 403,
                "DUMMY_SECRET", {}, io.BytesIO(b"DUMMY_SECRET"))
            with self.assertRaises(signing.SigningError) as caught:
                client.request("GET", "/v1/profiles")
            self.assertNotIn("DUMMY_SECRET", str(caught.exception))
            self.assertIn("HTTP 403", str(caught.exception))
        with patch.object(client, "request", side_effect=[
            {"data": [{"id": "1"}], "links": {"next": signing.API + "/v1/profiles?cursor=2"}},
            {"data": [{"id": "2"}], "links": {}}]):
            self.assertEqual(client.all("/v1/profiles"), [{"id": "1"}, {"id": "2"}])

    def test_main_withholds_unexpected_errors(self):
        with patch.object(signing, "auth_client", side_effect=ValueError("DUMMY_SECRET")), \
             patch("sys.stderr", new_callable=io.StringIO) as output:
            self.assertEqual(signing.main(), 1)
            self.assertNotIn("DUMMY_SECRET", output.getvalue())


if __name__ == "__main__":
    unittest.main()
