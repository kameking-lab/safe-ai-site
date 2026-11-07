import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const output = new URL('../../../docs/astra-local-evidence/pet/', import.meta.url);
await mkdir(output, {recursive:true});
const browser = await chromium.launch({headless:true, channel:'chrome'});
const results = [];
const asset = '/mascot/anzen-wanko-v1/';
async function context(options = {}) {
  const ctx = await browser.newContext({serviceWorkers:'block', ...options});
  await ctx.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname !== '127.0.0.1') return route.abort();
    if (url.pathname.startsWith('/api/')) return route.fulfill({status:503,json:{}});
    return route.continue();
  });
  return ctx;
}
async function ready(page) {
  await page.waitForFunction(() => document.querySelector('[data-pet-playing="true"]')?.complete);
}
async function snap(page, name, fullPage = false) {
  const target = fullPage ? page : page.locator('[data-pet-companion]');
  await target.screenshot({path:fileURLToPath(new URL(`${name}.png`,output)), ...(fullPage ? {fullPage:true} : {})});
}
try {
  for (const width of [1366,390,320]) {
    const ctx = await context({viewport:{width,height:844},reducedMotion:'reduce'});
    const page = await ctx.newPage();
    const requests = [];
    const errors = [];
    page.on('request', r => { const path = new URL(r.url()).pathname; if(path.includes(asset)) requests.push(path); });
    page.on('pageerror', e => errors.push(e.message));
    assert.equal((await page.goto('http://127.0.0.1:3416/',{waitUntil:'networkidle',timeout:90000})).status(),200);
    await page.locator('[data-pet-companion]').scrollIntoViewIfNeeded();
    assert.deepEqual([...new Set(requests)], [asset+'static.webp']);
    assert.equal(await page.locator('[data-pet-strip]').count(),0);
    await snap(page, `${width}-reduced-static`);
    await page.emulateMedia({reducedMotion:'no-preference'});
    await ready(page);
    const frame0 = await page.locator('[data-pet-strip]').evaluate(el => getComputedStyle(el).transform);
    await page.waitForTimeout(500);
    const frame1 = await page.locator('[data-pet-strip]').evaluate(el => getComputedStyle(el).transform);
    assert.notEqual(frame0,frame1);
    for (const pose of ['idle','waving','activework','review']) {
      await page.getByRole('combobox',{name:'わんこのしぐさ'}).selectOption(pose);
      await ready(page);
      // Inspect representative complete frames without changing any source pixels.
      await page.locator('[data-pet-strip]').evaluate(el => {
        const animation=el.getAnimations()[0]; animation.pause(); animation.currentTime=450;
      });
      await snap(page, `${width}-${pose}`);
      await page.locator('[data-pet-strip]').evaluate(el => el.getAnimations()[0].play());
    }
    await page.getByRole('button',{name:'わんこの動きを停止'}).click();
    assert.equal(await page.locator('[data-pet-strip]').count(),0);
    await page.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await page.getByRole('button',{name:'端末の設定で動きを停止中'}).isDisabled(),true);
    await page.emulateMedia({reducedMotion:'no-preference'});
    assert.equal(await page.getByRole('button',{name:'わんこの動きを再開'}).getAttribute('aria-pressed'),'true');
    await page.getByRole('button',{name:'安全わんこを非表示'}).click();
    await page.waitForFunction(() => document.activeElement?.textContent === '安全わんこを再表示');
    assert.equal(await page.locator('[data-pet-viewport]').count(),0);
    await snap(page, `${width}-hidden`);
    await page.getByRole('button',{name:'安全わんこを再表示'}).click();
    await page.waitForFunction(() => document.activeElement?.textContent?.trim() === 'わんこの動きを再開');
    assert.equal(await page.locator('[data-pet-strip]').count(),0);
    // Restore during reduced motion must focus an enabled control.
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.getByRole('button',{name:'安全わんこを非表示'}).click();
    await page.getByRole('button',{name:'安全わんこを再表示'}).click();
    await page.waitForFunction(() => document.activeElement?.tagName === 'SELECT');
    await page.emulateMedia({reducedMotion:'no-preference'});
    const controls = await page.locator('[data-pet-companion] button, [data-pet-companion] select').evaluateAll(els => els.map(el => {
      const b=el.getBoundingClientRect(); return {width:b.width,height:b.height};
    }));
    assert(controls.every(b => b.width>=44 && b.height>=44));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth+1);
    assert.equal(overflow,false);
    assert.equal(await page.locator('[data-pet-companion]').evaluate(el => ['fixed','absolute','sticky'].includes(getComputedStyle(el).position)),false);
    // Existing tool links remain actionable; the companion does not overlay them.
    const ky = page.locator('main').getByRole('link',{name:'KY用紙',exact:true}).first();
    await ky.scrollIntoViewIfNeeded();
    await ky.click({trial:true});
    // Allow the existing hero entrance transition to finish after media changes.
    await page.waitForTimeout(1000);
    await snap(page, `${width}-home`, true);
    assert.deepEqual(errors,[]);
    assert.deepEqual([...new Set(requests)].sort(), ['static','idle','waving','activework','review'].map(s=>asset+s+'.webp').sort());
    results.push({width,height:844,staticOnlyWithReducedMotion:true,animationChangesFrame:true,allFourStates:true,pauseHideRestore:true,dynamicReducedMotion:true,keyboardFocus:true,touchTargets:true,noHorizontalOverflow:true,toolLinkActionable:true,requests:[...new Set(requests)],pageErrors:errors});
    await ctx.close();
  }
  const nojs = await context({viewport:{width:390,height:844},javaScriptEnabled:false});
  const p = await nojs.newPage();
  await p.goto('http://127.0.0.1:3416/',{waitUntil:'networkidle'});
  assert.equal(await p.locator('[data-pet-static]').count(),1);
  assert.equal(await p.locator('[data-pet-strip]').count(),0);
  await snap(p,'nojs-static');
  results.push({noJavaScript:true,staticFallback:true});
  await nojs.close();
  const fail = await context({viewport:{width:390,height:844}});
  await fail.route('**/mascot/anzen-wanko-v1/idle.webp',route=>route.abort());
  const fp = await fail.newPage();
  await fp.goto('http://127.0.0.1:3416/',{waitUntil:'networkidle'});
  await fp.locator('[data-pet-companion]').scrollIntoViewIfNeeded();
  await fp.getByRole('status').filter({hasText:'静止画で表示'}).waitFor();
  assert.equal(await fp.locator('[data-pet-strip]').count(),0);
  assert.equal(await fp.locator('[data-pet-static]').evaluate(el=>el.complete && el.naturalWidth>0),true);
  await snap(fp,'failed-strip-static');
  results.push({failedStrip:true,staticFallback:true});
  await fail.close();
  await writeFile(new URL('browser-results.json',output),JSON.stringify(results,null,2)+'\n');
  console.log(JSON.stringify(results,null,2));
} finally { await browser.close(); }
