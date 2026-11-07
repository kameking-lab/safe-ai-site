// Real-device-style walkthrough of the bundled app (mobile/out) in Playwright WebKit.
// iPhone 15 Pro viewport, touch, and a stubbed Capacitor iOS bridge. The bridge only
// advertises the plugins a scenario says are registered natively, so a plugin that is
// missing from the native project fails exactly like on a device (UNIMPLEMENTED).
// Safe-area env() is rewritten to iPhone 15 Pro insets (59/34 px) and the status bar /
// home indicator are drawn on top, so overlap is visible in the screenshots.
// Usage: node docs/evidence/real-device-20261107/capture.mjs <label> [scenario...]
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, sep, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webkit } from '@playwright/test';

const mobile = fileURLToPath(new URL('../../../', import.meta.url));
const outDir = fileURLToPath(new URL('./', import.meta.url));
const label = process.argv[2] ?? 'run';
const only = process.argv.slice(3);
const base = resolve(mobile, 'out');
const SITE = 'https://www.anzen-ai-portal.jp';
const PORT = 3219;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  const pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://localhost').pathname);
  const file = resolve(base, `.${!extname(pathname) ? `${pathname.replace(/\/$/, '')}/index.html` : pathname}`);
  if (!file.startsWith(`${base}${sep}`)) { res.writeHead(403); res.end(); return; }
  try {
    let data = await readFile(file);
    if (extname(file) === '.css') {
      data = Buffer.from(String(data)
        .replace(/env\(\s*safe-area-inset-top\s*(?:,[^)]*)?\)/g, '59px')
        .replace(/env\(\s*safe-area-inset-bottom\s*(?:,[^)]*)?\)/g, '34px')
        .replace(/env\(\s*safe-area-inset-(?:left|right)\s*(?:,[^)]*)?\)/g, '0px'));
    }
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(done => server.listen(PORT, '127.0.0.1', done));
const ORIGIN = `http://127.0.0.1:${PORT}`;

const ALL = ['App', 'CAPBrowserPlugin', 'Filesystem', 'Network', 'Preferences', 'PushNotifications', 'Share', 'Purchases', 'CapacitorHttp', 'NativeVault', 'NativeDocuments', 'NativeSpeech'];
const now = () => new Date().toISOString();
const inMinutes = m => new Date(Date.now() + m * 60000).toISOString();
const capability = { version: 1, plan: 'free', session: 'member', expiresAt: inMinutes(4), csrfToken: 'csrf-fixture-00000000000000000000000000', safety: { originalEvidence: true, dangerousAssertionsBlocked: true, sharedMonthlyBudgetYen: 50000, serverSideEnforced: true }, features: {
  law_chat: { available: true, quota: { limit: 3, used: 0, remaining: 3, reserved: 0, resetAt: inMinutes(600) } },
  chemical_ra: { available: false, quota: { limit: 1, used: 0, remaining: 1, reserved: 0, resetAt: inMinutes(600) } } } };
const member = { plan: 'free', source: null, syncState: 'verified', expiresAt: null, appUserId: 'fixture-app-user-000000', verifiedAt: now(), purchasePending: false, purchaseIntentId: null, purchaseSource: null, purchaseStage: null,
  limits: { law_chat: 3, chemical_ra: 1, weatherLocations: 1, notifications: false } };

// One scenario = which native plugins exist + which of them reject + login state.
const scenarios = {
  happy: { registered: ALL, loggedIn: true },
  'logged-out': { registered: ALL, loggedIn: false },
  'build2-scene-delegate': { registered: ALL.filter(p => !p.startsWith('Native')), loggedIn: true },
  'preferences-reject': { registered: ALL, reject: ['Preferences'], loggedIn: true },
  'filesystem-reject': { registered: ALL, reject: ['Filesystem'], loggedIn: true },
  'network-app-reject': { registered: ALL, reject: ['Network', 'App'], loggedIn: true },
  'vault-push-reject': { registered: ALL, reject: ['NativeVault', 'PushNotifications', 'Purchases'], loggedIn: true },
};

