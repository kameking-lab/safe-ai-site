import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { installNativeTestBridge } from './native-test-bridge';
import { capability } from '../tests/fixtures';
import product from '../../web/src/lib/mobile/product-policy.json' with { type: 'json' };

const host='https://www.anzen-ai-portal.jp';
const captureDir=fileURLToPath(new URL('../../research/anz-tf3/',import.meta.url));
const cors={'Access-Control-Allow-Origin':'http://127.0.0.1:3213','Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'content-type,x-anzen-native,authorization,origin,accept'};
declare global { interface Window {setTestKeyboard:(height:number,offsetTop:number)=>void} }
async function keyboard(page:Page,height=500,offsetTop=0){
  await page.evaluate(({height,offsetTop})=>window.setTestKeyboard(height,offsetTop),{height,offsetTop});
}
async function position(page:Page,minHistory=100,safeTop=59){
  await expect(page.locator('[data-chatbot-viewport-section]')).toHaveAttribute('data-keyboard-open','');
  await expect.poll(async()=>page.locator('[data-chatbot-composer]').evaluate(el=>{
    const rect=el.getBoundingClientRect();const vv=visualViewport!;
    return Math.abs(rect.bottom-(vv.height+vv.offsetTop));
  })).toBeLessThan(2);
  const metrics=await page.evaluate(()=>{
    const rect=(selector:string)=>{const r=document.querySelector(selector)!.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height};};
    return {viewport:{height:visualViewport!.height,offsetTop:visualViewport!.offsetTop},input:rect('[data-primary-focus]'),composer:rect('[data-chatbot-composer]'),history:rect('[data-chatbot-history]'),scrollY};
  });
  expect(metrics.input.top).toBeGreaterThanOrEqual(metrics.viewport.offsetTop+safeTop);
  expect(metrics.history.height).toBeGreaterThan(minHistory);
  expect(metrics.history.bottom).toBeLessThanOrEqual(metrics.composer.top+1);
  return metrics;
}

