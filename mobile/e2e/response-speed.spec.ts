import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {test,expect} from './fixtures';
import type {BrowserContext} from '@playwright/test';
import {capability} from '../tests/fixtures';
import product from '../../web/src/lib/mobile/product-policy.json' with {type:'json'};
const host='https://www.anzen-ai-portal.jp';
const flow='88888888-1111-4111-8111-111111111111';
const appUserId='88888888-2222-4222-8222-222222222222';
const cors={'Access-Control-Allow-Origin':'http://127.0.0.1:3213','Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'content-type,x-anzen-native,x-operation-id,origin,accept,authorization,x-anzen-csrf'};
const delay=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

// Only iOS plugin and HTTP boundaries are fixtures. Actual PKCE/session, billing,
// account UI, quota validation, and canonical chat components run in the export.
async function nativeBridge(context:BrowserContext){
  await context.addInitScript(()=>{
    const prefs=new Map<string,string>();const vault=new Map<string,string>();const listeners=new Map<string,(value:unknown)=>void>();const send=window.fetch.bind(window);
    const plugins:Record<string,string[]>={NativeVault:['get','set','clear'],Preferences:['get','set','remove'],Browser:['open','close','addListener','removeListener'],App:['getLaunchUrl','addListener','removeListener'],PushNotifications:['addListener','removeListener'],NativeChatStream:['start','cancel','addListener','removeListener'],CapacitorHttp:['request'],NativeDocuments:['printPage'],NativeSpeech:['start','stop','addListener','removeListener'],Purchases:['configure','logIn','logOut','getOfferings','purchasePackage','restorePurchases']};
    Object.assign(window,{__speed:{},__returnSpeedLogin:()=>listeners.get('App:appUrlOpen')?.({url:'anzenai://auth/callback?flow=88888888-1111-4111-8111-111111111111&code='+ 'a'.repeat(43)}),webkit:{messageHandlers:{bridge:{}}},Capacitor:{
      PluginHeaders:Object.entries(plugins).map(([name,methods])=>({name,methods:methods.map(name=>({name,rtype:name==='addListener'?'callback':'promise'}))})),
      nativeCallback:(plugin:string,_method:string,options:{eventName:string},callback:(value:unknown)=>void)=>{listeners.set(plugin+':'+options.eventName,callback);return Promise.resolve('speed-listener');},
      nativePromise:async(plugin:string,method:string,options:Record<string,string>)=>{
        if(plugin==='Browser'&&method==='open'){Object.assign(window,{__speedBrowserOpened:true});return {};}
        if(plugin==='Preferences'||plugin==='NativeVault'){
          const store=plugin==='Preferences'?prefs:vault;const key=options?.key??options?.purpose??'session';
          if(method==='get')return {value:store.get(key)??null};
          if(method==='set')store.set(key,options.value);else store.delete(key);return {};
        }
        if(plugin==='CapacitorHttp'){
          const request=options as unknown as {url:string;method:string;headers:Record<string,string>;data?:unknown};
          const response=await send(request.url,{method:request.method,headers:request.headers,...(request.data?{body:typeof request.data==='string'?request.data:JSON.stringify(request.data)}:{})});
          return {url:response.url,status:response.status,headers:Object.fromEntries(response.headers),data:await response.json()};
        }
        if(plugin==='NativeChatStream'&&method==='start'){
          const request=options as unknown as {id:string;body:string;headers:Record<string,string>};
          const response=await send('https://www.anzen-ai-portal.jp/api/chatbot/stream',{method:'POST',headers:request.headers,body:request.body});const emit=listeners.get('NativeChatStream:response')!;
          emit({id:request.id,kind:'headers',status:response.status,headers:Object.fromEntries(response.headers)});
          const reader=response.body!.getReader();while(true){const item=await reader.read();if(item.done)break;emit({id:request.id,kind:'chunk',data:btoa(String.fromCharCode(...item.value))});}emit({id:request.id,kind:'end'});
        }
        if(plugin==='Purchases'&&method==='getOfferings')return {all:{speed:{availablePackages:[{identifier:'speed-package',packageType:'MONTHLY',product:{identifier:'jp.anzenaiportal.pro.monthly',price:980,priceString:'¥980',currencyCode:'JPY',subscriptionPeriod:'P1M'}}]}}};
        return {};
      },
    }});
  });
}
async function save(name:string,value:unknown){if(process.env.ANZ_SPEED_CAPTURE_DIR){await mkdir(process.env.ANZ_SPEED_CAPTURE_DIR,{recursive:true});await writeFile(path.join(process.env.ANZ_SPEED_CAPTURE_DIR,name),JSON.stringify(value,null,2));}}

test('login, confirmed purchase, manual refresh and logout avoid redundant waits',async({page,context})=>{
  await nativeBridge(context);await context.route('https://**/*',route=>route.abort());
  let paid=false;let signedOut=false;let entitlementReads=0;let forcedReads=0;let readsAtSync=0;let reconciledAt=0;
  let releaseLogout!:()=>void;const logout=new Promise<void>(resolve=>{releaseLogout=resolve;});
  const rights=()=>({plan:paid?'pro':'free',source:paid?'app_store':null,syncState:'verified',expiresAt:paid?new Date(Date.now()+86400000).toISOString():null,appUserId,verifiedAt:new Date().toISOString(),limits:paid?product.limits.pro:product.limits.free});
  await context.route(host+'/api/**',async route=>{
    const request=route.request();const url=new URL(request.url());if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
    if(url.pathname.endsWith('/billing/config'))return route.fulfill({headers:cors,json:{ready:true,publicKey:'synthetic-public-key',productId:'jp.anzenaiportal.pro.monthly',offeringId:'speed',policy:product,login:{apple:true,google:true},terms:host+'/terms',privacy:host+'/privacy',manage:'https://apps.apple.com/account/subscriptions'}});
    if(url.pathname.endsWith('/auth/start'))return route.fulfill({headers:cors,json:{flow,authorizeUrl:host+'/api/mobile/v1/auth/authorize?flow='+flow}});
    if(url.pathname.endsWith('/auth/exchange')){await delay(180);return route.fulfill({headers:cors,json:{token:'b'.repeat(43)}});}
    if(url.pathname==='/api/me/entitlements'){
      entitlementReads++;if(url.searchParams.get('refresh')==='1')forcedReads++;
      if(signedOut||!request.headers()['authorization'])return route.fulfill({status:401,headers:cors,json:{error:{code:'UNAUTHORIZED'}}});
      await delay(180);return route.fulfill({headers:cors,json:rights()});
    }
    if(url.pathname.endsWith('/purchase-intents'))return route.fulfill({headers:cors,json:{id:flow,appUserId,attemptId:request.postDataJSON().attemptId}});
    if(url.pathname.endsWith('/reconcile')){await delay(180);paid=true;readsAtSync=entitlementReads;reconciledAt=Date.now();return route.fulfill({headers:cors,json:rights()});}
    if(url.pathname.endsWith('/auth/logout')){await logout;signedOut=true;return route.fulfill({headers:cors,json:{ok:true}});}
    if(url.pathname.endsWith('/account'))return route.fulfill({headers:cors,json:{displayName:'速度確認',email:null,sdsHistory:[]}});
    return route.fulfill({status:401,headers:cors,json:{error:{code:'UNAUTHORIZED'}}});
  });
  await page.goto('/account/');await expect(page.getByText('ログインしていません',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Apple / Googleでログイン'}).click();
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {__speedBrowserOpened?:boolean}).__speedBrowserOpened)).toBe(true);
  const loginStart=Date.now();await page.evaluate(()=>{(window as unknown as {__returnSpeedLogin:()=>void}).__returnSpeedLogin();});
  await expect(page.getByText('無料会員',{exact:true})).toBeVisible();const loginMs=Date.now()-loginStart;
  await page.getByRole('button',{name:/月額¥980で続ける/}).click();
  await expect(page.getByText('Pro 購入済み（App Store購読）',{exact:true})).toBeVisible();
  const purchaseReflectedMs=Date.now()-reconciledAt;
  // A successful server reconciliation is final: no second entitlement GET or loading reset.
  expect(entitlementReads).toBe(readsAtSync);
  const manualStart=Date.now();await page.getByRole('button',{name:'会員情報を再読み込み',exact:true}).click();
  await expect.poll(()=>forcedReads).toBe(1);await expect(page.getByText('最新の状態です。',{exact:true})).toBeVisible();
  const manualRefreshMs=Date.now()-manualStart;
  const beforeLogout=entitlementReads;const logoutStart=Date.now();await page.getByRole('button',{name:'ログアウト',exact:true}).click();
  await expect(page.getByText('ログインしていません',{exact:true})).toBeVisible();const logoutFeedbackMs=Date.now()-logoutStart;
  expect(logoutFeedbackMs).toBeLessThan(300);releaseLogout();await expect(page.getByRole('button',{name:'Apple / Googleでログイン'})).toBeEnabled();
  expect(entitlementReads).toBe(beforeLogout);expect(loginMs).toBeLessThan(1000);
  await save('mobile-account-timings.json',{source:'native plugins + API fixtures, 180ms delayed exchange/rights; no real purchase',loginMs,purchaseReflectedMs,manualRefreshMs,logoutFeedbackMs,entitlementReads,forcedReads});
});