const bridgeStub = ({ registered, reject = [] }) => {
  const methods = ['addListener', 'removeListener', 'removeAllListeners', 'get', 'set', 'remove', 'clear', 'keys', 'readFile', 'writeFile', 'deleteFile', 'mkdir', 'stat', 'getUri', 'getStatus', 'getLaunchUrl', 'getInfo', 'open', 'close', 'share', 'canShare', 'request', 'requestPermissions', 'checkPermissions', 'register', 'unregister', 'configure', 'logIn', 'logOut', 'getOfferings', 'purchasePackage', 'restorePurchases', 'getCustomerInfo', 'printPage', 'start', 'stop', 'abort', 'isAvailable', 'setLogLevel', 'getDeliveredNotifications', 'removeAllDeliveredNotifications', 'createChannel', 'listChannels', 'migrate', 'removeOld', 'exitApp', 'minimizeApp', 'getState', 'toggleBackButtonHandler'];
  const headerName = { CAPBrowserPlugin: 'Browser' };
  window.webkit = { messageHandlers: { bridge: { postMessage() {} } } };
  const prefs = new Map(); const files = new Map(); const vault = new Map();
  window.__calls = [];
  const err = (message, code = 'UNAVAILABLE') => Object.assign(new Error(message), { code });
  window.Capacitor = {
    PluginHeaders: registered.map(p => ({ name: headerName[p] ?? p, methods: methods.map(name => ({ name, rtype: name === 'addListener' ? 'callback' : 'promise' })) })),
    nativeCallback(plugin, method, options) { window.__calls.push([plugin, method, options?.eventName]); return `cb-${Math.random()}`; },
    async nativePromise(plugin, method, options = {}) {
      window.__calls.push([plugin, method]);
      if (reject.includes(plugin)) throw err(`${plugin}.${method} failed (stub)`);
      switch (plugin) {
        case 'Preferences':
          if (method === 'get') return { value: prefs.has(options.key) ? prefs.get(options.key) : null };
          if (method === 'set') { prefs.set(options.key, options.value); return; }
          if (method === 'remove') { prefs.delete(options.key); return; }
          return {};
        case 'Filesystem':
          if (method === 'readFile') { if (!files.has(options.path)) throw err('File does not exist', 'OS-PLUG-FILE-0008'); return { data: files.get(options.path) }; }
          if (method === 'writeFile') { files.set(options.path, options.data); return { uri: options.path }; }
          if (method === 'deleteFile') { if (!files.delete(options.path)) throw err('File does not exist', 'OS-PLUG-FILE-0008'); return; }
          return {};
        case 'NativeVault': {
          const key = options.purpose ?? 'session';
          if (method === 'get') return { value: vault.get(key) ?? (key === 'session' && window.__loggedIn ? 'fixturetoken0000000000000000000000000000000' : undefined) };
          if (method === 'set') { vault.set(key, options.value); return; }
          if (method === 'clear') { vault.delete(key); return; }
          return {};
        }
        case 'Network': return { connected: true, connectionType: 'wifi' };
        case 'App': return method === 'getLaunchUrl' ? {} : {};
        case 'Browser': window.__opened = options.url; return;
        case 'Share': window.__shared = options; return;
        case 'PushNotifications': return method.endsWith('Permissions') ? { receive: 'granted' } : {};
        case 'Purchases':
          if (method === 'getOfferings') return { all: { default: { identifier: 'default', availablePackages: [{ identifier: '$rc_monthly', packageType: 'MONTHLY', product: { identifier: 'jp.anzenaiportal.pro.monthly', price: 980, priceString: '¥980', currencyCode: 'JPY', subscriptionPeriod: 'P1M', title: 'Pro' } }] } } };
          return {};
        case 'CapacitorHttp': return await window.__nativeHttp(JSON.stringify(options)).then(JSON.parse);
        default: return {};
      }
    },
  };
};

