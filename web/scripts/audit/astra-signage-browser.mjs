import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const output = new URL('../../../docs/astra-local-evidence/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless:true, channel:'chrome' });
const evidence = [];
try {
  for (const viewport of [{width:1920,height:1080},{width:1366,height:768},{width:390,height:844}]) {
    const page = await browser.newPage({ viewport, reducedMotion:'no-preference' });
    await page.goto('http://127.0.0.1:3417/scripts/audit/astra-fixture/index.html');
    await page.getByRole('button',{name:'検証ニュースの自動切替を停止'}).click();
    await page.mouse.move(1,1);
    await page.getByRole('button',{name:'検証ニュースの自動切替を再開'}).blur();
    const title = await page.locator('article:visible h3').innerText();
    await page.waitForTimeout(1500);
    assert.equal(await page.locator('article:visible h3').innerText(), title);
    await page.emulateMedia({ reducedMotion:'reduce' });
    assert.equal(await page.getByRole('button',{name:'検証ニュースの自動切替は端末設定で停止中'}).isDisabled(), true);
    await page.emulateMedia({ reducedMotion:'no-preference' });
    assert.equal(await page.getByRole('button',{name:'検証ニュースの自動切替を再開'}).getAttribute('aria-pressed'), 'true');
    const metrics = await page.locator('article:visible').evaluate((article) => {
      const content = article.parentElement;
      return { articleHeight:article.clientHeight, articleScrollHeight:article.scrollHeight, contentHeight:content.clientHeight, contentScrollHeight:content.scrollHeight, contentOverflow:getComputedStyle(content).overflowY };
    });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    assert.equal(overflow, false);
    assert.equal(metrics.contentOverflow, 'auto');
    const content = page.locator('[role="group"]:visible');
    await content.focus();
    await content.press('End');
    await page.waitForTimeout(300);
    const reachable = await content.evaluate((element) => {
      const last = element.querySelector('article p:last-child').getBoundingClientRect();
      const box = element.getBoundingClientRect();
      return last.bottom <= box.bottom + 1 && last.top >= box.top;
    });
    assert.equal(reachable, true, 'final paragraph remains reachable by keyboard scrolling');
    evidence.push({ viewport, metrics, manualStopAndMotionChanges:'pass', horizontalOverflow:overflow, finalParagraphReachable:reachable });
    await page.screenshot({ path:fileURLToPath(new URL(`signage-${viewport.width}.png`,output)), fullPage:true });
    await page.close();
  }
  console.log(JSON.stringify(evidence,null,2));
  await writeFile(new URL('signage-browser.json',output),JSON.stringify(evidence,null,2));
} finally { await browser.close(); }