test('late membership reads cannot replace a purchase or restore Pro during logout',async({page,context})=>{
  await nativeBridge(context);await context.route('https://**/*',route=>route.abort());
  let paid=false;let holdNext=false;let releaseRead:(()=>void)|undefined;let readFinished=false;
  let releaseLogout!:()=>void;const logout=new Promise<void>(resolve=>{releaseLogout=resolve;});
  const rights=()=>({plan:paid?'pro':'free',source:paid?'app_store':null,syncState:'verified',expiresAt:paid?new Date(Date.now()+86400000).toISOString():null,appUserId,verifiedAt:new Date().toISOString(),limits:paid?product.limits.pro:product.limits.free});
  await context.route(host+'/api/**',async route=>{
    const request=route.request();const url=new URL(request.url());if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
    if(url.pathname.endsWith('/billing/config'))return route.fulfill({headers:cors,json:{ready:true,publicKey:'synthetic-public-key',productId:'jp.anzenaiportal.pro.monthly',offeringId:'speed',policy:product,login:{apple:true,google:true},terms:host+'/terms',privacy:host+'/privacy',manage:'https://apps.apple.com/account/subscriptions'}});
    if(url.pathname.endsWith('/auth/start'))return route.fulfill({headers:cors,json:{flow,authorizeUrl:host+'/api/mobile/v1/auth/authorize?flow='+flow}});
    if(url.pathname.endsWith('/auth/exchange'))return route.fulfill({headers:cors,json:{token:'b'.repeat(43)}});
    if(url.pathname==='/api/me/entitlements'){
      if(!request.headers()['authorization'])return route.fulfill({status:401,headers:cors,json:{error:{code:'UNAUTHORIZED'}}});
      const snapshot=rights();const held=holdNext;
      if(held){holdNext=false;await new Promise<void>(resolve=>{releaseRead=resolve;});}
      await route.fulfill({headers:cors,json:snapshot});if(held)readFinished=true;return;
    }
    if(url.pathname.endsWith('/purchase-intents'))return route.fulfill({headers:cors,json:{id:flow,appUserId,attemptId:request.postDataJSON().attemptId}});
    if(url.pathname.endsWith('/reconcile')){paid=true;return route.fulfill({headers:cors,json:rights()});}
    if(url.pathname.endsWith('/auth/logout')){await logout;return route.fulfill({headers:cors,json:{ok:true}});}
    if(url.pathname.endsWith('/account'))return route.fulfill({headers:cors,json:{displayName:'応答順確認',email:null,sdsHistory:[]}});
    return route.fulfill({status:401,headers:cors,json:{error:{code:'UNAUTHORIZED'}}});
  });
  await page.goto('/account/');await expect(page.getByText('ログインしていません',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Apple / Googleでログイン'}).click();
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {__speedBrowserOpened?:boolean}).__speedBrowserOpened)).toBe(true);
  await page.evaluate(()=>{(window as unknown as {__returnSpeedLogin:()=>void}).__returnSpeedLogin();});
  await expect(page.getByText('無料会員',{exact:true})).toBeVisible();
  await page.evaluate(()=>{
    Object.assign(window,{__plans:[] as string[]});
    window.addEventListener('anzen-entitlement-changed',event=>(window as unknown as {__plans:string[]}).__plans.push((event as CustomEvent<{plan:string}>).detail.plan));
  });
  holdNext=true;await page.evaluate(()=>window.dispatchEvent(new Event('anzen-app-active')));
  await expect.poll(()=>!!releaseRead).toBe(true);
  await page.getByRole('button',{name:/月額¥980で続ける/}).click();
  await expect(page.getByText('Pro 購入済み（App Store購読）',{exact:true})).toBeVisible();
  releaseRead!();await expect.poll(()=>readFinished).toBe(true);
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {__plans:string[]}).__plans.at(-1))).toBe('pro');
  await expect(page.getByText('Pro 購入済み（App Store購読）',{exact:true})).toBeVisible();
  readFinished=false;releaseRead=undefined;holdNext=true;
  await page.evaluate(()=>window.dispatchEvent(new Event('anzen-app-active')));await expect.poll(()=>!!releaseRead).toBe(true);
  await page.getByRole('button',{name:'ログアウト',exact:true}).click();
  await expect(page.getByText('ログインしていません',{exact:true})).toBeVisible();
  const before=await page.evaluate(()=>(window as unknown as {__plans:string[]}).__plans.length);
  releaseRead!();await expect.poll(()=>readFinished).toBe(true);releaseLogout();
  await expect(page.getByRole('button',{name:'Apple / Googleでログイン'})).toBeEnabled();
  expect(await page.evaluate(()=>(window as unknown as {__plans:string[]}).__plans.length)).toBe(before);
  await expect(page.getByText('ログインしていません',{exact:true})).toBeVisible();
});