async function nativeHttp(scenario, raw) {
  const o = JSON.parse(raw);
  const url = new URL(o.url);
  const json = (status, data) => JSON.stringify({ status, data, headers: { 'Content-Type': 'application/json' }, url: o.url });
  const authed = scenario.loggedIn && !!(o.headers?.Authorization || o.headers?.authorization);
  const path = url.pathname;
  if (path === '/api/mobile/v1/capabilities') return authed ? json(200, { ...capability, expiresAt: inMinutes(4) }) : json(401, { error: { code: 'UNAUTHORIZED' } });
  if (path === '/api/me/entitlements' || path === '/api/billing/reconcile') return authed ? json(200, { ...member, verifiedAt: now() }) : json(401, { error: { code: 'UNAUTHORIZED' } });
  if (path === '/api/mobile/v1/account') return authed ? json(200, { displayName: '確認 太郎', email: 'reviewer@example.com', sdsHistory: [] }) : json(401, { error: { code: 'UNAUTHORIZED' } });
  if (path === '/api/me/weather-locations') return authed ? json(200, { locations: [{ locationId: 'tokyo-shinjuku', label: '東京都新宿区', active: true, primary: true }], limit: 1, notifications: false }) : json(401, { error: { code: 'UNAUTHORIZED' } });
  if (path === '/api/mobile/v1/auth/start') return json(200, { flow: '11111111-2222-4333-8444-555555555555', authorizeUrl: `${SITE}/api/mobile/v1/auth/authorize?flow=11111111-2222-4333-8444-555555555555` });
  if (path === '/api/mobile/v1/account/delete') {
    const body = typeof o.data === 'string' ? JSON.parse(o.data) : o.data;
    if (body?.action === 'prepare') return json(200, { id: 'del-fixture', confirmation: 'c', receipt: 'r', expiresAt: inMinutes(5), subject: 'fixture' });
    return json(200, { status: 'pending', completedAt: null });
  }
  if (path === '/api/mobile/v1/ai') {
    const body = typeof o.data === 'string' ? JSON.parse(o.data) : o.data;
    return json(200, { version: 1, requestId: body.requestId, feature: body.feature, status: 'completed', answer: '【スタブ回答】高さ2m以上の箇所で作業床を設けることが困難なときは、墜落制止用器具を使用させる等の措置が必要です（安衛則518条）。', conditions: ['作業床の設置可否'], evidence: [{ title: '労働安全衛生規則 第518条', original: '事業者は、高さが二メートル以上の箇所で作業を行なう場合において…', url: 'https://laws.e-gov.go.jp/law/347M50002000032', verification: 'e-Gov原文', asOf: '2026-11-01' }], safety: { reviewed: true, dangerousAssertionsBlocked: true }, charged: true, usage: { limit: 3, used: 1, remaining: 2, reserved: 0, resetAt: inMinutes(600) } });
  }
  if (path === '/api/chatbot/stream' || path === '/api/chatbot') {
    const sse = 'event: done\ndata: ' + JSON.stringify({ answer: '【スタブ回答】安衛則518条に基づき…', citations: [] }) + '\n\n';
    return JSON.stringify({ status: 200, data: Buffer.from(sse).toString('base64'), headers: { 'Content-Type': 'text/event-stream' }, url: o.url });
  }
  // Read-only public feeds: real production GET (no AI, no login).
  if ((o.method ?? 'GET') === 'GET' && ['/api/signage-data', '/api/revisions', '/api/mobile/v1/statistics', '/api/mobile/v1/billing/config'].includes(path)) {
    try {
      const r = await fetch(o.url, { headers: { Accept: 'application/json', Origin: SITE }, signal: AbortSignal.timeout(20000) });
      const data = await r.json();
      return JSON.stringify({ status: r.status, data, headers: { 'Content-Type': 'application/json' }, url: o.url });
    } catch { return json(503, { error: { code: 'UNAVAILABLE' } }); }
  }
  return json(404, { error: { code: 'NOT_FOUND' } });
}

