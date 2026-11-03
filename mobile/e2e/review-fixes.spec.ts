import type { BrowserContext } from '@playwright/test';
import { test,expect } from './fixtures';
import { capability } from '../tests/fixtures';
import product from '../../web/src/lib/mobile/product-policy.json' with {type:'json'};
const host='https://www.anzen-ai-portal.jp';
const cors={'Access-Control-Allow-Origin':'http://127.0.0.1:3213','Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'content-type,x-anzen-native,x-anzen-csrf,authorization'};
test.beforeEach(async({context})=>{await context.route('https://**/*',route=>route.abort());});
test('emergency contacts and local input guidance work offline without login or consent',async({page,context})=>{
  let sent=0;page.on('request',r=>{if(r.url().startsWith(host+'/api/mobile/v1/ai'))sent++;});
  await context.addInitScript(()=>Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>false}));
  await page.goto('/');await page.getByText('緊急時は作業を止め、安全な場所から119番へ',{exact:true}).click();
  await expect(page.getByRole('link',{name:'119番に電話'})).toHaveAttribute('href','tel:119');
  await page.getByRole('button',{name:'AI確認',exact:true}).click();await page.getByLabel('法令についての質問').fill('作業員が倒れて意識がない');
  await expect(page.getByRole('alert').filter({hasText:'119'})).toBeVisible();await expect(page.getByRole('button',{name:'確認して送信する'})).toBeDisabled();expect(sent).toBe(0);
});
test('server safety guidance is preserved on the home AI response',async({page,context})=>{
  await context.route(host+'/api/mobile/v1/capabilities',r=>r.fulfill({json:capability(),headers:cors}));
  await context.route(host+'/api/mobile/v1/ai',r=>r.fulfill({status:422,json:{error:{code:'SAFETY_BLOCKED',reason:'emergency',message:'安全な場所から119番へ連絡してください。AIの再送を待たないでください。'}},headers:cors}));
  await page.goto('/');await page.getByRole('button',{name:'AI確認',exact:true}).click();await page.getByLabel('法令についての質問').fill('局所排気装置の点検条件');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'確認して送信する'}).click();await expect(page.getByRole('status').filter({hasText:'AIの再送を待たないでください'})).toBeVisible();
});
test('all display preferences survive page changes, cold reload and print media',async({page})=>{
  await page.goto('/law-search/');const settings=page.locator('details[aria-label="全画面の表示設定"]');await settings.locator('summary').click();
  for(const name of ['ふりがな','やさしい日本語','文字大','屋外表示'])await settings.getByRole('button',{name,exact:true}).click();
  await settings.getByRole('button',{name:/テーマ切替/}).click();await settings.getByRole('button',{name:/テーマ切替/}).click();
  await expect(page.locator('html')).toHaveClass(/large-font/);await expect(page.locator('html')).toHaveClass(/high-contrast/);await expect(page.locator('html')).toHaveClass(/dark/);
  await page.goto('/e-learning/safety/');await page.reload();await page.emulateMedia({media:'print'});await page.emulateMedia({media:'screen'});
  await expect(page.locator('html')).toHaveClass(/large-font/);await expect(page.locator('html')).toHaveClass(/high-contrast/);await expect(page.locator('html')).toHaveClass(/dark/);
  expect(await page.evaluate(()=>[localStorage.getItem('furigana-enabled'),localStorage.getItem('easy-japanese-enabled')])).toEqual(['true','true']);
});
test('shared quota meter warns at 20 percent and shows the JST recovery date',async({page,context})=>{
  const cap=capability();cap.plan='pro';cap.session='member';cap.features.law_chat.quota={...cap.features.law_chat.quota,limit:50,used:40,reserved:0,remaining:10};cap.features.chemical_ra.quota={...cap.features.chemical_ra.quota,limit:10,used:8,reserved:0,remaining:2};
  await context.route(host+'/api/mobile/v1/capabilities',r=>r.fulfill({json:cap,headers:cors}));
  await page.goto('/chatbot/');const meter=page.getByLabel('会員の共通利用枠');await expect(meter.locator('[data-quota-low="true"]')).toHaveCount(2);await expect(meter).toContainText('残り10／50');await expect(meter).toContainText('残り2／10');await expect(meter).toContainText(/回復：.+（日本時間）/);
});
async function accountFixtures(context:BrowserContext,reauth=false,deletionResult:'completed'|'pending'='completed',lostConfirmation=false){
  let deleted=false;let confirmations=0;
  await context.route(host+'/api/**',async route=>{
    const path=new URL(route.request().url()).pathname;let status=200;let data:unknown={};
    if(path.endsWith('/billing/config'))data={ready:false,publicKey:null,productId:null,offeringId:null,policy:product,login:{apple:true,google:true},terms:host+'/terms',privacy:host+'/privacy',manage:'https://apps.apple.com/account/subscriptions'};
    else if(path==='/api/me/entitlements'){if(deleted){status=401;data={error:{code:'UNAUTHORIZED'}};}else data={plan:'free',source:null,syncState:'verified',expiresAt:null,appUserId:'88888888-1111-4111-8111-111111111111',verifiedAt:new Date().toISOString(),limits:product.limits.free};}
    else if(path.endsWith('/account/delete')){
      const body=route.request().postDataJSON();
      if(body.action==='prepare'){if(reauth){status=401;data={error:{code:'REAUTH_REQUIRED'}};}else data={id:'88888888-2222-4222-8222-222222222222',confirmation:'c'.repeat(43),receipt:'r'.repeat(43),expiresAt:new Date(Date.now()+600000).toISOString(),subject:'member-a'};}
      else if(body.action==='confirm'){confirmations++;deleted=true;if(lostConfirmation)return route.abort();data={status:deletionResult,completedAt:deletionResult==='completed'?new Date().toISOString():null};}else data={status:deletionResult,completedAt:deletionResult==='completed'?new Date().toISOString():null};
    }else if(path.endsWith('/account'))data={displayName:'試験会員',email:null,sdsHistory:[]};else{status=503;data={error:{code:'UNAVAILABLE'}};}
    await route.fulfill({status,json:data,headers:cors});
  });return ()=>confirmations;
}
test('deletion requires confirmation, completes in-app and clears saved personal data',async({page,context})=>{
  const count=await accountFixtures(context);await page.goto('/account/');await page.evaluate(()=>localStorage.setItem('company-profile','test-profile'));
  await page.getByRole('button',{name:'アカウント削除を開始',exact:true}).click();const confirm=page.getByRole('button',{name:'アカウントを完全に削除する',exact:true});await expect(confirm).toBeDisabled();expect(count()).toBe(0);
  await page.getByLabel('確認のため「削除」と入力').fill('削除');await confirm.click();await expect(page.getByRole('status').filter({hasText:'削除が完了しました'})).toBeVisible();expect(count()).toBe(1);expect(await page.evaluate(()=>localStorage.getItem('company-profile'))).toBeNull();
  await page.reload();await page.getByRole('button',{name:'削除状況を確認',exact:true}).click();await expect(page.getByRole('status').filter({hasText:'削除が完了しました'})).toBeVisible();
});
test('stale authentication offers reauthentication without claiming deletion succeeded',async({page,context})=>{
  const count=await accountFixtures(context,true);await page.goto('/account/');await page.getByRole('button',{name:'アカウント削除を開始',exact:true}).click();await expect(page.getByText(/削除には直近5分以内の本人確認/)).toBeVisible();expect(count()).toBe(0);await expect(page.getByRole('button',{name:'本人確認のため再ログイン'})).toBeVisible();
});
test('deletion waits for hydration and accepts its first click exactly once before showing confirmation',async({page,context},info)=>{
  await accountFixtures(context);
  const events:string[]=[];let prepares=0;
  let releaseScripts!:()=>void;const scripts=new Promise<void>(resolve=>{releaseScripts=resolve;});
  let releasePreparation!:()=>void;const preparation=new Promise<void>(resolve=>{releasePreparation=resolve;});
  let preparationRequested!:()=>void;const requested=new Promise<void>(resolve=>{preparationRequested=resolve;});
  await context.route('http://127.0.0.1:3213/_next/static/**/*.js',async route=>{await scripts;await route.continue();});
  await context.route(host+'/api/mobile/v1/account/delete',async route=>{
    expect(route.request().postDataJSON().action).toBe('prepare');prepares++;events.push('prepare-request');preparationRequested();
    await preparation;
    await route.fulfill({headers:cors,json:{id:'88888888-2222-4222-8222-222222222222',confirmation:'c'.repeat(43),receipt:'r'.repeat(43),expiresAt:new Date(Date.now()+600000).toISOString(),subject:'member-a'}});
  });
  try{
    await page.goto('/account/',{waitUntil:'commit'});
    const panel=page.getByRole('region',{name:'アカウントの削除',exact:true});
    const start=panel.getByRole('button',{name:'アカウント削除を開始',exact:true});
    await expect(start).toBeVisible();
    // Static HTML must advertise unavailability, even with no JS loaded.
    for(const button of await panel.getByRole('button').all())await expect(button).toBeDisabled();
    await expect(panel).toHaveAttribute('aria-busy','true');await expect(panel.getByRole('status')).toHaveText('削除操作を準備しています。');
    expect(prepares).toBe(0);events.push('prerender-disabled');
    // Ordinary first click: no sleep, readiness selector, force click or retry.
    const firstClick=start.click();releaseScripts();events.push('scripts-released');
    await firstClick;await test.step('wait for the first deletion prepare request',()=>requested);
    await expect(start).toBeDisabled();await expect(panel).toHaveAttribute('aria-busy','true');
    await expect(panel.getByLabel('確認のため「削除」と入力')).toHaveCount(0);expect(prepares).toBe(1);events.push('pending-prepare-disabled');
    releasePreparation();
    const input=panel.getByLabel('確認のため「削除」と入力');await expect(input).toBeVisible();
    await expect(panel).toHaveAttribute('aria-busy','false');await expect(panel.getByRole('button',{name:'アカウントを完全に削除する',exact:true})).toBeDisabled();
    await input.fill('削除');await expect(panel.getByRole('button',{name:'アカウントを完全に削除する',exact:true})).toBeEnabled();
    await panel.getByRole('button',{name:'戻る',exact:true}).click();await expect(input).toHaveCount(0);await expect(start).toBeEnabled();
    expect(prepares).toBe(1);events.push('confirmation-and-cancel-complete');
  }finally{
    releaseScripts();releasePreparation();
    await info.attach('deletion-readiness-transitions',{body:JSON.stringify({prepares,events}),contentType:'application/json'});
  }
});

