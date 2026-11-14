import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {test,expect} from './fixtures';
import type {BrowserContext} from '@playwright/test';
import {capability} from '../tests/fixtures';
import product from '../../web/src/lib/mobile/product-policy.json' with {type:'json'};
import substances from '../../web/src/data/create-simple/substances.json' with {type:'json'};

const host='https://www.anzen-ai-portal.jp';
const flow='88888888-1111-4111-8111-111111111111';
const owners={a:'88888888-2222-4222-8222-222222222222',b:'88888888-3333-4333-8333-333333333333'};
const cors={'Access-Control-Allow-Origin':'http://127.0.0.1:3213','Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'content-type,x-anzen-native,x-operation-id,origin,accept,authorization,x-anzen-csrf'};
type TraceEntry={event:string;owner?:string;at:number};
type Bridge={__loginReturn:()=>void;__billingTrace:TraceEntry[];__loginOpenCount:number};
async function bridge(context:BrowserContext){
  await context.addInitScript(()=>{
    const prefs=new Map<string,string>();const vault=new Map<string,string>();
    const listeners=new Map<string,(value:unknown)=>void>();const send=window.fetch.bind(window);
    const trace:TraceEntry[]=[];let owner:string|undefined;
    const plugins:Record<string,string[]>={NativeVault:['get','set','clear'],Preferences:['get','set','remove'],Browser:['open','close','addListener','removeListener'],App:['getLaunchUrl','addListener','removeListener'],PushNotifications:['addListener','removeListener'],CapacitorHttp:['request'],NativeDocuments:['printPage'],NativeSpeech:['start','stop','addListener','removeListener'],Purchases:['configure','logIn','logOut','invalidateCustomerInfoCache','getCustomerInfo','getOfferings','purchasePackage','restorePurchases']};
    Object.assign(window,{__loginOpenCount:0,__loginReturn:()=>listeners.get('App:appUrlOpen')?.({url:'anzenai://auth/callback?flow=88888888-1111-4111-8111-111111111111&code='+'a'.repeat(43)}),__billingTrace:trace,webkit:{messageHandlers:{bridge:{}}},Capacitor:{
      PluginHeaders:Object.entries(plugins).map(([name,methods])=>({name,methods:methods.map(name=>({name,rtype:name==='addListener'?'callback':'promise'}))})),
      nativeCallback:(plugin:string,_method:string,options:{eventName:string},callback:(value:unknown)=>void)=>{listeners.set(plugin+':'+options.eventName,callback);return Promise.resolve('relogin-listener');},
      nativePromise:async(plugin:string,method:string,options:Record<string,string>)=>{
        if(plugin==='Browser'&&method==='open'){(window as unknown as Bridge).__loginOpenCount++;return {};}
        if(plugin==='Preferences'||plugin==='NativeVault'){
          const store=plugin==='Preferences'?prefs:vault;const key=options?.key??options?.purpose??'session';
          if(method==='get')return {value:store.get(key)??null};
          if(method==='set')store.set(key,options.value);else store.delete(key);return {};
        }
        if(plugin==='CapacitorHttp'){
          const request=options as unknown as {url:string;method:string;headers:Record<string,string>;data?:unknown};
          const pathname=new URL(request.url).pathname;
          if(pathname==='/api/billing/reconcile')trace.push({event:'reconcile',owner:JSON.parse(JSON.stringify(request.data)).appUserId,at:performance.now()});
          if(pathname==='/api/me/entitlements')trace.push({event:'rights',at:performance.now()});
          const response=await send(request.url,{method:request.method,headers:request.headers,...(request.data?{body:JSON.stringify(request.data)}:{})});
          return {url:response.url,status:response.status,headers:Object.fromEntries(response.headers),data:await response.json()};
        }
        if(plugin==='Purchases'){
          if(method==='configure'||method==='logIn')owner=options.appUserID;
          trace.push({event:method,owner,at:performance.now()});
          if(method==='logOut')owner=undefined;
          // Deliberately retain a misleading cached Pro flag even when member B logs in.
          if(method==='getCustomerInfo'||method==='logIn')return {customerInfo:{entitlements:{active:{anzen_pro:{isActive:true}}}}};
          if(method==='getOfferings')return {all:{relogin:{availablePackages:[{identifier:'fixture',packageType:'MONTHLY',product:{identifier:'jp.anzenaiportal.pro.monthly',price:980,priceString:'¥980',currencyCode:'JPY',subscriptionPeriod:'P1M'}}]}}};
        }
        return {};
      },
    }});
  });
}
const captureDir=process.env.ANZ_TF4_CAPTURE_DIR;
test('same-account relogin automatically recovers Pro; another account cannot inherit cached Pro',async({page,context},info)=>{
  await bridge(context);await context.route('https://**/*',route=>route.abort());
  let next:'a'|'b'='a';let paid=false;let reconciles=0;
  const rights=(owner:'a'|'b')=>({plan:paid&&owner==='a'?'pro':'free',source:paid&&owner==='a'?'app_store':null,syncState:'verified',expiresAt:paid&&owner==='a'?new Date(Date.now()+86400000).toISOString():null,appUserId:owners[owner],verifiedAt:new Date().toISOString(),limits:paid&&owner==='a'?product.limits.pro:product.limits.free,purchasePending:!paid&&owner==='a',purchaseIntentId:!paid&&owner==='a'?flow:null,purchaseSource:!paid&&owner==='a'?'app_store':null,purchaseStage:!paid&&owner==='a'?'store_started':null});
  await context.route(host+'/api/**',async route=>{
    const request=route.request();const url=new URL(request.url());
    if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
    if(url.pathname.endsWith('/billing/config'))return route.fulfill({headers:cors,json:{ready:true,publicKey:'synthetic-public-sdk',productId:'jp.anzenaiportal.pro.monthly',offeringId:'relogin',policy:product,login:{apple:true,google:true},terms:host+'/terms',privacy:host+'/privacy',manage:'https://apps.apple.com/account/subscriptions'}});
    if(url.pathname.endsWith('/auth/start'))return route.fulfill({headers:cors,json:{flow,authorizeUrl:host+'/api/mobile/v1/auth/authorize?flow='+flow}});
    if(url.pathname.endsWith('/auth/exchange')){paid=false;return route.fulfill({headers:cors,json:{token:next.repeat(43)}});}
    if(url.pathname.endsWith('/auth/logout')){paid=false;return route.fulfill({headers:cors,json:{ok:true}});}
    const token=request.headers()['authorization'];const owner=token===`Bearer ${'a'.repeat(43)}`?'a':token===`Bearer ${'b'.repeat(43)}`?'b':null;
    if(!owner)return route.fulfill({status:401,headers:cors,json:{error:{code:'UNAUTHORIZED'}}});
    if(url.pathname==='/api/me/entitlements')return route.fulfill({headers:cors,json:rights(owner)});
    if(url.pathname==='/api/billing/reconcile'){
      expect(request.postDataJSON().appUserId).toBe(owners[owner]);reconciles++;paid=owner==='a';
      return route.fulfill({headers:cors,json:rights(owner)});
    }
    if(url.pathname.endsWith('/capabilities')){
      const cap=capability();cap.session='member';cap.plan=paid&&owner==='a'?'pro':'free';
      cap.features.law_chat.quota.limit=cap.plan==='pro'?50:3;cap.features.law_chat.quota.remaining=cap.plan==='pro'?50:0;
      return route.fulfill({headers:cors,json:cap});
    }
    if(url.pathname.endsWith('/account'))return route.fulfill({headers:cors,json:{displayName:'復帰テスト',email:null,sdsHistory:[]}});
    return route.fulfill({status:503,headers:cors,json:{error:{code:'UNAVAILABLE'}}});
  });
  await page.goto('/account/');await expect(page.getByRole('button',{name:'Apple / Googleでログイン'})).toBeEnabled();
  const login=async()=>{
    const opened=await page.evaluate(()=>(window as unknown as Bridge).__loginOpenCount);
    await page.getByRole('button',{name:'Apple / Googleでログイン'}).click();
    await expect.poll(()=>page.evaluate(()=>(window as unknown as Bridge).__loginOpenCount)).toBe(opened+1);
    await page.evaluate(()=>(window as unknown as Bridge).__loginReturn());
  };
  await login();await expect(page.getByText('Pro 購入済み（App Store購読）',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'ログアウト',exact:true}).click();
  await expect(page.getByRole('button',{name:'Apple / Googleでログイン'})).toBeEnabled();
  const reloginStart=Date.now();await login();
  await expect(page.getByText('Pro 購入済み（App Store購読）',{exact:true})).toBeVisible();
  const recoveryMs=Date.now()-reloginStart;expect(recoveryMs).toBeLessThan(3000);
  await expect(page.getByText('「購入を復元」をお試しください。',{exact:true})).toHaveCount(0);
  const trace=await page.evaluate(()=>(window as unknown as Bridge).__billingTrace);
  const logoutIndex=trace.findIndex(e=>e.event==='logOut');
  const recovery=trace.slice(logoutIndex+1).filter(e=>['logIn','invalidateCustomerInfoCache','getCustomerInfo','reconcile'].includes(e.event));
  expect(recovery.map(e=>e.event)).toEqual(['logIn','invalidateCustomerInfoCache','getCustomerInfo','reconcile']);
  expect(recovery.every(e=>e.owner===owners.a)).toBe(true);
  expect(trace.some(e=>e.event==='purchasePackage'||e.event==='restorePurchases')).toBe(false);
  if(captureDir){await mkdir(captureDir,{recursive:true});await page.screenshot({path:path.join(captureDir,`${info.project.name}-pro-recovered.png`),fullPage:true});}
  await page.getByRole('link',{name:'法令AI',exact:true}).click();
  await expect(page.getByLabel('AIの利用枠')).toContainText('50／50回');
  if(captureDir)await page.screenshot({path:path.join(captureDir,`${info.project.name}-pro-50.png`),fullPage:true});
  await page.getByRole('link',{name:'会員・Pro',exact:true}).click();
  await page.getByRole('button',{name:'ログアウト',exact:true}).click();
  await expect(page.getByRole('button',{name:'Apple / Googleでログイン'})).toBeEnabled();
  next='b';await login();await expect(page.getByText('無料会員',{exact:true})).toBeVisible();
  await expect.poll(()=>reconciles).toBeGreaterThanOrEqual(3);
  await expect(page.getByText('Pro 購入済み（App Store購読）',{exact:true})).toHaveCount(0);
  if(captureDir){await page.screenshot({path:path.join(captureDir,`${info.project.name}-other-account-free.png`),fullPage:true});await writeFile(path.join(captureDir,`${info.project.name}-relogin.json`),JSON.stringify({source:'mock RevenueCat + mock server; real bundled login/session/UI',recoveryMs,reconciles,trace:await page.evaluate(()=>(window as unknown as Bridge).__billingTrace)},null,2));}
});

test('chemical RA uses Arabic levels and stars on iPhone and printed pages',async({page,context},info)=>{
  await context.route('https://**/*',route=>route.abort());
  await context.route(host+'/api/chemical-ra/substances',route=>route.fulfill({headers:cors,json:substances}));
  await page.goto('/chemical-ra/');
  // A click is replayed during hydration; filling prerendered HTML can precede React's input listener in WebKit.
  await page.getByRole('button',{name:'トルエン',exact:true}).click();
  await page.getByRole('button',{name:/トルエン.*CAS 108-88-3/}).click();
  const choose=async(group:string,option:string)=>page.getByRole('radiogroup',{name:group}).getByRole('radio',{name:new RegExp(option)}).click();
  await choose('1回（1日）に扱う量','中量');await choose('換気','窓・換気扇');
  await page.getByLabel(/1日の作業時間/).selectOption('8');await page.getByLabel('日数',{exact:true}).selectOption('5');
  await choose('皮膚に付く範囲','両手と手首');
  await expect(page.getByRole('list',{name:'経路別のリスクレベル'})).toContainText('レベル4（大きい）★★★★');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if(captureDir){
    await mkdir(captureDir,{recursive:true});await page.screenshot({path:path.join(captureDir,`${info.project.name}-chemical-full.png`),fullPage:true});
    await page.getByRole('heading',{name:'③ リスクレベル'}).scrollIntoViewIfNeeded();await page.screenshot({path:path.join(captureDir,`${info.project.name}-chemical-iphone.png`)});
  }
  await page.emulateMedia({media:'print'});
  const report=page.locator('[data-cs-print-report]');await expect(report).toBeVisible();
  await expect(report).toContainText('レベル4（大きい）★★★★');await expect(report).toContainText('100%');
  if(captureDir&&info.project.name==='chromium-phone'){
    await page.pdf({path:path.join(captureDir,'chemical-print-color.pdf'),format:'A4',printBackground:true});
    await page.addStyleTag({content:'@media print{[data-cs-print-report],[data-cs-print-report] *{color:#111!important;background:#fff!important;border-color:#555!important;box-shadow:none!important}}'});
    await page.pdf({path:path.join(captureDir,'chemical-print-grayscale.pdf'),format:'A4',printBackground:true});
    await report.screenshot({path:path.join(captureDir,'chemical-print-grayscale-preview.png')});
  }
});
