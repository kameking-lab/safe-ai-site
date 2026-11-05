// Photograph the unchanged static iOS bundle with existing Windows Playwright.
// No response replacement, entitlement grants, fabricated records or OS chrome.
import { webkit } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile, readdir, unlink } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { checkImages } from './asc_image_check.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const config = JSON.parse(await readFile(path.join(root, 'asc/capture.json'), 'utf8'));
const output = path.resolve(process.argv[2] ?? path.join(root, 'build/asc/windows-capture'));
const origin = 'http://127.0.0.1:3213'; // node scripts/serve.mjs after npm run build
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
await mkdir(output, { recursive: true });
if ((await readdir(output)).length) throw new Error('Capture destination must be empty');
const manifest = {
  git_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  bundle_id: config.bundleId, version: '1.0.0', captured_at: new Date().toISOString(),
  capture_engine: 'Windows Playwright WebKit (not an iOS runtime)',
  capture_script_sha256: sha256((await readFile(fileURLToPath(import.meta.url), 'utf8')).replace(/\r\n/g, '\n')),
  authentication: 'anonymous', quota_grants: 0,
  capture_plan: 'ASCA1: bundled accident news, revision history, statistics, KY examples, law search',
  limitations: 'Offline connection state for bundled portal; actual shipped seed labelled as non-current. No records, AI results, purchase, login or notifications fabricated. Windows fonts/safe areas/native UI differ from iOS. Static Next export served locally; not a Simulator/archive screenshot.',
  local_source_sha256: {}, images: [],
};
const sources = execFileSync('git', ['ls-files', '-z', 'src', '../web/src', 'native', 'capacitor.config.ts', 'next.config.ts', 'package.json', 'package-lock.json'], { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }).split('\0').filter(Boolean);
sources.push('asc/capture.json', 'scripts/asc_image_check.mjs', 'scripts/asc_repository_check.mjs', 'scripts/build.mjs', 'scripts/serve.mjs');
for (const file of sources) manifest.local_source_sha256[file] = sha256((await readFile(path.join(root, file), 'utf8')).replace(/\r\n/g, '\n'));
const browser = await webkit.launch({ headless: true });
try {
  for (const device of config.devices) {
    const scale = device.scale;
    const context = await browser.newContext({
      viewport: { width: device.width / scale, height: device.height / scale },
      deviceScaleFactor: scale, isMobile: true, hasTouch: true, locale: 'ja-JP',
      timezoneId: 'Asia/Tokyo', colorScheme: 'light', serviceWorkers: 'block',
    });
    // The shipped app explicitly supports this browser offline condition.
    await context.addInitScript(() => Object.defineProperty(navigator, 'onLine', { get: () => false }));
    const blocked = [], errors = [], requests = [];
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== origin || url.pathname.startsWith('/api/') || !['GET', 'HEAD'].includes(request.method())) {
        blocked.push({ origin: url.origin, path: url.pathname, method: request.method() });
        return route.abort();
      }
      requests.push(url.pathname);
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const shot = async (screen, heading) => {
      await page.getByRole('heading', { name: heading, exact: true }).waitFor();
      await page.getByRole('heading', { name: heading, exact: true }).evaluate(e => e.scrollIntoView({ block: 'start', behavior: 'instant' }));
      await page.evaluate(async () => { document.activeElement?.blur(); await document.fonts.ready; });
      await page.waitForFunction(() => [...document.images].filter(e => {
        const r = e.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight;
      }).every(e => e.complete && e.naturalWidth > 0));
      const text = await page.locator('body').innerText();
      if (/読み込み中|Loading[.…]|\uFFFD/.test(text)) throw new Error('Loading or invalid text');
      const file = `${screen}-${device.slug}.jpg`;
      const first = path.join(output, file), second = path.join(output, `${file}.settled.jpg`);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: first, type: 'jpeg', quality: 95, fullPage: false });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: second, type: 'jpeg', quality: 95, fullPage: false });
      const pixels = await checkImages(first, device.width, device.height, second);
      if (!pixels.accepted) throw new Error(`Blank or unstable screenshot: ${file}`);
      if (errors.length) throw new Error(`Page errors: ${errors.join('; ')}`);
      await unlink(second);
      manifest.images.push({ file, sha256: sha256(await readFile(first)), url: page.url(), heading,
        source: 'Unmodified mobile/out static Next export used by Capacitor',
        viewport: { width: device.width / scale, height: device.height / scale, deviceScaleFactor: scale },
        pixel_check: pixels, visual_review: { status: 'pending' } });
      console.log(`Captured ${file}`);
    };
    await page.goto(origin + '/', { waitUntil: 'networkidle' });
    await page.getByText('オフライン · 保存した情報を表示', { exact: true }).waitFor();
    await shot('01-news', '事故速報');
    await page.getByRole('button', { name: '法改正', exact: true }).filter({ visible: true }).click();
    await shot('02-revisions', '法改正');
    await page.getByRole('button', { name: '事故統計', exact: true }).filter({ visible: true }).click();
    await shot('03-statistics', '事故統計');
    await page.goto(origin + '/ky-examples/', { waitUntil: 'networkidle' });
    await shot('04-ky', 'KY事例データベース');
    await page.goto(origin + '/law-search/', { waitUntil: 'networkidle' });
    await shot('05-laws', '法令・条文を検索');
    manifest[`request_audit_${device.slug}`] = { granted: 0, blocked, page_errors: errors, local_static_requests: requests.length };
    await context.close();
  }
  await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
} finally { await browser.close(); }