for(const pending of [false,true])test(`old deletion receipt preserves member B across navigation, restart and manual checks (${pending?'pending with lost response':'completed'})`,async({page,context})=>{
  await accountFixtures(context,false,pending?'pending':'completed',pending);await page.goto('/account/');
  await page.getByRole('button',{name:'アカウント削除を開始',exact:true}).click();await page.getByLabel('確認のため「削除」と入力').fill('削除');await page.getByRole('button',{name:'アカウントを完全に削除する',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:pending?'処理結果を確認できません':'削除が完了しました'})).toBeVisible();
  // Browser harness models the persisted incarnation written by native setSessionToken(B).
  // Unit coverage uses the real session mutation API and verifies Keychain-token preservation.
  await page.evaluate(()=>{localStorage.setItem('CapacitorStorage.anzen.session-incarnation','member-b-session');localStorage.setItem('company-profile','member-b-profile');localStorage.setItem('anzen.content.saved','member-b-saved');});
  await context.route(host+'/api/me/entitlements',route=>route.fulfill({headers:cors,json:{plan:'free',source:null,syncState:'verified',expiresAt:null,appUserId:'99999999-1111-4111-8111-111111111111',verifiedAt:new Date().toISOString(),limits:product.limits.free}}));
  await page.goto('/law-search/');await page.goto('/account/');await page.reload();
  await expect(page.getByText('無料会員',{exact:true})).toBeVisible();
  for(let i=0;i<2;i++)await page.getByRole('button',{name:'削除状況を確認',exact:true}).click();
  expect(await page.evaluate(()=>[localStorage.getItem('company-profile'),localStorage.getItem('anzen.content.saved')])).toEqual(['member-b-profile','member-b-saved']);
});
test('purchase screen states RA is unavailable before purchase and exposes deletion',async({page,context})=>{
  await accountFixtures(context);await page.goto('/account/');await expect(page.getByText(/Proでも生成できません/)).toBeVisible();await expect(page.getByRole('button',{name:'App StoreでProを購入',exact:true})).toBeDisabled();await expect(page.getByRole('heading',{name:'アカウントの削除',exact:true})).toBeVisible();
});
