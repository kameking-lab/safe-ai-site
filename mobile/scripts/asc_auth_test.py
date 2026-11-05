"""Exercise the actual pinned Codemagic resolver/signer with generated dummy keys."""
import contextlib
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import jwt
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

import asc_auth as a
import asc_signing


class AuthenticationTest(unittest.TestCase):
    def setUp(self):
        self.key = ec.generate_private_key(ec.SECP256R1())
        self.pem = self.key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                                          serialization.NoEncryption()).decode()
        self.env = {"APP_STORE_CONNECT_KEY_IDENTIFIER": "DUMMYKEY01", "APP_STORE_CONNECT_ISSUER_ID": "dummy-issuer"}

    def verify(self, token):
        claims = jwt.decode(token, self.key.public_key(), algorithms=["ES256"], audience="appstoreconnect-v1")
        self.assertEqual(claims["iss"], "dummy-issuer")
        self.assertEqual(jwt.get_unverified_header(token)["kid"], "DUMMYKEY01")
        self.assertNotIn(self.pem, token)

    def test_real_cli_resolver_pem_file_environment_reference_and_key_search(self):
        with tempfile.TemporaryDirectory(prefix="asc11-dummy-") as directory:
            path = Path(directory) / "AuthKey_DUMMYKEY01.p8"
            path.write_text(self.pem, encoding="utf-8")
            from codemagic.tools.app_store_connect.arguments import Types
            forms = [self.pem, self.pem.replace("\n", "\r\n"), "@file:" + str(path), "@env:ASC11_DUMMY_KEY", None]
            for value in forms:
                env = {**self.env, "ASC11_DUMMY_KEY": self.pem}
                if value is not None:
                    env["APP_STORE_CONNECT_PRIVATE_KEY"] = value
                with patch.dict(os.environ, env, clear=True), patch.object(Types.PrivateKeyArgument, "PRIVATE_KEY_LOCATIONS", (Path(directory),)):
                    output = io.StringIO()
                    with contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
                        c = a.client()
                        self.verify(c.jwt)
                        self.assertFalse(c._jwt_manager._enable_cache)
                        self.assertEqual(c.jwt, c.jwt)
                        # Force expiry to prove the official signer can renew.
                        c._jwt_manager._jwt = c._jwt_manager._jwt._replace(expires_at=c._jwt_manager._jwt.expires_at.replace(year=2000))
                        self.verify(c.jwt)
                    self.assertEqual(output.getvalue(), "")

    def test_pipe_subprocess_and_direct_rest_share_official_tokens(self):
        env = {**os.environ, **self.env, "APP_STORE_CONNECT_PRIVATE_KEY": self.pem}
        result = subprocess.run([sys.executable, str(Path(a.__file__)), "--token-for-pipe"],
                                env=env, capture_output=True, text=True, check=True)
        data = json.loads(result.stdout)
        self.verify(data["token"])
        self.assertEqual(set(data), {"token", "expiration"})
        self.assertEqual(result.stderr, "")
        with patch.dict(os.environ, env, clear=True):
            c = a.client()
            self.verify(c.generate_auth_headers()["Authorization"].removeprefix("Bearer "))

    def test_invalid_credentials_fail_without_value_path_or_traceback(self):
        marker = "asc11-secret-marker"
        values = [marker, "@file:/" + marker, "@env:" + marker, self.pem.replace("\n", r"\n"),
                  self.key.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo).decode()]
        for value in values:
            env = {**os.environ, **self.env, "APP_STORE_CONNECT_PRIVATE_KEY": value}
            result = subprocess.run([sys.executable, str(Path(a.__file__)), "--check"], env=env, capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(result.stdout, "")
            self.assertNotIn(marker, result.stderr)
            self.assertNotIn("Traceback", result.stderr)
            self.assertNotIn("BEGIN", result.stderr)
            self.assertIn("authentication failed", result.stderr)

    def test_check_validates_only_the_fixed_app_identity(self):
        result = {"data": {"id": "6831079439", "attributes": {"bundleId": "jp.anzen-ai-portal.app"}}}
        with patch.object(a, "client", return_value=object()), \
                patch.object(asc_signing.Client, "request", return_value=result) as request, \
                patch.object(sys, "argv", ["asc_auth.py", "--check"]), \
                contextlib.redirect_stdout(io.StringIO()):
            a.main()
            request.assert_called_once_with("GET", "/v1/apps/6831079439", query={"fields[apps]": "bundleId"})
            result["data"]["attributes"]["bundleId"] = "wrong.app"
            with self.assertRaisesRegex(a.AuthError, "identity mismatch"):
                a.main()


if __name__ == "__main__":
    unittest.main()
