import { test,expect } from '@playwright/test';
import product from '../../web/src/lib/mobile/product-policy.json' with {type:'json'};
test.beforeEach(async({context})=>{await context.route('https://**/*',route=>route.abort());});
test('bundles the complete exam catalog, scored practice, and saved progress offline',async({page},info)=>{
  await page.goto('/e-learning/exams/');await expect(page.getByRole('heading',{level:1})).toContainText('公表試験問題');
  await page.goto('/e-learning/exams/lckohyo-LC20260402-1/');
  await expect(page.getByRole('heading',{level:1})).toContainText('ボイラー');
  await page.getByLabel('この端末に保存する',{exact:true}).check();await page.getByText('（3）',{exact:true}).click();await page.getByRole('button',{name:'回答する',exact:true}).click();
  await expect(page.getByRole('heading',{name:'正解',exact:true})).toBeVisible();
  await page.reload();await expect(page.getByRole('heading',{name:'この端末に保存した進捗があります'})).toBeVisible();await expect(page.getByText(/1問回答済み/)).toBeVisible();await page.getByRole('button',{name:'続きから再開'}).click();await expect(page.getByText('保存した進捗を読み込みました。以降の回答もこの端末に保存します。')).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  expect(await page.getByRole('button',{name:'問10（未回答）',exact:true}).evaluate(button=>{const text=Array.from(button.childNodes).find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent?.trim()==='10');if(!text)return false;const range=document.createRange();range.selectNodeContents(text);return range.getClientRects().length===1;})).toBe(true);
  await page.screenshot({path:`test-results/previews/exam-${info.project.name}.png`,fullPage:true});
});
test('uses the same evidence-backed safety quiz and unscored materials',async({page})=>{
  await page.goto('/e-learning/safety/first-class-health-officer/');await expect(page.getByRole('heading',{level:1})).toContainText('第一種衛生管理者');
  await page.getByRole('radio').first().check();await page.getByRole('button',{name:'回答する',exact:true}).click();
  await expect(page.getByText(/公式根拠|一次根拠|根拠/).first()).toBeVisible();
  await page.goto('/e-learning/exams/lckohyo-LC20260401-2/');await expect(page.getByRole('heading',{level:1})).toContainText('特級ボイラー');await expect(page.getByText(/自動採点.*しません|採点なし/).first()).toBeVisible();
});
test('restores article search and foreign-worker industry selection from a shared-page URL',async({page})=>{
  await page.goto('/law-search/?law='+encodeURIComponent('労働安全衛生法')+'&art=12');await expect(page.getByRole('searchbox',{name:'条番号で検索'})).toHaveValue('第12条');
  await page.goto('/foreign-workers/safety-training/?industry=manufacturing');await expect(page.getByRole('button',{name:/製造.*Manufacturing/i})).toHaveAttribute('aria-pressed','true');
});
test('shows existing website Pro rights and prevents double purchase',async({page,context})=>{
  await context.route('https://www.anzen-ai-portal.jp/api/**',async route=>{
    const config={ready:true,publicKey:'mock_public_sdk',productId:'mock_product',offeringId:'mock_offering',policy:product,login:{apple:true,google:true},terms:'https://www.anzen-ai-portal.jp/terms',privacy:'https://www.anzen-ai-portal.jp/privacy',manage:'https://apps.apple.com/account/subscriptions'};
    const rights={plan:'pro',source:'stripe',syncState:'verified',expiresAt:new Date(Date.now()+86400000).toISOString(),appUserId:'88888888-1111-4111-8111-111111111111',verifiedAt:new Date().toISOString(),limits:product.limits.pro};
    await route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'http://127.0.0.1:3213','Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'content-type,authorization'},body:JSON.stringify(route.request().url().includes('/billing/config')?config:rights)});
  });
  await page.goto('/account/');await expect(page.getByText('Pro 購入済み（ウェブ購読）',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'購入済み',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'購入を復元'})).toBeVisible();await expect(page.getByRole('button',{name:'App Storeの購読管理・解約'})).toBeVisible();await expect(page.getByRole('link',{name:'利用規約'})).toBeVisible();
});
