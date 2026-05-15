/**
 * Add service account as GSC property owner via webmasters.sites.add API.
 *
 * GSC UI silently rejects service accounts (Google account validation).
 * This script uses a direct API call instead.
 *
 * Env: GOOGLE_APPLICATION_CREDENTIALS_JSON (service account JSON, single line)
 */

import { createSign } from 'node:crypto';

const SITE_URL = 'https://www.anzen-ai-portal.jp/';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/webmasters';
const WEBMASTERS_BASE = 'https://www.googleapis.com/webmasters/v3';

async function getAccessToken(credentials) {
  const { client_email, private_key } = credentials;
  const now = Math.floor(Date.now() / 1000);

  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ iss: client_email, scope: SCOPE, aud: TOKEN_ENDPOINT, exp: now + 3600, iat: now })
  ).toString('base64url');

  const sigInput = `${header}.${payload}`;
  const sign = createSign('RSA-SHA256');
  sign.update(sigInput);
  const signature = sign.sign(private_key, 'base64url');
  const jwt = `${sigInput}.${signature}`;

  const resp = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Token exchange failed ${resp.status}: ${text}`);
  }

  const data = await resp.json();
  return data.access_token;
}

async function sitesAdd(token) {
  const url = `${WEBMASTERS_BASE}/sites/${encodeURIComponent(SITE_URL)}`;
  const resp = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
  });

  // 204 No Content = already exists, 200 OK = newly added, both are success
  if (resp.status === 204 || resp.status === 200) {
    console.log(`sites.add: OK (${resp.status})`);
    return true;
  }

  const text = await resp.text();
  console.error(`sites.add: FAILED ${resp.status}: ${text}`);
  return false;
}

async function sitesList(token) {
  const resp = await fetch(`${WEBMASTERS_BASE}/sites`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error(`sites.list: FAILED ${resp.status}: ${text}`);
    return false;
  }

  const data = await resp.json();
  const sites = data.siteEntry ?? [];
  console.log(`sites.list: total=${sites.length}`);

  const found = sites.find((s) => s.siteUrl === SITE_URL);
  if (found) {
    console.log(`sites.list: ${SITE_URL} FOUND permissionLevel=${found.permissionLevel}`);
    return true;
  }

  console.warn(`sites.list: ${SITE_URL} NOT FOUND`);
  console.log('Registered sites:', sites.map((s) => s.siteUrl).join(', '));
  return false;
}

async function searchAnalyticsQuery(token) {
  const url = `${WEBMASTERS_BASE}/sites/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      startDate: '2026-05-01',
      endDate: '2026-05-15',
      dimensions: ['query'],
      rowLimit: 1,
    }),
  });

  if (resp.ok) {
    const data = await resp.json();
    console.log(`searchAnalytics.query: 200 OK rows=${(data.rows ?? []).length}`);
  } else {
    const text = await resp.text();
    console.warn(`searchAnalytics.query: ${resp.status} ${text}`);
  }
}

async function main() {
  const credJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!credJson) {
    console.error('ERROR: GOOGLE_APPLICATION_CREDENTIALS_JSON is not set');
    process.exit(1);
  }

  let creds;
  try {
    creds = JSON.parse(credJson);
  } catch {
    console.error('ERROR: Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON as JSON');
    process.exit(1);
  }

  console.log(`service_account: ${creds.client_email}`);
  console.log(`target_site: ${SITE_URL}`);

  const token = await getAccessToken(creds);
  console.log('access_token: obtained');

  const added = await sitesAdd(token);
  const listed = await sitesList(token);
  await searchAnalyticsQuery(token);

  if (!added || !listed) {
    console.error('RESULT: INCOMPLETE — check logs above');
    process.exit(1);
  }

  console.log('RESULT: SUCCESS');
}

main().catch((err) => {
  console.error('Unhandled error:', err.message);
  process.exit(1);
});
