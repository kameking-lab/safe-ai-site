"""Use the pinned Codemagic CLI's credential resolver and JWT issuer.

No independent integration credential store or token-export CLI exists. The
integration injects the CLI's reserved environment variables. Do not print values,
exception details, HTTP responses, or the JWT; --token-for-pipe is internal IPC.
"""
import contextlib
import io
import json
import logging
import os
import sys


class AuthError(RuntimeError):
    pass


def source_kind():
    value = os.environ.get("APP_STORE_CONNECT_PRIVATE_KEY", "")
    if not value:
        return "standard-key-locations"
    if value.startswith("@file:"):
        return "file-reference"
    if value.startswith("@env:"):
        return "environment-reference"
    if value.startswith("-----BEGIN "):
        return "pem"
    return "unsupported-value"


def client():
    # The official argument parser's exceptions may include filenames/inputs.
    # Keep both diagnostic streams private and replace failures with a fixed error.
    try:
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
            # Includes the official AuthKey_<key-id>.p8 search when env is absent.
            tool._assert_api_client_credentials()
            result = tool.api_client
            result.generate_auth_headers()  # Prove signing now, before any write.
            return result
    except Exception:
        raise AuthError("Codemagic ASC authentication failed (source=" + source_kind() +
                        "); verify the existing App Store Key integration, not a new secret variable") from None


def main():
    # No request/debug logging or disk JWT cache, even on a failed parse/sign.
    logging.disable(logging.CRITICAL)
    c = client()
    if sys.argv[1:] == ["--token-for-pipe"]:
        import jwt
        token = c.jwt
        # Locally issued JWT; read expiry only for Spaceship's refresh schedule.
        claims = jwt.decode(token, options={"verify_signature": False})
        print(json.dumps({"token": token, "expiration": claims["exp"]}))
    elif sys.argv[1:] == ["--check"]:
        # Authenticate against ASC without emitting its response or review data.
        from asc_signing import Client
        data = Client(c).request("GET", "/v1/apps/6831079439", query={"fields[apps]": "bundleId"})["data"]
        if data["id"] != "6831079439" or data["attributes"]["bundleId"] != "jp.anzen-ai-portal.app":
            raise AuthError("ASC app identity mismatch")
        print("Codemagic ASC integration authentication and app identity PASS (source=" + source_kind() + ")")
    else:
        raise AuthError("Use --check; token IPC is reserved for the fastlane adapter")


if __name__ == "__main__":
    try:
        main()
    except AuthError as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
    except Exception:
        print("ASC authentication/app identity check failed; response and credentials withheld", file=sys.stderr)
        sys.exit(1)
