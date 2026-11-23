import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {test,expect} from './fixtures';
import type {BrowserContext,Page} from '@playwright/test';
import {capability} from '../tests/fixtures';
import product from '../../web/src/lib/mobile/product-policy.json' with {type:'json'};
const host='https://www.anzen-ai-portal.jp';
const flow='88888888-1111-4111-8111-111111111111';
const owners={a:'88888888-2222-4222-8222-222222222222',b:'88888888-3333-4333-8333-333333333333'};
type Fault={stage:string;mode:'never'|'failed'|'slow'};
type Bridge={__return:()=>void;__activate:()=>void;__opened:number;__fault:Fault|null;__trace:Array<{event:string;at:number}>};
const cors={'Access-Control-Allow-Origin':'http://127.0.0.1:3213','Access-Control-Allow-Credentials':'true','Access-Control-Allow-Headers':'content-type,x-anzen-native,origin,accept,authorization,x-anzen-csrf'};
async function setup(context:BrowserContext,fault:Fault|null=null){
 await context.addInitScript(({fault})=>{
  const prefs=new Map<string,string>(JSON.parse(sessionStorage.getItem('test-prefs')??'[]'));
  const vault=new Map<string,string>(JSON.parse(sessionStorage.getItem('test-vault')??'[]'));
  const listeners=new Map<string,(value:unknown)=>void>();const send=window.fetch.bind(window);
  const trace:Array<{event:string;at:number}>=[];let sdkOwner:string|undefined;
  const plugins:Record<string,string[]>={NativeVault:['get','set','clear'],Preferences:['get','set','remove'],Browser:['open','close','addListener','removeListener'],App:['getLaunchUrl','addListener','removeListener'],PushNotifications:['addListener','removeListener'],CapacitorHttp:['request'],NativeChatStream:['start','cancel','addListener','removeListener'],Purchases:['configure','isConfigured','logIn','logOut','syncPurchases','invalidateCustomerInfoCache','getCustomerInfo','getOfferings','purchasePackage','restorePurchases']};
  Object.assign(window,{__fault:fault,__opened:0,__trace:trace,__return:()=>listeners.get('App:appUrlOpen')?.({url:'anzenai://auth/callback?flow=88888888-1111-4111-8111-111111111111&code='+'x'.repeat(43)}),__activate:()=>listeners.get('App:appStateChange')?.({isActive:true}),webkit:{messageHandlers:{bridge:{}}},Capacitor:{
   PluginHeaders:Object.entries(plugins).map(([name,methods])=>({name,methods:methods.map(name=>({name,rtype:name==='addListener'?'callback':'promise'}))})),
   nativeCallback:(plugin:string,_method:string,options:{eventName:string},callback:(value:unknown)=>void)=>{listeners.set(plugin+':'+options.eventName,callback);return Promise.resolve('fixture-listener');},
   nativePromise:async(plugin:string,method:string,options:Record<string,string>)=>{
    if(plugin==='Browser'&&method==='open'){(window as unknown as Bridge).__opened++;return {};}
    if(plugin==='Preferences'||plugin==='NativeVault'){
     const fault=(window as unknown as Bridge).__fault;
     if(fault?.stage===`${plugin}.${method}`&&fault.mode==='never')await new Promise(()=>{});
     const store=plugin==='Preferences'?prefs:vault;const key=options?.key??options?.purpose??'session';
     if(method==='get')return {value:store.get(key)??null};if(method==='set')store.set(key,options.value);else store.delete(key);
     sessionStorage.setItem(plugin==='Preferences'?'test-prefs':'test-vault',JSON.stringify([...store]));return {};
    }
    if(plugin==='CapacitorHttp'){
     const request=options as unknown as {url:string;method:string;headers:Record<string,string>;data?:unknown};
     const response=await send(request.url,{method:request.method,headers:request.headers,...(request.data?{body:JSON.stringify(request.data)}:{})});
     return {url:response.url,status:response.status,headers:Object.fromEntries(response.headers),data:await response.json()};
    }
    if(plugin==='NativeChatStream'&&method==='start'){
     trace.push({event:'chat.start',at:performance.now()});
     const request=options as unknown as {id:string;body:string;headers:Record<string,string>};
     const response=await send('https://www.anzen-ai-portal.jp/api/chatbot/stream',{method:'POST',headers:request.headers,body:request.body});
     const emit=listeners.get('NativeChatStream:response')!;
     emit({id:request.id,kind:'headers',status:response.status,headers:Object.fromEntries(response.headers)});
     const bytes=new Uint8Array(await response.arrayBuffer());emit({id:request.id,kind:'chunk',data:btoa(String.fromCharCode(...bytes))});emit({id:request.id,kind:'end'});return {};
    }
    if(plugin==='Purchases'){
     trace.push({event:method,at:performance.now()});const fault=(window as unknown as Bridge).__fault;
     if(method==='configure'||method==='logIn')sdkOwner=options.appUserID;
     if(fault?.stage===method){if(fault.mode==='never')await new Promise(()=>{});if(fault.mode==='failed')throw {code:'35'};if(fault.mode==='slow')await new Promise(resolve=>setTimeout(resolve,2500));}
     if(method==='isConfigured')return {isConfigured:true};
     if(method==='syncPurchases'||method==='restorePurchases')await send('https://www.anzen-ai-portal.jp/api/test/store-sync',{method:'POST',body:JSON.stringify({appUserId:sdkOwner})});
     // Cached native Pro is deliberately untrustworthy, including for member B.
     if(method==='getCustomerInfo'||method==='logIn')return {customerInfo:{entitlements:{active:{anzen_pro:{isActive:true}}}}};
     if(method==='getOfferings')return {all:{fixture:{availablePackages:[{identifier:'fixture',packageType:'MONTHLY',product:{identifier:'jp.anzenaiportal.pro.monthly',price:980,priceString:'¥980',currencyCode:'JPY',subscriptionPeriod:'P1M'}}]}}};
    }
    return {};
   },
  }});
 },{fault});
 let next:'a'|'b'='a';let serverOffline=false;let freeA=false;let configFails=false;let reconciliationOffline=false;let logoutDelay=0;let transfer=false;let verifiedReceipt=true;let synced:'a'|'b'|null=null;let paidOwner:'a'|'b'='a';let conflict=false;let chats=0;
 const diagnostics:unknown[]=[];
 const rights=(owner:'a'|'b')=>{const paid=owner===paidOwner&&!freeA;return {plan:paid?'pro':'free',source:paid?'app_store':null,syncState:'verified',expiresAt:paid?new Date(Date.now()+86400000).toISOString():null,appUserId:owners[owner],verifiedAt:new Date().toISOString(),limits:paid?product.limits.pro:product.limits.free};};
 await context.route('https://**/*',route=>route.abort());
 await context.route(host+'/api/**',async route=>{
  const request=route.request();const url=new URL(request.url());
  if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:cors});
  if(url.pathname.endsWith('/diagnostics')){diagnostics.push(request.postDataJSON());return route.fulfill({headers:cors,json:{ok:true}});}
  if(url.pathname==='/api/test/store-sync'){const id=request.postDataJSON().appUserId;synced=verifiedReceipt?(id===owners.a?'a':id===owners.b?'b':null):null;return route.fulfill({headers:cors,json:{ok:true}});}
  if(serverOffline)return route.abort('internetdisconnected');
  if(url.pathname.endsWith('/billing/config'))return route.fulfill({headers:cors,status:configFails?503:200,json:configFails?{error:{code:'UNAVAILABLE'}}:{ready:true,publicKey:'appl_synthetic_public_sdk',productId:'jp.anzenaiportal.pro.monthly',offeringId:'fixture',policy:product,login:{apple:true,google:true},terms:host+'/terms',privacy:host+'/privacy',manage:'https://apps.apple.com/account/subscriptions'}});
  if(url.pathname.endsWith('/auth/start'))return route.fulfill({headers:cors,json:{flow,authorizeUrl:host+'/api/mobile/v1/auth/authorize?flow='+flow}});
  if(url.pathname.endsWith('/auth/exchange'))return route.fulfill({headers:cors,json:{token:next.repeat(43)}});
  if(url.pathname.endsWith('/auth/logout')){if(logoutDelay)await new Promise(resolve=>setTimeout(resolve,logoutDelay));return route.fulfill({headers:cors,json:{ok:true}});}
  const token=request.headers()['authorization'];const owner=token===`Bearer ${'a'.repeat(43)}`?'a':token===`Bearer ${'b'.repeat(43)}`?'b':null;
  if(!owner)return route.fulfill({status:401,headers:cors,json:{error:{code:'UNAUTHORIZED'}}});
  if(url.pathname==='/api/me/entitlements')return route.fulfill({headers:cors,json:rights(owner)});
  if(url.pathname==='/api/billing/reconcile'){
   if(conflict&&owner!==paidOwner)return route.fulfill({status:409,headers:cors,json:{error:{code:'PURCHASE_OWNED_BY_OTHER_ACCOUNT'}}});
   if(transfer&&synced===owner)paidOwner=owner;
   return route.fulfill({status:reconciliationOffline?503:200,headers:cors,json:reconciliationOffline?{error:{code:'ENTITLEMENT_SYNC_PENDING'}}:rights(owner)});
  }
  if(url.pathname.endsWith('/capabilities')){const cap=capability();cap.session='member';cap.plan=rights(owner).plan==='pro'?'pro':'free';cap.features.law_chat.quota.limit=cap.plan==='pro'?50:3;cap.features.law_chat.quota.used=cap.plan==='pro'?0:3;cap.features.law_chat.quota.remaining=cap.plan==='pro'?50:0;return route.fulfill({headers:cors,json:cap});}
  if(url.pathname==='/api/chatbot/stream'){
   chats++;const answer='作業前に設備と周囲の安全を確認してください。';return route.fulfill({headers:{...cors,'Content-Type':'text/event-stream'},body:`event: text\ndata: ${JSON.stringify({chunk:answer})}\n\nevent: meta\ndata: ${JSON.stringify({answer,sources:[],source_type:'safety',confidence:'low',requiresHumanReview:true})}\n\n`});
  }
  if(url.pathname.endsWith('/account'))return route.fulfill({headers:cors,json:{displayName:'検証会員',email:null,sdsHistory:[]}});
  return route.fulfill({status:503,headers:cors,json:{error:{code:'UNAVAILABLE'}}});
 });
 return {diagnostics,rights,chats:()=>chats,transfer:(verified=true)=>{transfer=true;verifiedReceipt=verified;},conflict:()=>{conflict=true;},setNext:(value:'a'|'b')=>{next=value;},offline:(value:boolean)=>{serverOffline=value;},free:(value:boolean)=>{freeA=value;},failConfig:()=>{configFails=true;},failReconcile:()=>{reconciliationOffline=true;},delayLogout:(ms:number)=>{logoutDelay=ms;}};
}
async function login(page:Page){
 const count=await page.evaluate(()=>(window as unknown as Bridge).__opened);
 await page.getByRole('button',{name:'Apple / Googleで連携（任意）'}).click();
 await expect.poll(()=>page.evaluate(()=>(window as unknown as Bridge).__opened)).toBe(count+1);
 await expect(page.getByRole('button',{name:'Apple / Googleで連携（任意）'})).toBeEnabled();
 await page.evaluate(()=>(window as unknown as Bridge).__return());
}
async function pro(page:Page){await expect(page.getByText('Pro 利用中',{exact:true})).toBeVisible({timeout:3000});}
async function buttons(page:Page){await expect(page.getByRole('button',{name:'購入を復元',exact:true})).toBeEnabled();await expect(page.getByRole('button',{name:/権利を再確認|会員情報を再読み込み|App Storeの購入手続きを再開/})).toHaveCount(0);await expect(page.getByRole('link',{name:'App Storeで購読を管理・解約',exact:true})).toBeVisible();}
async function chat50(page:Page){await page.getByRole('link',{name:'法令AI',exact:true}).click();await expect(page.getByLabel('AIの利用枠')).toContainText('50／50回',{timeout:3000});}
async function account(page:Page){await page.getByRole('link',{name:'Pro',exact:true}).click();await expect(page).toHaveURL(/\/account\/$/);await expect(page.getByRole('heading',{name:'安全AI Pro',exact:true})).toBeVisible();}
const captureDir=process.env.ANZ_TF5_CAPTURE_DIR;

