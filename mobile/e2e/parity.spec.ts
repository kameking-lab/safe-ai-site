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

test('preserves all six visual KYT print formats offline',async({page,context})=>{
  await context.route('https://**/*',route=>route.abort());
  await page.goto('/training/visual-ky/scaffold-fall/print/');
  for(const [label,id] of [['問題だけ','problem'],['問題＋記入欄','worksheet'],['解答・解説','answer'],['朝礼用1枚','morning'],['講師進行台本','script'],['参加者配布用','participant']]){
    await page.getByRole('navigation',{name:'印刷形式'}).getByRole('link',{name:label,exact:true}).click();
    await expect(page.getByRole('navigation',{name:'印刷形式'}).getByRole('link',{name:label,exact:true})).toHaveAttribute('aria-current','page');
    await expect(page.locator('article.visual-ky-print-sheet').first()).toContainText(label);
    expect(new URL(page.url()).searchParams.get('format')).toBe(id);
  }
});

test('restores the newcomer guide audience from the same web URL',async({page,context})=>{
  await context.route('https://**/*',route=>route.abort());
  await page.goto('/guides/?audience=new-worker');await expect(page.getByRole('heading',{name:'最初に確認する4項目'})).toBeVisible();
  await page.goto('/guides/');await expect(page.getByRole('heading',{name:'最初に確認する4項目'})).toHaveCount(0);
});

test('prints only the selected accident search and restores it after cold reload',async({page,context})=>{
  await context.route('https://**/*',route=>route.abort());
  await page.goto('/accident-news/print/?q=IOS3B-no-matching-accident&limit=1');
  await expect(page.getByText('該当する事例がありません。',{exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'← 一覧に戻る'})).toHaveAttribute('href',/q=IOS3B-no-matching-accident/);
  await page.reload();await expect(page.getByText('該当する事例がありません。',{exact:true})).toBeVisible();
});

test('loads authenticated fleet rows using the selected organization instead of a build-time empty page',async({page,context})=>{
  let organization='';
  await context.route('https://www.anzen-ai-portal.jp/api/mobile/v1/signage-fleet**',async route=>{
    organization=new URL(route.request().url()).searchParams.get('organization')??'';
    await route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'http://127.0.0.1:3213','Access-Control-Allow-Credentials':'true'},body:JSON.stringify({organizationName:'モック組織',records:[{siteId:'site',siteName:'検証拠点',siteCode:'s1',deviceId:'dev',deviceName:'検証サイネージ',effectiveStatus:'stale',lastSeenAt:'2026-11-03T01:00:00Z',softwareVersion:'1.0',configurationVersion:1,assignedLayout:'map',rolloutStatus:'pending',rolloutStage:'canary',acknowledgedAt:null}],unavailable:null})});
  });
  await page.goto('/signage/manage/?organization=mock-org');await expect(page.getByRole('heading',{name:'モック組織 の実端末'})).toBeVisible();await expect(page.getByRole('cell',{name:'情報期限切れ'})).toBeVisible();expect(organization).toBe('mock-org');
});

test('keeps the complete weather location catalog and stops a live display after a failed refresh',async({page,context})=>{
  let failWeather=false;
  await context.route('https://www.anzen-ai-portal.jp/api/**',async route=>{
    const url=new URL(route.request().url());let body:unknown;
    if(url.pathname==='/api/signage-data'){
      if(failWeather)return route.abort();
      const now=new Date().toISOString();body={fetchedAt:now,degradedSources:[],laborTrend:[],jmaSourceFetchedAt:now,jmaSelectedState:'live',jmaHeadline:null,jmaReportTime:now,selectedWarnings:[],locationLabel:'モック地点'};
    }else if(url.pathname==='/api/me/weather-locations')body={locations:[],limit:10,notifications:true};else return route.abort();
    await route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'http://127.0.0.1:3213','Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'content-type,authorization,x-anzen-native'},body:JSON.stringify(body)});
  });
  await page.goto('/notifications/');const panel=page.locator('section.native-panel');
  await expect(panel.getByText('気象庁のデータを取得済み',{exact:true})).toBeVisible();
  const catalog=panel.getByRole('combobox');expect(await catalog.first().locator('option').count()).toBeGreaterThan(47);expect(await catalog.nth(1).locator('option').count()).toBe(await catalog.first().locator('option').count());
  failWeather=true;await page.evaluate(()=>window.dispatchEvent(new Event('anzen-app-active')));
  await expect(panel.getByText('気象庁のデータを取得済み',{exact:true})).toHaveCount(0);await expect(panel.getByText(/現在の警報状況は未確認です/)).toBeVisible();await expect(panel.getByText(/現在の警報情報を取得できません/)).toBeVisible();
});

test('includes the published fatal accident database, analytics modes and the two newer training courses',async({page,context})=>{
  await context.route('https://**/*',route=>route.abort());
  await page.goto('/fatal-accidents/?year=2024');await expect(page.getByRole('heading',{level:1})).toContainText('死亡事故データベース');await expect(page.locator('select[name="year"]')).toHaveValue('2024');
  await page.goto('/fatal-accidents/print/?q=IOS3B-no-matching-accident');await expect(page.getByText('該当する事例がありません。',{exact:true})).toBeVisible();
  await page.goto('/accidents-analytics/?year=2024');await expect(page.getByRole('heading',{level:1})).toContainText('事故分析');await expect(page.getByText('出典・安全性を再確認中です',{exact:true})).toHaveCount(0);
  await page.goto('/accidents-analytics/?view=flash');await expect(page.getByText(/収録事例の2019〜2024年系列には接続していません/)).toBeVisible();
  for(const path of ['chemicals-sds-risk-assessment','safety-management-basics-osh-law']){await page.goto('/training/safety-seminars/'+path+'/');await expect(page.getByRole('heading',{level:1})).toBeVisible();await expect(page.getByRole('button',{name:/次|スライド/}).first()).toBeVisible();}
});
