# Google Search Console — User OAuth Setup Guide

**Status:** Required after merging the user-OAuth migration PR.
**Audience:** Site owner (`kenshi.ycc@gmail.com`).
**Why this exists:** Service-account access to GSC failed (Google rejects the
service-account email at the "Add user" step), and Workspace-only alternatives
(Group membership, Domain-wide Delegation) are unavailable on a personal Gmail
account. Therefore `/api/search-console` now authenticates as the property
owner via user OAuth with a long-lived refresh token.

## 1. Create an OAuth Client (one-time, GCP Console)

1. Open <https://console.cloud.google.com/apis/credentials>.
2. Select the same GCP project that already hosts the GA4 service account.
3. If the OAuth consent screen has not been configured for this project,
   configure it first:
   - User type: **External**.
   - App name: `ANZEN AI GSC`.
   - User support email + developer email: `kenshi.ycc@gmail.com`.
   - Scopes: leave empty on the consent screen (we request the scope at
     authorization time).
   - Test users: add `kenshi.ycc@gmail.com`.
   - You can leave the app in **Testing** mode. Refresh tokens issued to a
     Testing app expire after 7 days unless the app is published — see
     section 5 below for the Production-mode step that removes that limit.
4. Back on the Credentials page click **+ Create Credentials → OAuth client ID**.
5. Application type: **Web application**.
6. Name: `GSC OAuth Client`.
7. Authorized redirect URIs: add exactly
   `http://localhost:8765/oauth2/callback`
   (this is the local loopback the init script listens on; it is used **once**).
8. Click **Create** and copy:
   - `Client ID`
   - `Client secret`

## 2. Add the first two Vercel env vars

Project Settings → Environment Variables (Production scope):

| Name                       | Value                                |
| -------------------------- | ------------------------------------ |
| `GSC_OAUTH_CLIENT_ID`      | Client ID from step 1.8              |
| `GSC_OAUTH_CLIENT_SECRET`  | Client secret from step 1.8          |

Do **not** redeploy yet — the third variable comes next.

## 3. Obtain the refresh token (one-time, local script)

In the repository root:

```bash
export GSC_OAUTH_CLIENT_ID=<paste from step 1.8>
export GSC_OAUTH_CLIENT_SECRET=<paste from step 1.8>
node scripts/etl/gsc-oauth-init.mjs
```

What the script does:

- Starts a local HTTP server on `http://localhost:8765`.
- Opens your browser to Google's consent screen with the
  `https://www.googleapis.com/auth/webmasters.readonly` scope and
  `access_type=offline` + `prompt=consent` (so a refresh token is always
  returned).
- After you sign in as **`kenshi.ycc@gmail.com`** and approve, Google redirects
  to `http://localhost:8765/oauth2/callback?code=...`.
- The script exchanges the code for `{ access_token, refresh_token }` and
  prints the refresh token to the terminal.
- The script then exits. Nothing is written to disk.

Copy the printed refresh token — you will paste it into Vercel next.

> If you see "redirect_uri_mismatch", the URI in step 1.7 does not match the
> script's listener. The exact value is
> `http://localhost:8765/oauth2/callback`.

## 4. Add the third Vercel env var and redeploy

| Name                        | Value                       |
| --------------------------- | --------------------------- |
| `GSC_OAUTH_REFRESH_TOKEN`   | Refresh token from step 3   |

Then trigger a redeploy (Deployments → latest → ⋯ → Redeploy, or push an empty
commit). Once live:

```bash
curl https://www.anzen-ai-portal.jp/api/search-console | jq '.source'
# expected: "gsc"
```

If `source` is `"mock"` the server response will also include a `note` field
explaining which env var is missing or which API error was returned.

## 5. (Optional) Publish the OAuth app to remove the 7-day expiry

In Testing mode Google revokes refresh tokens 7 days after issuance. For a
long-running production deployment, switch the consent screen to **In
production**:

1. APIs & Services → OAuth consent screen → **Publish App**.
2. The app does not need to go through Google verification because
   `webmasters.readonly` is a **sensitive** but not **restricted** scope, and
   only the owner uses the app. A "This app isn't verified" warning will be
   shown to anyone who tries to authorize — that is acceptable because there is
   only one authorized user (the owner).
3. If verification is requested anyway, the simplest workaround is to keep the
   app in Testing and re-run `scripts/etl/gsc-oauth-init.mjs` once a week to
   refresh the token. The script is idempotent.

## 6. Property identifier

The runtime calls the URL-prefix property `https://www.anzen-ai-portal.jp/`
because the OAuth user (`kenshi.ycc@gmail.com`) is the verified owner of that
property. The previous `GSC_SITE_URL` override (used by the service-account
path) is still honoured if set — leave it unset to use the URL-prefix default.

## 7. Existing service-account credentials

`GOOGLE_APPLICATION_CREDENTIALS_JSON` is **kept**. It is still used by the GA4
Data API client (`web/src/lib/stats/ga4-client.ts`) and the page-analytics
client (`web/src/lib/stats/page-analytics-client.ts`). Only the GSC client has
been migrated to user OAuth.

## Troubleshooting

| Symptom                                                          | Cause / fix                                                                                                                  |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `source: "mock"`, note: `credentials missing`                    | One or more of `GSC_OAUTH_CLIENT_ID` / `GSC_OAUTH_CLIENT_SECRET` / `GSC_OAUTH_REFRESH_TOKEN` is unset in the deployed env.    |
| `source: "mock"`, note: `GSC 401: invalid_grant`                 | Refresh token was revoked (7-day Testing-mode expiry, password change, or manual revocation). Re-run the init script.        |
| `source: "mock"`, note: `GSC 403`                                | The OAuth user is not the owner of the property identifier in `siteUrl`. Confirm `kenshi.ycc@gmail.com` is listed in GSC UI. |
| Init script: `redirect_uri_mismatch`                             | Redirect URI in the OAuth client does not match `http://localhost:8765/oauth2/callback` exactly.                             |
| Init script: token response has no `refresh_token`               | Google only returns it on first consent. The script forces `prompt=consent` so this should not happen — re-run it.           |
