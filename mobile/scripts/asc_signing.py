"""CM7: reuse the installed distribution identity; only create missing profiles.

The existing App Store Key integration supplies authentication. No certificate
private key is read/exported here. Never log JWTs, credentials or API responses.
Both profiles are prepared by either workflow, including before Anzen registers
with Codemagic. No certificates, bundle IDs or capabilities are created/changed.
"""
import base64
import contextlib
from datetime import datetime, timedelta, timezone
import hashlib
import io
import json
import logging
from pathlib import Path
import plistlib
import re
import subprocess
import sys
from urllib.error import HTTPError
from urllib.parse import urlencode, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
import uuid

API = "https://api.appstoreconnect.apple.com"
BUNDLES = ("jp.tsugino-shikaku.app", "jp.anzen-ai-portal.app")
PROFILE_TYPE = "IOS_APP_STORE"


class SigningError(RuntimeError):
    pass


def require(condition, message):
    if not condition:
        raise SigningError(message)


def auth_client():
    # Same official resolver/JWT issuer as ASC11, pinned in an isolated venv.
    # Do not use the SDK HTTP session: its failure audit can persist headers.
    with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
        from codemagic.tools.app_store_connect import AppStoreConnect
        from codemagic.tools.app_store_connect.arguments import Types

        def value(kind):
            argument = kind.from_environment_variable_default()
            return argument.value if argument else None

        tool = AppStoreConnect(
            key_identifier=value(Types.KeyIdentifierArgument),
            issuer_id=value(Types.IssuerIdArgument),
            private_key=value(Types.PrivateKeyArgument),
            enable_jwt_cache=False, log_requests=False,
        )
        tool._assert_api_client_credentials()
        client = tool.api_client
        client.generate_auth_headers()
        return client


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


class Client:
    def __init__(self, auth):
        self.auth = auth

    def request(self, method, path, payload=None, query=None):
        url = path if path.startswith("https://") else API + path
        parts = urlsplit(url)
        require(parts.scheme == "https" and parts.netloc == urlsplit(API).netloc
                and parts.path.startswith("/v1/"), "Foreign API URL rejected")
        if query:
            url += "?" + urlencode(query)
        headers = {**self.auth.generate_auth_headers(), "Content-Type": "application/json"}
        body = None if payload is None else json.dumps(payload).encode()
        try:
            with build_opener(NoRedirect).open(Request(url, body, headers, method=method), timeout=60) as response:
                return json.loads(response.read())
        except HTTPError as error:
            raise SigningError(f"ASC signing request failed (HTTP {error.code}); response withheld") from None

    def all(self, path, query=None):
        rows, seen = [], set()
        while path:
            require(path not in seen, "ASC pagination loop rejected")
            seen.add(path)
            page = self.request("GET", path, query=query)
            rows.extend(page["data"])
            path, query = page.get("links", {}).get("next"), None
        return rows


def run_public_command(args, data=None):
    # security find-identity returns public fingerprints, never private keys.
    result = subprocess.run(args, input=data, capture_output=True, check=False)
    require(result.returncode == 0, "macOS public signing identity/profile command failed")
    return result.stdout


def installed_identities():
    output = run_public_command(["security", "find-identity", "-v", "-p", "codesigning"]).decode()
    return set(re.findall(r"\b[0-9A-Fa-f]{40}\b", output.upper()))


def certificate_identity(client, fingerprints):
    from cryptography import x509
    from cryptography.x509.oid import NameOID

    candidates = []
    for row in client.all("/v1/certificates", {"filter[certificateType]": "DISTRIBUTION,IOS_DISTRIBUTION"}):
        attributes = row["attributes"]
        if attributes["certificateType"] not in ("DISTRIBUTION", "IOS_DISTRIBUTION"):
            continue
        der = base64.b64decode(attributes["certificateContent"], validate=True)
        if hashlib.sha1(der).hexdigest().upper() not in fingerprints:
            continue
        cert = x509.load_der_x509_certificate(der)
        now = datetime.now(timezone.utc)
        require(cert.not_valid_before_utc <= now < cert.not_valid_after_utc, "Installed distribution certificate is expired/not valid")
        teams = cert.subject.get_attributes_for_oid(NameOID.ORGANIZATIONAL_UNIT_NAME)
        require(len(teams) == 1, "Distribution certificate team is ambiguous")
        candidates.append((row["id"], der, teams[0].value))
    require(len(candidates) == 1, "Expected one installed ASC distribution identity; check kameking_distribution")
    return candidates[0]


