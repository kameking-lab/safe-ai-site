// Page-by-page parity: live site vs the bundled app (mobile/out), iPhone width in WebKit.
// Live pages are read only (GET, no login). The app side runs with the same Capacitor
// stub as capture.mjs is not needed here: it measures what the bundle renders by itself.
// Usage: node docs/evidence/real-device-20261107/parity.mjs
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, sep, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webkit } from '@playwright/test';

const mobile = fileURLToPath(new URL('../../../', import.meta.url));
const outDir = join(fileURLToPath(new URL('./', import.meta.url)), 'parity');
const base = resolve(mobile, 'out');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain' };
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  const file = resolve(base, `.${!extname(pathname) ? `${pathname.replace(/\/$/, '')}/index.html` : pathname}`);
  if (!file.startsWith(`${base}${sep}`)) { res.writeHead(403); res.end(); return; }
  try { const data = await readFile(file); res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }); res.end(data); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise(done => server.listen(3222, '127.0.0.1', done));
const APP = 'http://127.0.0.1:3222';
const LIVE = 'https://www.anzen-ai-portal.jp';
const pages = ['/', '/chatbot', '/chemical-ra', '/chemical-database', '/accident-news', '/laws', '/features', '/e-learning', '/goods'];
const measure = () => {
  const main = document.querySelector('main') ?? document.body;
  const imgs = [...main.querySelectorAll('img')].filter(i => i.getBoundingClientRect().width > 0);
  return {
    h1: document.querySelector('h1')?.textContent?.trim().slice(0, 60) ?? null,
    text: main.innerText.replace(/\s+/g, '').length,
    images: imgs.length,
    mascots: imgs.filter(i => /mascot|wanko|chihuahua/.test(i.currentSrc || i.src)).length,
    links: main.querySelectorAll('a[href]').length,
    forms: main.querySelectorAll('textarea,input:not([type=hidden]),select').length,
    unavailable: (main.innerText.match(/取得できません|読み込めません|準備中|not found/gi) ?? []).length,
  };
};
const browser = await webkit.launch();
const rows = [];
await mkdir(outDir, { recursive: true });
for (const path of pages) {
  const row = { path };
  for (const [side, origin] of [['live', LIVE], ['app', APP]]) {
    const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, locale: 'ja-JP' });
    if (side === 'app') {
      await context.route(url => !url.href.startsWith(APP), route => route.abort());
      // Native bridge: public GET APIs pass through to the live site (as CapacitorHttp would), no login.
      await context.exposeFunction('__nativeHttp', async raw => {
        const o = JSON.parse(raw);
        if ((o.method ?? 'GET') !== 'GET') return JSON.stringify({ status: 401, data: { error: { code: 'UNAUTHORIZED' } }, headers: { 'Content-Type': 'application/json' }, url: o.url });
        try {
          const r = await fetch(o.url, { headers: { Accept: o.headers?.Accept ?? '*/*', Origin: LIVE }, signal: AbortSignal.timeout(20000) });
          const type = r.headers.get('content-type') ?? '';
          const data = type.includes('json') ? await r.json() : Buffer.from(await r.arrayBuffer()).toString('base64');
          return JSON.stringify({ status: r.status, data, headers: { 'Content-Type': type }, url: o.url });
        } catch { return JSON.stringify({ status: 503, data: { error: { code: 'UNAVAILABLE' } }, headers: { 'Content-Type': 'application/json' }, url: o.url }); }
      });
      await context.addInitScript(() => {
        const store = new Map();
        window.webkit = { messageHandlers: { bridge: { postMessage() {} } } };
        const methods = ['addListener', 'removeListener', 'get', 'set', 'remove', 'clear', 'readFile', 'writeFile', 'deleteFile', 'getStatus', 'getLaunchUrl', 'request', 'open', 'share'].map(name => ({ name, rtype: name === 'addListener' ? 'callback' : 'promise' }));
        window.Capacitor = {
          PluginHeaders: ['App', 'Browser', 'Filesystem', 'Network', 'Preferences', 'Share', 'CapacitorHttp', 'NativeVault', 'PushNotifications', 'Purchases'].map(name => ({ name, methods })),
          nativeCallback() { return 'cb'; },
          async nativePromise(plugin, method, o = {}) {
            if (plugin === 'CapacitorHttp') return JSON.parse(await window.__nativeHttp(JSON.stringify(o)));
            if (plugin === 'Preferences') { if (method === 'get') return { value: store.get(o.key) ?? null }; if (method === 'set') store.set(o.key, o.value); return {}; }
            if (plugin === 'Filesystem' && method === 'readFile') throw Object.assign(new Error('missing'), { code: 'OS-PLUG-FILE-0008' });
            if (plugin === 'Network') return { connected: true, connectionType: 'wifi' };
            return {};
          },
        };
      });
    }
    const page = await context.newPage();
    try {
      await page.goto(origin + (path === '/' ? '/' : `${path}/`), { waitUntil: 'load', timeout: 45000 });
      await page.waitForTimeout(2500);
      row[side] = await page.evaluate(measure);
      await page.screenshot({ path: join(outDir, `${side}${path === '/' ? '-home' : path.replaceAll('/', '-')}.png`) });
    } catch (e) { row[side] = { error: String(e.message).split('\n')[0] }; }
    await context.close();
  }
  rows.push(row);
}
await browser.close(); server.close();
await writeFile(join(outDir, 'parity.json'), JSON.stringify(rows, null, 2) + '\n');
for (const r of rows) console.log(r.path.padEnd(20), 'live', JSON.stringify(r.live), '\n'.padEnd(21), 'app ', JSON.stringify(r.app));