test('verified App Store receipt moves A to B automatically, relogin is immediately Pro and first chat sends once',async({page,context},info)=>{
 const s=await setup(context);s.transfer();await page.goto('/account/');await login(page);await pro(page);await buttons(page);
 await page.getByRole('button',{name:'ログアウト',exact:true}).click();s.setNext('b');await login(page);await pro(page);
 expect(s.rights('a').plan).toBe('free');expect(s.rights('b').plan).toBe('pro');
 await expect(page.getByRole('button',{name:/Proにする/})).toHaveCount(0);await expect(page.getByText(/更新・有効期限/)).toBeVisible();
 await page.getByRole('button',{name:'ログアウト',exact:true}).click();await login(page);await pro(page);await buttons(page);
 if(captureDir){await mkdir(captureDir,{recursive:true});await page.screenshot({path:path.join(captureDir,`${info.project.name}-account-pro.png`),fullPage:true});}
 // Login installed a verified session. Simulate Keychain being temporarily
 // inaccessible on iOS activation; first send must use that same credential.
 await page.evaluate(()=>(window as unknown as Bridge).__fault={stage:'NativeVault.get',mode:'never'});
 await chat50(page);await page.getByRole('textbox',{name:'質問入力'}).fill('作業前の安全確認は？');await page.getByRole('button',{name:'送信',exact:true}).click();
 await expect(page.locator('[data-chatbot-answer]')).toHaveCount(1);expect(s.chats()).toBe(1);
 expect(await page.evaluate(()=>(window as unknown as Bridge).__trace.filter(item=>item.event==='chat.start').length)).toBe(1);
 expect(s.diagnostics.filter(value=>{const d=value as {operation:string;result:string;stage?:string};return d.operation==='chat'&&d.result==='failed'&&d.stage==='session';})).toEqual([]);
 await info.attach('first-chat', {body:JSON.stringify({requests:s.chats(),a:s.rights('a').plan,b:s.rights('b').plan}),contentType:'application/json'});
});
test('unverified native Pro cache cannot move a purchase and an ownership conflict offers restore',async({page,context},info)=>{
 const s=await setup(context);s.transfer(false);s.setNext('b');await page.goto('/account/');await login(page);
 await expect(page.getByText('無料プラン',{exact:true})).toBeVisible();expect(s.rights('a').plan).toBe('pro');expect(s.rights('b').plan).toBe('free');
 await expect(page.getByRole('button',{name:/Proにする/})).toHaveCount(1);await buttons(page);
 s.conflict();await page.evaluate(()=>(window as unknown as Bridge).__activate());
 await expect(page.getByRole('status').filter({hasText:'この購入は別のアカウントで使用中です。購入時のApple Accountを確認し、Pro画面の「購入を復元」をお試しください。'})).toBeVisible();
 expect(s.rights('a').plan).toBe('pro');expect(s.rights('b').plan).toBe('free');
 if(captureDir){await mkdir(captureDir,{recursive:true});await page.screenshot({path:path.join(captureDir,`${info.project.name}-account-conflict.png`),fullPage:true});}
});
test('saved Pro survives logout, relogin and restart; cached native Pro never transfers accounts',async({page,context},info)=>{
 const s=await setup(context);await page.goto('/account/');await login(page);await pro(page);
 await page.getByRole('button',{name:'ログアウト',exact:true}).click();await expect(page.getByRole('button',{name:'Apple / Googleで連携（任意）'})).toBeEnabled();
 const started=Date.now();await login(page);await pro(page);const recoveryMs=Date.now()-started;expect(recoveryMs).toBeLessThan(3000);await buttons(page);await chat50(page);
 await account(page);await page.reload();await pro(page);await buttons(page);await chat50(page);
 if(captureDir){await mkdir(captureDir,{recursive:true});await page.screenshot({path:path.join(captureDir,`${info.project.name}-saved-pro-50.png`),fullPage:true});}
 await account(page);await page.getByRole('button',{name:'ログアウト',exact:true}).click();await expect(page.getByRole('button',{name:'Apple / Googleで連携（任意）'})).toBeEnabled();
 s.setNext('b');await login(page);await expect(page.getByText('無料プラン',{exact:true})).toBeVisible();await page.getByRole('link',{name:'法令AI',exact:true}).click();await expect(page.getByLabel('AIの利用枠')).toContainText('0／3回');
 expect(s.diagnostics.length).toBeGreaterThan(0);
 if(captureDir)await writeFile(path.join(captureDir,`${info.project.name}-saved-ledger.json`),JSON.stringify({recoveryMs,diagnostics:s.diagnostics},null,2));
});
for(const stage of ['configure','isConfigured','logIn','logOut','getCustomerInfo'])test(`server Pro and login stay usable when ${stage} never returns`,async({page,context},info)=>{
 const s=await setup(context,{stage,mode:'never'});await page.goto('/account/');await login(page);await pro(page);await buttons(page);
 if(stage==='logIn'||stage==='logOut')await expect.poll(()=>page.evaluate(()=>(window as unknown as Bridge).__trace.some(entry=>entry.event==='configure'))).toBe(true);
 await page.getByRole('button',{name:'ログアウト',exact:true}).click();await expect(page.getByRole('button',{name:'Apple / Googleで連携（任意）'})).toBeEnabled({timeout:3000});
 await login(page);await pro(page);await chat50(page);await account(page);await pro(page);await buttons(page);
 // Real 8-second timers, including a diagnostic failure, with the UI usable throughout.
 await expect.poll(()=>s.diagnostics.some(value=>(value as {result:string}).result==='timeout'),{timeout:11000}).toBe(true);
 await buttons(page);await page.reload();await pro(page);await chat50(page);
 if(captureDir){await mkdir(captureDir,{recursive:true});await page.screenshot({path:path.join(captureDir,`${info.project.name}-stalled-${stage}-pro.png`),fullPage:true});await writeFile(path.join(captureDir,`${info.project.name}-stalled-${stage}.json`),JSON.stringify(s.diagnostics,null,2));}
});
test('config failure leaves login, restore and recheck operable; offering and restore stalls release separately',async({page,context})=>{
 const s=await setup(context,{stage:'getOfferings',mode:'never'});s.free(true);s.failConfig();await page.goto('/account/');
 await expect(page.getByRole('button',{name:'Apple / Googleで連携（任意）'})).toBeEnabled();await login(page);await expect(page.getByText('無料プラン',{exact:true})).toBeVisible();await buttons(page);
 await page.getByRole('button',{name:'購入を復元',exact:true}).click();await expect(page.getByRole('button',{name:'ログアウト',exact:true})).toBeEnabled();
 await expect(page.getByRole('button',{name:'購入を復元',exact:true})).toBeEnabled();
});
test('price lookup never blocks restore or recheck; stalled restore only disables itself',async({page,context})=>{
 const s=await setup(context,{stage:'getOfferings',mode:'never'});s.free(true);await page.goto('/account/');await login(page);await expect(page.getByText('無料プラン',{exact:true})).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>(window as unknown as Bridge).__trace.some(entry=>entry.event==='getOfferings'))).toBe(true);
 await buttons(page);await page.evaluate(()=>(window as unknown as Bridge).__fault={stage:'restorePurchases',mode:'never'});
 await page.getByRole('button',{name:'購入を復元',exact:true}).click();await expect(page.getByRole('button',{name:'購入を復元',exact:true})).toBeDisabled();
 await expect(page.getByRole('button',{name:'権利を再確認',exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:'ログアウト',exact:true})).toBeEnabled();
 await expect(page.getByRole('button',{name:'購入を復元',exact:true})).toBeEnabled({timeout:11000});
});
test('network switch and a failed reconciliation preserve saved server Pro',async({page,context})=>{
 const s=await setup(context,{stage:'getCustomerInfo',mode:'slow'});await page.goto('/account/');await login(page);await pro(page);
 s.offline(true);await page.evaluate(()=>{window.dispatchEvent(new Event('offline'));(window as unknown as Bridge).__activate();});
 await buttons(page);s.offline(false);s.failReconcile();await page.evaluate(()=>{window.dispatchEvent(new Event('online'));(window as unknown as Bridge).__activate();});
 await pro(page);await buttons(page);await page.evaluate(()=>window.dispatchEvent(new Event('anzen-app-active')));await pro(page);await chat50(page);
});
test('starting login during a slow server logout keeps the new login and saved Pro',async({page,context})=>{
 const s=await setup(context);await page.goto('/account/');await login(page);await pro(page);s.delayLogout(1500);
 await page.getByRole('button',{name:'ログアウト',exact:true}).click();await expect(page.getByRole('button',{name:'Apple / Googleで連携（任意）'})).toBeEnabled();
 await login(page);await pro(page);await buttons(page);await chat50(page);
});
test('a stalled Keychain proof releases the login button after app activation and permits retry',async({page,context})=>{
 await setup(context);await page.goto('/account/');await login(page);await pro(page);
 await page.getByRole('button',{name:'ログアウト',exact:true}).click();
 const signIn=page.getByRole('button',{name:'Apple / Googleで連携（任意）'});
 await expect(signIn).toBeEnabled();const opened=await page.evaluate(()=>(window as unknown as Bridge).__opened);
 await signIn.click();await expect.poll(()=>page.evaluate(()=>(window as unknown as Bridge).__opened)).toBe(opened+1);
 await page.evaluate(()=>{const bridge=window as unknown as Bridge;bridge.__fault={stage:'NativeVault.get',mode:'never'};bridge.__return();bridge.__activate();});
 await expect(signIn).toBeDisabled();await expect(signIn).toBeEnabled({timeout:11000});
 await page.evaluate(()=>(window as unknown as Bridge).__fault=null);
 await login(page);await pro(page);await buttons(page);await chat50(page);
});