const overlay = () => {
  const draw = () => {
    if (document.getElementById('__device')) return;
    const d = document.createElement('div'); d.id = '__device';
    d.innerHTML = '<div style="position:fixed;left:0;right:0;top:0;height:59px;background:rgba(255,0,80,.18);z-index:2147483647;pointer-events:none;font:600 17px -apple-system;color:#000"><span style="position:absolute;left:44px;top:18px">9:41</span><span style="position:absolute;left:50%;top:11px;width:126px;height:37px;margin-left:-63px;border-radius:20px;background:#000"></span><span style="position:absolute;right:36px;top:18px">􀙇 100%</span></div><div style="position:fixed;left:0;right:0;bottom:0;height:34px;background:rgba(255,0,80,.18);z-index:2147483647;pointer-events:none"><span style="position:absolute;left:50%;bottom:8px;width:134px;height:5px;margin-left:-67px;border-radius:3px;background:#000"></span></div>';
    document.documentElement.appendChild(d);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', draw); else draw();
};

const audit = () => {
  const vw = innerWidth; const issues = [];
  const se = document.scrollingElement;
  if (se.scrollWidth > vw + 1) issues.push(`horizontal-scroll ${se.scrollWidth}>${vw}`);
  const visible = el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none' && !el.closest('#__device'); };
  for (const el of document.querySelectorAll('a,button,summary,input,select,textarea')) {
    if (!visible(el)) continue; const r = el.getBoundingClientRect();
    const text = (el.innerText || el.getAttribute('aria-label') || el.value || '').trim().slice(0, 24);
    if (r.right > vw + 1 || r.left < -1) issues.push(`offscreen-x "${text}" ${Math.round(r.left)}..${Math.round(r.right)}`);
    if (r.top < 59 && r.bottom > 0 && window.scrollY === 0) issues.push(`under-status-bar "${text}" top=${Math.round(r.top)}`);
    const inline = getComputedStyle(el).display === 'inline' && el.tagName === 'A' && el.closest('p,li');
    if (!inline && (r.height < 32 || r.width < 32) && !['INPUT'].includes(el.tagName)) issues.push(`small-target "${text}" ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  const textLen = document.body.innerText.replace(/\s+/g, '').length;
  return { url: location.pathname + location.search, issues, textLen, title: document.title, bodyEmpty: textLen < 20 };
};

const browser = await webkit.launch();
const report = {};
for (const [name, scenario] of Object.entries(scenarios)) {
  if (only.length && !only.includes(name)) continue;
  const dir = join(outDir, label, name); await mkdir(dir, { recursive: true });
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ja-JP', timezoneId: 'Asia/Tokyo',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148' });
  const external = new Set();
  await context.route(url => !url.href.startsWith(ORIGIN), route => { external.add(new URL(route.request().url()).origin + new URL(route.request().url()).pathname); return route.abort(); });
  await context.exposeFunction('__nativeHttp', raw => nativeHttp(scenario, raw));
  await context.addInitScript(bridgeStub, { registered: scenario.registered, reject: scenario.reject ?? [] });
  await context.addInitScript(`window.__loggedIn=${scenario.loggedIn};`);
  await context.addInitScript(overlay);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e.message).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  const results = [];
  const shot = async (step, settle = 1200) => { await page.waitForTimeout(settle); await page.screenshot({ path: join(dir, `${step}.png`) }); results.push({ step, ...(await page.evaluate(audit)) }); };
  const tap = async (locator) => { await locator.first().scrollIntoViewIfNeeded(); await locator.first().tap(); };
  try {
    await page.goto(`${ORIGIN}/`, { waitUntil: 'load' });
    await shot('01-launch', 2500);
    await tap(page.getByRole('navigation', { name: 'タブ' }).getByRole('button', { name: /AI確認/ }));
    await shot('02-ai-tab');
    if (name === 'happy' || name === 'logged-out' || name === 'build2-scene-delegate') {
      const box = page.getByRole('textbox').first();
      await box.tap(); await box.fill('高さ2mの足場で作業するとき、墜落制止用器具は必要ですか？');
      const consent = page.getByRole('checkbox', { name: /送信に同意/ });
      if (await consent.count()) await consent.check();
      const send = page.getByRole('button', { name: '確認して送信する' });
      if (await send.isEnabled()) { await tap(send); }
      await shot('03-ai-answer', 2000);
      await page.goto(`${ORIGIN}/chatbot/`); await shot('04-chatbot', 2500);
      const composer = page.locator('[data-chatbot-composer] textarea, textarea').first();
      results.push({ step: 'chatbot-composer', visible: await composer.isVisible().catch(() => false) });
      if (await composer.isVisible().catch(() => false)) { await composer.scrollIntoViewIfNeeded(); await composer.tap(); await composer.fill('足場の手すりの高さは？'); await shot('04a-chatbot-composer', 600); }
    }
    if (name === 'happy') {
      // Real taps: portal header link, then the shared header back button.
      await page.goto(`${ORIGIN}/`); await page.waitForTimeout(1500);
      await tap(page.locator('header.app-header').getByRole('link', { name: '会員・Pro' }));
      await page.waitForURL('**/account/**', { timeout: 15000 }).catch(() => {});
      await shot('04b-tap-account-from-portal', 2500);
      await tap(page.getByRole('button', { name: '戻る' }).first());
      await page.waitForTimeout(1500);
      await shot('04c-back-button', 1000);
    }
    await page.goto(`${ORIGIN}/account/`); await shot('05-account', 2500);
    await page.evaluate(() => window.scrollTo(0, 500)); await shot('05b-account-scrolled-sticky', 600);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await shot('06-account-bottom', 600);
    if (name === 'logged-out' || name === 'build2-scene-delegate') {
      const login = page.getByRole('button', { name: /Apple \/ Googleでログイン/ });
      results.push({ step: 'login-button', enabled: await login.isEnabled().catch(() => false) });
      if (await login.isEnabled().catch(() => false)) { await tap(login); await page.waitForTimeout(800); results.push({ step: 'login-opened', url: await page.evaluate(() => window.__opened ?? null) }); await shot('07-after-login-tap', 400); }
    }
    if (name === 'happy') {
      await page.evaluate(() => window.scrollTo(0, 0));
      await tap(page.getByRole('button', { name: 'アカウント削除を開始' }));
      await shot('07-delete-confirm', 1200);
      await page.goto(`${ORIGIN}/notifications/`); await shot('08-notifications', 2500);
      await page.goto(`${ORIGIN}/features/`); await shot('09-features', 2000);
      await tap(page.getByRole('button', { name: '戻る' }).first()); await shot('10-back', 1500);
      await page.goto(`${ORIGIN}/e-learning/exams/`); await shot('11-exams', 2000);
    }
  } catch (e) { errors.push(`STEP FAILED: ${String(e.message).split('\n')[0]}`); await page.screenshot({ path: join(dir, 'zz-failure.png') }).catch(() => {}); }
  report[name] = { results, errors: [...new Set(errors)].slice(0, 30), externalBlocked: [...external].slice(0, 30), nativeCalls: await page.evaluate(() => window.__calls?.length ?? 0).catch(() => null) };
  await context.close();
}
// Login screen as the SFSafariViewController shows it (production page, view only, no sign-in).
if (!only.length || only.includes('signin')) {
  const context = await browser.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'ja-JP' });
  const page = await context.newPage();
  const response = await page.goto(`${SITE}/api/mobile/v1/auth/authorize?flow=11111111-2222-4333-8444-555555555555`, { waitUntil: 'load' }).catch(() => null);
  await page.waitForTimeout(1500);
  await mkdir(join(outDir, label, 'signin'), { recursive: true });
  await page.screenshot({ path: join(outDir, label, 'signin', 'production-signin.png'), fullPage: true });
  report.signin = { finalUrl: page.url(), status: response?.status() ?? null,
    buttons: await page.getByRole('button').allInnerTexts().catch(() => []), summaries: await page.locator('summary').allInnerTexts().catch(() => []) };
  await context.close();
}
await browser.close(); server.close();
await writeFile(join(outDir, label, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 1).slice(0, 12000));
