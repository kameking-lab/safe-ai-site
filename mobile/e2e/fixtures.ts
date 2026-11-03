import { test as base, expect } from '@playwright/test';

// A missing local bundle leaves prerendered HTML visible without hydration.
// Report that failure directly instead of only a later missing UI assertion.
export const test = base.extend<{ localBundles: void }>({
  localBundles: [async ({ context }, use, info) => {
    const diagnostic = Boolean(process.env.IOS3G_DIAGNOSTICS);
    const network: unknown[] = [];
    const consoleEvents: unknown[] = [];
    if (diagnostic) {
      context.on('request', r => network.push({ event: 'request', time: Date.now(), method: r.method(), path: new URL(r.url()).pathname }));
      context.on('response', r => network.push({ event: 'response', time: Date.now(), status: r.status(), path: new URL(r.url()).pathname }));
      context.on('requestfailed', r => network.push({ event: 'failed', time: Date.now(), path: new URL(r.url()).pathname, error: r.failure()?.errorText }));
      context.on('page', page => {
        page.on('console', m => consoleEvents.push({ time: Date.now(), type: m.type(), text: m.text() }));
        page.on('pageerror', e => consoleEvents.push({ time: Date.now(), type: 'pageerror', text: e.message }));
      });
      if (process.env.IOS3G_DIAGNOSTICS === '1') await context.addInitScript(() => {
        const history: unknown[] = [];
        Object.assign(window, { __deletionDiagnostics: history });
        const describe = (target: EventTarget | null) => target instanceof Element ? `${target.tagName}:${target.textContent?.slice(0, 100)}` : null;
        const state = (measure = false) => {
          const panel = document.querySelector('section[aria-label="アカウントの削除"]');
          const button = Array.from(panel?.querySelectorAll('button') ?? []).find(b => b.textContent === 'アカウント削除を開始');
          // Never force layout from a mutation callback: that can change the race under investigation.
          const rect = measure ? button?.getBoundingClientRect() : undefined;
          return { disabled: button?.disabled, busy: panel?.getAttribute('aria-busy'), rect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null, scrollY, member: document.body?.textContent?.includes('無料会員'), status: panel?.querySelector('[role="status"]')?.textContent };
        };
        const record = (event: unknown, measure = false) => { if (history.length < 500) history.push({ time: performance.now(), ...state(measure), event }); };
        for (const type of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'mouseup', 'click']) document.addEventListener(type, event => {
          const e = event as MouseEvent;
          record({ type, target: describe(event.target), x: e.clientX, y: e.clientY, hit: typeof e.clientX === 'number' ? describe(document.elementFromPoint(e.clientX, e.clientY)) : null }, true);
        }, true);
        let last = '';
        new MutationObserver(() => { const next = JSON.stringify(state()); if (next !== last) { last = next; record('mutation'); } }).observe(document, { childList: true, subtree: true, attributes: true, characterData: true });
      });
    }
    const failures: { path: string; error: string }[] = [];
    const cancellations: { path: string; error: string }[] = [];
    context.on('requestfailed', request => {
      const url = new URL(request.url());
      const error = request.failure()?.errorText ?? 'unknown';
      if (url.origin === 'http://127.0.0.1:3213' && url.pathname.endsWith('.js')) {
        // Navigation cancels speculative/lazy requests. WebKit uses this text
        // for the same cancellation Chromium reports as net::ERR_ABORTED.
        const cancelled = error === 'net::ERR_ABORTED' || error === 'Load request cancelled';
        (cancelled ? cancellations : failures).push({ path: url.pathname, error });
      }
    });
    context.on('response', response => {
      const url = new URL(response.url());
      if (url.origin === 'http://127.0.0.1:3213' && url.pathname.endsWith('.js') && response.status() >= 400) {
        failures.push({ path: url.pathname, error: `HTTP ${response.status()}` });
      }
    });
    await use();
    if (diagnostic) {
      await info.attach('network', { body: JSON.stringify(network), contentType: 'application/json' });
      await info.attach('console', { body: JSON.stringify(consoleEvents), contentType: 'application/json' });
      for (const page of context.pages()) {
        await info.attach('deletion-input-events', { body: JSON.stringify(await page.evaluate(() => (window as unknown as { __deletionDiagnostics?: unknown }).__deletionDiagnostics ?? []).catch(() => null)), contentType: 'application/json' });
        if (info.status !== info.expectedStatus) {
          await info.attach('failure-dom', { body: await page.content().catch(() => ''), contentType: 'text/html' });
          await info.attach('failure-screen', { body: await page.screenshot(), contentType: 'image/png' });
        }
      }
    }
    await info.attach('local-bundle-cancellations', { body: JSON.stringify(cancellations), contentType: 'application/json' });
    await info.attach('local-bundle-failures', { body: JSON.stringify(failures), contentType: 'application/json' });
    expect(failures, 'All local JavaScript bundles must load for hydration').toEqual([]);
  }, { auto: true }],
});
export { expect };