def decode_profile(content):
    return plistlib.loads(run_public_command(["security", "cms", "-D"], content))


def profile_content(row, bundle, der, team, decode=decode_profile):
    attributes = row["attributes"]
    if attributes["profileType"] != PROFILE_TYPE or attributes["profileState"] != "ACTIVE":
        return None
    if not attributes.get("profileContent"):
        return None
    content = base64.b64decode(attributes["profileContent"], validate=True)
    profile = decode(content)
    entitlements = profile["Entitlements"]
    expiry = profile["ExpirationDate"].replace(tzinfo=timezone.utc)
    valid = (
        expiry > datetime.now(timezone.utc) + timedelta(days=1)
        and profile["TeamIdentifier"] == [team]
        and entitlements.get("com.apple.developer.team-identifier") == team
        and entitlements.get("application-identifier") == team + "." + bundle
        and entitlements.get("get-task-allow") is False
        and "ProvisionedDevices" not in profile
        and not profile.get("ProvisionsAllDevices", False)
        and der in profile["DeveloperCertificates"]
        and profile["UUID"] == attributes["uuid"]
    )
    if bundle == "jp.anzen-ai-portal.app":
        valid = valid and entitlements.get("aps-environment") == "production"
    return content if valid else None


def prepare_profile(client, bundle, identity, directory, decode=decode_profile):
    certificate_id, der, team = identity
    rows = client.all("/v1/bundleIds", {"filter[identifier]": bundle})
    rows = [row for row in rows if row["attributes"]["identifier"] == bundle
            and row["attributes"]["platform"] in ("IOS", "UNIVERSAL")]
    require(len(rows) == 1, "Expected one existing iOS bundle ID for " + bundle)
    bundle_id = rows[0]["id"]
    # Read profile information explicitly; relationship listings can omit content.
    for entry in client.all(f"/v1/bundleIds/{bundle_id}/profiles"):
        try:
            row = client.request("GET", "/v1/profiles/" + entry["id"])["data"]
        except SigningError as error:
            if "(HTTP 404)" in str(error):
                continue  # Apple's relationship listing can contain stale IDs.
            raise
        content = profile_content(row, bundle, der, team, decode)
        if content:
            break
    else:
        payload = {"data": {
            "type": "profiles",
            "attributes": {"name": "CM7 " + bundle + " " + uuid.uuid4().hex[:12], "profileType": PROFILE_TYPE},
            "relationships": {
                "bundleId": {"data": {"type": "bundleIds", "id": bundle_id}},
                "certificates": {"data": [{"type": "certificates", "id": certificate_id}]},
            },
        }}
        row = client.request("POST", "/v1/profiles", payload)["data"]
        content = profile_content(row, bundle, der, team, decode)
        require(content is not None, "Created profile failed certificate/team/entitlement checks for " + bundle)
    profile_uuid = row["attributes"]["uuid"]
    require(str(uuid.UUID(profile_uuid)).upper() == profile_uuid.upper(), "Invalid profile UUID")
    directory.mkdir(parents=True, exist_ok=True)
    target = directory / (profile_uuid + ".mobileprovision")
    target.write_bytes(content)
    target.chmod(0o600)
    return {"bundleId": bundle, "profileId": row["id"], "uuid": profile_uuid,
            "certificateId": certificate_id, "teamId": team, "profileType": PROFILE_TYPE,
            "expirationDate": row["attributes"]["expirationDate"]}


def main():
    logging.disable(logging.CRITICAL)
    stage = "integration authentication"
    try:
        client = Client(auth_client())
        stage = "installed public distribution identity"
        identity = certificate_identity(client, installed_identities())
        directory = Path.home() / "Library/MobileDevice/Provisioning Profiles"
        summaries = []
        for bundle in BUNDLES:
            stage = "profile preparation for " + bundle
            summaries.append(prepare_profile(client, bundle, identity, directory))
        # Allowlisted non-secret metadata only; no keys, JWTs, CMS or API bodies.
        print(json.dumps({"signingProfiles": summaries}, indent=2))
    except Exception as error:
        detail = str(error) if isinstance(error, SigningError) else "details withheld"
        print("CM7 failed at " + stage + ": " + detail, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
