// Photograph the unchanged static iOS bundle with fresh Windows Playwright.
// No response replacement, entitlement grants, fabricated records or OS chrome.
import { webkit } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile, readdir, unlink, stat } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { checkImages } from './asc_image_check.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const config = JSON.parse(await readFile(path.join(root, 'asc/capture.json'), 'utf8'));
const output = path.resolve(process.argv[2] ?? path.join(root, 'build/asc/windows-capture'));
// Optional preflight export: compare its source before opening the browser.
const bundleRoot = path.resolve(process.argv[3] ?? root);
const origin = `http://127.0.0.1:${Number(process.argv[4] ?? 3213)}`;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceHash = async file => sha256((await readFile(file, 'utf8')).replace(/\r\n/g, '\n'));
await mkdir(output, { recursive: true });
if ((await readdir(output)).length) throw new Error('Capture destination must be empty');
const sources = execFileSync('git', ['ls-files', '-z', 'src', '../web/src', '../web/public', 'native', 'capacitor.config.ts', 'next.config.ts', 'package.json', 'package-lock.json'], { cwd: root, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }).split('\0').filter(Boolean);
const bundleInputs = [...sources, 'scripts/build.mjs', 'scripts/share-web.mjs', 'scripts/pack-seed.mjs'];
for (const file of bundleInputs) {
  const digest = async directory => file.startsWith('../web/public/') ? sha256(await readFile(path.join(directory, file))) : sourceHash(path.join(directory, file));
  if (await digest(root) !== await digest(bundleRoot)) throw new Error(`Export source differs: ${file}`);
}
const manifest = {
  git_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  bundle_id: config.bundleId, version: '1.0.0', captured_at: new Date().toISOString(),
  capture_engine: 'Windows Playwright WebKit (not an iOS runtime)',
  capture_script_sha256: await sourceHash(fileURLToPath(import.meta.url)),
  authentication: 'anonymous', quota_grants: 0,
  capture_plan: 'ASCA2: current home, visual KY, law search, safety sign, training library',
  limitations: 'No AI, login, purchase, notifications or fabricated responses. Windows fonts/safe areas/native UI differ from iOS. Existing static Next export served locally; not a Simulator/archive screenshot. iPad-size images retained for existing 15-image validation; native target is iPhone only.',
  export_provenance: { source_directory: bundleRoot, compared_input_count: bundleInputs.length,
    index_sha256: sha256(await readFile(path.join(bundleRoot, 'out/index.html'))),
    index_modified_at: (await stat(path.join(bundleRoot, 'out/index.html'))).mtime.toISOString(), new_build_performed: false },
  local_source_sha256: {}, public_asset_sha256: {}, images: [],
};
for (const file of sources.filter(file => file.startsWith('../web/public/'))) manifest.public_asset_sha256[file] = sha256(await readFile(path.join(root, file)));
for (const file of [...sources.filter(file => !file.startsWith('../web/public/')), 'asc/capture.json', 'scripts/asc_image_check.mjs', 'scripts/asc_repository_check.mjs', 'scripts/build.mjs', 'scripts/serve.mjs', 'scripts/share-web.mjs', 'scripts/pack-seed.mjs']) manifest.local_source_sha256[file] = await sourceHash(path.join(root, file));
const browser = await webkit.launch({ headless: true });
try {
  for (const device of config.devices) {
    const scale = device.scale;
    const context = await browser.newContext({ viewport: { width: device.width / scale, height: device.height / scale },
      deviceScaleFactor: scale, isMobile: true, hasTouch: true, locale: 'ja-JP', timezoneId: 'Asia/Tokyo',
      colorScheme: 'light', reducedMotion: 'reduce', serviceWorkers: 'block' });
    const blocked = [], errors = [], requests = [];
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.origin !== origin || url.pathname.startsWith('/api/') || /^\/(?:exam-quiz|e-learning\/exams)(?:\/|$)/.test(url.pathname) || !['GET', 'HEAD'].includes(request.method())) {
        blocked.push({ origin: url.origin, path: url.pathname, method: request.method() });
        return route.abort();
      }
      requests.push(url.pathname);
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const scrollTo = async locator => locator.evaluate(e => window.scrollTo({ top: e.getBoundingClientRect().top + window.scrollY - 72, behavior: 'instant' }));
    const shot = async (screen, routePath, prepare) => {
      const response = await page.goto(origin + routePath, { waitUntil: 'networkidle' });
      const routeHash = sha256(await readFile(path.join(bundleRoot, 'out', routePath, 'index.html')));
      if (!response?.ok() || sha256(await response.body()) !== routeHash) throw new Error(`Served HTML differs: ${routePath}`);
      if (prepare) await prepare();
      await page.evaluate(async () => { document.activeElement?.blur(); await document.fonts.ready; });
      await page.waitForFunction(() => [...document.images].filter(e => {
        const r = e.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight;
      }).every(e => e.complete && e.naturalWidth > 0));
      if (/読み込み中|Loading[.…]|\uFFFD/.test(await page.locator('body').innerText())) throw new Error('Loading or invalid text');
      const file = `${screen}-${device.slug}.jpg`;
      const first = path.join(output, file), second = path.join(output, `${file}.settled.jpg`);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: first, type: 'jpeg', quality: 95, fullPage: false, animations: 'disabled' });
      await page.waitForTimeout(1000);
      await page.screenshot({ path: second, type: 'jpeg', quality: 95, fullPage: false, animations: 'disabled' });
      const pixels = await checkImages(first, device.width, device.height, second);
      if (!pixels.accepted) throw new Error(`Blank or unstable screenshot: ${file}`);
      if (errors.length) throw new Error(`Page errors: ${errors.join('; ')}`);
      await unlink(second);
      manifest.images.push({ file, sha256: sha256(await readFile(first)), url: page.url(),
        heading: await page.locator('h1').first().innerText(), scroll_y: await page.evaluate(() => scrollY),
        source: 'Unmodified existing preflight mobile/out static Next export used by Capacitor',
        route_html_sha256: routeHash,
        viewport: { width: device.width / scale, height: device.height / scale, deviceScaleFactor: scale },
        pixel_check: pixels, visual_review: { status: 'pending' } });
      console.log(`Captured ${file}`);
    };
    await shot('01-home', '/', async () => {
      const pause = page.getByRole('button', { name: 'わんこの動きを停止', exact: true });
      if (await pause.count()) await pause.click();
    });
    await shot('02-visual-kyt', '/training/visual-ky/');
    await shot('03-law-search', '/law-search/', async () => {
      await page.getByRole('button', { name: '安衛法 第61条', exact: true }).click();
      await page.getByRole('searchbox', { name: '条番号で検索', exact: true }).fill('第8条');
      await page.getByText('収録本文を表示', { exact: true }).waitFor();
      await page.waitForTimeout(1500);
      await page.evaluate(() => window.scrollTo({ top: 420, behavior: 'instant' }));
    });
    await shot('04-safety-sign', '/materials/safety-images/helmet-required/', async () => {
      await page.getByRole('button', { name: 'A4横', exact: true }).click();
      await page.getByLabel('英語', { exact: true }).check();
      await scrollTo(page.getByRole('heading', { name: 'プレビュー', exact: true }));
    });
    await shot('05-training', '/training/safety-seminars/', async () => {
      await scrollTo(page.getByRole('heading', { name: '安全管理の基本と安衛法', exact: true }));
    });
    manifest[`request_audit_${device.slug}`] = { granted: 0, blocked, page_errors: errors, local_static_requests: requests.length };
    await context.close();
  }
  await writeFile(path.join(output, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
} finally { await browser.close(); }