for(const plan of ['free','pro'] as const)test(`${plan}: first question, follow-up, viewport pan and quota card keep composer above keyboard`,async({page,context},info)=>{
  await page.setViewportSize({width:390,height:844});
  await context.route('https://**/*',route=>route.abort());
  let answers=0;let limited=false;let failed=false;let rightsReads=0;let purchasePosts=0;
  await context.route(host+'/api/**',async route=>{
    const request=route.request();const url=new URL(request.url());
    if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
    if(url.pathname.endsWith('/billing/config'))return route.fulfill({headers:cors,json:{ready:true,publicKey:'fixture_public',productId:'fixture.monthly',offeringId:null,policy:product,login:{apple:true,google:true},terms:host+'/terms',privacy:host+'/privacy',manage:'https://apps.apple.com/account/subscriptions'}});
    if(url.pathname==='/api/me/entitlements'){
      rightsReads++;
      return route.fulfill({headers:cors,json:{plan,source:plan==='pro'?'app_store':null,syncState:plan==='pro'?'verified':'pending',expiresAt:plan==='pro'?new Date(Date.now()+86400000).toISOString():null,appUserId:'88888888-1111-4111-8111-111111111111',verifiedAt:new Date().toISOString(),limits:product.limits[plan]}});
    }
    if(url.pathname.startsWith('/api/billing/'))purchasePosts++;
    if(url.pathname.endsWith('/capabilities')){
      const cap=capability();cap.plan=plan;cap.session='member';cap.upgrade=plan==='free';
      cap.features.law_chat.quota={...cap.features.law_chat.quota,limit:product.limits[plan].law_chat,used:limited?3:answers,remaining:limited?0:product.limits[plan].law_chat-answers};
      return route.fulfill({headers:cors,json:cap});
    }
    if(url.pathname==='/api/chatbot/stream'){
      if(failed)return route.fulfill({status:503,headers:cors,json:{error:{code:'UNAVAILABLE',message:'通信環境を確認して、もう一度お試しください。'}}});
      if(limited)return route.fulfill({status:429,headers:cors,json:{error:{code:'DAILY_LIMIT_REACHED',plan,upgrade:plan==='free',message:'今日の無料3回はここまでです。日本時間の0時にまた使えます。'}}});
      answers++;
      const answer='現場の条件を整理します。作業の種類と設備を確認してください。';
      return route.fulfill({headers:{...cors,'Content-Type':'text/event-stream'},body:`event: text\ndata: ${JSON.stringify({chunk:answer})}\n\nevent: meta\ndata: ${JSON.stringify({answer,sources:[],source_type:'safety',confidence:'low',requiresHumanReview:true})}\n\n`});
    }
    return route.fulfill({status:503,headers:cors,json:{error:{code:'UNAVAILABLE'}}});
  });
  await installNativeTestBridge(context,true);
  await context.addInitScript(()=>{
    const viewport=Object.assign(new EventTarget(),{height:844,width:390,offsetTop:0,offsetLeft:0,scale:1});
    Object.defineProperty(window,'visualViewport',{configurable:true,value:viewport});
    window.setTestKeyboard=(height,offsetTop)=>{
      viewport.height=height;viewport.offsetTop=offsetTop;
      const mock=document.getElementById('test-keyboard')??document.body.appendChild(Object.assign(document.createElement('div'),{id:'test-keyboard',textContent:'キーボード（表示領域を模擬）'}));
      mock.style.cssText=`position:fixed;top:${height+offsetTop}px;bottom:0;left:0;right:0;z-index:100;background:#d8dbe1;color:#334155;padding:24px;text-align:center;border-top:1px solid #aaa`;
      viewport.dispatchEvent(new Event('resize'));viewport.dispatchEvent(new Event('scroll'));
    };
  });
  await page.goto('/chatbot/');
  await page.addStyleTag({content:'body{padding-top:59px!important}body::before{height:59px!important}header.sticky{top:59px!important}[data-chatbot-page] [data-chatbot-viewport-section][data-keyboard-open]{top:calc(var(--chatbot-viewport-offset) + 59px)!important;height:calc(var(--chatbot-viewport-height) - 59px)!important}'});
  await expect(page.getByLabel('AIの利用枠')).toContainText(plan==='pro'?'Pro':'無料');
  const input=page.getByRole('textbox',{name:'質問入力'});
  await input.fill('作業前に確認する条件は？');await keyboard(page);
  const metrics:Record<string,unknown>={first:await position(page)};
  await page.getByRole('button',{name:'送信',exact:true}).click();
  await expect.poll(()=>answers).toBe(1);await expect(input).toBeEnabled();
  metrics.firstAnswer=await position(page);
  // Model WebKit's document scroll independently from visualViewport panning.
  await page.evaluate(()=>{document.body.style.minHeight='1400px';window.scrollTo(0,100);});
  await input.fill('なんで？');await keyboard(page,400,120);
  metrics.followup=await position(page);
  await mkdir(captureDir,{recursive:true});
  await page.screenshot({path:captureDir+`${plan}-followup-keyboard.png`,scale:'css',animations:'disabled'});
  await input.press('Enter');await expect.poll(()=>answers).toBe(2);await expect(input).toBeEnabled();
  metrics.followupAnswer=await position(page);
  await expect(page.locator('[data-chatbot-answer]')).toHaveCount(2);
  await expect(page.getByLabel('AIの利用枠')).toContainText(`残り${product.limits[plan].law_chat-2}／${product.limits[plan].law_chat}回`);
  if(plan==='free'){
    limited=true;await input.fill('追加で確認したい');await input.press('Enter');
    const offer=page.locator('[data-pro-upsell]');await expect(offer).toHaveCount(1);
    await expect(page.getByLabel('AIの利用枠')).toContainText('残り0／3回');
    await expect(offer.locator('[data-pro-start]')).toHaveCount(1);
    metrics.limit=await position(page);
    expect(await offer.evaluate(el=>!!el.closest('[data-chatbot-history]'))).toBe(true);
    await expect(page.getByText(/二重購入|権利を確認できません|購入画面を開いています/)).toHaveCount(0);
    await offer.locator('[data-pro-start]').click();
    await expect(offer.getByRole('status')).toHaveText('少し待ってからもう一度お試しください。');
    await expect(page.locator('header + [role="alert"]')).toHaveCount(0);
    expect(purchasePosts).toBe(0);expect(rightsReads).toBeGreaterThanOrEqual(3);
    metrics.purchaseBlocked=await position(page);
    await page.screenshot({path:captureDir+'free-limit-keyboard.png',scale:'css',animations:'disabled'});
  }else await expect(page.locator('[data-pro-upsell]')).toHaveCount(0);
  await keyboard(page,844,0);await expect(page.locator('[data-keyboard-open]')).toHaveCount(0);
  await page.evaluate(()=>{document.body.style.minHeight='';window.scrollTo(0,0);});
  await input.blur();await expect(page.getByRole('navigation',{name:'モバイル ボトムナビゲーション'})).toBeVisible();
  await page.screenshot({path:captureDir+`${plan}-keyboard-closed.png`,scale:'css',animations:'disabled'});
  await page.setViewportSize({width:844,height:390});await keyboard(page,390,0);
  await page.addStyleTag({content:'@media(min-width:768px){body{padding-top:0!important}body::before{height:0!important}header.sticky{top:0!important}[data-chatbot-page] [data-chatbot-viewport-section][data-keyboard-open]{top:var(--chatbot-viewport-offset)!important;height:var(--chatbot-viewport-height)!important}}'});
  await input.fill('横向きでも続けたい');await keyboard(page,210,0);
  metrics.landscape=await position(page,20,0);
  await page.screenshot({path:captureDir+`${plan}-landscape-keyboard.png`,scale:'css',animations:'disabled'});
  await keyboard(page,390,0);await page.setViewportSize({width:390,height:844});await keyboard(page,844,0);
  // Additional follow-up paths must leave room for the conversation too.
  limited=false;
  await input.fill('会社名: 株式会社安全工業');await keyboard(page,320,120);await input.press('Enter');
  await page.evaluate(()=>{Object.defineProperty(window,'innerHeight',{configurable:true,value:320});window.dispatchEvent(new Event('resize'));});
  await expect(page.locator('[data-safety-kind="privacy"]')).toBeVisible();
  metrics.privacy=await position(page,50);
  await page.screenshot({path:captureDir+`${plan}-privacy-keyboard.png`,scale:'css',animations:'disabled'});
  failed=true;await input.fill('作業前の確認事項は？');await input.press('Enter');
  await expect(page.getByRole('button',{name:'再試行',exact:true})).toBeVisible();
  metrics.error=await position(page,50);
  await page.screenshot({path:captureDir+`${plan}-error-keyboard.png`,scale:'css',animations:'disabled'});
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await page.evaluate(()=>{Reflect.deleteProperty(window,'innerHeight');window.dispatchEvent(new Event('resize'));});
  await keyboard(page,844,0);await input.blur();
  await expect(page.locator('[data-keyboard-open]')).toHaveCount(0);
  await writeFile(captureDir+`${plan}-geometry.json`,JSON.stringify(metrics,null,2)+'\n');
  await info.attach('geometry',{body:JSON.stringify(metrics),contentType:'application/json'});
});
