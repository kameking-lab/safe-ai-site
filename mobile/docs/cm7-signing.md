# CM7 App Store provisioning (2026-11-06)

The existing Codemagic team certificate reference is `kameking_distribution`
(recorded in `ios1sub/asc-setup-log.md`, 2026-11-04). Both workflows select only
this certificate through `environment.ios_signing.certificates`. Codemagic
installs the identity into its build keychain before user scripts run.
The `distribution_type` / `bundle_identifier` selection is removed because it
requires profiles already uploaded to Code signing identities and fails before
scripts when none exist. Do not mix these two selection modes or add empty lists.

The first script uses an isolated venv with `codemagic-cli-tools==0.70.2` and the
existing **App Store Key** integration. It uses the same official credential
resolver and JWT issuer verified in ASC11. The integration's reserved environment
variables are consumed in memory; no new secret variables or key files are needed.
JWT disk caching, SDK HTTP audit logging and response logging are avoided.

`asc_signing.py` reads the installed identity's **public fingerprint** using
`security find-identity -v -p codesigning`. It matches exactly one unexpired
Apple `DISTRIBUTION` / `IOS_DISTRIBUTION` public certificate through the API.
It never opens a p12, exports a private key, creates a certificate or revokes one.

Either workflow prepares **both** existing registered bundle IDs:

- `jp.tsugino-shikaku.app`
- `jp.anzen-ai-portal.app`

This lets the next Tsugino build create Anzen's Apple profile even before Anzen is
registered with Codemagic. For each bundle, the script reuses a valid matching
`IOS_APP_STORE` profile, or sends `POST /v1/profiles` with the existing bundle ID
resource and matched certificate ID. It does not alter bundle IDs or capabilities.
Anzen's App ID must already have Push Notifications enabled (recorded as enabled
in CMREG); a missing production APNs entitlement stops the build.

The downloaded CMS is decoded locally with `security cms -D` and checked for the
exact bundle/team/certificate, active App Store type, more than one day of remaining
validity, no devices or enterprise/debug signing, and production APNs for Anzen.
Validated files are installed at
`~/Library/MobileDevice/Provisioning Profiles/<UUID>.mobileprovision`.
`xcode-project use-profiles --profile <installed-glob> --archive-method app-store`
selects the profile for the generated app target; the existing `verify-ios.rb`
then checks export options. Only allowlisted profile metadata is printed.
Profiles need not be uploaded back into Codemagic or assigned dashboard references.
Both bundle IDs must remain available to the integration; authentication or profile
creation errors fail the build before app dependencies/build/upload.

`fetch-signing-files --create` was considered but is not used: in CLI 0.70.2,
`FetchSigningFilesAction.fetch_signing_files` requires a certificate private key
before any profile fetch and later exports a p12. An API key alone cannot recover
that private key. Creating profiles with an **existing certificate ID** avoids
requiring a new `CERTIFICATE_PRIVATE_KEY` or exporting the installed identity.

Windows verification: run `python -m unittest discover -s mobile/scripts -p
asc_signing_test.py -v` using a Python environment containing CLI 0.70.2.
Tests use only an ephemeral dummy key/certificate and mocked network/keychain.
Actual keychain installation, Apple API permissions, provisioning, Xcode archive
and ASC upload require the Codemagic macOS run.

Official references:

- [Codemagic signing identities and selection modes](https://docs.codemagic.io/yaml-code-signing/signing-ios/)
- [Codemagic alternative signing / integration variables](https://docs.codemagic.io/yaml-code-signing/alternative-code-signing-methods/)
- [Pinned fetch-signing-files documentation](https://github.com/codemagic-ci-cd/cli-tools/blob/73a194a2db2dadf381c878bf1d848dc9e27809c4/docs/app-store-connect/fetch-signing-files.md)
- [Pinned fetch-signing-files implementation](https://github.com/codemagic-ci-cd/cli-tools/blob/73a194a2db2dadf381c878bf1d848dc9e27809c4/src/codemagic/tools/app_store_connect/actions/fetch_signing_files_action.py)
- [Apple Profiles API](https://developer.apple.com/documentation/appstoreconnectapi/profiles)
- [Apple create profile](https://developer.apple.com/documentation/appstoreconnectapi/post-v1-profiles)
- [Apple list bundle ID profiles](https://developer.apple.com/documentation/appstoreconnectapi/get-v1-bundleids-_id_-profiles)
- [Pinned use-profiles CLI options](https://github.com/codemagic-ci-cd/cli-tools/blob/73a194a2db2dadf381c878bf1d848dc9e27809c4/docs/xcode-project/use-profiles.md)
