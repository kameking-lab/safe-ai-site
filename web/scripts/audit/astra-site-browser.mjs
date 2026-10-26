import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import os from 'node:os';

const output = new URL('../../../docs/astra-local-evidence/', import.meta.url);
await mkdir(output, { recursive: true });
const fromIndex = Number(process.argv[2] ?? 0);
const results = fromIndex ? JSON.parse(await readFile(new URL('site-browser.json', output), 'utf8')).slice(0, fromIndex) : [];
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  for (const target of [
    { name:'home-desktop', path:'/', width:1440, height:900 },
    { name:'goods-mobile', path:'/goods', width:390, height:844 },
    { name:'chemical-nojs-mobile', path:'/chemical-ra', width:390, height:844, nojs:true },
    { name:'ky-paper-mobile', path:'/ky/paper', width:390, height:844 },
    { name:'signage-desktop', path:'/signage', width:1920, height:1080, signage:true },
    { name:'signage-laptop', path:'/signage', width:1366, height:768, signage:true },
    { name:'signage-mobile', path:'/signage', width:390, height:844, signage:true },
  ].slice(fromIndex)) {
    const context = await browser.newContext({ viewport:{width:target.width,height:target.height}, javaScriptEnabled:!target.nojs, serviceWorkers:'block' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (url.hostname !== '127.0.0.1') return route.abort();
      if (url.pathname === '/api/signage-data') return route.fulfill({ json:{
        fetchedAt:new Date().toISOString(), degradedSources:['jma','open-meteo'],
        jmaSourceFetchedAt:null, jmaSelectedState:'unavailable', jmaVerifiedPrefectureCount:0,
        openMeteoFetchedAt:null, openMeteoForecastFrom:null, openMeteoForecastThrough:null, openMeteoTimezone:null,
        prefectureLevels:{}, hourly:[], jmaHeadline:null, jmaReportTime:null, selectedWarnings:[], locationLabel:'表示検証',
        laborTrend:[
          {title:'表示検証用：作業前に足場と保護具を確認する',link:'https://example.invalid/first',pubDate:'2026-10-26'},
          {title:'表示検証用：情報の出典と現場条件を確認する',link:'https://example.invalid/second',pubDate:'2026-10-26'},
        ],
      } });
      if (url.pathname.startsWith('/api/')) return route.fulfill({status:503,json:{}});
      return route.continue();
    });
    const response = await page.goto(`http://127.0.0.1:3416${target.path}`, {waitUntil:'domcontentloaded',timeout:90000});
    assert.equal(response?.status(),200);
    await page.waitForLoadState('networkidle', { timeout:45000 });
    await writeFile(new URL(`${target.name}-inspection.txt`,output), await page.locator('body').innerText());
    if (target.signage) {
      if (target.width >= 1024) {
        const settings = page.getByRole('button',{name:'設定・詳細',exact:true});
        await settings.click();
        await page.getByRole('heading',{name:'サイネージ設定・詳細'}).waitFor();
        await page.getByRole('button',{name:'閉じる',exact:true}).click();
      } else {
      const stop = page.getByRole('button',{name:'トレンドニュースの自動切替を停止'});
      await stop.waitFor({timeout:45000});
      await stop.click();
      await page.emulateMedia({reducedMotion:'reduce'});
      assert.equal(await page.getByRole('button',{name:'トレンドニュースの自動切替は端末設定で停止中'}).isDisabled(),true);
      await page.emulateMedia({reducedMotion:'no-preference'});
      assert.equal(await page.getByRole('button',{name:'トレンドニュースの自動切替を再開'}).getAttribute('aria-pressed'),'true');
      }
    } else if (target.path === '/ky/paper') {
      await page.locator('#ky-paper-start').waitFor({timeout:45000});
    } else if (target.nojs) {
      assert.match(await page.locator('body').innerText(),/第3項（組成及び成分情報）/);
    } else {
      await page.locator('main').first().waitFor({timeout:45000});
      await page.waitForTimeout(1000);
    }
    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    const body = await page.locator('body').innerText();
    await page.screenshot({path:fileURLToPath(new URL(`${target.name}.png`,output)),fullPage:true});
    const record = {name:target.name,path:target.path,viewport:[target.width,target.height],status:response.status(),horizontalOverflow,pageErrors:errors,bodyLength:body.length,memoryUsedPercent:100*(1-os.freemem()/os.totalmem()),dataMode:'browser API fixtures/unavailable; external browser requests blocked'};
    results.push(record);
    console.log(JSON.stringify(record));
    await writeFile(new URL('site-browser.json',output),JSON.stringify(results,null,2));
    await writeFile(new URL(`${target.name}.txt`,output),body);
    assert.equal(errors.length,0);
    assert.equal(horizontalOverflow,false);
    await context.close();
  }
} finally { await browser.close(); }
