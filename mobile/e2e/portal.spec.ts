import type { BrowserContext } from '@playwright/test';
import { expect, test } from './fixtures';
import { capability, aiResult } from '../tests/fixtures';
import seed from '../src/data/seed.json' with { type: 'json' };
const host = 'https://www.anzen-ai-portal.jp';
test.beforeEach(async({context})=>{await context.route('https://**/*',route=>route.abort());});
function signage(sourceFetchedAt = new Date().toISOString()) {
  return { fetchedAt: new Date().toISOString(), degradedSources: [],
    laborTrend: [{ title: 'ローカル試験：事故速報の見出し', link: 'https://example.org/report/1', pubDate: new Date().toISOString() }],
    jmaSourceFetchedAt: sourceFetchedAt, jmaSelectedState: 'live', jmaHeadline: null,
    jmaReportTime: sourceFetchedAt, selectedWarnings: [], locationLabel: '東京都 新宿区' };
}
async function fixtures(context: BrowserContext, options: { ai?: boolean; oldWeather?: boolean; unavailableRa?: boolean } = {}) {
  let executions = 0;
  await context.route('https://**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== host) return route.abort();
    let data: unknown;
    let status = 200;
    if (url.pathname === '/api/signage-data') data = signage(options.oldWeather ? new Date(Date.now() - 3600000).toISOString() : undefined);
    else if (url.pathname === '/api/revisions') data = { revisions: seed.revisions.data.map(a => ({ id: a.id, title: a.title, summary: a.summary, publishedAt: a.date, source_url: a.url, enforcement_date: a.effectiveOn })) };
    else if (url.pathname === '/api/mobile/v1/statistics') data = seed.statistics.data;
    else if (url.pathname === '/api/mobile/v1/capabilities' && options.ai) data = capability();
    else if (url.pathname === '/api/mobile/v1/ai' && options.ai) {
      executions++; const input = route.request().postDataJSON(); data = aiResult(input.requestId, input.feature);
      if (input.feature === 'chemical_ra' && options.unavailableRa) { status = 503; data = { error: { code: 'FEATURE_UNAVAILABLE' } }; }
    } else { status = 404; data = { error: { code: 'UNAVAILABLE' } }; }
    await route.fulfill({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': 'http://127.0.0.1:3213', 'Access-Control-Allow-Credentials': 'true', 'Access-Control-Allow-Headers': 'content-type,x-anzen-csrf,x-anzen-native,x-operation-id,authorization' }, body: JSON.stringify(data) });
  });
  return () => executions;
}
test('bundled reading, saved article and font choice survive cold reload without site access', async ({ page, context }) => {
  await context.addInitScript(() => Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false }));
  await context.route('https://**/*', route => route.abort());
  await page.goto('/portal/');
  await expect(page.getByText('オフライン · 保存した情報を表示')).toBeVisible();
  await expect(page.getByRole('heading', { name: '厚生労働省 労働災害発生状況（保存資料）' })).toBeVisible();
  await page.getByRole('button', { name: '保存する', exact: true }).click();
  await page.getByRole('button', { name: '設定を開く' }).click();
  await page.getByLabel('文字を大きく表示する').check();
  await page.reload();
  await expect(page.locator('.portal')).toHaveClass(/large-text/);
  await expect(page.getByRole('button', { name: '保存済み', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
test('successful refresh remains readable after later network failures and restart', async ({ page, context }) => {
  await fixtures(context); await page.goto('/portal/');
  await expect(page.getByRole('heading', { name: 'ローカル試験：事故速報の見出し' })).toBeVisible();
  await page.getByRole('button', { name: '保存する', exact: true }).click();
  await context.route(`${host}/**`, route => route.abort());
  await page.getByRole('button', { name: '更新する', exact: true }).click();
  await expect(page.getByText('更新できませんでした。最後に保存した情報を表示しています。')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'ローカル試験：事故速報の見出し' })).toBeVisible();
  await expect(page.getByRole('button', { name: '保存済み', exact: true })).toBeVisible();
});
test('free revisions search and statistical filters work inside bundled screens', async ({ page, context }) => {
  await fixtures(context); await page.goto('/portal/');
  await expect(page.getByRole('heading', { name: 'ローカル試験：事故速報の見出し' })).toBeVisible();
  await page.getByRole('button', { name: '法改正', exact: true }).click();
  await expect(page.getByRole('heading', { name: '法改正', exact: true })).toBeVisible();
  await page.getByRole('searchbox').fill('存在しない単語の試験');
  await expect(page.getByText('該当する情報はありません。条件を変えてお試しください。')).toBeVisible();
  await page.getByRole('searchbox').fill('');
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(20);
  await page.getByRole('button', { name: '事故統計', exact: true }).click();
  await expect(page.getByText('全国の年間発生数ではありません')).toBeVisible();
  await page.getByLabel('集計対象').selectOption('2021');
  await expect(page.locator('.bar-row')).toHaveCount(1);
  await expect(page.locator('.metric strong')).toContainText(seed.statistics.data.years.find(y => y.year === 2021)!.count.toLocaleString('ja-JP'));
});
test('missing server safety contract blocks execution after consent', async ({ page, context }) => {
  const count = await fixtures(context); await page.goto('/portal/');
  await expect(page.getByRole('heading', { name: 'ローカル試験：事故速報の見出し' })).toBeVisible();
  await page.getByRole('button', { name: 'AI確認', exact: true }).click();
  await page.getByLabel('法令についての質問').fill('確認したい作業条件');
  await page.getByRole('checkbox').check();
  await expect(page.getByRole('button', { name: '確認して送信する' })).toBeDisabled();
  await expect(page.getByText(/サイト側の回数制限・安全装置を確認できない/)).toBeVisible();
  expect(count()).toBe(0);
});
test('server-verified AI exposes original evidence and unavailable RA consumes no result', async ({ page, context }) => {
  const count = await fixtures(context, { ai: true, unavailableRa: true }); await page.goto('/portal/');
  await expect(page.getByRole('heading', { name: 'ローカル試験：事故速報の見出し' })).toBeVisible();
  await page.getByRole('button', { name: 'AI確認', exact: true }).click();
  await page.getByLabel('法令についての質問').fill('局所排気装置の確認条件');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: '確認して送信する' }).click();
  await expect(page.getByText('これはローカル試験用の原文です。')).toBeVisible();
  await expect(page.getByRole('heading', { name: '根拠原文' })).toBeVisible();
  await page.getByRole('button', { name: '化学物質RA', exact: true }).click();
  await page.getByLabel('評価対象と作業条件').fill('エタノール、SDS版と作業条件を確認する試験');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: '確認して送信する' }).click();
  await expect(page.getByText('この評価機能は現在利用できません。回数は消費しません。')).toBeVisible();
  expect(count()).toBe(2);
});
test('stale weather never becomes an all-clear and explicit deletion restores bundled data', async ({ page, context }) => {
  await fixtures(context, { oldWeather: true }); await page.goto('/portal/');
  await expect(page.getByRole('heading', { name: 'ローカル試験：事故速報の見出し' })).toBeVisible();
  await page.getByRole('button', { name: '保存する', exact: true }).click();
  await page.getByRole('button', { name: '気象警報', exact: true }).click();
  await expect(page.getByText('保存データには警報・注意報の掲載がありません。現在の状態は確認できません。')).toBeVisible();
  await expect(page.getByText('取得時点で、この区域の警報・注意報の掲載はありません。')).toHaveCount(0);
  await expect(page.getByLabel('地点').locator('option')).toHaveCount(69);
  await page.getByRole('button', { name: '設定を開く' }).click();
  await page.getByRole('button', { name: '端末内データを削除', exact: true }).click();
  await page.getByRole('button', { name: '削除を実行', exact: true }).click();
  await expect(page.getByText('端末内データを削除しました。')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('anzen.content.saved'))).toBeNull();
});