for(const reduced of [false,true])test(`Chihuahua is visible before the first native text, reduced=${reduced}`,async({page,context})=>{
  await nativeBridge(context);await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:reduced?'reduce':'no-preference'});
  await context.route('https://**/*',route=>route.abort());let release!:()=>void;const response=new Promise<void>(resolve=>{release=resolve;});
  await context.route(host+'/api/**',async route=>{
    if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
    const url=new URL(route.request().url());
    if(url.pathname.endsWith('/capabilities'))return route.fulfill({headers:cors,json:capability()});
    if(url.pathname==='/api/chatbot/stream'){
      await response;const answer='確認する条件を整理します。';
      return route.fulfill({headers:{...cors,'Content-Type':'text/event-stream'},body:`event: text\ndata: ${JSON.stringify({chunk:answer})}\n\nevent: meta\ndata: ${JSON.stringify({answer,sources:[],source_type:'safety',confidence:'low',requiresHumanReview:true})}\n\n`});
    }
    return route.fulfill({status:401,headers:cors,json:{error:{code:'UNAUTHORIZED'}}});
  });
  const quotaStart=Date.now();await page.goto('/chatbot/');await page.addStyleTag({content:'body{padding-top:59px!important}body::before{height:59px!important}header.sticky{top:59px!important}.fixed.inset-0{padding-top:59px!important}'});
  await expect(page.getByLabel('AIの利用枠')).toContainText('残り3／3');
  const quotaDisplayedMs=Date.now()-quotaStart;
  expect(quotaDisplayedMs).toBeLessThan(1000);
  await page.getByRole('textbox').fill('作業前に確認する条件を整理したい');
  await page.getByRole('button',{name:'送信',exact:true}).evaluate(button=>{
    const timing:{start?:number;paintMs?:number}={};Object.assign(window,{__chatFeedback:timing});let measuring=false;
    button.addEventListener('click',()=>{timing.start=performance.now();},{once:true,capture:true});
    const observer=new MutationObserver(()=>{
      const image=document.querySelector<HTMLImageElement>('[data-chat-thinking] img');
      if(timing.start===undefined||!image||measuring)return;measuring=true;observer.disconnect();
      // Decode the selected GIF/still and allow a full painted frame. The clock
      // starts at the input event, excluding Playwright's actionability wait.
      void image.decode().then(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{timing.paintMs=performance.now()-timing.start!;})));
    });observer.observe(document.body,{childList:true,subtree:true});
  });
  await page.getByRole('button',{name:'送信',exact:true}).click();
  const thinking=page.locator('[data-chat-thinking]');await expect(thinking).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {__chatFeedback:{paintMs?:number}}).__chatFeedback.paintMs)).toBeGreaterThanOrEqual(0);
  const thinkingMs=await page.evaluate(()=>(window as unknown as {__chatFeedback:{paintMs:number}}).__chatFeedback.paintMs);
  await expect.poll(()=>thinking.locator('img').evaluate(img=>(img as HTMLImageElement).complete&&(img as HTMLImageElement).naturalWidth>0)).toBe(true);
  const image=thinking.locator('img');expect(await image.evaluate(img=>(img as HTMLImageElement).currentSrc)).toContain(reduced?'chat-thinking-still.webp':'chat-thinking.webp');
  const rect=await image.boundingBox();expect(rect!.y).toBeGreaterThanOrEqual(59);expect(rect!.y+rect!.height).toBeLessThan(844);
  expect(thinkingMs).toBeLessThan(300);
  if(process.env.ANZ_SPEED_CAPTURE_DIR)await page.screenshot({path:path.join(process.env.ANZ_SPEED_CAPTURE_DIR,reduced?'mobile-reduced-motion.png':'mobile-thinking.png'),scale:'css'});
  const captureDir=process.env.ANZ_MASCOT_CAPTURE_DIR;
  const composer=page.locator('[data-chatbot-composer]');const composerBefore=await composer.boundingBox();
  if(captureDir){await mkdir(captureDir,{recursive:true});await page.screenshot({path:path.join(captureDir,`mobile-${reduced?'still':'motion'}-thinking.png`),scale:'css'});}
  await expect(page.locator('[data-chat-mascot="researching"]')).toBeVisible();
  await expect.poll(()=>image.evaluate(img=>(img as HTMLImageElement).currentSrc)).toContain(reduced?'chat-researching-still.webp':'chat-researching.webp');
  if(captureDir)await page.screenshot({path:path.join(captureDir,`mobile-${reduced?'still':'motion'}-researching.png`),scale:'css'});
  const releaseAt=Date.now();release();await expect(page.getByText('確認する条件を整理します。',{exact:true})).toBeVisible();const firstTextAfterReleaseMs=Date.now()-releaseAt;
  await expect(page.locator('[data-chat-mascot="idea"]')).toBeVisible();
  await expect.poll(()=>image.evaluate(img=>(img as HTMLImageElement).currentSrc)).toContain(reduced?'chat-idea-still.webp':'chat-idea.webp');
  expect((await composer.boundingBox())!.y).toBe(composerBefore!.y);
  if(captureDir)await page.screenshot({path:path.join(captureDir,`mobile-${reduced?'still':'motion'}-idea.png`),scale:'css'});
  await expect(thinking).toHaveCount(0);
  await save(reduced?'mobile-reduced-timing.json':'mobile-chat-timing.json',{source:'export + native stream adapter; response held until screenshot',quotaDisplayedMs,thinkingMs,firstTextAfterReleaseMs,rect,reduced});
});
